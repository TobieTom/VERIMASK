from django.utils import timezone
from django.shortcuts import render, get_object_or_404
import logging
import ipfshttpclient
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, serializers
from rest_framework.permissions import IsAuthenticated, AllowAny

from .Serializer import UserProfileSerializer, DocumentSerializer
from .models import Document, VerificationRecord, UserProfile
from .blockchain_utils import upload_document_to_blockchain, verify_document_on_blockchain, verify_ethereum_signature
from web3 import Web3
from eth_account.messages import encode_defunct
from .blockchain_utils import BlockchainManager
from django.db import transaction
from .permissions import IsInstitution
from django.http import JsonResponse
from web3 import Web3
from rest_framework.throttling import UserRateThrottle
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db import transaction
from django.contrib.auth import authenticate

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Custom token serializer with user information
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Get username and password from the request
        username = attrs.get('username')
        password = attrs.get('password')
        
        # Log the incoming data (ONLY FOR DEBUGGING - REMOVE IN PRODUCTION)
        logger.info(f"Login attempt with username: {username}")
        logger.info(f"Context data: {self.context['request'].data}")
        
        # Get role from the request (optional)
        role = self.context['request'].data.get('role')
        
        # Try to find the user
        try:
            # First check if this username exists directly
            user_obj = User.objects.get(username=username)
        except User.DoesNotExist:
            # Then check if it's an email address
            try:
                user_obj = User.objects.get(email=username)
                # Update username to match what's in the database
                attrs['username'] = user_obj.username
            except User.DoesNotExist:
                user_obj = None
        
        # Try to authenticate
        user = authenticate(username=attrs.get('username'), password=password)
        
        if user is None and user_obj is not None:
            # Try direct authentication with the user object's username
            user = authenticate(username=user_obj.username, password=password)
        
        if user is None:
            # Log the failure with available details
            logger.error(f"Failed login attempt for {username}")
            if user_obj:
                logger.error(f"User exists but authentication failed. Username in DB: {user_obj.username}")
            
            # Check if we can read the password hash from the database
            if user_obj:
                logger.info(f"Password hash in DB: {user_obj.password[:15]}...")
            
            raise serializers.ValidationError({
                'detail': 'No active account found with the given credentials'
            })
        
        # Get the token data
        data = super().validate(attrs)
        
        # Get the user profile
        try:
            profile = UserProfile.objects.get(user=user)
            is_institution = profile.is_institution
            wallet_address = profile.wallet_address
        except UserProfile.DoesNotExist:
            # Create profile if it doesn't exist
            is_institution = role == 'institution' if role else False
            wallet_address = None
            profile = UserProfile.objects.create(
                user=user,
                is_institution=is_institution,
                wallet_address=wallet_address
            )
        
        # Add user data to the response
        data['user'] = {
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'fullName': f"{user.first_name} {user.last_name}".strip(),
            'role': 'institution' if is_institution else 'client',
            'walletAddress': wallet_address
        }
        
        logger.info(f"User {username} logged in successfully")
        return data

# Custom token view
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

# Auth status check endpoint
class AuthStatusView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        try:
            profile = user.profile
            is_institution = profile.is_institution
            wallet_address = profile.wallet_address
        except UserProfile.DoesNotExist:
            is_institution = False
            wallet_address = None
        
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': 'institution' if is_institution else 'client',
            'walletAddress': wallet_address,
            'isAuthenticated': True
        })

class DocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            if 'file' not in request.FILES:
                return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
            
            file = request.FILES['file']
            document_type = request.data.get('document_type')
            
            if not document_type:
                return Response({'error': 'Document type is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Step 1: Upload to IPFS
            from .ipfs_service import IPFSService
            ipfs_hash = IPFSService.upload_file(file)
            logger.info(f"IPFS upload successful, hash: {ipfs_hash}")
            
            # Step 2: Create document in database
            document = Document.objects.create(
                user=request.user,
                ipfs_hash=ipfs_hash,
                document_type=document_type,
                file_name=file.name,
                file_size=file.size,
                status='Pending'
            )
            logger.info(f"Document created with ID: {document.id}")
            
            # Step 3: Record on blockchain
            try:
                # Check if user has a profile with wallet address
                if not hasattr(request.user, 'profile') or not request.user.profile.wallet_address:
                    logger.error("User does not have a profile with wallet address")
                    # Continue without blockchain recording, just store in database
                    return Response({
                        'message': 'Document uploaded successfully (blockchain recording skipped - no wallet address)',
                        'document_id': document.id,
                        'ipfs_hash': ipfs_hash
                    }, status=status.HTTP_201_CREATED)
                
                logger.info(f"Recording on blockchain with wallet: {request.user.profile.wallet_address}")
                # Use blockchain manager to upload the document
                from .blockchain_utils import BlockchainManager
                blockchain = BlockchainManager()
                receipt = blockchain.upload_document(ipfs_hash, document_type, request.user.profile.wallet_address)
                
                # Update document with blockchain information
                document.blockchain_tx_hash = receipt.transactionHash.hex()
                document.blockchain_index = blockchain.get_document_count(request.user.profile.wallet_address) - 1
                document.save()
                logger.info(f"Blockchain recording successful, tx hash: {document.blockchain_tx_hash}")
                
                return Response({
                    'message': 'Document uploaded successfully and recorded on blockchain',
                    'document_id': document.id,
                    'ipfs_hash': ipfs_hash,
                    'blockchain_tx_hash': document.blockchain_tx_hash
                }, status=status.HTTP_201_CREATED)
            except Exception as blockchain_error:
                logger.error(f"Blockchain recording failed: {str(blockchain_error)}")
                # We still return success since the document is stored in IPFS and database
                return Response({
                    'message': 'Document uploaded successfully (blockchain recording failed)',
                    'document_id': document.id,
                    'ipfs_hash': ipfs_hash,
                    'blockchain_error': str(blockchain_error)
                }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Document upload failed: {str(e)}")
            return Response({
                'error': f'Failed to upload document: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DocumentVerificationView(APIView):
    permission_classes = [IsAuthenticated, IsInstitution]
    
    def post(self, request, document_id):
        try:
            document = get_object_or_404(Document, id=document_id)
        except Document.DoesNotExist:
            return Response({'error': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)
        
        status_value = request.data.get('status')
        if status_value not in ['Verified', 'Rejected']:
            return Response({'error': 'Invalid status. Must be Verified or Rejected'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        notes = request.data.get('notes', '')
        
        # Update database
        document.status = status_value
        document.verified_by = request.user
        document.verification_date = timezone.now()
        document.notes = notes
        document.save()
        
        # Update blockchain
        try:
            blockchain = BlockchainManager()
            receipt = blockchain.verify_document(
                document.user.profile.wallet_address,
                document.blockchain_index,
                status_value,
                notes
            )
            
            # Create a verification record
            VerificationRecord.objects.create(
                document=document,
                verifier=request.user,
                status_change=status_value,
                notes=notes,
                transaction_hash=receipt.transactionHash.hex()
            )
            
            # Send WebSocket notification
            try:
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f"user_{document.user.id}",  # Group name (user-specific)
                    {
                        'type': 'send_notification',
                        'message': f"Your document '{document.file_name}' has been {document.status.lower()}."
                    }
                )
            except Exception as ws_error:
                logger.error(f"WebSocket notification error: {str(ws_error)}")
            
            return Response({
                'message': 'Document verification updated successfully',
                'document_id': document.id,
                'status': status_value,
                'transaction_hash': receipt.transactionHash.hex()
            })
            
        except Exception as e:
            # Revert database changes if blockchain update fails
            document.status = 'Pending'
            document.verified_by = None
            document.verification_date = None
            document.notes = ''
            document.save()
            
            logger.error(f"Blockchain verification failed: {str(e)}")
            return Response({'error': 'Failed to update blockchain. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PendingDocumentsView(APIView):
    permission_classes = [IsAuthenticated, IsInstitution]
    
    def get(self, request):
        documents = Document.objects.filter(status='Pending')
        serializer = DocumentSerializer(documents, many=True)
        return Response(serializer.data)
    
class DocumentDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, document_id):
        try:
            document = Document.objects.get(id=document_id, user=request.user)
            serializer = DocumentSerializer(document)
            return Response(serializer.data)
        except Document.DoesNotExist:
            return Response({'error': 'Document not found or access denied'}, 
                          status=status.HTTP_404_NOT_FOUND)
    
class DocumentSearchView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        query = request.query_params.get('query', '')
        documents = Document.objects.filter(user=request.user, file_name__icontains=query)
        serializer = DocumentSerializer(documents, many=True)
        return Response(serializer.data)
        
class ProfileUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def put(self, request):
        profile = request.user.profile
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class VerificationHistoryView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        documents = Document.objects.filter(user=request.user).exclude(status='Pending')
        serializer = DocumentSerializer(documents, many=True)
        return Response(serializer.data)
    
class VerifySignatureView(APIView):
    def post(self, request):
        user_address = request.data.get('user_address')
        signature = request.data.get('signature')
        message = "Please sign this message to authenticate."
        
        if not user_address or not signature:
            return Response({'error': 'User address and signature are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Use the utility function from blockchain_utils
            valid = verify_ethereum_signature(message, signature, user_address)
            
            if valid:
                # Authenticate the user (e.g., generate JWT token)
                return Response({'status': 'success', 'token': 'your_jwt_token'})
            else:
                return Response({'status': 'error', 'message': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Signature verification failed: {str(e)}")
            return Response({'error': 'Failed to verify signature. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
class UserDocumentsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        documents = Document.objects.filter(user=request.user)
        serializer = DocumentSerializer(documents, many=True)
        return Response(serializer.data)
    
class UserRegistrationView(APIView):
    def post(self, request):
        try:
            with transaction.atomic():
                # Create user
                user_data = {
                    'username': request.data.get('email'),
                    'email': request.data.get('email'),
                    'first_name': request.data.get('fullName', '').split(' ')[0] if request.data.get('fullName') else '',
                    'last_name': ' '.join(request.data.get('fullName', '').split(' ')[1:]) if request.data.get('fullName') else '',
                }
                
                # Set password separately to use set_password method
                password = request.data.get('password')
                if not password:
                    return Response({'error': 'Password is required'}, status=status.HTTP_400_BAD_REQUEST)
                
                # Check if user already exists
                if User.objects.filter(username=user_data['username']).exists():
                    return Response({'error': 'User with this email already exists'}, 
                                  status=status.HTTP_400_BAD_REQUEST)
                
                # Create user with proper password hashing
                user = User.objects.create(
                    username=user_data['username'],
                    email=user_data['email'],
                    first_name=user_data['first_name'],
                    last_name=user_data['last_name'],
                    is_active=True
                )
                user.set_password(password)  # This properly hashes the password
                user.save()
                
                # Create user profile
                role = request.data.get('role')
                profile_data = {
                    'user': user,
                    'wallet_address': request.data.get('walletAddress'),
                    'is_institution': role == 'institution',
                    'registration_number': request.data.get('registrationNumber', '')
                }
                
                UserProfile.objects.create(**profile_data)
                
                # Generate tokens
                refresh = RefreshToken.for_user(user)
                
                logger.info(f"User registered successfully: {user.email}")
                
                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'fullName': f"{user.first_name} {user.last_name}".strip(),
                        'role': 'institution' if profile_data['is_institution'] else 'client',
                        'walletAddress': profile_data['wallet_address']
                    }
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class WalletAuthView(APIView):
    def post(self, request):
        wallet_address = request.data.get('walletAddress')
        message = request.data.get('message')
        signature = request.data.get('signature')
        
        if not all([wallet_address, message, signature]):
            return Response({'error': 'Wallet address, message, and signature are required'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Add debug information
            logger.info(f"Attempting to verify signature for wallet: {wallet_address}")
            logger.info(f"Message: {message}")
            
            # Use the utility function from blockchain_utils
            valid = verify_ethereum_signature(message, signature, wallet_address)
            
            if not valid:
                return Response({'error': 'Invalid signature'}, 
                               status=status.HTTP_400_BAD_REQUEST)
            
            # Find user by wallet address
            try:
                profile = UserProfile.objects.get(wallet_address=wallet_address)
                user = profile.user
                
                # Generate tokens
                refresh = RefreshToken.for_user(user)
                
                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'fullName': f"{user.first_name} {user.last_name}",
                        'role': 'institution' if profile.is_institution else 'client',
                        'walletAddress': profile.wallet_address
                    }
                })
            except UserProfile.DoesNotExist:
                # Auto-create user if wallet is valid but not registered
                with transaction.atomic():
                    # Create a username from the wallet address
                    username = f"user_{wallet_address[:8].lower()}"
                    
                    # Create basic user
                    user = User.objects.create_user(
                        username=username,
                        email=f"{username}@placeholder.com",  # Placeholder email
                        password=None  # No password for wallet-based users
                    )
                    
                    # Create user profile
                    profile = UserProfile.objects.create(
                        user=user,
                        wallet_address=wallet_address,
                        is_institution=False  # Default to client
                    )
                    
                    # Generate tokens
                    refresh = RefreshToken.for_user(user)
                    
                    return Response({
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                        'user': {
                            'id': user.id,
                            'email': user.email,
                            'fullName': username,
                            'role': 'client',
                            'walletAddress': profile.wallet_address
                        },
                        'new_account': True  # Flag to indicate this is a new account
                    })
                
        except Exception as e:
            logger.error(f"Wallet auth error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
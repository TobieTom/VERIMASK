from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from .models import UserProfile, Document, VerificationRecord
from .Serializer import UserProfileSerializer, DocumentSerializer
from .blockchain_utils import BlockchainManager
from unittest.mock import patch

class UserProfileModelTest(TestCase):
    def test_user_profile_creation(self):
        user = User.objects.create_user(username='testuser', password='testpass')
        profile = UserProfile.objects.create(
            user=user,
            wallet_address='0x1234567890abcdef',
            is_institution=False
        )
        self.assertEqual(profile.user.username, 'testuser')
        self.assertEqual(profile.wallet_address, '0x1234567890abcdef')

class DocumentModelTest(TestCase):
    def test_document_creation(self):
        user = User.objects.create_user(username='testuser', password='testpass')
        document = Document.objects.create(
            user=user,
            ipfs_hash='Qm1234567890abcdef',
            document_type='passport',
            file_name='test.pdf',
            status='Pending'
        )
        self.assertEqual(document.user.username, 'testuser')
        self.assertEqual(document.document_type, 'passport')

class VerificationRecordModelTest(TestCase):
    def test_verification_record_creation(self):
        user = User.objects.create_user(username='testuser', password='testpass')
        document = Document.objects.create(
            user=user,
            ipfs_hash='Qm1234567890abcdef',
            document_type='passport',
            file_name='test.pdf',
            status='Pending'
        )
        record = VerificationRecord.objects.create(
            document=document,
            verifier=user,
            status_change='Verified',
            notes='Document verified successfully'
        )
        self.assertEqual(record.document.file_name, 'test.pdf')
        self.assertEqual(record.status_change, 'Verified')

class DocumentUploadViewTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client.force_authenticate(user=self.user)

    def test_document_upload(self):
        url = reverse('document_upload')
        data = {
            'file': open('path/to/test.pdf', 'rb'),
            'document_type': 'passport'
        }
        response = self.client.post(url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Document.objects.count(), 1)

class DocumentVerificationViewTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.institution = User.objects.create_user(username='institution', password='testpass')
        self.institution.profile.is_institution = True
        self.institution.profile.save()
        self.document = Document.objects.create(
            user=self.user,
            ipfs_hash='Qm1234567890abcdef',
            document_type='passport',
            file_name='test.pdf',
            status='Pending'
        )
        self.client.force_authenticate(user=self.institution)

    def test_document_verification(self):
        url = reverse('document_verify', args=[self.document.id])
        data = {
            'status': 'Verified',
            'notes': 'Document verified successfully'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Document.objects.get(id=self.document.id).status, 'Verified')

class UserProfileSerializerTest(APITestCase):
    def test_user_profile_serializer(self):
        data = {
            'wallet_address': '0x1234567890abcdef',
            'phone_number': '1234567890',
            'registration_number': '12345'
        }
        serializer = UserProfileSerializer(data=data)
        self.assertTrue(serializer.is_valid())

class BlockchainUtilsTest(APITestCase):
    @patch('web3.Web3')
    def test_upload_document_to_blockchain(self, mock_web3):
        mock_web3.eth.contract.return_value.functions.uploadDocument.return_value.build_transaction.return_value = {}
        mock_web3.eth.account.sign_transaction.return_value.rawTransaction = b'signed_tx'
        mock_web3.eth.send_raw_transaction.return_value = b'tx_hash'
        mock_web3.eth.wait_for_transaction_receipt.return_value = {'status': 1}

        blockchain = BlockchainManager()
        receipt = blockchain.upload_document('Qm1234567890abcdef', 'passport', '0x1234567890abcdef')
        self.assertEqual(receipt['status'], 1)
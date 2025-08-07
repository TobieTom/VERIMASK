# Complete Guide to Building the Blockchain Component for eKYC System

This guide provides a comprehensive approach to building the blockchain component that will integrate with a Django backend for your eKYC document verification system.

## 1. Setup and Installation

First, install all necessary tools for blockchain development:

bash
# Install Truffle globally
npm install -g truffle

# Install Ganache for local blockchain development
npm install -g ganache-cli

# Create a new directory for your blockchain component
mkdir ekyc-blockchain
cd ekyc-blockchain

# Initialize a new Truffle project
truffle init

# Initialize npm
npm init -y

# Install dependencies
npm install web3 @openzeppelin/contracts dotenv


## 2. Smart Contract Development

Create the smart contract for identity verification:

Create a file contracts/IdentityVerification.sol:

solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract IdentityVerification {
    struct Document {
        string documentHash;  // IPFS hash of the document
        string documentType;  // Type of document (passport, ID, etc.)
        string status;        // "Pending", "Verified", or "Rejected"
        uint256 timestamp;    // When the document was uploaded
        address verifier;     // Address of the institution that verified it
        string notes;         // Optional verification notes
    }
    
    // Map user addresses to their documents
    mapping(address => Document[]) public userDocuments;
    
    // Map institution addresses to their verification rights
    mapping(address => bool) public verifiers;
    
    // Contract owner
    address public owner;
    
    // Events for tracking actions
    event DocumentUploaded(address indexed user, string documentType, string documentHash);
    event DocumentVerified(address indexed user, address indexed verifier, uint docIndex, string status);
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    
    constructor() {
        owner = msg.sender;
    }
    
    // Only owner can call this function
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // Only verified institutions can call this function
    modifier onlyVerifier() {
        require(verifiers[msg.sender], "Only authorized verifiers can call this function");
        _;
    }
    
    // Add a new institution that can verify documents
    function addVerifier(address _verifier) public onlyOwner {
        verifiers[_verifier] = true;
        emit VerifierAdded(_verifier);
    }
    
    // Remove a verifier
    function removeVerifier(address _verifier) public onlyOwner {
        verifiers[_verifier] = false;
        emit VerifierRemoved(_verifier);
    }
    
    // Upload a document for verification
    function uploadDocument(string memory _documentHash, string memory _documentType) public {
        Document memory newDoc = Document({
            documentHash: _documentHash,
            documentType: _documentType,
            status: "Pending",
            timestamp: block.timestamp,
            verifier: address(0),
            notes: ""
        });
        
        userDocuments[msg.sender].push(newDoc);
        emit DocumentUploaded(msg.sender, _documentType, _documentHash);
    }
    
    // Verify a document
    function verifyDocument(address _user, uint _docIndex, string memory _status, string memory _notes) public onlyVerifier {
        require(_docIndex < userDocuments[_user].length, "Document does not exist");
        
        Document storage doc = userDocuments[_user][_docIndex];
        doc.status = _status;
        doc.verifier = msg.sender;
        doc.notes = _notes;
        
        emit DocumentVerified(_user, msg.sender, _docIndex, _status);
    }
    
    // Get the number of documents for a user
    function getDocumentCount(address _user) public view returns (uint) {
        return userDocuments[_user].length;
    }
    
    // Get a document's details
    function getDocument(address _user, uint _index) public view returns (
        string memory documentHash,
        string memory documentType,
        string memory status,
        uint256 timestamp,
        address verifier,
        string memory notes
    ) {
        require(_index < userDocuments[_user].length, "Document does not exist");
        
        Document storage doc = userDocuments[_user][_index];
        return (
            doc.documentHash,
            doc.documentType,
            doc.status,
            doc.timestamp,
            doc.verifier,
            doc.notes
        );
    }
    
    // Check if an address is a verifier
    function isVerifier(address _addr) public view returns (bool) {
        return verifiers[_addr];
    }
}


## 3. Configure Truffle

Update the Truffle configuration file truffle-config.js:

javascript
require('dotenv').config();

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,  // Default Ganache GUI port
      network_id: "*"
    }
  },
  compilers: {
    solc: {
      version: "0.8.17"
    }
  }
};


## 4. Create Migration Script

Create migration file migrations/2_deploy_identity_verification.js:

javascript
const IdentityVerification = artifacts.require("IdentityVerification");

module.exports = function (deployer) {
  deployer.deploy(IdentityVerification);
};


## 5. Write Tests for Smart Contract

Create test file test/identity_verification_test.js:

javascript
const IdentityVerification = artifacts.require("IdentityVerification");

contract("IdentityVerification", accounts => {
  const owner = accounts[0];
  const institution = accounts[1];
  const client = accounts[2];
  
  let identityVerification;
  
  beforeEach(async () => {
    identityVerification = await IdentityVerification.new({ from: owner });
  });
  
  it("should allow the owner to add verifiers", async () => {
    await identityVerification.addVerifier(institution, { from: owner });
    const isVerifier = await identityVerification.isVerifier(institution);
    assert.equal(isVerifier, true, "Institution should be a verifier");
  });
  
  it("should allow clients to upload documents", async () => {
    const docHash = "QmXb5M6qCMKRRKqjARKb5XBgtaDfbvCt7uCYgECgVJDXXX";
    const docType = "passport";
    
    await identityVerification.uploadDocument(docHash, docType, { from: client });
    
    const docCount = await identityVerification.getDocumentCount(client);
    assert.equal(docCount, 1, "Document count should be 1");
    
    const document = await identityVerification.getDocument(client, 0);
    assert.equal(document.documentHash, docHash, "Document hash should match");
    assert.equal(document.documentType, docType, "Document type should match");
    assert.equal(document.status, "Pending", "Status should be Pending");
  });
  
  it("should allow verifiers to verify documents", async () => {
    // Add institution as verifier
    await identityVerification.addVerifier(institution, { from: owner });
    
    // Upload a document
    const docHash = "QmXb5M6qCMKRRKqjARKb5XBgtaDfbvCt7uCYgECgVJDXXX";
    const docType = "passport";
    await identityVerification.uploadDocument(docHash, docType, { from: client });
    
    // Verify the document
    const status = "Verified";
    const notes = "All looks good";
    await identityVerification.verifyDocument(client, 0, status, notes, { from: institution });
    
    // Check document status
    const document = await identityVerification.getDocument(client, 0);
    assert.equal(document.status, status, "Status should be updated");
    assert.equal(document.notes, notes, "Notes should be updated");
    assert.equal(document.verifier, institution, "Verifier should be the institution");
  });
});


## 6. Compile and Test the Contract

bash
# Start Ganache in a separate terminal
ganache-cli

# Compile the contract
truffle compile

# Run tests
truffle test


## 7. Deploy to Local Blockchain

bash
# Deploy to local Ganache
truffle migrate --network development


After deployment, note the contract address for integration with Django.

## 8. Create Python Integration Files for Django

Create a directory for the Django integration files:

bash
mkdir django-integration


Create a file django-integration/blockchain_utils.py:

python
from web3 import Web3
import json
import os
from dotenv import load_dotenv

load_dotenv()

class BlockchainManager:
    def __init__(self):
        # Load environment variables
        self.web3_provider = os.getenv('WEB3_PROVIDER', 'http://localhost:7545')
        self.contract_address = os.getenv('CONTRACT_ADDRESS')
        self.private_key = os.getenv('ETHEREUM_PRIVATE_KEY')
        
        # Load contract ABI
        contract_json_path = os.path.join(os.path.dirname(__file__), 'IdentityVerification.json')
        with open(contract_json_path, 'r') as f:
            contract_data = json.load(f)
            self.contract_abi = contract_data['abi']
        
        # Initialize Web3
        self.web3 = Web3(Web3.HTTPProvider(self.web3_provider))
        
        # Initialize contract
        self.contract = self.web3.eth.contract(
            address=self.contract_address,
            abi=self.contract_abi
        )
        
        # Set up account from private key if provided
        if self.private_key:
            self.account = self.web3.eth.account.from_key(self.private_key)
        else:
            self.account = None
    
    def upload_document(self, document_hash, document_type, user_address=None):
        """
        Upload a document to the blockchain
        
        Args:
            document_hash (str): IPFS hash of the document
            document_type (str): Type of document (passport, license, etc.)
            user_address (str, optional): Ethereum address of the user. If not provided, 
                                         uses the account from private key.
        
        Returns:
            dict: Transaction receipt
        """
        if not self.account:
            raise ValueError("Private key not configured for transactions")
        
        address_to_use = user_address if user_address else self.account.address
        
        # Build transaction
        tx = self.contract.functions.uploadDocument(
            document_hash,
            document_type
        ).build_transaction({
            'from': self.account.address,
            'nonce': self.web3.eth.get_transaction_count(self.account.address),
            'gas': 2000000,
            'gasPrice': self.web3.to_wei('50', 'gwei')
        })
        
        # Sign and send transaction
        signed_tx = self.web3.eth.account.sign_transaction(tx, self.private_key)
        tx_hash = self.web3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        # Wait for receipt
        return self.web3.eth.wait_for_transaction_receipt(tx_hash)
    
    def verify_document(self, user_address, doc_index, status, notes):
        """
        Verify a document on the blockchain
        
        Args:
            user_address (str): Ethereum address of the document owner
            doc_index (int): Index of the document in the user's document array
            status (str): New status (Verified or Rejected)
            notes (str): Verification notes
        
        Returns:
            dict: Transaction receipt
        """
        if not self.account:
            raise ValueError("Private key not configured for transactions")
        
        # Build transaction
        tx = self.contract.functions.verifyDocument(
            user_address,
            doc_index,
            status,
            notes
        ).build_transaction({
            'from': self.account.address,
            'nonce': self.web3.eth.get_transaction_count(self.account.address),
            'gas': 2000000,
            'gasPrice': self.web3.to_wei('50', 'gwei')
        })
        
        # Sign and send transaction
        signed_tx = self.web3.eth.account.sign_transaction(tx, self.private_key)
        tx_hash = self.web3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        # Wait for receipt
        return self.web3.eth.wait_for_transaction_receipt(tx_hash)
    
    def add_verifier(self, verifier_address):
        """
        Add a new verifier
        
        Args:
            verifier_address (str): Ethereum address to add as verifier
        
        Returns:
            dict: Transaction receipt
        """
        if not self.account:
            raise ValueError("Private key not configured for transactions")
        
        # Build transaction
        tx = self.contract.functions.addVerifier(
            verifier_address
        ).build_transaction({
            'from': self.account.address,
            'nonce': self.web3.eth.get_transaction_count(self.account.address),
            'gas': 2000000,
            'gasPrice': self.web3.to_wei('50', 'gwei')
        })
        
        # Sign and send transaction
        signed_tx = self.web3.eth.account.sign_transaction(tx, self.private_key)
        tx_hash = self.web3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        # Wait for receipt
        return self.web3.eth.wait_for_transaction_receipt(tx_hash)
    
    def get_document(self, user_address, doc_index):
        """
        Get document details from blockchain
        
        Args:
            user_address (str): Ethereum address of the document owner
            doc_index (int): Index of the document in the user's document array
        
        Returns:
            tuple: Document details (hash, type, status, timestamp, verifier, notes)
        """
        return self.contract.functions.getDocument(user_address, doc_index).call()
    
    def get_document_count(self, user_address):
        """
        Get the number of documents for a user
        
        Args:
            user_address (str): Ethereum address of the user
        
        Returns:
            int: Number of documents
        """
        return self.contract.functions.getDocumentCount(user_address).call()
    
    def is_verifier(self, address):
        """
        Check if an address is a verifier
        
        Args:
            address (str): Ethereum address to check
        
        Returns:
            bool: True if address is a verifier, False otherwise
        """
        return self.contract.functions.isVerifier(address).call()


## 9. Create Sample Django Integration Model

Create a file django-integration/models_example.py:

python
# Example model for Django integration
from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    wallet_address = models.CharField(max_length=42)  # Ethereum address
    is_institution = models.BooleanField(default=False)
    registration_number = models.CharField(max_length=100, blank=True)  # For institutions
    
    def __str__(self):
        return self.user.username

class Document(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Verified', 'Verified'),
        ('Rejected', 'Rejected'),
    ]
    
    DOCUMENT_TYPES = [
        ('passport', 'Passport'),
        ('drivers_license', 'Driver\'s License'),
        ('national_id', 'National ID'),
        ('utility_bill', 'Utility Bill'),
        ('bank_statement', 'Bank Statement'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents')
    ipfs_hash = models.CharField(max_length=100)
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    file_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    upload_date = models.DateTimeField(auto_now_add=True)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_documents')
    verification_date = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    blockchain_index = models.IntegerField(null=True, blank=True)  # Index in the blockchain array
    blockchain_tx_hash = models.CharField(max_length=100, blank=True)  # Transaction hash


## 10. Create Sample Django Integration Views

Create a file django-integration/views_example.py:

python
# Example views for Django integration
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .blockchain_utils import BlockchainManager
import ipfshttpclient
import os

# Assuming you have these models
from .models import Document

class DocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Check if file was uploaded
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        document_type = request.data.get('document_type')
        
        if not document_type:
            return Response({'error': 'Document type is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create IPFS client
        try:
            ipfs_client = ipfshttpclient.connect('/dns/ipfs.infura.io/tcp/5001/https')
            
            # Upload to IPFS
            ipfs_result = ipfs_client.add(file.read())
            ipfs_hash = ipfs_result['Hash']
            
            # Save to database
            document = Document.objects.create(
                user=request.user,
                ipfs_hash=ipfs_hash,
                document_type=document_type,
                file_name=file.name,
                status='Pending'
            )
            
            # Upload to blockchain
            blockchain = BlockchainManager()
            receipt = blockchain.upload_document(
                ipfs_hash,
                document_type,
                request.user.profile.wallet_address
            )
            
            # Save blockchain index and transaction hash
            document.blockchain_tx_hash = receipt.transactionHash.hex()
            document.blockchain_index = blockchain.get_document_count(request.user.profile.wallet_address) - 1
            document.save()
            
            return Response({
                'message': 'Document uploaded successfully',
                'document_id': document.id,
                'ipfs_hash': ipfs_hash
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DocumentVerificationView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, document_id):
        # Check if user is an institution
        if not hasattr(request.user, 'profile') or not request.user.profile.is_institution:
            return Response({'error': 'Only institutions can verify documents'}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        try:
            document = Document.objects.get(id=document_id)
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
            
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


## 11. Create .env Files for Both Components

For blockchain development, create .env:


# Blockchain .env file
WEB3_PROVIDER=http://localhost:7545
PRIVATE_KEY=your_private_key_here  # Add your Ethereum private key for testing


For Django integration, create django-integration/.env:


# Django .env file
WEB3_PROVIDER=http://localhost:7545
CONTRACT_ADDRESS=your_deployed_contract_address  # Add after deployment
ETHEREUM_PRIVATE_KEY=your_private_key_here  # Add your Ethereum private key
IPFS_HOST=ipfs.infura.io
IPFS_PORT=5001
IPFS_PROTOCOL=https


## 12. Create Integration Guide for Django Developer

Create a file INTEGRATION_GUIDE.md:

markdown
# Blockchain Integration Guide for Django

This guide explains how to integrate the blockchain component with your Django application.

## Setup Instructions

1. Install required Python packages:

bash
pip install web3 django-rest-framework python-dotenv ipfshttpclient


2. Copy the following files to your Django project:
   - `blockchain_utils.py` - Utility functions for blockchain interaction
   - `IdentityVerification.json` - Contract ABI (from `build/contracts/` after deployment)

3. Set up environment variables in your Django settings or `.env` file:
   
   WEB3_PROVIDER=http://localhost:7545  # Or your Ethereum node URL
   CONTRACT_ADDRESS=0x...  # The deployed contract address
   ETHEREUM_PRIVATE_KEY=0x...  # Private key for transactions
   

4. Add wallet address field to your user model as shown in `models_example.py`

## Using the Blockchain Component

### Document Upload Process

1. User uploads a document via your Django view
2. Store the document in IPFS to get a hash
3. Call `blockchain.upload_document(ipfs_hash, document_type, user_wallet_address)`
4. Store the document metadata in your Django database
5. Save the blockchain document index for future reference

### Document Verification Process

1. Institution reviews a document
2. Update the document status in your database
3. Call `blockchain.verify_document(user_wallet_address, doc_index, status, notes)`
4. The verification is now recorded permanently on the blockchain

### Querying Document Status

To get a document's status from the blockchain:

python
document_details = blockchain.get_document(user_wallet_address, doc_index)


## Important Notes

1. You'll need an Ethereum account with ETH for gas fees
2. Each blockchain transaction requires gas and takes time to complete
3. Always handle blockchain errors gracefully in your views
4. Store the document index after upload for future verification
5. Make sure your contract is deployed before connecting from Django


## 13. Package Everything for Your Teammate

Organize the files and share them with your Django-developer teammate:

bash
# Create a package directory
mkdir ekyc-blockchain-package
cd ekyc-blockchain-package

# Copy relevant files
cp -r ../contracts ../migrations ../test .
cp ../truffle-config.js .
mkdir django-integration
cp ../django-integration/* django-integration/
cp ../INTEGRATION_GUIDE.md .

# Create a README
echo "# eKYC Blockchain Component\n\nSee INTEGRATION_GUIDE.md for instructions on integrating with Django." > README.md

# Create a zip file
zip -r ekyc-blockchain-package.zip .


## 14. Deployment Instructions

Include these steps in your package for your teammate:

markdown
## Deployment Steps

1. Install Truffle and Ganache for testing:
   bash
   npm install -g truffle ganache-cli
   

2. Start Ganache for local testing:
   bash
   ganache-cli
   

3. Deploy the contract:
   bash
   truffle migrate --network development
   

4. Note the contract address from the deployment output and add it to your `.env` file

5. For production deployment, you'll need to:
   - Configure a network for a testnet or mainnet in `truffle-config.js`
   - Get ETH for the deployment account
   - Deploy with `truffle migrate --network ropsten` (or another network)
   - Update the CONTRACT_ADDRESS in the Django environment variables


## 15. Testing the Integrated System

Provide guidance on testing the integrated system:

markdown
## Testing the Integrated System

1. Deploy the smart contract on Ganache
2. Set up the Django project with the blockchain integration files
3. Configure IPFS with Infura or a local IPFS node
4. Test the document upload flow:
   - Upload a document through the Django view
   - Check that it was recorded in the blockchain
5. Test the verification flow:
   - Verify a document as an institution
   - Check that the status was updated on the blockchain


This comprehensive approach separates your blockchain development from the backend but ensures they can be easily integrated when ready. Your teammate can follow the integration guide to incorporate the blockchain functionality into their Django application.
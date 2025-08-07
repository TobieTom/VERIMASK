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
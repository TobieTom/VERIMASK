import logging
from web3 import Web3
import json
import os
from dotenv import load_dotenv
from eth_account.messages import encode_defunct

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load contract ABI
CONTRACT_ABI = [
    {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": False,
    "inputs": [
      {
        "indexed": True,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": False,
        "internalType": "string",
        "name": "documentType",
        "type": "string"
      },
      {
        "indexed": False,
        "internalType": "string",
        "name": "documentHash",
        "type": "string"
      }
    ],
    "name": "DocumentUploaded",
    "type": "event"
  },
  {
    "anonymous": False,
    "inputs": [
      {
        "indexed": True,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": True,
        "internalType": "address",
        "name": "verifier",
        "type": "address"
      },
      {
        "indexed": False,
        "internalType": "uint256",
        "name": "docIndex",
        "type": "uint256"
      },
      {
        "indexed": False,
        "internalType": "string",
        "name": "status",
        "type": "string"
      }
    ],
    "name": "DocumentVerified",
    "type": "event"
  },
  {
    "anonymous": False,
    "inputs": [
      {
        "indexed": True,
        "internalType": "address",
        "name": "verifier",
        "type": "address"
      }
    ],
    "name": "VerifierAdded",
    "type": "event"
  },
  {
    "anonymous": False,
    "inputs": [
      {
        "indexed": True,
        "internalType": "address",
        "name": "verifier",
        "type": "address"
      }
    ],
    "name": "VerifierRemoved",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_verifier",
        "type": "address"
      }
    ],
    "name": "addVerifier",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_user",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_index",
        "type": "uint256"
      }
    ],
    "name": "getDocument",
    "outputs": [
      {
        "internalType": "string",
        "name": "documentHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "documentType",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "status",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "verifier",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "notes",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_user",
        "type": "address"
      }
    ],
    "name": "getDocumentCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_addr",
        "type": "address"
      }
    ],
    "name": "isVerifier",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_verifier",
        "type": "address"
      }
    ],
    "name": "removeVerifier",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_documentHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_documentType",
        "type": "string"
      }
    ],
    "name": "uploadDocument",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_user",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_docIndex",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_status",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_notes",
        "type": "string"
      }
    ],
    "name": "verifyDocument",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "verifiers",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

 # If CONTRACT_ABI is already a list, we don't need to load it from a file
if isinstance(CONTRACT_ABI, list):
    # It's already loaded, do nothing
    pass
else:
    # It's a file path, so load it
    try:
        with open(CONTRACT_ABI, 'r') as f:
            contract_data = json.load(f)
            CONTRACT_ABI = contract_data['abi']
    except Exception as e:
        logger.error(f"Failed to load contract ABI: {str(e)}")
    raise

CONTRACT_ADDRESS = "0x7A950d2311E19e14F4a7A0A980dC1e24eA7bf0E0"  # Your actual contract address
WEB3_PROVIDER = "http://localhost:8545"  # Your actual Ethereum node URL
PRIVATE_KEY = os.getenv('ETHEREUM_PRIVATE_KEY')
GAS_LIMIT = int(os.getenv('GAS_LIMIT', 2000000))
GAS_PRICE = int(os.getenv('GAS_PRICE', 50))  # in gwei

def verify_ethereum_signature(message, signature, wallet_address):
    """
    Verify an Ethereum signature using the proper approach with encode_defunct
    
    Args:
        message (str): The original message that was signed
        signature (str): The signature to verify
        wallet_address (str): The wallet address that supposedly signed the message
        
    Returns:
        bool: True if signature is valid, False otherwise
    """
    web3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER))
    
    # Use encode_defunct to format the message properly
    message_hash = encode_defunct(text=message)
    
    # Recover the address from the signature and message hash
    try:
        recovered_address = web3.eth.account.recover_message(
            message_hash,
            signature=signature
        )
        
        # Compare addresses in lowercase
        return recovered_address.lower() == wallet_address.lower()
    except Exception as e:
        logger.error(f"Signature verification error: {str(e)}")
        return False

def get_web3():
    return Web3(Web3.HTTPProvider(WEB3_PROVIDER))

def get_contract():
    web3 = get_web3()
    return web3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)

def get_account():
    web3 = get_web3()
    account = web3.eth.account.from_key(PRIVATE_KEY)
    return account

def send_transaction(tx_function, *args):
    web3 = get_web3()
    account = get_account()
    
    try:
        tx = tx_function(*args).build_transaction({
            'from': account.address,
            'nonce': web3.eth.get_transaction_count(account.address),
            'gas': GAS_LIMIT,
            'gasPrice': web3.to_wei(GAS_PRICE, 'gwei')
        })
        
        signed_tx = web3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
        tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        return receipt
    except Exception as e:
        logger.error(f"Transaction failed: {str(e)}")
        raise

def upload_document_to_blockchain(user_address, ipfs_hash, document_type):
    """Upload document info to blockchain"""
    contract = get_contract()
    return send_transaction(contract.functions.uploadDocument, ipfs_hash, document_type)

def verify_document_on_blockchain(user_address, doc_index, status, notes):
    """Verify a document on the blockchain"""
    contract = get_contract()
    return send_transaction(contract.functions.verifyDocument, user_address, doc_index, status, notes)

class BlockchainManager:
    def __init__(self):
        self.web3_provider = os.getenv('WEB3_PROVIDER', 'http://localhost:8545')
        self.contract_address = os.getenv('CONTRACT_ADDRESS')
        self.private_key = os.getenv('ETHEREUM_PRIVATE_KEY')
        self.gas_limit = int(os.getenv('GAS_LIMIT', 2000000))
        self.gas_price = int(os.getenv('GAS_PRICE', 50))  # in gwei
        
        # Load contract ABI
        contract_json_path = os.getenv('CONTRACT_ABI', os.path.join(os.path.dirname(__file__), 'IdentityVerification.json'))
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
    
    def send_transaction(self, tx_function, *args):
        try:
            tx = tx_function(*args).build_transaction({
                'from': self.account.address,
                'nonce': self.web3.eth.get_transaction_count(self.account.address),
                'gas': self.gas_limit,
                'gasPrice': self.web3.to_wei(self.gas_price, 'gwei')
            })
            
            signed_tx = self.web3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.web3.eth.send_raw_transaction(signed_tx.rawTransaction)
            return self.web3.eth.wait_for_transaction_receipt(tx_hash)
        except Exception as e:
            logger.error(f"Transaction failed: {str(e)}")
            raise
    
    def upload_document(self, document_hash, document_type, user_address=None):
        address_to_use = user_address if user_address else self.account.address
        return self.send_transaction(self.contract.functions.uploadDocument, document_hash, document_type)
    
    def verify_document(self, user_address, doc_index, status, notes):
        return self.send_transaction(self.contract.functions.verifyDocument, user_address, doc_index, status, notes)
    
    def get_document_count(self, user_address):
        """Get the number of documents for a user"""
        return self.contract.functions.getDocumentCount(user_address).call()
    
    def get_document(self, user_address, doc_index):
        """Get a document's details"""
        return self.contract.functions.getDocument(user_address, doc_index).call()
    
    def is_verifier(self, address):
        """Check if an address is a verifier"""
        return self.contract.functions.isVerifier(address).call()
// src/services/BlockchainIntegration.js
import Web3 from 'web3';

// Contract address from .env
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x7A950d2311E19e14F4a7A0A980dC1e24eA7bf0E0";

// Full ABI inline
const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "documentType",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "documentHash",
        "type": "string"
      }
    ],
    "name": "DocumentUploaded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "verifier",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "docIndex",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "status",
        "type": "string"
      }
    ],
    "name": "DocumentVerified",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "verifier",
        "type": "address"
      }
    ],
    "name": "VerifierAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
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

class BlockchainService {
  constructor() {
    this.web3 = null;
    this.contract = null;
    this.account = null;
    this.initialized = false;
    this.isConnecting = false;
    this.contractAddress = CONTRACT_ADDRESS;
  }

  /**
   * Initialize blockchain connection
   */
  async init() {
    if (this.initialized) return true;
    if (this.isConnecting) return false;

    this.isConnecting = true;
    
    try {
      // Check if Web3 is injected by MetaMask
      if (window.ethereum) {
        this.web3 = new Web3(window.ethereum);
      } else if (window.web3) {
        // Legacy dapp browsers
        this.web3 = new Web3(window.web3.currentProvider);
      } else {
        // Fallback to local provider (development only)
        this.web3 = new Web3("http://localhost:8545");
        console.warn("No wallet provider detected. Using local fallback.");
      }

      // Initialize contract
      this.contract = new this.web3.eth.Contract(CONTRACT_ABI, this.contractAddress);
      console.log("Contract initialized at address:", this.contractAddress);
      
      this.initialized = true;
      this.isConnecting = false;
      
      // Try to get current wallet address if already connected
      try {
        const accounts = await this.web3.eth.getAccounts();
        if (accounts && accounts.length > 0) {
          this.account = accounts[0];
          console.log("Account already connected:", this.account);
        }
      } catch (accountError) {
        console.warn("Could not get account:", accountError);
      }
      
      return true;
    } catch (error) {
      console.error("Blockchain initialization error:", error);
      this.initialized = false;
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Connect wallet
   */
  async connectWallet() {
    try {
      await this.init();
      
      if (!window.ethereum) {
        throw new Error("MetaMask not installed. Please install to use this feature.");
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        this.account = accounts[0];
        console.log("Wallet connected:", this.account);
        return this.account;
      } else {
        throw new Error("No accounts returned from wallet");
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      throw error;
    }
  }

  /**
   * Upload document to blockchain
   */
 /**
 * Upload document to blockchain
 */
/**
 * Upload document to blockchain
 */
async uploadDocument(ipfsHash, documentType) {
  try {
    await this.init();
    
    if (!this.account) {
      await this.connectWallet();
    }
    
    console.log("Uploading document to blockchain:");
    console.log("IPFS Hash:", ipfsHash);
    console.log("Document Type:", documentType);
    
    // Validate inputs before proceeding
    if (!ipfsHash || typeof ipfsHash !== 'string') {
      throw new Error(`Invalid IPFS hash: ${ipfsHash}. Must be a non-empty string.`);
    }
    
    if (!documentType || typeof documentType !== 'string') {
      throw new Error(`Invalid document type: ${documentType}. Must be a non-empty string.`);
    }
    
    // Create transaction data
    const data = this.contract.methods.uploadDocument(ipfsHash, documentType).encodeABI();
    
    // Get gas price and estimated gas for transaction
    const gasPrice = await this.web3.eth.getGasPrice();
    const gasEstimate = await this.contract.methods.uploadDocument(ipfsHash, documentType)
      .estimateGas({ from: this.account })
      .catch(() => 200000); // Default gas limit if estimation fails
    
    // Convert BigInt values to strings to avoid mixing types
    const gasPriceStr = typeof gasPrice === 'bigint' ? gasPrice.toString() : String(gasPrice);
    
    // Create transaction parameters
    const txParams = {
      from: this.account,
      to: this.contractAddress,
      data: data,
      gas: String(Math.round(Number(gasEstimate) * 1.2)), // Convert final gas value to string
      gasPrice: gasPriceStr
    };
    
    console.log("Transaction parameters:", JSON.stringify(txParams, null, 2));
    
    // Send transaction through MetaMask
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [txParams],
    });
    
    console.log("Transaction sent:", txHash);
    
    // Create transaction receipt object
    const receipt = {
      transactionHash: txHash,
      status: 'pending',
      from: this.account,
      to: this.contractAddress
    };
    
    return receipt;
  } catch (error) {
    console.error("Document upload error:", error);
    throw error;
  }
}

  /**
   * Verify document on blockchain with MetaMask
   */
 /**
 * Verify document on blockchain with MetaMask
 */
/**
 * Verify document on blockchain with MetaMask
 */
// Update the verifyDocument method in BlockchainIntegration.js

async verifyDocument(userAddress, documentIndex, status, notes) {
  try {
    await this.init();
    
    // Connect wallet if not already connected
    if (!this.account) {
      await this.connectWallet();
    }
    
    console.log("Verifying document on blockchain");
    console.log("User Address:", userAddress);
    console.log("Document Index:", documentIndex);
    console.log("Status:", status);
    
    // Validate Ethereum address format
    if (!userAddress || typeof userAddress !== 'string' || !userAddress.startsWith('0x')) {
      // Use a default address if the provided one is invalid
      console.warn("Invalid Ethereum address provided, using default address");
      userAddress = "0x9e1B746457a30C6826f778679Bc2d6AbB9db6DE7";
    }
    
    // Validate document index
    const docIndex = parseInt(documentIndex, 10);
    if (isNaN(docIndex)) {
      console.warn("Invalid document index, using 0");
      documentIndex = 0;
    }
    
    // Use the MetaMask provider directly
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    // Create the transaction data
    const txData = this.contract.methods.verifyDocument(
      userAddress, 
      documentIndex,
      status, 
      notes || ''
    ).encodeABI();
    
    // Get the current gas price
    const gasPrice = await this.web3.eth.getGasPrice();
    
    // Request transaction from MetaMask
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: this.account,
        to: this.contractAddress,
        data: txData,
        gas: '0x186A0', // 100,000 gas in hex
        gasPrice: this.web3.utils.toHex(gasPrice)
      }]
    });
    
    console.log("Document verification transaction sent:", txHash);
    return txHash;
  } catch (error) {
    console.error("Document verification error:", error);
    throw error;
  }
}

  /**
   * Get document from blockchain
   */
  async getDocument(userAddress, documentIndex) {
    try {
      await this.init();
      
      console.log("Getting document from blockchain");
      console.log("User Address:", userAddress);
      console.log("Document Index:", documentIndex);
      
      // Validate document index
      const docIndex = parseInt(documentIndex, 10);
      if (isNaN(docIndex)) {
        throw new Error(`Invalid document index: ${documentIndex}`);
      }
      
      // Call view function - doesn't need gas
      const document = await this.contract.methods.getDocument(userAddress, docIndex).call();
      
      console.log("Document retrieved:", document);
      return document;
    } catch (error) {
      console.error("Get document error:", error);
      
      // If the contract call fails, return a mock document
      if (process.env.NODE_ENV === 'development') {
        console.log("Returning mock document for development");
        return {
          documentHash: "QmXb5M6qCMKRRKqjARKb5XBgtaDfbvCt7uCYgECgVJDXXX",
          documentType: "passport",
          status: "Pending",
          timestamp: Math.floor(Date.now() / 1000),
          verifier: "0x0000000000000000000000000000000000000000",
          notes: ""
        };
      }
      
      throw error;
    }
  }

  /**
   * Get document count for a user
   */
  async getDocumentCount(userAddress) {
    try {
      await this.init();
      
      // Call view function
      const count = await this.contract.methods.getDocumentCount(userAddress).call();
      console.log("Document count:", count);
      return count;
    } catch (error) {
      console.error("Get document count error:", error);
      
      // Return mock count in development
      if (process.env.NODE_ENV === 'development') {
        return 1;
      }
      
      throw error;
    }
  }

  /**
   * Check if an address is a verifier
   */
  async isVerifier(address) {
    try {
      await this.init();
      
      // Call view function
      const isVerifier = await this.contract.methods.isVerifier(address).call();
      console.log("Is verifier:", isVerifier);
      return isVerifier;
    } catch (error) {
      console.error("Is verifier check error:", error);
      
      // In development, allow all verifications 
      if (process.env.NODE_ENV === 'development') {
        return true;
      }
      
      throw error;
    }
  }

  /**
   * Get network information
   */
  async getNetworkInfo() {
    try {
      await this.init();
      
      // Get network ID
      const networkId = await this.web3.eth.net.getId();
      
      // Get latest block number
      const latestBlock = await this.web3.eth.getBlockNumber();
      
      // Get gas price
      const gasPrice = await this.web3.eth.getGasPrice();
      const gasPriceGwei = this.web3.utils.fromWei(gasPrice, 'gwei');
      
      // Get peer count
      const peerCount = await this.web3.eth.net.getPeerCount();
      
      const info = {
        networkId,
        gasPrice: gasPriceGwei,
        latestBlock,
        peerCount,
        connected: true
      };
      
      return info;
    } catch (error) {
      console.error("Get network info error:", error);
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Get the user's blockchain wallet address
   */
  async getWalletAddress() {
    if (this.account) return this.account;
    
    return await this.connectWallet();
  }
}

// Create a singleton instance
const blockchainService = new BlockchainService();
export default blockchainService;
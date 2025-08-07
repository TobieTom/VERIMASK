// src/utils/ContractChecker.js
import Web3 from 'web3';

// Contract address from your config
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x7A950d2311E19e14F4a7A0A980dC1e24eA7bf0E0";

// Minimal ABI for checking contract existence
const MINIMAL_ABI = [
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
  }
];

/**
 * Utility to check if the contract is deployed and accessible
 * with improved error handling and fallback mechanisms
 */
const checkContract = async () => {
  try {
    console.log("Checking contract deployment at address:", CONTRACT_ADDRESS);
    
    // Check if MetaMask is installed
    if (!window.ethereum) {
      return {
        success: false,
        error: "MetaMask not installed. Please install MetaMask to use blockchain features."
      };
    }
    
    // Create Web3 instance
    let web3;
    try {
      web3 = new Web3(window.ethereum);
    } catch (webError) {
      console.error("Error creating Web3 instance:", webError);
      // Use HTTP fallback if window.ethereum fails
      web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
    }
    
    // Get the network ID with retry logic
    let networkId;
    let attempts = 0;
    while (attempts < 3) {
      try {
        networkId = await web3.eth.net.getId();
        console.log("Connected to network ID:", networkId);
        break;
      } catch (netError) {
        console.warn(`Network ID retrieval failed (attempt ${attempts + 1}):`, netError);
        attempts++;
        if (attempts < 3) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // Use a fallback ID
          networkId = 1337; // Default to local network
          console.warn("Using fallback network ID:", networkId);
        }
      }
    }
    
    // Check if there's code at the address with retry
    let code = '0x';
    attempts = 0;
    while (attempts < 3) {
      try {
        code = await web3.eth.getCode(CONTRACT_ADDRESS);
        break;
      } catch (codeError) {
        console.warn(`GetCode failed (attempt ${attempts + 1}):`, codeError);
        attempts++;
        if (attempts < 3) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // Return failure but don't throw
          return {
            success: false,
            error: `Failed to check contract code after ${attempts} attempts`
          };
        }
      }
    }
    
    if (code === '0x' || code === '0x0') {
      return {
        success: false,
        error: `No contract found at address ${CONTRACT_ADDRESS} on network ${networkId}`
      };
    }
    
    console.log("Contract code found at address. Checking interface...");
    
    // Try to create a contract instance with minimal ABI
    try {
      const contract = new web3.eth.Contract(MINIMAL_ABI, CONTRACT_ADDRESS);
      
      // Try to call a simple view function (owner) with timeout
      let owner;
      const ownerPromise = contract.methods.owner().call();
      
      // Add a timeout to the owner call
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Contract call timed out")), 10000);
      });
      
      // Race the promises
      owner = await Promise.race([ownerPromise, timeoutPromise]);
      
      return {
        success: true,
        details: {
          address: CONTRACT_ADDRESS,
          networkId,
          owner,
          code: code.substring(0, 10) + '...' // Just store a snippet of the code
        }
      };
    } catch (methodError) {
      console.error("Error calling contract method:", methodError);
      
      // Try an alternative method if owner() fails
      try {
        const alternativeCheckResult = await checkContractAlternative(web3, CONTRACT_ADDRESS);
        return alternativeCheckResult;
      } catch (altError) {
        console.error("Alternative contract check also failed:", altError);
        return {
          success: false,
          error: "Contract exists but couldn't verify its interface. It may still be usable."
        };
      }
    }
  } catch (error) {
    console.error("Contract check failed:", error);
    return {
      success: false,
      error: error.message,
      suggestion: "Please check your network connection and wallet configuration."
    };
  }
};

/**
 * Alternative check method that doesn't require method calls,
 * just checks if the contract exists
 */
const checkContractAlternative = async (web3, contractAddress) => {
  // Check code length
  const code = await web3.eth.getCode(contractAddress);
  
  if (code && code !== '0x' && code !== '0x0' && code.length > 10) {
    // If code exists and has reasonable length, assume success
    return {
      success: true,
      details: {
        address: contractAddress,
        codeLength: code.length,
        partialVerification: true,
        note: "Contract existence verified by code length, but function interface couldn't be verified"
      }
    };
  }
  
  return {
    success: false,
    error: "Contract does not have valid code at the specified address"
  };
};

export default { checkContract };
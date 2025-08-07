// src/contexts/WalletContext.js (fixed implementation)
import React, { createContext, useState, useEffect, useContext } from 'react';
import blockchainService from '../services/BlockchainIntegration';
import { toast } from 'react-hot-toast';

// Create context
export const WalletContext = createContext();

// Context provider component
export const WalletProvider = ({ children }) => {
  const [wallet, setWallet] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerifier, setIsVerifier] = useState(false);
  const [networkId, setNetworkId] = useState(null);
  
  // Check local storage for previously connected wallet
  useEffect(() => {
    const storedWallet = localStorage.getItem('connectedWallet');
    if (storedWallet) {
      setWallet(storedWallet);
      
      // Check verifier status in the background
      checkVerifierStatus(storedWallet).catch(err => {
        console.warn("Background verifier status check failed:", err);
      });
    }
    
    // Auto-connect on mount if possible
    const autoConnect = async () => {
      if (window.ethereum && window.ethereum.selectedAddress) {
        try {
          await connectWallet();
        } catch (error) {
          console.log("Auto-connect failed:", error);
        }
      }
    };
    
    if (!storedWallet) {
      autoConnect();
    }
    
    // Listen for account changes
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          const newAddress = accounts[0];
          setWallet(newAddress);
          localStorage.setItem('connectedWallet', newAddress);
          
          // Check verifier status for new account
          checkVerifierStatus(newAddress);
        } else {
          setWallet(null);
          setIsVerifier(false);
          localStorage.removeItem('connectedWallet');
        }
      };
      
      const handleChainChanged = () => {
        // Refresh the page on chain change as recommended by MetaMask
        window.location.reload();
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        // Clean up listeners when component unmounts
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);
  
  // Connect wallet function with improved error handling
  const connectWallet = async () => {
    setIsConnecting(true);
    
    try {
      if (!window.ethereum) {
        throw new Error("No wallet detected. Please install MetaMask or another Ethereum wallet.");
      }
      
      // Initialize blockchain service
      await blockchainService.init().catch(error => {
        console.warn("Blockchain initialization warning (continuing anyway):", error);
      });
      
      // Try to get address with multiple attempts
      let address = null;
      let attempts = 0;
      
      while (!address && attempts < 3) {
        try {
          // Connect wallet
          address = await blockchainService.connectWallet();
          break;
        } catch (requestError) {
          console.warn(`Account request attempt ${attempts + 1} failed:`, requestError);
          attempts++;
          
          // Check for user rejection (don't retry if user rejected)
          if (requestError.code === 4001) { // User rejected request
            throw new Error("Connection rejected. Please approve the connection request in your wallet.");
          }
          
          if (attempts < 3) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            throw new Error("Failed to connect wallet after multiple attempts: " + requestError.message);
          }
        }
      }
      
      // Set wallet address
      setWallet(address);
      localStorage.setItem('connectedWallet', address);
      
      // Get network info
      try {
        const netInfo = await blockchainService.getNetworkInfo();
        setNetworkId(netInfo.networkId);
      } catch (netError) {
        console.warn("Error getting network info:", netError);
      }
      
      // Check if verifier
      await checkVerifierStatus(address);
      
      return address;
    } catch (error) {
      console.error("Wallet connection error:", error);
      
      // Format user-friendly error message
      let errorMessage = "Failed to connect wallet: ";
      
      if (error.code === 4001) {
        errorMessage = "Connection rejected by user. Please approve the connection request in your wallet.";
      } else if (error.code === -32002) {
        errorMessage = "Connection request already pending. Please check your wallet.";
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += "Unknown error";
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Check if wallet is a verifier with retry
  const checkVerifierStatus = async (address) => {
    if (!address) {
      setIsVerifier(false);
      return false;
    }
    
    let attempts = 0;
    let result = false;
    
    while (attempts < 3) {
      try {
        // Make sure blockchain service is initialized
        if (!blockchainService.initialized) {
          await blockchainService.init();
        }
        
        result = await blockchainService.isVerifier(address);
        setIsVerifier(result);
        return result;
      } catch (error) {
        console.warn(`Verifier check attempt ${attempts + 1} failed:`, error);
        attempts++;
        
        if (attempts < 3) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        } else {
          console.error("All verifier check attempts failed");
          setIsVerifier(false);
          return false;
        }
      }
    }
    
    return false;
  };
  
  // Disconnect wallet (limited by MetaMask capabilities)
  const disconnectWallet = () => {
    setWallet(null);
    setIsVerifier(false);
    localStorage.removeItem('connectedWallet');
    // Note: MetaMask doesn't support programmatic disconnection,
    // this just clears the state in our app
  };
  
  // Retry verifier status check
  const retryVerifierCheck = async () => {
    if (!wallet) {
      toast.error("No wallet connected. Please connect your wallet first.");
      return false;
    }
    
    toast.promise(
      checkVerifierStatus(wallet), 
      {
        loading: 'Checking verifier status...',
        success: result => result 
          ? "Verifier status confirmed!" 
          : "Your account does not have verifier permissions",
        error: "Failed to check verifier status. Please try again."
      }
    );
  };
  
  return (
    <WalletContext.Provider 
      value={{
        wallet,
        isConnecting,
        connectWallet,
        disconnectWallet,
        isVerifier,
        retryVerifierCheck,
        checkVerifierStatus,
        networkId,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// Custom hook for using the wallet context
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
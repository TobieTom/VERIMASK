// src/components/auth/WalletConnect.jsx
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

const WalletConnect = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        const address = accounts[0];
        setWalletAddress(address);
        setIsConnected(true);
        toast.success('Wallet connected successfully!');
      } catch (error) {
        toast.error('Failed to connect wallet. Please try again.');
      }
    } else {
      toast.error('Please install MetaMask to connect your wallet.');
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Wallet Connection
      </label>
      
      {!isConnected ? (
        <button
          type="button"
          onClick={connectWallet}
          className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          Connect MetaMask
        </button>
      ) : (
        <div className="bg-gray-50 rounded-md p-3">
          <p className="text-sm text-gray-700">Connected Wallet:</p>
          <p className="text-sm font-mono text-gray-500 truncate">
            {walletAddress}
          </p>
        </div>
      )}
    </div>
  );
};

export default WalletConnect;
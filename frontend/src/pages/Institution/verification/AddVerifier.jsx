// src/pages/admin/AddVerifier.jsx
import React, { useState } from 'react';
import { Shield, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import blockchainService from '../../../services/BlockchainIntegration';

const AddVerifier = () => {
  const [verifierAddress, setVerifierAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [currentAddress, setCurrentAddress] = useState('');

  // Connect wallet
  const connectWallet = async () => {
    try {
      setLoading(true);
      const account = await blockchainService.connectWallet();
      setCurrentAddress(account);
      setWalletConnected(true);
      setLoading(false);
    } catch (error) {
      console.error("Wallet connection error:", error);
      setError(error.message);
      setLoading(false);
    }
  };

  // Check if the connected wallet is the contract owner
  // Check if the connected wallet is the contract owner
  const checkOwnership = async () => {
    try {
      if (!walletConnected) {
        await connectWallet();
      }
      
      // Make sure blockchain service is initialized
      await blockchainService.init();
      
      // Get the owner address
      const owner = await blockchainService.contract.methods.owner().call();
      console.log("Contract owner:", owner);
      console.log("Current address:", currentAddress);
      
      // Case-insensitive comparison of addresses
      const isOwner = owner.toLowerCase() === currentAddress.toLowerCase();
      console.log("Is current wallet the owner?", isOwner);
      
      return isOwner;
    } catch (error) {
      console.error("Error checking ownership:", error);
      toast.error(`Error checking contract ownership: ${error.message}`);
      return false;
    }
  };

  // Add verifier function
  const handleAddVerifier = async (e) => {
    e.preventDefault();
    
    if (!verifierAddress || !verifierAddress.startsWith('0x') || verifierAddress.length !== 42) {
      toast.error('Please enter a valid Ethereum address');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Check if the current user is the contract owner
      const isOwner = await checkOwnership();
      if (!isOwner) {
        throw new Error('Only the contract owner can add verifiers');
      }
      
      // Get the current gas price for legacy transaction format
      const gasPrice = await blockchainService.web3.eth.getGasPrice();
      console.log("Using gas price:", gasPrice);
      
      // Add verifier with legacy transaction format to avoid EIP-1559 errors
      await blockchainService.contract.methods.addVerifier(verifierAddress)
        .send({ 
          from: currentAddress,
          gasPrice: gasPrice,     // Use current network gas price
          gas: 200000             // Set fixed gas limit
        });
      
      // Check if the address is now a verifier
      const isVerifier = await blockchainService.isVerifier(verifierAddress);
      
      if (isVerifier) {
        setSuccess(true);
        toast.success('Verifier added successfully');
      } else {
        throw new Error('Transaction completed but verifier status not confirmed');
      }
    } catch (error) {
      console.error("Add verifier error:", error);
      setError(error.message);
      toast.error(`Failed to add verifier: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
        <Shield className="h-6 w-6 mr-2 text-blue-500" />
        Add Verifier
      </h1>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            Use this tool to add an institution wallet address as a verifier. Only the contract owner can add verifiers.
          </p>
          
          {!walletConnected ? (
            <div className="mb-6">
              <button
                onClick={connectWallet}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
              >
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-sm text-gray-600">Connected wallet:</p>
              <p className="text-sm font-mono text-gray-900 truncate">{currentAddress}</p>
            </div>
          )}
          
          <form onSubmit={handleAddVerifier}>
            <div className="mb-6">
              <label htmlFor="verifierAddress" className="block text-sm font-medium text-gray-700 mb-1">
                Institution Wallet Address
              </label>
              <input
                type="text"
                id="verifierAddress"
                placeholder="0x..."
                value={verifierAddress}
                onChange={(e) => setVerifierAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loading || !walletConnected}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !walletConnected}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:bg-blue-300"
            >
              {loading ? 'Processing...' : 'Add as Verifier'}
            </button>
          </form>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 rounded-md">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
          
          {success && (
            <div className="mt-4 p-3 bg-green-50 rounded-md">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <p className="text-sm text-green-700">
                  Address <span className="font-mono">{verifierAddress.substring(0, 8)}...{verifierAddress.substring(verifierAddress.length - 6)}</span> has been added as a verifier.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
        <h2 className="text-lg font-medium text-yellow-800 mb-2">Instructions</h2>
        <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-2">
          <li>Connect your wallet (must be the contract owner account)</li>
          <li>Enter the Ethereum address of the institution you want to add as a verifier</li>
          <li>Submit the transaction and approve it in your wallet</li>
          <li>Once confirmed, the institution wallet will have verifier permissions</li>
        </ol>
      </div>
    </div>
  );
};

export default AddVerifier;
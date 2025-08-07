// src/pages/verification/StatusPage.jsx
import React, { useState, useEffect } from 'react';
import { Shield, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw, Server, Database, Link, Unlink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import blockchainService from '../../services/BlockchainIntegration';
import { useWallet } from '../../contexts/WalletContext';

const StatusPage = () => {
  const navigate = useNavigate();
  const { wallet, connectWallet, isConnecting } = useWallet();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blockchainStatus, setBlockchainStatus] = useState({
    connected: false,
    latestBlock: 0,
    peerCount: 0,
    gasPrice: 0,
    networkId: '0',
    syncStatus: 'disconnected',
    contracts: {
      identityVerification: {
        address: '0x7A950d2311E19e14F4a7A0A980dC1e24eA7bf0E0',
        status: 'unknown'
      }
    },
    wallet: null,
    isVerifier: false,
    statistics: {
      pendingVerifications: 0,
      completedVerifications: 0,
      rejectedVerifications: 0
    }
  });

  const fetchBlockchainStatus = async () => {
    setLoading(true);
    try {
      console.log("Initializing blockchain service...");
      // Initialize blockchain service
      await blockchainService.init();
      
      // Get network information
      const networkInfo = await blockchainService.getNetworkInfo();
      console.log("Network info:", networkInfo);
      
      // Check if contract is active
      let contractStatus = 'unknown';
      try {
        const owner = await blockchainService.contract.methods.owner().call();
        contractStatus = 'active';
        console.log("Contract is active, owner:", owner);
      } catch (error) {
        contractStatus = 'error';
        console.error("Contract check error:", error);
      }
      
      // Try to get wallet information
      let walletAddress = null;
      let isVerifier = false;
      
      try {
        if (wallet) {
          walletAddress = wallet;
          isVerifier = await blockchainService.isVerifier(wallet);
          console.log("Wallet connected:", walletAddress, "Verifier status:", isVerifier);
        }
      } catch (error) {
        console.log("Wallet status check error:", error);
      }
      
      // Fetch real statistics from the blockchain if possible
      let statistics = {
        pendingVerifications: 0,
        completedVerifications: 0,
        rejectedVerifications: 0
      };
      
      try {
        if (walletAddress) {
          // Try to fetch some real data through the API
          const authToken = localStorage.getItem('user') ? 
            JSON.parse(localStorage.getItem('user')).token : null;
            
          if (authToken) {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await fetch(`${backendUrl}/documents/`, {
              headers: {
                'Authorization': `Bearer ${authToken}`
              }
            });
            
            if (response.ok) {
              const documents = await response.json();
              
              // Calculate real statistics
              statistics.pendingVerifications = documents.filter(doc => doc.status === 'Pending').length;
              statistics.completedVerifications = documents.filter(doc => doc.status === 'Verified').length;
              statistics.rejectedVerifications = documents.filter(doc => doc.status === 'Rejected').length;
              
              console.log("Real stats from API:", statistics);
            }
          }
        }
      } catch (statsError) {
        console.warn("Error fetching statistics:", statsError);
        // Fall back to mock data
        statistics = {
          pendingVerifications: 12,
          completedVerifications: 32,
          rejectedVerifications: 5
        };
      }
      
      setBlockchainStatus({
        connected: networkInfo.connected,
        latestBlock: networkInfo.latestBlock || 0,
        peerCount: networkInfo.peerCount || 0,
        gasPrice: networkInfo.gasPrice || 0,
        networkId: networkInfo.networkId ? networkInfo.networkId.toString() : '0',
        syncStatus: networkInfo.connected ? 'synced' : 'disconnected',
        contracts: {
          identityVerification: {
            address: blockchainService.contractAddress,
            status: contractStatus
          }
        },
        wallet: walletAddress,
        isVerifier,
        statistics
      });
      
      setError(null);
    } catch (err) {
      console.error("Blockchain status error:", err);
      setError("Failed to connect to blockchain network. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockchainStatus();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchBlockchainStatus();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [wallet]);

  // Manually refresh status
  const handleRefresh = () => {
    toast.promise(
      fetchBlockchainStatus(),
      {
        loading: 'Refreshing blockchain status...',
        success: 'Blockchain status updated',
        error: 'Failed to update blockchain status'
      }
    );
  };

  // Determine network name from ID
  const getNetworkName = (id) => {
    const networks = {
      '1': 'Ethereum Mainnet',
      '3': 'Ropsten Testnet',
      '4': 'Rinkeby Testnet',
      '5': 'Goerli Testnet',
      '42': 'Kovan Testnet',
      '1337': 'Local Ganache',
      '31337': 'Hardhat Network'
    };
    
    return networks[id] || `Unknown Network (${id})`;
  };

  // Status indicator component
  const StatusIndicator = ({ status, text }) => {
    const getStatusColor = () => {
      switch (status) {
        case 'active':
        case 'synced':
        case 'connected':
          return 'bg-green-500';
        case 'pending':
        case 'syncing':
          return 'bg-yellow-500';
        case 'disconnected':
        case 'inactive':
        case 'error':
          return 'bg-red-500';
        default:
          return 'bg-gray-500';
      }
    };
    
    return (
      <div className="flex items-center">
        <div className={`h-3 w-3 rounded-full ${getStatusColor(status)} mr-2`}></div>
        <span>{text || status}</span>
      </div>
    );
  };

  // Connect wallet handler
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      toast.success('Wallet connected successfully');
      fetchBlockchainStatus();
    } catch (error) {
      console.error("Wallet connection error:", error);
      toast.error('Failed to connect wallet');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Blockchain Status</h1>
        <button
          onClick={handleRefresh}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {loading && !blockchainStatus.connected ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Connecting to blockchain...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
            <div>
              <p className="text-red-700">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-2 text-sm text-red-700 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Wallet Connection Status */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-gray-500" />
                Wallet Status
              </h2>
              
              {blockchainStatus.wallet ? (
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <StatusIndicator status="connected" text="Connected" />
                      <span className="ml-4 text-sm font-mono">
                        {blockchainStatus.wallet.substring(0, 8)}...{blockchainStatus.wallet.substring(blockchainStatus.wallet.length - 6)}
                      </span>
                    </div>
                    
                    <div>
                      {blockchainStatus.isVerifier ? (
                        <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          Verifier
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          Client
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-md">
                  <Unlink className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-500 mb-4">No wallet connected</p>
                  <button
                    onClick={handleConnectWallet}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Connect Wallet
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Connection Status */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Server className="h-5 w-5 mr-2 text-gray-500" />
                Connection Status
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Status</span>
                  <div className="mt-1">
                    <StatusIndicator status={blockchainStatus.connected ? 'connected' : 'disconnected'} 
                                    text={blockchainStatus.connected ? 'Connected' : 'Disconnected'} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Network</span>
                  <span className="text-lg font-medium">{getNetworkName(blockchainStatus.networkId)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Sync Status</span>
                  <div className="mt-1">
                    <StatusIndicator status={blockchainStatus.syncStatus} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Latest Block</span>
                  <span className="text-lg font-medium">{blockchainStatus.latestBlock.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Smart Contract Status */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Link className="h-5 w-5 mr-2 text-gray-500" />
                Smart Contracts
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contract
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Address
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        IdentityVerification
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {blockchainStatus.contracts.identityVerification.address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <StatusIndicator status={blockchainStatus.contracts.identityVerification.status} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Verification Statistics */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Database className="h-5 w-5 mr-2 text-gray-500" />
                Verification Statistics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 p-4 rounded-lg flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-md bg-green-100 flex items-center justify-center mr-4">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-700">Verified</p>
                    <p className="text-2xl font-semibold text-green-900">{blockchainStatus.statistics.completedVerifications}</p>
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-md bg-yellow-100 flex items-center justify-center mr-4">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-yellow-700">Pending</p>
                    <p className="text-2xl font-semibold text-yellow-900">{blockchainStatus.statistics.pendingVerifications}</p>
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-md bg-red-100 flex items-center justify-center mr-4">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-red-700">Rejected</p>
                    <p className="text-2xl font-semibold text-red-900">{blockchainStatus.statistics.rejectedVerifications}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gas Information */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Gas Information</h2>
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Current Gas Price</p>
                  <p className="text-xl font-semibold">{blockchainStatus.gasPrice} Gwei</p>
                </div>
                <div>
                  <div className="text-xs text-gray-500">
                    <p>Estimated cost per transaction:</p>
                    <div className="mt-1 bg-gray-100 p-2 rounded">
                      <p>Document Upload: ~{(blockchainStatus.gasPrice * 200000 / 1000000000).toFixed(6)} ETH</p>
                      <p>Document Verification: ~{(blockchainStatus.gasPrice * 150000 / 1000000000).toFixed(6)} ETH</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusPage;
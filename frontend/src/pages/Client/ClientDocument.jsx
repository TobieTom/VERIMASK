// src/pages/Client/ClientDocument.jsx
import React, { useState, useEffect } from 'react';
import { Upload, FileText, Eye, Clock, CheckCircle, XCircle, AlertTriangle, ExternalLink, Wallet, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import UploadModal from '../../components/common/UploadModal';
import ipfsService from '../../services/IPFSService';
import blockchainService from '../../services/BlockchainIntegration';
import AuthService from '../../services/AuthService';
import { useWallet } from '../../contexts/WalletContext';

const ClientDocument = () => {
  const navigate = useNavigate();
  const { wallet, connectWallet, isConnecting } = useWallet();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');

  // Load documents when component mounts
  useEffect(() => {
    const initializeAndLoadDocuments = async () => {
      setLoading(true);
      
      try {
        // First check if wallet is connected
        if (!wallet) {
          try {
            await connectWallet();
          } catch (walletError) {
            console.warn("Wallet connection error:", walletError);
            // Continue anyway to try to load documents from backend
          }
        }
        
        // Load documents from backend and blockchain
        await loadDocuments();
      } catch (err) {
        console.error("Document loading error:", err);
        setError("Failed to load documents. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    initializeAndLoadDocuments();
  }, [wallet]);

  // Load documents from backend and blockchain
  const loadDocuments = async () => {
    try {
      // First try to load from backend API
      const token = AuthService.getToken();
      
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }
      
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await axios.get(`${backendUrl}/documents/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data) {
        // Transform backend data to match component structure
        const transformedDocuments = response.data.map(doc => ({
          id: doc.id,
          name: doc.file_name || `Document_${doc.id}`,
          type: doc.document_type,
          status: doc.status,
          uploadDate: new Date(doc.upload_date).toLocaleDateString(),
          fileSize: doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : 'Unknown',
          documentHash: doc.ipfs_hash,
          notes: doc.notes,
          verifier: doc.verified_by?.username || null,
          verifierAddress: doc.verifier,
          verificationDate: doc.verification_date ? new Date(doc.verification_date).toLocaleDateString() : null
        }));
        
        setDocuments(transformedDocuments);
      } else {
        throw new Error("Invalid response format");
      }
      
      // Also try to load from blockchain if wallet is connected
      if (wallet) {
        try {
          await syncBlockchainData(wallet);
        } catch (blockchainError) {
          console.warn("Blockchain sync error:", blockchainError);
          // Continue with data from backend
        }
      }
    } catch (err) {
      console.error("Error loading documents:", err);
      
      // If backend request fails and wallet is connected, try blockchain only
      if (wallet) {
        try {
          await loadBlockchainDocuments(wallet);
        } catch (blockchainError) {
          console.error("Blockchain loading error:", blockchainError);
          
          // If in development, use mock data
          if (process.env.NODE_ENV === 'development') {
            console.log("Using mock data in development mode");
            const mockDocuments = [
              {
                id: 0,
                name: 'Passport.pdf',
                type: 'passport',
                status: 'Verified',
                uploadDate: '2025-03-01',
                fileSize: '1.23 MB',
                documentHash: 'QmXb5M6qCMKRRKqjARKb5XBgtaDfbvCt7uCYgECgVJDXXX',
                notes: 'All requirements met',
                verifier: '0x9876543210987654321098765432109876543210',
                verificationDate: '2025-03-02'
              },
              {
                id: 1,
                name: 'DriversLicense.pdf',
                type: 'drivers_license',
                status: 'Pending',
                uploadDate: '2025-02-28',
                fileSize: '952 KB',
                documentHash: 'QmYb5M6qCMKRRKqjARKb5XBgtaDfbvCt7uCYgECgVJDYYY'
              },
              {
                id: 2,
                name: 'BankStatement.pdf',
                type: 'bank_statement',
                status: 'Rejected',
                uploadDate: '2025-02-27',
                fileSize: '756 KB',
                documentHash: 'QmZb5M6qCMKRRKqjARKb5XBgtaDfbvCt7uCYgECgVJDZZZ',
                notes: 'Document appears to be outdated',
                verifier: '0x9876543210987654321098765432109876543210',
                verificationDate: '2025-02-28'
              }
            ];
            
            setDocuments(mockDocuments);
          } else {
            throw new Error("Failed to load documents from backend and blockchain");
          }
        }
      } else {
        throw err;
      }
    }
  };

  // Sync blockchain data with backend data
  const syncBlockchainData = async (address) => {
    try {
      // Initialize blockchain
      await blockchainService.init();
      
      // Get document count for the user
      const count = await blockchainService.getDocumentCount(address);
      console.log(`Found ${count} documents on blockchain`);
      
      // If there are documents in the blockchain but not in our local state, refresh from blockchain
      if (count > documents.length) {
        await loadBlockchainDocuments(address);
      }
    } catch (error) {
      console.error("Blockchain sync error:", error);
      throw error;
    }
  };

  // Load documents directly from blockchain
  const loadBlockchainDocuments = async (address) => {
    try {
      // Initialize blockchain
      await blockchainService.init();
      
      // Get document count for the user
      const count = await blockchainService.getDocumentCount(address);
      
      // Load each document from blockchain
      const loadedDocuments = [];
      for (let i = 0; i < count; i++) {
        const doc = await blockchainService.getDocument(address, i);
        
        // Add to loaded documents
        loadedDocuments.push({
          id: i,
          name: `Document_${i + 1}`,
          type: doc.documentType,
          status: doc.status,
          uploadDate: new Date(Number(doc.timestamp) * 1000).toLocaleDateString(),
          fileSize: 'N/A',
          documentHash: doc.documentHash,
          notes: doc.notes,
          verifier: doc.verifier !== '0x0000000000000000000000000000000000000000' ? doc.verifier : null,
          verificationDate: doc.status !== 'Pending' ? new Date(Number(doc.timestamp) * 1000).toLocaleDateString() : null
        });
      }
      
      setDocuments(loadedDocuments);
    } catch (error) {
      console.error("Error loading documents from blockchain:", error);
      throw error;
    }
  };

  // Connect wallet handler
  const handleConnectWallet = async () => {
    try {
      setLoading(true);
      await connectWallet();
      toast.success("Wallet connected successfully");
      await loadDocuments();
    } catch (error) {
      console.error("Wallet connection error:", error);
      toast.error("Failed to connect wallet. Please check MetaMask.");
      setLoading(false);
    }
  };

  // Handle document upload success
  const handleUploadSuccess = (documentData) => {
    // Refresh document list
    loadDocuments();
    
    toast.success('Document uploaded successfully');
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Verified': return 'text-green-600 bg-green-100';
      case 'Pending': return 'text-yellow-600 bg-yellow-100';
      case 'Rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    toast.promise(
      loadDocuments(),
      {
        loading: 'Refreshing documents...',
        success: 'Documents refreshed successfully',
        error: 'Failed to refresh documents'
      }
    );
  };

  // Handle search and filters
  const filteredDocuments = documents.filter(doc => {
    // Apply search filter
    const matchesSearch = searchTerm === '' || 
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply status filter
    const matchesStatus = filterStatus === 'all' || doc.status.toLowerCase() === filterStatus.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  // Apply sorting
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    let compareA, compareB;
    
    // Determine which field to sort by
    switch (sortBy) {
      case 'name':
        compareA = a.name.toLowerCase();
        compareB = b.name.toLowerCase();
        break;
      case 'type':
        compareA = a.type.toLowerCase();
        compareB = b.type.toLowerCase();
        break;
      case 'status':
        compareA = a.status.toLowerCase();
        compareB = b.status.toLowerCase();
        break;
      case 'date':
      default:
        compareA = new Date(a.uploadDate);
        compareB = new Date(b.uploadDate);
        break;
    }
    
    // Apply sort direction
    if (sortOrder === 'asc') {
      return compareA > compareB ? 1 : -1;
    } else {
      return compareA < compareB ? 1 : -1;
    }
  });

  // Render wallet connection prompt if not connected
  if (!loading && !wallet) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">My Documents</h1>
        </div>
        
        <div className="mt-8 text-center py-12 bg-white shadow rounded-lg">
          <Wallet className="mx-auto h-12 w-12 text-blue-500 mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Please connect your Ethereum wallet to view and manage your documents. 
            All documents will be secured on the blockchain.
          </p>
          <button
            onClick={handleConnectWallet}
            disabled={isConnecting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      </div>
    );
  }

  // Render loading indicator
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">My Documents</h1>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">My Documents</h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload Document
            </button>
          </div>
        </div>

        {/* Wallet info */}
        {wallet && (
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <Wallet className="h-4 w-4 mr-1" />
            Connected wallet: <span className="font-mono ml-1">{wallet.substring(0, 6)}...{wallet.substring(wallet.length - 4)}</span>
            <button 
              onClick={handleConnectWallet} 
              className="ml-3 text-blue-500 hover:text-blue-700 underline text-xs"
            >
              Change
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="w-full md:w-1/3">
            <label htmlFor="search" className="sr-only">Search documents</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Eye className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="search"
                type="text"
                placeholder="Search by name or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div className="flex flex-row flex-wrap gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="block w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="block w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="type">Sort by Type</option>
              <option value="status">Sort by Status</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </button>
          </div>
        </div>

        {/* Document List */}
        <div className="mt-6">
          {sortedDocuments.length === 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No Documents Found</h3>
              <p className="mt-1 text-gray-500">
                {searchTerm || filterStatus !== 'all' ? 
                  'No documents match your search criteria.' : 
                  'You haven\'t uploaded any documents yet. Click the "Upload Document" button to get started.'}
              </p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
              >
                <Upload className="h-5 w-5 mr-2" />
                Upload Your First Document
              </button>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {sortedDocuments.map((document) => (
                  <li key={document.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <FileText className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <h2 className="text-sm font-medium text-blue-600">{document.name}</h2>
                            <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                              {document.status}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            <span>{document.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                            <span className="mx-2">•</span>
                            <span>Uploaded on {document.uploadDate}</span>
                            {document.fileSize && (
                              <>
                                <span className="mx-2">•</span>
                                <span>{document.fileSize}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <a
                          href={ipfsService.getFileUrl(document.documentHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-500"
                          title="View on IPFS"
                        >
                          <ExternalLink className="h-5 w-5" />
                        </a>
                      </div>
                    </div>
                    
                    {document.status === 'Rejected' && document.notes && (
                      <div className="mt-2 ml-10 p-2 bg-red-50 text-sm text-red-700 rounded">
                        <p className="font-medium">Rejection reason:</p>
                        <p>{document.notes}</p>
                      </div>
                    )}
                    
                    {document.status === 'Verified' && (
                      <div className="mt-2 ml-10 text-xs text-gray-500">
                        {document.verificationDate && (
                          <p>Verified on {document.verificationDate}</p>
                        )}
                        {document.verifier && (
                          <p className="mt-1">
                            Verified by {typeof document.verifier === 'string' ? 
                              `${document.verifier.substring(0, 6)}...${document.verifier.substring(document.verifier.length - 4)}` : 
                              document.verifier}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
};

export default ClientDocument;
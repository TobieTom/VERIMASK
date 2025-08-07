// src/pages/institution/verification/PendingVerification.jsx
import React, { useState, useEffect } from 'react';
import { Search, Filter, Clock, Eye, AlertTriangle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import blockchainService from '../../../services/BlockchainIntegration';
import AuthService from '../../../services/AuthService';
import { useWallet } from '../../../contexts/WalletContext';

const PendingVerification = () => {
  const navigate = useNavigate();
  const { wallet, connectWallet, isVerifier } = useWallet();
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');

  // Initialize and load data when component mounts
  useEffect(() => {
    // Check if dashboard needs refresh
    const needsRefresh = localStorage.getItem('refresh_history') === 'true';
    if (needsRefresh) {
      console.log("Dashboard refresh triggered by localStorage flag");
      loadPendingDocuments();
      // Clear the flag after refreshing
      localStorage.removeItem('refresh_history');
    } else {
      // Initial load of pending documents
      loadPendingDocuments();
    }
  }, []);

  const loadPendingDocuments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const token = AuthService.getToken();
      
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }
      
      console.log("Fetching pending documents from backend");
      
      // Get all documents
      const response = await axios.get(`${backendUrl}/documents/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log("Documents response:", response.data);
      
      if (Array.isArray(response.data)) {
        // Filter for pending documents with case-insensitive comparison
        const pendingDocuments = response.data.filter(doc => {
          if (!doc || typeof doc !== 'object') return false;
          
          // Convert status to string and lowercase for case-insensitive comparison
          const status = String(doc.status || '').toLowerCase();
          return status.includes('pend');
        });
        
        console.log("Pending documents found:", pendingDocuments.length);
        
        // Process the documents to add calculated fields
        const processedDocs = pendingDocuments.map(doc => {
          return {
            id: doc.id,
            clientName: doc.user?.username || 'Unknown Client',
            clientAddress: doc.user?.profile?.wallet_address || 'Unknown',
            documentType: doc.document_type,
            submittedDate: new Date(doc.upload_date).toLocaleDateString(),
            priority: calculatePriority(doc.upload_date, doc.document_type),
            timeInQueue: calculateTimeInQueue(doc.upload_date),
            documentHash: doc.ipfs_hash,
            fileName: doc.file_name
          };
        });
        
        setPendingDocuments(processedDocs);
      } else {
        throw new Error("Unexpected response format");
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Error loading pending documents:", err);
      setError("Failed to load pending documents. Please try again later.");
      
      // Fall back to mock data in development
      if (process.env.NODE_ENV === 'development') {
        const mockDocs = [
          {
            id: 1,
            clientName: 'John Doe',
            documentType: 'passport',
            submittedDate: new Date().toLocaleDateString(),
            priority: 'high',
            timeInQueue: '2 hours',
            documentHash: 'QmXb5M6qCMKRRKqjARKb5XBgtaDfbvCt7uCYgECgVJDXXX'
          },
          {
            id: 2,
            clientName: 'Jane Smith',
            documentType: 'drivers_license',
            submittedDate: new Date(Date.now() - 86400000).toLocaleDateString(),
            priority: 'medium',
            timeInQueue: '1 day',
            documentHash: 'QmYb5M6qCMKRRKqjARKb5XBgtaDfbvCt7uCYgECgVJDYYY'
          },
          {
            id: 3,
            clientName: 'Mike Johnson',
            documentType: 'bank_statement',
            submittedDate: new Date(Date.now() - 172800000).toLocaleDateString(),
            priority: 'low',
            timeInQueue: '2 days',
            documentHash: 'QmZb5M6qCMKRRKqjARKb5XBgtaDfbvCt7uCYgECgVJDZZZ'
          }
        ];
        setPendingDocuments(mockDocs);
      }
      
      setLoading(false);
    }
  };
  
  // Calculate priority based on time in queue and document type
  const calculatePriority = (uploadDate, documentType) => {
    if (!uploadDate) return 'medium';
    
    const uploadTime = new Date(uploadDate);
    const currentTime = new Date();
    const diffInHours = (currentTime - uploadTime) / (1000 * 60 * 60);
    
    // Higher priority for older documents and certain document types
    if (diffInHours > 48 || documentType === 'passport') {
      return 'high';
    } else if (diffInHours > 24) {
      return 'medium';
    } else {
      return 'low';
    }
  };
  
  // Get priority badge color
  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate time in queue
  const calculateTimeInQueue = (uploadDate) => {
    if (!uploadDate) return 'Unknown';
    
    const uploadTime = new Date(uploadDate);
    const currentTime = new Date();
    const diffInMs = currentTime - uploadTime;
    
    // Convert to appropriate units
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInHours / 24;
    
    if (diffInHours < 1) {
      return 'Less than an hour';
    } else if (diffInHours < 24) {
      return `${Math.round(diffInHours)} hours`;
    } else {
      return `${Math.round(diffInDays)} days`;
    }
  };

  const handleReviewDocument = (docId) => {
    try {
      if (typeof docId === 'undefined' || docId === null) {
        throw new Error(`Invalid document ID: ${docId}`);
      }
      
      // Log with the actual ID for debugging
      console.log(`Reviewing document with ID: ${docId}`);
      
      // IMPORTANT: Store document ID as string in multiple storage mechanisms for redundancy
      const docIdString = String(docId);
      
      // 1. Store in localStorage
      localStorage.setItem('current_verification_id', docIdString);
      
      // 2. Store in sessionStorage (persists across page refreshes but not tabs)
      sessionStorage.setItem('current_verification_id', docIdString);
      
      // 3. Use URLSearchParams for more reliable passing (doesn't rely on storage)
      navigate(`/institution/verification/${docIdString}`);
      
      // Additional message to confirm ID is being passed
      toast.success(`Opening document ID: ${docIdString} for verification`);
      
    } catch (error) {
      console.error(error.message);
      toast.error("Cannot review this document: Invalid document ID");
    }
  };

  // Filter documents
  const filteredDocuments = pendingDocuments.filter(doc => {
    // Apply search filter
    const matchesSearch = searchTerm === '' ||
      doc.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.documentType.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply priority filter
    const matchesPriority = filterPriority === 'all' || doc.priority === filterPriority;
    
    return matchesSearch && matchesPriority;
  });

  // Connect wallet handler
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      toast.success("Wallet connected successfully");
      
      // Reload documents after wallet connection
      loadPendingDocuments();
    } catch (error) {
      console.error("Connect wallet error:", error);
      toast.error("Failed to connect wallet. Please check MetaMask.");
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    toast.promise(
      loadPendingDocuments(),
      {
        loading: 'Refreshing documents...',
        success: 'Documents refreshed successfully',
        error: 'Failed to refresh documents'
      }
    );
  };

  // Render loading state
  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-xl font-semibold text-gray-900">Pending Verifications</h1>
          </div>
        </div>
        <div className="mt-10 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Pending Verifications</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all pending document verifications that require your attention.
          </p>
        </div>
        <div className="sm:ml-16 sm:flex-none">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>
      
      {/* Wallet connection prompt */}
      {!wallet && (
        <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-yellow-800">Wallet Connection Required</h3>
              <div className="mt-2 text-yellow-700">
                <p>Please connect your blockchain wallet to access verification functions.</p>
                <button
                  onClick={handleConnectWallet}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Connect Wallet
                </button>
              </div>
            </div>
          </div>
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

      {/* Search and Filter Section */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 min-w-0 sm:mr-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search by client name or document type..."
            />
          </div>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-4">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Pending Documents Table */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              {filteredDocuments.length === 0 ? (
                <div className="bg-white py-6 px-4 text-center">
                  <p className="text-gray-500">No pending verifications match your criteria.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Client</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Document Type</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Submitted Date</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Priority</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Time in Queue</th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredDocuments.map((doc) => (
                      <tr key={doc.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{doc.clientName}</span>
                            {doc.clientAddress && (
                              <span className="text-gray-500 text-xs font-mono">
                                {doc.clientAddress.substring(0, 8)}...{doc.clientAddress.substring(Math.max(0, doc.clientAddress.length - 6))}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {doc.documentType ? doc.documentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown Type'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{doc.submittedDate || 'Unknown'}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getPriorityBadgeColor(doc.priority)}`}>
                            {doc.priority}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1 text-gray-400" />
                            {doc.timeInQueue}
                          </div>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleReviewDocument(doc.id)}
                            className="text-blue-600 hover:text-blue-900 flex items-center justify-end"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingVerification;
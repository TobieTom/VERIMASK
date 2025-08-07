// src/pages/Client/ClientDashboard.jsx
import React, { useState, useEffect } from 'react';
import { FileText, Upload, Clock, CheckCircle, XCircle, AlertTriangle, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import UploadModal from '../../components/common/UploadModal';
import AuthService from '../../services/AuthService';
import { useWallet } from '../../contexts/WalletContext';
import blockchainService from '../../services/BlockchainIntegration';

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { wallet, connectWallet, isConnecting } = useWallet();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Dashboard data
  const [documentStats, setDocumentStats] = useState({
    total: 0,
    verified: 0,
    pending: 0,
    rejected: 0
  });
  const [recentDocuments, setRecentDocuments] = useState([]);

  // Initialize and load data
  useEffect(() => {
    const initializeAndLoadData = async () => {
      setLoading(true);
      
      try {
        // First check if wallet is connected
        if (!wallet) {
          try {
            await connectWallet();
          } catch (walletError) {
            console.warn("Wallet connection error:", walletError);
            // Continue anyway to load dashboard data
          }
        }
        
        // Load dashboard data
        await loadDashboardData();
      } catch (err) {
        console.error("Dashboard loading error:", err);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    initializeAndLoadData();
  }, [wallet]);

  // Load dashboard data from backend
  const loadDashboardData = async () => {
    try {
      const token = AuthService.getToken();
      
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }
      
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      
      // Get all documents
      const response = await axios.get(`${backendUrl}/documents/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data) {
        const documents = response.data;
        
        // Calculate statistics
        const stats = {
          total: documents.length,
          verified: documents.filter(doc => doc.status === 'Verified').length,
          pending: documents.filter(doc => doc.status === 'Pending').length,
          rejected: documents.filter(doc => doc.status === 'Rejected').length
        };
        
        setDocumentStats(stats);
        
        // Get recent documents (up to 5 most recent)
        const sorted = [...documents].sort((a, b) => 
          new Date(b.upload_date) - new Date(a.upload_date)
        );
        
        const recentDocs = sorted.slice(0, 5).map(doc => ({
          id: doc.id,
          name: doc.file_name || `Document_${doc.id}`,
          status: doc.status.toLowerCase(),
          date: new Date(doc.upload_date).toLocaleDateString(),
          documentHash: doc.ipfs_hash,
          documentType: doc.document_type,
          notes: doc.notes
        }));
        
        setRecentDocuments(recentDocs);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      
      // In development, use mock data
      if (process.env.NODE_ENV === 'development') {
        console.log("Using mock data in development mode");
        setDocumentStats({
          total: 12,
          verified: 5,
          pending: 4,
          rejected: 3
        });
        
        setRecentDocuments([
          { id: 1, name: 'Passport.pdf', status: 'verified', date: '2025-03-01' },
          { id: 2, name: 'DriversLicense.pdf', status: 'pending', date: '2025-02-28' },
          { id: 3, name: 'BankStatement.pdf', status: 'rejected', date: '2025-02-27' }
        ]);
      } else {
        throw err;
      }
    }
  };

  // Navigate to all documents page
  const handleViewAllDocuments = () => {
    navigate('/client/documents');
  };

  // Connect wallet handler
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      toast.success("Wallet connected successfully");
      loadDashboardData();
    } catch (error) {
      console.error("Connect wallet error:", error);
      toast.error("Failed to connect wallet. Please check MetaMask.");
    }
  };

  // Handle document upload success
  const handleUploadSuccess = () => {
    loadDashboardData();
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500 mr-1" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500 mr-1" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500 mr-1" />;
      default:
        return null;
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Render wallet connection prompt if not connected
  if (!wallet) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        
        <div className="mt-8 text-center py-12 bg-white shadow rounded-lg">
          <Wallet className="mx-auto h-12 w-12 text-blue-500 mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Please connect your Ethereum wallet to view your documents and dashboard.
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        
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
        
        {/* Stats Cards */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Documents</dt>
                    <dd className="text-lg font-semibold text-gray-900">{documentStats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Verified</dt>
                    <dd className="text-lg font-semibold text-gray-900">{documentStats.verified}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                    <dd className="text-lg font-semibold text-gray-900">{documentStats.pending}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Rejected</dt>
                    <dd className="text-lg font-semibold text-gray-900">{documentStats.rejected}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload New Document
            </button>
            <button 
              className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200" 
              onClick={handleViewAllDocuments}
            >
              <FileText className="h-5 w-5 mr-2" />
              View All Documents
            </button>
          </div>
        </div>

        {/* Recent Documents */}
        <div className="mt-8">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Recent Documents</h2>
            <button 
              onClick={handleViewAllDocuments}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              View all
            </button>
          </div>
          {recentDocuments.length === 0 ? (
            <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
              <p className="text-gray-500">No documents found. Upload your first document to get started.</p>
            </div>
          ) : (
            <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {recentDocuments.map((document) => (
                  <li key={document.id}>
                    <div className="px-4 py-4 flex items-center justify-between sm:px-6 hover:bg-gray-50">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-gray-400 mr-2" />
                          <p className="font-medium text-blue-600 truncate">{document.name}</p>
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium">
                            {getStatusIcon(document.status)}
                            {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <p>
                            {document.documentType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} • Uploaded on {document.date}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => navigate(`/client/documents/${document.id}`)}
                        className="ml-4 flex-shrink-0 text-sm text-blue-600 hover:text-blue-500"
                      >
                        View
                      </button>
                    </div>
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

export default ClientDashboard;
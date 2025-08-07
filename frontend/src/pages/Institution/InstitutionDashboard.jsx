import React, { useState, useEffect } from 'react';
import { Users, FileText, CheckCircle, Clock, AlertCircle, Search, ArrowRight, Wallet, AlertTriangle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import AuthService from '../../services/AuthService';
import blockchainService from '../../services/BlockchainIntegration';
import { useWallet } from '../../contexts/WalletContext';

const InstitutionDashboard = () => {
  const navigate = useNavigate();
  const { wallet, connectWallet, isVerifier } = useWallet();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dashboard data state
  const [verificationStats, setVerificationStats] = useState({
    totalClients: 0,
    pendingVerifications: 0,
    completedToday: 0,
    rejectedToday: 0
  });

  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Load data on component mount
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);

      try {
        // Try to connect wallet if not already connected
        if (!wallet) {
          try {
            await connectWallet();
          } catch (walletError) {
            console.warn("Wallet connection error:", walletError);
            // Continue anyway to load dashboard data
          }
        }

        // Load all the dashboard data in parallel
        await Promise.all([
          loadVerificationStats(),
          loadPendingVerifications(),
          loadRecentActivities()
        ]);

        setLoading(false);
      } catch (err) {
        console.error("Dashboard loading error:", err);
        setError("Failed to load dashboard data. Please try again.");
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [wallet]);

  // Load verification statistics
  // Load verification statistics
  // Updated loadVerificationStats function
  // From src/pages/Institution/InstitutionDashboard.jsx

  // Updated loadVerificationStats function for InstitutionDashboard.jsx

  const loadVerificationStats = async () => {
    try {
      const token = AuthService.getToken();

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      // Check for blockchain connection to get real-time stats
      let blockchainStats = {
        totalVerified: 0,
        totalRejected: 0,
        totalPending: 0
      };

      try {
        if (wallet) {
          await blockchainService.init();
          // Could fetch blockchain statistics here if available
        }
      } catch (bcError) {
        console.warn("Blockchain stats error:", bcError);
      }

      // Fetch all documents to calculate statistics
      const response = await axios.get(`${backendUrl}/documents/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data) {
        console.log("Stats - Documents response:", response.data);
        const documents = response.data;

        // Get current date for today's calculations
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Log document status values to debug
        const statusValues = new Set(documents.map(doc =>
          typeof doc.status === 'string' ? doc.status.toLowerCase() : String(doc.status).toLowerCase()
        ));
        console.log("Unique status values in documents:", Array.from(statusValues));

        // Get unique clients count
        const uniqueClients = new Set(documents.map(doc => {
          return doc.user?.id || (typeof doc.user === 'number' ? doc.user : null);
        })).size;

        // Case-insensitive status checking functions
        const isPending = (doc) => {
          const status = String(doc.status || '').toLowerCase();
          return status.includes('pend');
        };

        const isVerified = (doc) => {
          const status = String(doc.status || '').toLowerCase();
          return status.includes('verif');
        };

        const isRejected = (doc) => {
          const status = String(doc.status || '').toLowerCase();
          return status.includes('reject');
        };

        // Count pending documents - now case-insensitive matching
        const pendingCount = documents.filter(isPending).length;

        // Count today's verified documents - case-insensitive
        const verifiedToday = documents.filter(doc => {
          // First check if status matches Verified (case-insensitive)
          if (!isVerified(doc) || !doc.verification_date) return false;

          // Then check if verification date is today
          const verifiedDate = new Date(doc.verification_date);
          verifiedDate.setHours(0, 0, 0, 0);
          return verifiedDate.getTime() === today.getTime();
        }).length;

        // Count today's rejected documents - case-insensitive
        const rejectedToday = documents.filter(doc => {
          // First check if status matches Rejected (case-insensitive)
          if (!isRejected(doc) || !doc.verification_date) return false;

          // Then check if verification date is today
          const verifiedDate = new Date(doc.verification_date);
          verifiedDate.setHours(0, 0, 0, 0);
          return verifiedDate.getTime() === today.getTime();
        }).length;

        // Count total verified and rejected for debugging
        const totalVerified = documents.filter(isVerified).length;
        const totalRejected = documents.filter(isRejected).length;

        console.log("Stats calculation:", {
          uniqueClients,
          pendingCount,
          verifiedToday,
          rejectedToday,
          totalVerified,
          totalRejected
        });

        setVerificationStats({
          totalClients: uniqueClients || 0,
          pendingVerifications: pendingCount || 0,
          completedToday: verifiedToday || 0,
          rejectedToday: rejectedToday || 0
        });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Stats loading error:", error);

      // Fall back to mock data in case of error
      setVerificationStats({
        totalClients: 15,
        pendingVerifications: 5,
        completedToday: 3,
        rejectedToday: 1
      });
    }
  };

  // Load pending verifications
  const loadPendingVerifications = async () => {
    try {
      const token = AuthService.getToken();

      if (!token) {
        throw new Error("Authentication token not found");
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      // Get all documents and filter for pending ones
      const response = await axios.get(`${backendUrl}/documents/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data) {
        // Filter for pending documents
        const pendingDocuments = response.data
          .filter(doc => doc.status === 'Pending')
          .sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));

        // Process only the first 3 items for dashboard
        const pendingDocs = pendingDocuments.slice(0, 3).map(doc => ({
          id: doc.id,
          clientName: doc.user?.username || 'Unknown Client',
          documentType: doc.document_type,
          submittedDate: new Date(doc.upload_date).toLocaleDateString(),
          priority: calculatePriority(doc.upload_date, doc.document_type)
        }));

        setPendingVerifications(pendingDocs);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Pending verifications loading error:", error);

      // Fall back to mock data
      setPendingVerifications([
        {
          id: 1,
          clientName: 'John Doe',
          documentType: 'passport',
          submittedDate: new Date().toLocaleDateString(),
          priority: 'high'
        },
        {
          id: 2,
          clientName: 'Jane Smith',
          documentType: 'drivers_license',
          submittedDate: new Date(Date.now() - 86400000).toLocaleDateString(),
          priority: 'medium'
        },
        {
          id: 3,
          clientName: 'Mike Johnson',
          documentType: 'bank_statement',
          submittedDate: new Date(Date.now() - 172800000).toLocaleDateString(),
          priority: 'low'
        }
      ]);
    }
  };

  // Calculate priority based on time and document type
  const calculatePriority = (uploadDate, documentType) => {
    const uploadTime = new Date(uploadDate);
    const currentTime = new Date();
    const diffInHours = (currentTime - uploadTime) / (1000 * 60 * 60);

    if (diffInHours > 48 || documentType === 'passport') {
      return 'high';
    } else if (diffInHours > 24) {
      return 'medium';
    } else {
      return 'low';
    }
  };

  // Load recent activities
  const loadRecentActivities = async () => {
    try {
      const token = AuthService.getToken();

      if (!token) {
        throw new Error("Authentication token not found");
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      // Get all documents for activities
      const response = await axios.get(`${backendUrl}/documents/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data) {
        // Sort documents by verification_date or upload_date (most recent first)
        const sortedDocuments = response.data.sort((a, b) => {
          const dateA = a.verification_date || a.upload_date;
          const dateB = b.verification_date || b.upload_date;
          return new Date(dateB) - new Date(dateA);
        });

        // Process the 3 most recent activities
        const activities = sortedDocuments.slice(0, 3).map(doc => {
          let action = 'New Submission';

          if (doc.status === 'Verified') {
            action = 'Verification Completed';
          } else if (doc.status === 'Rejected') {
            action = 'Document Rejected';
          }

          return {
            id: doc.id,
            action,
            client: doc.user?.username || 'Unknown Client',
            document: doc.document_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            time: calculateTimeElapsed(doc.verification_date || doc.upload_date)
          };
        });

        setRecentActivities(activities);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Recent activities loading error:", error);

      // Fall back to mock data
      setRecentActivities([
        {
          id: 1,
          action: 'Verification Completed',
          client: 'Sarah Wilson',
          document: 'Passport',
          time: '2 hours ago'
        },
        {
          id: 2,
          action: 'Document Rejected',
          client: 'Alex Brown',
          document: 'Utility Bill',
          time: '3 hours ago'
        },
        {
          id: 3,
          action: 'New Submission',
          client: 'Emily Davis',
          document: 'Bank Statement',
          time: '5 hours ago'
        }
      ]);
    }
  };

  // Calculate time elapsed since event
  const calculateTimeElapsed = (timestamp) => {
    if (!timestamp) return 'Unknown';

    const eventTime = new Date(timestamp);
    const currentTime = new Date();
    const diffInMs = currentTime - eventTime;

    // Convert to appropriate units
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInHours / 24;

    if (diffInHours < 1) {
      return 'Less than an hour ago';
    } else if (diffInHours < 24) {
      const hours = Math.round(diffInHours);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffInDays < 30) {
      const days = Math.round(diffInDays);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    } else {
      const months = Math.round(diffInDays / 30);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    }
  };

  // Navigate to pending verifications page
  const handleViewAllPending = () => {
    navigate('/institution/pending');
  };

  // Navigate to verification history page
  const handleViewAllHistory = () => {
    navigate('/institution/history');
  };

  // Navigate to verify a document
  const handleVerifyDocument = (id) => {
    navigate(`/institution/verification/${id}`);
  };

  // Helper function to determine priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Helper function to determine action color
  const getActionColor = (action) => {
    switch (action) {
      case 'Verification Completed': return 'text-green-600';
      case 'Document Rejected': return 'text-red-600';
      case 'New Submission': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  // Handle wallet connection
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      toast.success("Wallet connected successfully");

      // Reload dashboard data
      await Promise.all([
        loadVerificationStats(),
        loadPendingVerifications(),
        loadRecentActivities()
      ]);
    } catch (error) {
      console.error("Connect wallet error:", error);
      toast.error("Failed to connect wallet. Please check MetaMask.");
    }
  };

  // Handle dashboard refresh
  const handleRefresh = async () => {
    toast.promise(
      Promise.all([
        loadVerificationStats(),
        loadPendingVerifications(),
        loadRecentActivities()
      ]),
      {
        loading: 'Refreshing dashboard data...',
        success: 'Dashboard refreshed',
        error: 'Failed to refresh dashboard'
      }
    );
  };

  // Render loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-semibold text-gray-900">Institution Dashboard</h1>
        <div className="mt-10 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Institution Dashboard</h1>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>

        {/* Wallet Connection Status */}
        {!wallet && (
          <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  To access all features, please connect your blockchain wallet
                </p>
                <div className="mt-2">
                  <button
                    onClick={handleConnectWallet}
                    className="px-3 py-1 rounded text-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Connect Wallet
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Clients</dt>
                    <dd className="text-lg font-semibold text-gray-900">{verificationStats.totalClients}</dd>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Verifications</dt>
                    <dd className="text-lg font-semibold text-gray-900">{verificationStats.pendingVerifications}</dd>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Completed Today</dt>
                    <dd className="text-lg font-semibold text-gray-900">{verificationStats.completedToday}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Rejected Today</dt>
                    <dd className="text-lg font-semibold text-gray-900">{verificationStats.rejectedToday}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mt-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex-1 min-w-0 md:mr-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search for clients or documents..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Pending Verifications */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Pending Verifications</h2>
              <button
                onClick={handleViewAllPending}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                View all
              </button>
            </div>
            {pendingVerifications.length === 0 ? (
              <div className="px-4 py-5 text-center text-gray-500">
                No pending verifications
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {pendingVerifications.map((verification) => (
                  <li key={verification.id} className="px-4 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-blue-600 truncate">{verification.clientName}</p>
                          <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(verification.priority)}`}>
                            {verification.priority}
                          </span>
                        </div>
                        <div className="mt-2 flex">
                          <p className="text-sm text-gray-500">
                            {verification.documentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          <p className="ml-2 text-sm text-gray-500">• {verification.submittedDate}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleVerifyDocument(verification.id)}
                        className="ml-4 flex-shrink-0 text-sm text-blue-600 hover:text-blue-500"
                      >
                        Verify <ArrowRight className="inline-block h-4 w-4 ml-1" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
              <button
                onClick={handleViewAllHistory}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                View all
              </button>
            </div>
            {recentActivities.length === 0 ? (
              <div className="px-4 py-5 text-center text-gray-500">
                No recent activities
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {recentActivities.map((activity) => (
                  <li key={activity.id} className="px-4 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${getActionColor(activity.action)}`}>
                          {activity.action}
                        </p>
                        <div className="mt-2 flex">
                          <p className="text-sm text-gray-500">{activity.client}</p>
                          <p className="ml-2 text-sm text-gray-500">• {activity.document}</p>
                          <p className="ml-2 text-sm text-gray-500">• {activity.time}</p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionDashboard;
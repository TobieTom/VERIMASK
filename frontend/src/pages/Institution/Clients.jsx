// src/pages/institution/Clients.jsx
import React, { useState, useEffect } from 'react';
import { Search, Filter, User, FileText, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import ApiService from '../../services/ApiService';
import AuthService from '../../services/AuthService';

const Clients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Load clients data when component mounts
  useEffect(() => {
    loadClientsData();
  }, []);

  // Load clients data from backend
  const loadClientsData = async () => {
    setLoading(true);
    
    try {
      // Get auth token
      const token = AuthService.getToken();
      
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }
      
      // Get backend URL from environment variable
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      
      // First try to get clients from a dedicated endpoint if available
      try {
        const response = await axios.get(`${backendUrl}/clients/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (Array.isArray(response.data)) {
          // Process client data
          const clientData = response.data.map(client => ({
            id: client.id,
            name: client.username || `${client.first_name || ''} ${client.last_name || ''}`.trim(),
            email: client.email || 'No email provided',
            totalDocuments: client.total_documents || 0,
            verifiedDocuments: client.verified_documents || 0,
            pendingDocuments: client.pending_documents || 0,
            lastActivity: client.last_activity ? new Date(client.last_activity).toLocaleDateString() : 'Unknown',
            status: client.is_active ? 'active' : 'inactive'
          }));
          
          setClients(clientData);
        } else {
          throw new Error("Invalid response format from clients endpoint");
        }
      } catch (clientsError) {
        console.warn("Direct clients endpoint failed:", clientsError);
        
        // If direct endpoint fails, try to get clients from documents
        try {
          const docsResponse = await axios.get(`${backendUrl}/documents/`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (Array.isArray(docsResponse.data)) {
            // Extract unique clients from documents
            const clientsMap = new Map();
            
            docsResponse.data.forEach(doc => {
              if (doc.user) {
                const userId = doc.user.id;
                
                if (!clientsMap.has(userId)) {
                  clientsMap.set(userId, {
                    id: userId,
                    name: doc.user.username || 'Unknown User',
                    email: doc.user.email || 'No email provided',
                    totalDocuments: 1,
                    verifiedDocuments: doc.status === 'Verified' ? 1 : 0,
                    pendingDocuments: doc.status === 'Pending' ? 1 : 0,
                    lastActivity: doc.upload_date || doc.verification_date,
                    status: 'active'
                  });
                } else {
                  const client = clientsMap.get(userId);
                  client.totalDocuments += 1;
                  
                  if (doc.status === 'Verified') {
                    client.verifiedDocuments += 1;
                  } else if (doc.status === 'Pending') {
                    client.pendingDocuments += 1;
                  }
                  
                  // Update lastActivity if this document is more recent
                  const docDate = new Date(doc.upload_date || doc.verification_date);
                  const currentLastActivity = new Date(client.lastActivity);
                  
                  if (docDate > currentLastActivity) {
                    client.lastActivity = doc.upload_date || doc.verification_date;
                  }
                }
              }
            });
            
            // Convert map to array and format dates
            const clientsList = Array.from(clientsMap.values()).map(client => ({
              ...client,
              lastActivity: client.lastActivity ? new Date(client.lastActivity).toLocaleDateString() : 'Unknown'
            }));
            
            setClients(clientsList);
          } else {
            throw new Error("Unexpected response format from documents endpoint");
          }
        } catch (docsError) {
          console.error("Could not extract clients from documents:", docsError);
          throw docsError;
        }
      }
      
    } catch (err) {
      console.error("Error loading clients data:", err);
      setError("Failed to load clients data. Please try again.");
      
      // In development mode, use mock data if API calls fail
      if (process.env.NODE_ENV === 'development') {
        console.log("Using mock clients data in development mode");
        const mockClients = [
          {
            id: 1,
            name: 'John Doe',
            email: 'john.doe@example.com',
            totalDocuments: 5,
            verifiedDocuments: 3,
            pendingDocuments: 2,
            lastActivity: '2025-02-22',
            status: 'active'
          },
          {
            id: 2,
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            totalDocuments: 3,
            verifiedDocuments: 2,
            pendingDocuments: 1,
            lastActivity: '2025-02-21',
            status: 'active'
          },
          {
            id: 3,
            name: 'Robert Brown',
            email: 'robert.brown@example.com',
            totalDocuments: 4,
            verifiedDocuments: 4,
            pendingDocuments: 0,
            lastActivity: '2025-02-20',
            status: 'inactive'
          }
        ];
        
        setClients(mockClients);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    toast.promise(
      loadClientsData(),
      {
        loading: 'Refreshing clients data...',
        success: 'Client data refreshed successfully',
        error: 'Failed to refresh client data'
      }
    );
  };

  // Handle client view
  const handleViewClient = (clientId) => {
    // Navigate to client details page or relevant documents
    navigate(`/institution/clients/${clientId}`);
  };

  // Filter clients based on search and status
  const filteredClients = clients.filter(client => {
    // Apply search filter
    const matchesSearch = searchTerm === '' || 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply status filter
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Render loading state
  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-xl font-semibold text-gray-900">Clients</h1>
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
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Clients</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all clients and their document verification status.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Alert */}
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

      {/* Filters */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Clients List */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <div className="divide-y divide-gray-200 bg-white">
                {filteredClients.length === 0 ? (
                  <div className="px-4 py-4 text-center text-sm text-gray-500">
                    No clients found matching your criteria.
                  </div>
                ) : (
                  filteredClients.map((client) => (
                    <div
                      key={client.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewClient(client.id)}
                    >
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <User className="h-8 w-8 text-gray-400" />
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-blue-600">{client.name}</p>
                              <p className="text-sm text-gray-500">{client.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-8">
                            <div className="flex flex-col items-end">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-5 w-5 text-gray-400" />
                                <span className="text-sm text-gray-900">
                                  {client.verifiedDocuments}/{client.totalDocuments} Verified
                                </span>
                              </div>
                              {client.pendingDocuments > 0 && (
                                <span className="text-sm text-yellow-600">
                                  {client.pendingDocuments} Pending
                                </span>
                              )}
                            </div>
                            <div className="flex items-center">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {client.status}
                              </span>
                              <ChevronRight className="h-5 w-5 text-gray-400 ml-4" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              Last active: {client.lastActivity}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Clients;
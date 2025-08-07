// src/pages/Institution/verification/VerificationDocument.jsx
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Download, MessageSquare, ArrowLeft, ExternalLink, FileText, Clock, Shield, UploadCloud } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import blockchainService from '../../../services/BlockchainIntegration';
import ipfsService from '../../../services/IPFSService';
import { useWallet } from '../../../contexts/WalletContext';
import AuthService from '../../../services/AuthService';

// Utility function to find document ID in any format
const findDocumentIdInAnyFormat = (doc) => {
  if (!doc || typeof doc !== 'object') {
    console.warn("Invalid document object:", doc);
    return null;
  }
  
  // 1. First check the direct ID field (most reliable)
  if (doc.id !== undefined && doc.id !== null) {
    console.log(`Found direct ID:`, doc.id);
    return String(doc.id);
  }
  
  // 2. Check other possible ID field names
  const possibleIdFields = ['document_id', 'documentId', '_id', 'doc_id', 'docId', 'documentID', 'documentIdentifier'];
  
  for (const field of possibleIdFields) {
    if (doc[field] !== undefined && doc[field] !== null) {
      console.log(`Found ID in field ${field}:`, doc[field]);
      return String(doc[field]);
    }
  }
  
  // 3. Check for blockchain_index field which might be the document ID
  if (doc.blockchain_index !== undefined && doc.blockchain_index !== null) {
    console.log(`Using blockchain_index as ID:`, doc.blockchain_index);
    return String(doc.blockchain_index);
  }
  
  // 4. Extract ID from URL if present
  for (const key in doc) {
    if (typeof doc[key] === 'string' && doc[key].includes('/documents/')) {
      const matches = doc[key].match(/\/documents\/([^\/]+)/);
      if (matches && matches[1]) {
        console.log(`Extracted ID from URL in field ${key}:`, matches[1]);
        return matches[1];
      }
    }
  }
  
  // 5. IMPORTANT: DO NOT use user field as document ID (this was causing the bug)
  // The user field is the ID of the user who owns the document, not the document itself
  
  // No ID found
  console.warn("No valid ID found in document:", JSON.stringify(doc).substring(0, 200) + "...");
  return null;
};

const VerificationDocument = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { wallet, connectWallet, isVerifier } = useWallet();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Document state
  const [document, setDocument] = useState({
    id: '',
    clientName: '',
    clientAddress: '',
    documentType: '',
    submissionDate: '',
    status: 'Pending',
    imageUrl: '',
    documentHash: '',
    verificationNotes: '',
    requirements: [
      { id: 1, text: 'Document must be valid', checked: false },
      { id: 2, text: 'All information must be clearly visible', checked: false },
      { id: 3, text: 'No signs of tampering', checked: false },
      { id: 4, text: 'Document not expired', checked: false },
      { id: 5, text: 'Photo matches client description', checked: false },
      { id: 6, text: 'Security features verified', checked: false }
    ]
  });
  
  // Form state
  const [verificationNotes, setVerificationNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState('');
  
  // Effect to load document when component mounts or document ID changes
  useEffect(() => {
    // Clear any existing error state at the start
    setError(null);
    
    const documentId = getDocumentId();
    
    // Log the document ID situation for debugging
    console.log("Document ID resolution:", {
      fromParams: id,
      fromQuery: new URLSearchParams(location.search).get('docId'),
      fromSessionStorage: sessionStorage.getItem('current_verification_id'),
      fromLocalStorage: localStorage.getItem('current_verification_id'),
      fromPreviousState: document?.id,
      fromPathExtraction: window.location.pathname.match(/\/verification\/(\d+)/)?.[1],
      finalResolvedId: documentId
    });
    
    // If no document ID could be found, show error
    if (!documentId) {
      setError("No document ID could be found. Please select a document from the pending list.");
      setLoading(false);
      return;
    }
    
    // Store the document ID in both storage mechanisms for redundancy
    try {
      localStorage.setItem('current_verification_id', documentId);
      sessionStorage.setItem('current_verification_id', documentId);
    } catch (storageError) {
      console.warn("Failed to store document ID in browser storage:", storageError);
      // Continue anyway, this is just for redundancy
    }
    
    // Fetch the document with the ID
    fetchDocument(documentId);
  }, [id, location.search]);

  // Improved document ID retrieval logic
  const getDocumentId = () => {
    // Priority 1: URL parameter (from the route)
    if (id) {
      console.log("Using document ID from URL params:", id);
      return id;
    }
    
    // Priority 2: URL query parameter (e.g., ?docId=123)
    const queryParams = new URLSearchParams(location.search);
    const queryId = queryParams.get('docId');
    if (queryId) {
      console.log("Using document ID from URL query params:", queryId);
      return queryId;
    }
    
    // Priority 3: sessionStorage (persists across page reloads but not browser tabs)
    const sessionId = sessionStorage.getItem('current_verification_id');
    if (sessionId) {
      console.log("Using document ID from sessionStorage:", sessionId);
      return sessionId;
    }
    
    // Priority 4: localStorage (persists across browser sessions)
    const localId = localStorage.getItem('current_verification_id');
    if (localId) {
      console.log("Using document ID from localStorage:", localId);
      return localId;
    }
    
    // Priority 5: Extract from URL path as last resort
    const pathMatch = window.location.pathname.match(/\/verification\/(\d+)/);
    if (pathMatch && pathMatch[1]) {
      const pathId = pathMatch[1];
      console.log("Extracted document ID from URL path:", pathId);
      return pathId;
    }
    
    return null;
  };

  // Modified fetchDocument function to handle specific document ID
  const fetchDocument = async (documentId) => {
    setLoading(true);
    setError(null);
    
    console.log("Fetching document with ID:", documentId);
    
    try {
      // Connect wallet if needed
      if (!wallet) {
        try {
          await connectWallet();
        } catch (walletError) {
          console.warn("Wallet connection error:", walletError);
        }
      }
      
      // Check verifier status
      if (wallet) {
        try {
          const isUserVerifier = await blockchainService.isVerifier(wallet);
          console.log("Is verifier:", isUserVerifier);
        } catch (verifierError) {
          console.warn("Verifier status check failed:", verifierError);
        }
      }
      
      // Validate document ID
      if (!documentId) {
        setError("Invalid document ID. Please select a document from the pending list.");
        setLoading(false);
        return;
      }
      
      // Load the document from backend
      const token = AuthService.getToken();
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setLoading(false);
        return;
      }
      
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      
      // Try multiple fetching strategies
      let documentData = null;
      let fetchErrors = [];
      
      // Strategy 1: Try direct document endpoint
      try {
        // Format document ID as string
        const documentIdStr = String(documentId);
        console.log(`Fetching document from ${backendUrl}/documents/${documentIdStr}/`);
        
        const response = await axios.get(`${backendUrl}/documents/${documentIdStr}/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data) {
          console.log("Document fetched successfully via direct API endpoint");
          documentData = response.data;
        }
      } catch (directFetchError) {
        console.warn(`Failed to load specific document with ID ${documentId}, trying documents list`);
        fetchErrors.push(`Direct fetch: ${directFetchError.message}`);
        
        // Strategy 2: Get all documents and find the matching one
        try {
          console.log("Attempting to fetch document from documents list");
          const allDocsResponse = await axios.get(`${backendUrl}/documents/`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (Array.isArray(allDocsResponse.data)) {
            console.log("All documents response:", allDocsResponse.data);
            
            // Find the document by matching its ID with the requested ID
            const docIdStr = String(documentId);
            
            // First try to find the exact document by strictly matching IDs
            let matchedDoc = allDocsResponse.data.find(doc => 
              String(doc.id) === docIdStr
            );
            
            if (matchedDoc) {
              console.log("Found matching document:", matchedDoc);
              documentData = matchedDoc;
            } else {
              console.error("Document not found in list. Available IDs:", 
                allDocsResponse.data.map(doc => doc.id)
              );
              fetchErrors.push("Document not found in document list");
            }
          } else {
            console.warn("Unexpected response format:", allDocsResponse.data);
            fetchErrors.push("Unexpected response format from documents endpoint");
          }
        } catch (listError) {
          console.error("Error fetching documents list:", listError);
          fetchErrors.push(`Documents list fetch: ${listError.message}`);
        }
      }
      
      // Strategy 3: Try fetching by modified endpoints (in case API format is different)
      if (!documentData) {
        try {
          console.log("Trying alternative API endpoint formats");
          
          // Try without trailing slash
          const response = await axios.get(`${backendUrl}/documents/${documentId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.data) {
            console.log("Document fetched successfully via alternative endpoint");
            documentData = response.data;
          }
        } catch (alternativeError) {
          console.warn("Alternative endpoint fetch failed:", alternativeError.message);
          fetchErrors.push(`Alternative endpoint: ${alternativeError.message}`);
        }
      }
      
      // Final check to see if we found the document
      if (documentData) {
        processDocumentData(documentData, documentId);
      } else {
        // Create a helpful error message
        setError(`Failed to load document with ID ${documentId}. Errors: ${fetchErrors.join('; ')}`);
        setLoading(false);
      }
    } catch (err) {
      console.error("Error fetching document:", err);
      setError("Failed to load document: " + (err.response?.data?.detail || err.message));
      setLoading(false);
    }
  };

  // Improved processDocumentData function for more robust handling
  const processDocumentData = (doc, docId) => {
    console.log("Processing document data:", doc);
    
    // Ensure we have a valid document ID
    const documentId = doc.id || docId;
    if (!documentId) {
      setError("Document doesn't have a valid ID. Please try another document.");
      setLoading(false);
      return;
    }
    
    // Extract client wallet address from various possible locations
    let clientAddress = '0x0000000000000000000000000000000000000000';
    
    if (doc.user?.profile?.wallet_address && doc.user.profile.wallet_address.startsWith('0x')) {
      clientAddress = doc.user.profile.wallet_address;
    } else if (doc.user?.wallet_address && doc.user.wallet_address.startsWith('0x')) {
      clientAddress = doc.user.wallet_address;
    } else if (doc.wallet_address && doc.wallet_address.startsWith('0x')) {
      clientAddress = doc.wallet_address;
    }
    
    // Use a hardcoded address if we couldn't find a valid one
    if (clientAddress === '0x0000000000000000000000000000000000000000') {
      clientAddress = '0x9e1B746457a30C6826f778679Bc2d6AbB9db6DE7';
    }
    
    console.log("Client address resolved to:", clientAddress);
    
    // Process document data with fallbacks for missing fields
    const processedDoc = {
      id: String(documentId),
      clientName: doc.user?.username || 'Unknown Client',
      clientAddress: clientAddress,
      documentType: doc.document_type || 'Unknown Type',
      submissionDate: doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : 'Unknown',
      status: doc.status || 'Pending',
      documentHash: doc.ipfs_hash || '',
      fileName: doc.file_name || 'Document',
      fileSize: doc.file_size || 0,
      verificationNotes: doc.notes || '',
      requirements: [
        { id: 1, text: 'Document must be valid', checked: false },
        { id: 2, text: 'All information must be clearly visible', checked: false },
        { id: 3, text: 'No signs of tampering', checked: false },
        { id: 4, text: 'Document not expired', checked: false },
        { id: 5, text: 'Photo matches client description', checked: false },
        { id: 6, text: 'Security features verified', checked: false }
      ]
    };
    
    setDocument(processedDoc);
    
    if (doc.notes) {
      setVerificationNotes(doc.notes);
    }
    
    setLoading(false);
  };

  // Handle requirement toggle
  const handleRequirementToggle = (reqId) => {
    setDocument(prev => ({
      ...prev,
      requirements: prev.requirements.map(req =>
        req.id === reqId ? { ...req, checked: !req.checked } : req
      )
    }));
  };
  
  // Check if all requirements are met
  const areAllRequirementsMet = document.requirements.every(req => req.checked);
  
  // Updated handleVerification function for proper ID handling
  const handleVerification = async (action) => {
    // Basic validation
    if (action === 'approve' && !areAllRequirementsMet) {
      toast.error('All requirements must be met before approval');
      return;
    }
    
    if (!verificationNotes.trim() && action === 'reject') {
      toast.error('Please provide rejection reason in the notes');
      return;
    }
    
    // Check if we have a valid document ID
    if (!document.id) {
      toast.error('Cannot verify document: Missing document ID');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Determine status based on action
      const status = action === 'approve' ? 'Verified' : 'Rejected';
      
      // Update UI immediately for better user experience
      setDocument(prev => ({
        ...prev,
        status: status,
        verificationNotes: verificationNotes
      }));
      
      // Toast for overall process
      const processToastId = toast.loading("Processing verification...");

      // Proceed with backend verification first
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      let backendSuccess = false;
      try {
        const token = AuthService.getToken();
        if (!token) {
          throw new Error("Authentication token not found");
        }
        
        // Update document status in backend
        const response = await axios.post(`${backendUrl}/documents/${document.id}/verify/`, {
          status: status,
          notes: verificationNotes
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log("Backend verification response:", response.data);
        backendSuccess = true;
        toast.success("Document status updated in database", { id: processToastId });
      } catch (backendError) {
        console.error("Backend verification error:", backendError);
        toast.error("Database update failed, but will try blockchain", { id: processToastId });
      }
      
      // Continue with blockchain verification
      if (wallet) {
        try {
          // Initialize blockchain service
          await blockchainService.init();
          
          toast.loading("Waiting for wallet confirmation...", { id: processToastId });
          
          // Use the correct client address
          const clientAddress = document.clientAddress || "0x9e1B746457a30C6826f778679Bc2d6AbB9db6DE7";
          
          // Always use document index 0 for testing
          // In production, you should get this from the document data
          const documentIndex = 0;
          
          console.log("Blockchain verification parameters:", {
            clientAddress,
            documentIndex,
            status,
            notes: verificationNotes
          });
          
          // Execute transaction
          const tx = await blockchainService.verifyDocument(
            clientAddress,
            documentIndex,
            status,
            verificationNotes
          );
          
          console.log('Transaction receipt:', tx);
          setTxHash(tx.transactionHash || tx);
          
          toast.success("Verification completed on blockchain", { id: processToastId });
          
          // If we got here with both backend and blockchain success, log this information
          if (backendSuccess) {
            console.log("VERIFICATION COMPLETE: Both database and blockchain updated successfully");
          }
          
          // Force a refresh of any document lists
          localStorage.setItem('refresh_history', 'true');
          
          // Navigate away after a short delay
          setTimeout(() => {
            navigate('/institution/history');
          }, 2000);
          
        } catch (blockchainError) {
          console.error("Blockchain error:", blockchainError);
          
          // Even if blockchain verification fails, we might have succeeded with the backend
          if (backendSuccess) {
            toast.success("Document updated in database, but blockchain verification failed", { id: processToastId });
            
            // Force a refresh of any document lists
            localStorage.setItem('refresh_history', 'true');
            
            // Navigate away after a short delay
            setTimeout(() => {
              navigate('/institution/history');
            }, 2000);
          } else {
            if (blockchainError.code === 4001) {
              toast.error("Transaction was rejected in your wallet", { id: processToastId });
            } else {
              toast.error("Blockchain verification failed: " + blockchainError.message, { id: processToastId });
            }
          }
        }
      } else {
        // If wallet not connected but backend succeeded, still show success
        if (backendSuccess) {
          toast.success("Document updated in database (no blockchain verification)", { id: processToastId });
          
          // Force a refresh of any document lists
          localStorage.setItem('refresh_history', 'true');
          
          // Navigate away after a short delay
          setTimeout(() => {
            navigate('/institution/history');
          }, 2000);
        } else {
          toast.error("Wallet not connected. Please connect your wallet first.", { id: processToastId });
        }
      }
      
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Verification process error: " + error.message);
      
      // Revert UI state
      setDocument(prev => ({
        ...prev,
        status: 'Pending',
        verificationNotes: prev.verificationNotes
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Connect wallet handler
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      
      // Check verifier status
      try {
        const isUserVerifier = await blockchainService.isVerifier(wallet);
        if (isUserVerifier) {
          toast.success("Wallet connected successfully with verifier permissions");
        } else {
          toast.warning("Wallet connected but without verifier permissions");
        }
      } catch (permError) {
        console.warn("Permission check error:", permError);
        toast.error("Wallet connected but verifier status couldn't be determined");
      }
    } catch (error) {
      console.error("Connect wallet error:", error);
      toast.error("Failed to connect wallet. Please check MetaMask.");
    }
  };

  // Reload and retry fetching document
  const handleRetryFetch = () => {
    const documentId = getDocumentId();
    if (documentId) {
      toast.loading("Retrying document fetch...");
      fetchDocument(documentId);
    } else {
      toast.error("No document ID available for retry");
    }
  };

  // Render loading indicator
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
        </div>
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <div className="mt-4 flex space-x-4">
                <button
                  onClick={handleRetryFetch}
                  className="text-sm font-medium text-red-700 hover:text-red-600"
                >
                  Retry Fetch
                </button>
                <button
                  onClick={() => navigate('/institution/pending')}
                  className="text-sm font-medium text-red-700 hover:text-red-600"
                >
                  Return to Pending Documents
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if we have a valid ID for verification
  const isValidDocumentId = document.id && document.id !== '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Verifications
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Document Verification</h1>
            <p className="mt-2 text-sm text-gray-600">Review and verify the submitted document</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => handleVerification('approve')}
              disabled={!areAllRequirementsMet || isSubmitting || document.status !== 'Pending' || !isValidDocumentId}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                areAllRequirementsMet && !isSubmitting && document.status === 'Pending' && isValidDocumentId
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-green-300 cursor-not-allowed'
              }`}
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Approve
            </button>
            <button
              onClick={() => handleVerification('reject')}
              disabled={isSubmitting || document.status !== 'Pending' || !isValidDocumentId}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                !isSubmitting && document.status === 'Pending' && isValidDocumentId
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-red-300 cursor-not-allowed'
              }`}
            >
              <XCircle className="h-5 w-5 mr-2" />
              Reject
            </button>
          </div>
        </div>

        {/* Wallet Connection Warning */}
        {!wallet && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-yellow-800">Wallet Connection Required</h3>
                <div className="mt-2 text-yellow-700">
                  <p>Please connect your blockchain wallet to verify documents.</p>
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

        {/* Invalid Document ID Warning */}
        {!isValidDocumentId && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  Invalid document ID. Verification cannot proceed without a valid document ID.
                  Please go back and select a valid document.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Document Preview Section */}
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-gray-500" />
                  Document Preview
                </h2>
                
                {/* Document Display */}
                <div className="bg-gray-100 rounded-lg overflow-hidden mb-4 border border-gray-200">
                  <div className="aspect-w-16 aspect-h-9 sm:aspect-w-4 sm:aspect-h-5">
                    <div className="flex items-center justify-center h-full p-10 bg-gray-50">
                      <div className="text-center">
                        <UploadCloud className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">Document stored on IPFS</p>
                        <p className="text-xs text-gray-500 mt-1">{document.fileName || 'Unknown filename'}</p>
                        <p className="text-gray-400 text-sm font-mono mt-2 break-all">{document.documentHash}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <a 
                    href={ipfsService.getFileUrl(document.documentHash)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <ExternalLink className="h-5 w-5 mr-2" />
                    View on IPFS
                  </a>
                </div>
              </div>
            </div>

            {/* Document Information */}
            <div className="bg-white shadow rounded-lg">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-gray-500" />
                  Document Information
                </h2>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Client Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{document.clientName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Document Type</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {document.documentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Submission Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">{document.submissionDate}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1 text-sm">
                      {document.status === 'Verified' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Verified
                        </span>
                      )}
                      {document.status === 'Pending' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Clock className="h-4 w-4 mr-1" />
                          Pending
                        </span>
                      )}
                      {document.status === 'Rejected' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejected
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Blockchain Address</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono text-xs break-all">{document.clientAddress}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Verification Section */}
          <div className="space-y-6">
            {/* Requirements Checklist */}
            <div className="bg-white shadow rounded-lg">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Verification Requirements</h2>
                <div className="space-y-4">
                  {document.requirements.map((req) => (
                    <div key={req.id} className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id={`requirement-${req.id}`}
                          type="checkbox"
                          checked={req.checked}
                          onChange={() => handleRequirementToggle(req.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={document.status !== 'Pending' || !isValidDocumentId}
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor={`requirement-${req.id}`} className={`font-medium ${document.status !== 'Pending' ? 'text-gray-500' : 'text-gray-700'}`}>
                          {req.text}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                {!areAllRequirementsMet && document.status === 'Pending' && isValidDocumentId && (
                  <div className="mt-4 flex items-center text-sm text-yellow-600">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    All requirements must be met before approval
                  </div>
                )}
              </div>
            </div>

            {/* Verification Notes */}
            <div className="bg-white shadow rounded-lg">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  <div className="flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2 text-gray-500" />
                    Verification Notes
                  </div>
                </h2>
                {document.status !== 'Pending' ? (
                  <div className="bg-gray-50 rounded-md p-4">
                    <p className="text-sm text-gray-700">{document.verificationNotes || 'No notes provided.'}</p>
                  </div>
                ) : (
                  <textarea
                    rows={5}
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    placeholder="Add notes about the verification process..."
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                )}
              </div>
            </div>

            {/* Transaction Information (when transaction is complete) */}
            {txHash && (
              <div className="bg-white shadow rounded-lg">
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Transaction Information</h2>
                  
                  {/* Success case */}
                  {!txHash.startsWith('error-') && !txHash.startsWith('rejected-') && !txHash.startsWith('no-wallet-') && (
                    <div className="p-4 bg-green-50 border border-green-100 rounded-md">
                      <div className="flex">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-green-800">
                            Verification recorded on blockchain
                          </p>
                          <p className="mt-1 text-xs text-green-700">
                            Transaction Hash:
                          </p>
                          <p className="mt-1 text-xs font-mono break-all">
                            {txHash}
                          </p>
                          <p className="mt-3 text-sm text-green-700">
                            Redirecting to verification history...
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Error case or rejection */}
                  {(txHash.startsWith('error-') || txHash.startsWith('rejected-') || txHash.startsWith('no-wallet-')) && (
                    <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-md">
                      <div className="flex">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">
                            Document was verified in the database
                          </p>
                          <p className="mt-1 text-sm text-yellow-700">
                            {txHash.startsWith('rejected-') 
                              ? 'The blockchain transaction was rejected in MetaMask.' 
                              : txHash.startsWith('no-wallet-')
                                ? 'No wallet was connected for blockchain verification.'
                                : 'The blockchain transaction failed to complete.'}
                          </p>
                          <p className="mt-1 text-sm text-yellow-700">
                            However, the verification was still recorded in the system database.
                          </p>
                          <button
                            onClick={() => navigate('/institution/history')}
                            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                          >
                            Go to Verification History
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submission in progress */}
            {isSubmitting && !txHash && (
              <div className="bg-white shadow rounded-lg">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                    <p className="text-blue-700">Processing blockchain transaction...</p>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Please wait while the verification is being recorded on the blockchain. This may take a few moments.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerificationDocument;
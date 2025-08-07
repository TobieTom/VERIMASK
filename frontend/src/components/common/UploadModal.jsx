// src/components/common/UploadModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import ipfsService from '../../services/IPFSService';
import blockchainService from '../../services/BlockchainIntegration';
import AuthService from '../../services/AuthService';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../../contexts/WalletContext';

const UploadModal = ({ isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const { wallet, connectWallet } = useWallet();
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('passport');
  const [uploading, setUploading] = useState(false);
  const [uploadState, setUploadState] = useState({
    ipfsUploaded: false,
    ipfsHash: '',
    backendUploaded: false,
    documentId: null,
    blockchainUploaded: false,
    txHash: '',
    error: null
  });
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [canUploadNew, setCanUploadNew] = useState(false);

  const documentTypes = [
    { value: 'passport', label: 'Passport' },
    { value: 'drivers_license', label: 'Driver\'s License' },
    { value: 'national_id', label: 'National ID' },
    { value: 'utility_bill', label: 'Utility Bill' },
    { value: 'bank_statement', label: 'Bank Statement' }
  ];

  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      resetState();
      checkAuth();
    }
  }, [isOpen]);

  const resetState = () => {
    setFile(null);
    setDocumentType('passport');
    setUploading(false);
    setUploadState({
      ipfsUploaded: false,
      ipfsHash: '',
      backendUploaded: false,
      documentId: null,
      blockchainUploaded: false,
      txHash: '',
      error: null
    });
    setCanUploadNew(false);
  };

  const checkAuth = () => {
    const user = AuthService.getCurrentUser();
    if (!user || !user.token) {
      setIsAuthenticated(false);
    } else {
      setIsAuthenticated(true);
    }
  };

  const handleUploadSuccess = (documentData) => {
    console.log("Upload successful, document data:", documentData);
    
    // Store document ID in multiple storage mechanisms for redundancy
    if (documentData && documentData.id) {
      const docId = String(documentData.id);
      
      // Store in both local and session storage for redundancy
      localStorage.setItem('current_verification_id', docId);
      sessionStorage.setItem('current_verification_id', docId);
      
      console.log(`Stored document ID ${docId} in browser storage`);
    }
    
    // Enable uploading a new document
    setCanUploadNew(true);
    
    // Call the parent's onSuccess handler if provided
    if (onSuccess) {
      onSuccess(documentData);
    }
    
    toast.success('Document uploaded successfully');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadNew = () => {
    resetState();
  };

  const handleLoginRedirect = () => {
    onClose();
    navigate('/login');
  };

  const handleViewVerification = (documentId) => {
    // IMPROVED: Additional check to ensure ID is valid
    if (!documentId) {
      toast.error("Invalid document ID. Cannot proceed to verification.");
      return;
    }
    
    // Store ID in both storages
    const docIdStr = String(documentId);
    localStorage.setItem('current_verification_id', docIdStr);
    sessionStorage.setItem('current_verification_id', docIdStr);
    
    // Navigate to verification page with ID in URL
    onClose();
    navigate(`/institution/verification/${docIdStr}`);
    
    // Show toast to confirm navigation
    toast.success(`Opening document ${docIdStr} for verification`);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }
  
    // Authentication check
    const token = AuthService.getToken();
    if (!token) {
      toast.error('Your session has expired. Please log in again.');
      setIsAuthenticated(false);
      return;
    }
  
    setUploading(true);
    setUploadState({
      ipfsUploaded: false,
      ipfsHash: '',
      backendUploaded: false,
      documentId: null,
      blockchainUploaded: false,
      txHash: '',
      error: null
    });

    try {
      // Upload document with type
      const ipfsHash = await ipfsService.uploadFile(file, documentType);
      
      setUploadState(prev => ({
        ...prev,
        ipfsUploaded: true,
        ipfsHash
      }));
      
      toast.success('Document uploaded to IPFS');
      
      // Get document ID from the most recent document with this hash
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await axios.get(`${backendUrl}/documents/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Find the document with the matching IPFS hash - most recent first
      let matchingDocs = response.data.filter(doc => doc.ipfs_hash === ipfsHash);
      // Sort by upload date descending
      matchingDocs.sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
      const document = matchingDocs[0];
      
      if (document) {
        const docId = String(document.id);
        setUploadState(prev => ({
          ...prev,
          backendUploaded: true,
          documentId: docId
        }));
        
        // Store document ID in both localStorage and sessionStorage
        localStorage.setItem('current_verification_id', docId);
        sessionStorage.setItem('current_verification_id', docId);
        
        toast.success('Document saved successfully');
        
        // Try blockchain upload if wallet is connected
        try {
          if (wallet) {
            const blockchainToast = toast.loading('Recording on blockchain...');
            const tx = await blockchainService.uploadDocument(ipfsHash, documentType);
            setUploadState(prev => ({
              ...prev,
              blockchainUploaded: true,
              txHash: tx.transactionHash
            }));
            toast.dismiss(blockchainToast);
            toast.success('Document recorded on blockchain');
          }
        } catch (blockchainError) {
          console.error("Blockchain upload error:", blockchainError);
          toast.error('Document saved but blockchain recording failed');
        }
        
        // Call success handler
        handleUploadSuccess({
          id: docId,
          ipfsHash,
          documentType,
          fileName: file.name,
          fileSize: file.size
        });
      } else {
        // If we couldn't find the document in the backend response,
        // we'll use what we know from the upload
        setUploadState(prev => ({
          ...prev,
          backendUploaded: true,
          documentId: "unknown-id"
        }));
        
        handleUploadSuccess({
          id: "unknown-id",
          ipfsHash,
          documentType,
          fileName: file.name,
          fileSize: file.size
        });
      }
    } catch (error) {
      console.error("IPFS upload error:", error);
      setUploadState(prev => ({
        ...prev,
        error: error.message
      }));
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative bg-white rounded-lg max-w-lg w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-medium">Upload Document</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-6">
            {!isAuthenticated ? (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                  <h4 className="text-yellow-700 font-medium">Authentication Required</h4>
                </div>
                <p className="mt-2 text-sm text-yellow-600">
                  Your session has expired or you are not logged in. Please log in to continue.
                </p>
                <button
                  onClick={handleLoginRedirect}
                  className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
                >
                  Go to Login
                </button>
              </div>
            ) : uploadState.error ? (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                  <h4 className="text-red-700 font-medium">Upload Failed</h4>
                </div>
                <p className="mt-2 text-sm text-red-600">{uploadState.error}</p>
                <button
                  onClick={resetState}
                  className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Try Again
                </button>
              </div>
            ) : uploadState.backendUploaded ? (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <h4 className="text-green-700 font-medium">Upload Successful</h4>
                </div>
                <div className="mt-2 space-y-2 text-sm">
                  {uploadState.documentId && (
                    <p className="text-gray-700">
                      <span className="font-medium">Document ID:</span>
                      <span className="ml-2 font-mono">{uploadState.documentId}</span>
                    </p>
                  )}
                  <p className="text-gray-700">
                    <span className="font-medium">IPFS Hash:</span>
                    <span className="ml-2 font-mono break-all">{uploadState.ipfsHash}</span>
                  </p>
                  {uploadState.blockchainUploaded && (
                    <p className="text-gray-700">
                      <span className="font-medium">Transaction Hash:</span>
                      <span className="ml-2 font-mono break-all">{uploadState.txHash}</span>
                    </p>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    onClick={onClose}
                    className="inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Close
                  </button>
                  
                  <button
                    onClick={handleUploadNew}
                    className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Upload Another
                  </button>
                  
                  {uploadState.ipfsHash && (
                    <a 
                      href={`https://gateway.pinata.cloud/ipfs/${uploadState.ipfsHash}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 sm:col-span-2"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on IPFS
                    </a>
                  )}
                  
                  {uploadState.documentId && uploadState.documentId !== "unknown-id" && (
                    <button
                      onClick={() => handleViewVerification(uploadState.documentId)}
                      className="inline-flex justify-center items-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 sm:col-span-2"
                    >
                      View Document Details
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Document Type Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Type
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={uploading}
                  >
                    {documentTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* File Input */}
                <div className="mb-6">
                  {file ? (
                    <div className="p-4 border border-gray-200 rounded-md">
                      <div className="flex items-center">
                        <FileText className="h-6 w-6 text-gray-400 mr-3" />
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                        <button
                          onClick={() => setFile(null)}
                          className="ml-auto text-gray-400 hover:text-gray-500"
                          disabled={uploading}
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-6 relative">
                      <div className="text-center">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          PDF, PNG, JPG up to 5MB
                        </p>
                      </div>
                      <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                        disabled={uploading}
                      />
                    </div>
                  )}
                </div>
                
                {/* Upload Button */}
                <button
                  onClick={handleUpload}
                  disabled={uploading || !file}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    uploading || !file ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
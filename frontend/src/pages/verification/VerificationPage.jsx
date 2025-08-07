// src/pages/verification/VerificationPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  AlertTriangle, 
  ArrowLeft, 
  MessageSquare, 
  UploadCloud,
  Shield,
  Download,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import blockchainService from '../../services/BlockchainIntegration';
import ipfsService from '../../services/IPFSService';
import { useWallet } from '../../contexts/WalletContext';

const VerificationPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { wallet, connectWallet, isVerifier } = useWallet();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Document state
  const [document, setDocument] = useState({
    id: '0',
    clientName: '',
    clientAddress: '',
    documentType: '',
    documentHash: '',
    submissionDate: '',
    status: 'Pending',
    notes: '',
    verificationRequirements: [
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
  const [processingTx, setProcessingTx] = useState(false);
  const [txHash, setTxHash] = useState('');
  
  // Fetch document data
  useEffect(() => {
    const fetchDocument = async () => {
      setLoading(true);
      try {
        // In a real implementation, you would fetch this from your API
        // For demo purposes, we'll use mock data
        setTimeout(() => {
          setDocument({
            id: id || '123',
            clientName: 'John Smith',
            clientAddress: '0x1234567890abcdef1234567890abcdef12345678',
            documentType: 'Passport',
            documentHash: 'QmXb5M6qCMKRRKqjARKb5XBgtaDfbvCt7uCYgECgVJDXXX',
            submissionDate: '2025-02-22',
            status: 'Pending',
            notes: '',
            verificationRequirements: [
              { id: 1, text: 'Document must be valid', checked: false },
              { id: 2, text: 'All information must be clearly visible', checked: false },
              { id: 3, text: 'No signs of tampering', checked: false },
              { id: 4, text: 'Document not expired', checked: false },
              { id: 5, text: 'Photo matches client description', checked: false },
              { id: 6, text: 'Security features verified', checked: false }
            ]
          });
          setLoading(false);
        }, 1000);
      } catch (err) {
        setError('Failed to fetch document details');
        setLoading(false);
      }
    };
    
    fetchDocument();
  }, [id]);
  
  // Handle requirement toggle
  const handleRequirementToggle = (reqId) => {
    setDocument(prev => ({
      ...prev,
      verificationRequirements: prev.verificationRequirements.map(req =>
        req.id === reqId ? { ...req, checked: !req.checked } : req
      )
    }));
  };
  
  // Check if all requirements are met
  const areAllRequirementsMet = document.verificationRequirements.every(req => req.checked);
  
  // Handle verification (approve/reject)
  const handleVerification = async (action) => {
    if (action === 'approve' && !areAllRequirementsMet) {
      toast.error('All requirements must be met before approval');
      return;
    }
    
    if (!verificationNotes.trim() && action === 'reject') {
      toast.error('Please provide rejection reason in the notes');
      return;
    }
    
    setProcessingTx(true);
    
    try {
      // Initialize blockchain connection
      await blockchainService.init();
      
      // Connect wallet if not already connected
      if (!wallet) {
        await connectWallet();
      }
      
      // Perform blockchain verification
      const status = action === 'approve' ? 'Verified' : 'Rejected';
      const tx = await blockchainService.verifyDocument(
        document.clientAddress,
        document.id,
        status,
        verificationNotes
      );
      
      setTxHash(tx.transactionHash);
      
      toast.success(`Document ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      
      // Update document status
      setDocument(prev => ({
        ...prev,
        status: status,
        notes: verificationNotes
      }));
      
      // Wait a moment before redirecting
      setTimeout(() => {
        navigate('/institution/history');
      }, 3000);
    } catch (err) {
      toast.error(`Failed to ${action} document: ${err.message}`);
    } finally {
      setProcessingTx(false);
    }
  };
  
  // Get IPFS gateway URL
  const getIpfsUrl = (hash) => {
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  };

  // Connect wallet handler
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      toast.error('Failed to connect wallet');
    }
  };

  // Render loading state
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
      </div>

      {!wallet ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
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
      ) : !isVerifier && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-yellow-800">Verifier Permissions Required</h3>
              <p className="mt-2 text-yellow-700">
                Your account does not have verifier permissions. Please contact an admin to get access.
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
                      <p className="text-gray-400 text-sm font-mono mt-2 break-all">{document.documentHash}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
                <a 
                  href={getIpfsUrl(document.documentHash)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="h-5 w-5 mr-2" />
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
                  <dd className="mt-1 text-sm text-gray-900">{document.documentType}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Submission Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">{document.submissionDate}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Blockchain Address</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono text-xs break-all">{document.clientAddress}</dd>
                </div>
                <div className="sm:col-span-2">
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
                {document.verificationRequirements.map((req) => (
                  <div key={req.id} className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id={`requirement-${req.id}`}
                        type="checkbox"
                        checked={req.checked}
                        onChange={() => handleRequirementToggle(req.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        disabled={document.status !== 'Pending' || !wallet || !isVerifier}
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
              {!areAllRequirementsMet && document.status === 'Pending' && (
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
                  <p className="text-sm text-gray-700">{document.notes || 'No notes provided.'}</p>
                </div>
              ) : (
                <textarea
                  rows={5}
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Add notes about the verification process..."
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled={!wallet || !isVerifier}
                />
              )}
            </div>
          </div>

          {/* Verification Actions */}
          {document.status === 'Pending' && wallet && (
            <div className="bg-white shadow rounded-lg">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Verification Actions</h2>
                <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => handleVerification('approve')}
                    disabled={!areAllRequirementsMet || processingTx || !isVerifier}
                    className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                      areAllRequirementsMet && !processingTx && isVerifier
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-green-300 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Approve Document
                  </button>
                  <button
                    onClick={() => handleVerification('reject')}
                    disabled={processingTx || !isVerifier}
                    className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                      processingTx || !isVerifier
                        ? 'bg-red-300 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    <XCircle className="h-5 w-5 mr-2" />
                    Reject Document
                  </button>
                </div>
                
                {processingTx && (
                  <div className="mt-4 p-4 border border-yellow-300 bg-yellow-50 rounded-md">
                    <div className="flex items-center">
                      <div className="mr-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-700"></div>
                      </div>
                      <p className="text-sm text-yellow-700">
                        Processing blockchain transaction...
                      </p>
                    </div>
                  </div>
                )}
                
                {txHash && (
                  <div className="mt-4 p-4 border border-green-300 bg-green-50 rounded-md">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm text-green-700 font-medium">Transaction successful!</p>
                        <p className="text-xs text-green-600 mt-1 font-mono break-all">{txHash}</p>
                        <p className="text-xs text-green-600 mt-1">Redirecting to verification history...</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Blockchain Record */}
          {document.status !== 'Pending' && (
            <div className="bg-white shadow rounded-lg">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Blockchain Record</h2>
                <div className="bg-gray-50 rounded-md p-4">
                  <dl className="divide-y divide-gray-200">
                    <div className="py-3 flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="text-sm text-gray-900">{document.status}</dd>
                    </div>
                    <div className="py-3 flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Timestamp</dt>
                      <dd className="text-sm text-gray-900">Feb 24, 2025 10:23 AM</dd>
                    </div>
                    <div className="py-3 flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Transaction Hash</dt>
                      <dd className="text-sm text-gray-900 font-mono text-xs break-all">
                        0x3a8e7f512f0a8245319a4caec21ede4c82e7a295dcb9b8afa1bc44442ceb25c4
                      </dd>
                    </div>
                    <div className="py-3 flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Block Number</dt>
                      <dd className="text-sm text-gray-900">14356802</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationPage;
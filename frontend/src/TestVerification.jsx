// // Fixed TestVerification.jsx
// import React, { useState } from 'react';
// import { toast } from 'react-hot-toast';
// import { CheckCircle, XCircle, ExternalLink } from 'lucide-react';
// import blockchainService from '../../frontend/src/services/BlockchainIntegration';

// const TestVerification = () => {
//   const [loading, setLoading] = useState(false);
//   const [verifying, setVerifying] = useState(false);
//   const [userAddress, setUserAddress] = useState('');
//   const [documentIndex, setDocumentIndex] = useState(0);
//   const [document, setDocument] = useState(null);
//   const [notes, setNotes] = useState('');

//   const fetchDocument = async () => {
//     if (!userAddress) {
//       toast.error('Please enter a user address');
//       return;
//     }

//     setLoading(true);
//     try {
//       // Connect wallet
//       await blockchainService.connectWallet();
      
//       // Get document from blockchain
//       const doc = await blockchainService.getDocument(userAddress, documentIndex);
//       setDocument({
//         documentHash: doc.documentHash,
//         documentType: doc.documentType,
//         status: doc.status,
//         timestamp: new Date(doc.timestamp * 1000).toLocaleString(),
//         verifier: doc.verifier,
//         notes: doc.notes
//       });
//     } catch (error) {
//       console.error('Error fetching document:', error);
//       toast.error('Failed to fetch document: ' + error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleVerify = async (status) => {
//     if (!document) return;

//     setVerifying(true);
//     try {
//       // Connect wallet
//       await blockchainService.connectWallet();
      
//       // Verify document
//       const tx = await blockchainService.verifyDocument(
//         userAddress,
//         documentIndex,
//         status,
//         notes
//       );
      
//       toast.success(`Document ${status === 'Verified' ? 'approved' : 'rejected'} successfully`);
      
//       // Fetch updated document
//       await fetchDocument();
//     } catch (error) {
//       console.error('Verification error:', error);
//       toast.error('Verification failed: ' + error.message);
//     } finally {
//       setVerifying(false);
//     }
//   };

//   return (
//     <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
//       <h1 className="text-2xl font-semibold mb-6">Test Document Verification</h1>
      
//       <div className="mb-4">
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           User Address
//         </label>
//         <input
//           type="text"
//           value={userAddress}
//           onChange={(e) => setUserAddress(e.target.value)}
//           placeholder="0x..."
//           className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
//         />
//       </div>
      
//       <div className="mb-4">
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           Document Index
//         </label>
//         <input
//           type="number"
//           value={documentIndex}
//           onChange={(e) => setDocumentIndex(parseInt(e.target.value))}
//           min="0"
//           className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
//         />
//       </div>
      
//       <button
//         onClick={fetchDocument}
//         disabled={loading}
//         className="w-full bg-blue-600 text-white p-2 rounded mb-4 hover:bg-blue-700"
//       >
//         {loading ? 'Loading...' : 'Fetch Document'}
//       </button>
      
//       {document && (
//         <div className="mt-6 border border-gray-200 rounded-md p-4">
//           <h3 className="text-lg font-medium mb-4">Document Details</h3>
          
//           <div className="grid grid-cols-2 gap-4 mb-4">
//             <div>
//               <p className="text-sm text-gray-500">Document Type</p>
//               <p className="font-medium">{document.documentType}</p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-500">Status</p>
//               <p className="font-medium">{document.status}</p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-500">Timestamp</p>
//               <p className="font-medium">{document.timestamp}</p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-500">IPFS Hash</p>
//               <p className="font-mono text-xs break-all">{document.documentHash}</p>
//             </div>
//           </div>
          
//           <div className="mb-4">
//             <a
//               href={`https://gateway.pinata.cloud/ipfs/${document.documentHash}`}
//               target="_blank"
//               rel="noopener noreferrer"
//               className="text-blue-600 hover:underline flex items-center"
//             >
//               <ExternalLink className="h-4 w-4 mr-1" />
//               View Document on IPFS
//             </a>
//           </div>
          
//           <div className="mb-4">
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Verification Notes
//             </label>
//             <textarea
//               value={notes}
//               onChange={(e) => setNotes(e.target.value)}
//               className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
//               rows={3}
//             />
//           </div>
          
//           <div className="flex space-x-4">
//             <button
//               onClick={() => handleVerify('Verified')}
//               disabled={verifying}
//               className="flex-1 bg-green-600 text-white p-2 rounded flex items-center justify-center hover:bg-green-700"
//             >
//               <CheckCircle className="mr-2 h-5 w-5" />
//               Approve
//             </button>
//             <button
//               onClick={() => handleVerify('Rejected')}
//               disabled={verifying}
//               className="flex-1 bg-red-600 text-white p-2 rounded flex items-center justify-center hover:bg-red-700"
//             >
//               <XCircle className="mr-2 h-5 w-5" />
//               Reject
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default TestVerification;
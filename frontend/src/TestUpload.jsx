// // Fixed TestUpload.jsx
// import React, { useState } from 'react';
// import { toast } from 'react-hot-toast';
// import { Upload, Check, AlertTriangle, Link } from 'lucide-react';
// import blockchainService from '../src/services/BlockchainIntegration';

// const TestUpload = () => {
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [documentType, setDocumentType] = useState('passport');
//   const [uploading, setUploading] = useState(false);
//   const [ipfsHash, setIpfsHash] = useState('');
//   const [txHash, setTxHash] = useState('');
  
//   const handleFileChange = (e) => {
//     if (e.target.files && e.target.files[0]) {
//       setSelectedFile(e.target.files[0]);
//     }
//   };
  
//   const handleTypeChange = (e) => {
//     setDocumentType(e.target.value);
//   };
  
//   const handleUpload = async () => {
//     if (!selectedFile) {
//       toast.error('Please select a file first');
//       return;
//     }
    
//     setUploading(true);
    
//     try {
//       // 1. Connect wallet
//       await blockchainService.connectWallet();
      
//       // 2. Upload to Pinata
//       const formData = new FormData();
//       formData.append('file', selectedFile);
      
//       const pinataApiKey = 'd138fddd7e7457d6be27';
//       const pinataApiSecret = 'def6a690a7990307247439ea4af76460525e696eeeb288f23a0078b17b318120';
      
//       const pinataToast = toast.loading('Uploading to IPFS via Pinata...');
      
//       const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
//         method: 'POST',
//         headers: {
//           'pinata_api_key': pinataApiKey,
//           'pinata_secret_api_key': pinataApiSecret
//         },
//         body: formData
//       });
      
//       const result = await response.json();
      
//       if (!result.IpfsHash) {
//         throw new Error('Failed to get IPFS hash from Pinata');
//       }
      
//       setIpfsHash(result.IpfsHash);
//       toast.dismiss(pinataToast);
//       toast.success('Successfully uploaded to IPFS');
      
//       // 3. Upload to blockchain
//       const blockchainToast = toast.loading('Recording on blockchain...');
//       const tx = await blockchainService.uploadDocument(result.IpfsHash, documentType);
//       setTxHash(tx.transactionHash);
//       toast.dismiss(blockchainToast);
//       toast.success('Document recorded on blockchain');
      
//     } catch (error) {
//       console.error('Upload error:', error);
//       toast.dismiss();
//       toast.error('Upload failed: ' + error.message);
//     } finally {
//       setUploading(false);
//     }
//   };
  
//   return (
//     <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
//       <h1 className="text-2xl font-semibold mb-6">Complete Document Upload Test</h1>
      
//       <div className="mb-4">
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           Document Type
//         </label>
//         <select
//           value={documentType}
//           onChange={handleTypeChange}
//           className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//         >
//           <option value="passport">Passport</option>
//           <option value="drivers_license">Driver's License</option>
//           <option value="national_id">National ID</option>
//           <option value="utility_bill">Utility Bill</option>
//           <option value="bank_statement">Bank Statement</option>
//         </select>
//       </div>
      
//       <div className="mb-6">
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           Document File
//         </label>
//         <input
//           type="file"
//           onChange={handleFileChange}
//           className="w-full border border-gray-300 rounded p-2"
//         />
//       </div>
      
//       <button
//         onClick={handleUpload}
//         disabled={uploading || !selectedFile}
//         className={`w-full ${uploading || !selectedFile ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'} text-white p-3 rounded`}
//       >
//         {uploading ? 'Uploading...' : 'Upload Document'}
//       </button>
      
//       {ipfsHash && (
//         <div className="mt-6 p-4 border border-green-200 rounded-md bg-green-50">
//           <h3 className="text-lg font-medium flex items-center text-green-800">
//             <Check className="h-5 w-5 mr-2" />
//             Document Uploaded Successfully
//           </h3>
          
//           <div className="mt-4">
//             <p className="text-sm text-gray-600">
//               <strong>IPFS Hash:</strong>
//               <span className="font-mono text-xs ml-2 break-all">{ipfsHash}</span>
//             </p>
//             <p className="mt-2">
//               <a
//                 href={`https://gateway.pinata.cloud/ipfs/${ipfsHash}`}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="flex items-center text-sm text-blue-600 hover:text-blue-800"
//               >
//                 <Link className="h-4 w-4 mr-1" />
//                 View on IPFS
//               </a>
//             </p>
            
//             {txHash && (
//               <p className="mt-4 text-sm text-gray-600">
//                 <strong>Transaction Hash:</strong>
//                 <span className="font-mono text-xs ml-2 break-all">{txHash}</span>
//               </p>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default TestUpload;
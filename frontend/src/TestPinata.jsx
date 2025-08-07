// // TestPinata.jsx
// import React, { useState } from 'react';
// import { toast } from 'react-hot-toast';
// import { Upload } from 'lucide-react';

// const TestPinata = () => {
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [uploading, setUploading] = useState(false);
//   const [ipfsHash, setIpfsHash] = useState('');
  
//   const handleFileChange = (e) => {
//     if (e.target.files && e.target.files[0]) {
//       setSelectedFile(e.target.files[0]);
//     }
//   };
  
//   const handleUpload = async () => {
//     if (!selectedFile) {
//       toast.error('Please select a file first');
//       return;
//     }
    
//     setUploading(true);
    
//     try {
//       // Upload to Pinata
//       const formData = new FormData();
//       formData.append('file', selectedFile);
      
//       const pinataApiKey = 'YOUR_PINATA_API_KEY';
//       const pinataApiSecret = 'YOUR_PINATA_API_SECRET';
      
//       const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
//         method: 'POST',
//         headers: {
//           'pinata_api_key': pinataApiKey,
//           'pinata_secret_api_key': pinataApiSecret
//         },
//         body: formData
//       });
      
//       const result = await response.json();
      
//       if (result.IpfsHash) {
//         setIpfsHash(result.IpfsHash);
//         toast.success('File uploaded to IPFS via Pinata');
//       } else {
//         throw new Error('Failed to get IPFS hash');
//       }
//     } catch (error) {
//       console.error('Upload error:', error);
//       toast.error('Failed to upload to Pinata: ' + error.message);
//     } finally {
//       setUploading(false);
//     }
//   };
  
//   return (
//     <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
//       <h1 className="text-2xl font-semibold mb-6">Test Pinata IPFS Upload</h1>
      
//       <div className="mb-6">
//         <input
//           type="file"
//           onChange={handleFileChange}
//           className="form-control"
//         />
//       </div>
      
//       <button
//         onClick={handleUpload}
//         disabled={uploading || !selectedFile}
//         className="w-full bg-blue-500 text-white p-2 rounded"
//       >
//         {uploading ? 'Uploading...' : 'Upload to Pinata'}
//       </button>
      
//       {ipfsHash && (
//         <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
//           <p>IPFS Hash: {ipfsHash}</p>
//           <a 
//             href={`https://gateway.pinata.cloud/ipfs/${ipfsHash}`}
//             target="_blank"
//             rel="noopener noreferrer"
//             className="text-blue-500 hover:underline"
//           >
//             View on IPFS
//           </a>
//         </div>
//       )}
//     </div>
//   );
// };

// export default TestPinata;
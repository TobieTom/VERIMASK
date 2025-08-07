// src/services/IPFSService.js - Updated
import axios from 'axios';
import AuthService from './AuthService';

class IPFSService {
  constructor() {
    // Pinata credentials from environment variables
    this.apiKey = import.meta.env.VITE_PINATA_API_KEY;
    this.apiSecret = import.meta.env.VITE_PINATA_API_SECRET;
    
    // Multiple IPFS gateways for reliability
    this.gateways = [
      'https://gateway.pinata.cloud/ipfs/',
      'https://ipfs.io/ipfs/',
      'https://gateway.ipfs.io/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://dweb.link/ipfs/'
    ];
    
    // Log initialization
    console.log("IPFS Service initialized");
  }
  
  async uploadFile(file, documentType = 'passport') {
    try {
      console.log("Starting document upload for file:", file.name);
      
      // Get token for authentication
      const token = AuthService.getToken();
      
      if (!token) {
        throw new Error("Authentication required for document upload");
      }
      
      // Get backend URL from environment
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      
      // Create form data for document upload endpoint
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);
      
      console.log("Uploading document to:", `${backendUrl}/documents/upload/`);
      
      // Send directly to the document upload endpoint which handles IPFS internally
      const response = await axios.post(
        `${backendUrl}/documents/upload/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log("Document upload response:", response.data);
      
      // Extract IPFS hash from response
      let ipfsHash;
      if (response.data && response.data.ipfs_hash) {
        ipfsHash = response.data.ipfs_hash;
      } else if (response.data && response.data.document && response.data.document.ipfs_hash) {
        ipfsHash = response.data.document.ipfs_hash;
      } else if (response.data && response.data.ipfsHash) {
        ipfsHash = response.data.ipfsHash;
      } else {
        throw new Error("No IPFS hash found in response");
      }
      
      console.log("Document upload successful, IPFS hash:", ipfsHash);
      return ipfsHash;
    } catch (error) {
      console.error("Error uploading document:", error);
      
      // Provide more detailed error message
      const errorMessage = error.response ? 
        `Upload failed: ${error.response.status} - ${error.response.data?.detail || error.response.statusText}` : 
        `Upload failed: ${error.message}`;
      
      throw new Error(errorMessage);
    }
  }
  
  getFileUrl(ipfsHash) {
    if (!ipfsHash) return null;
    return `${this.gateways[0]}${ipfsHash}`;
  }
  
  // Get alternative gateway URLs for a hash
  getAllGateways(ipfsHash) {
    if (!ipfsHash) return [];
    
    return this.gateways.map(gateway => ({
      name: gateway.split('/')[2], // Extract domain name
      url: `${gateway}${ipfsHash}`
    }));
  }
}

// Create singleton instance
const ipfsService = new IPFSService();
export default ipfsService;
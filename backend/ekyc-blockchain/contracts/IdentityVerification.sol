// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract IdentityVerification {
    struct Document {
        string documentHash;  // IPFS hash of the document
        string documentType;  // Type of document (passport, ID, etc.)
        string status;        // "Pending", "Verified", or "Rejected"
        uint256 timestamp;    // When the document was uploaded
        address verifier;     // Address of the institution that verified it
        string notes;         // Optional verification notes
    }
    
    // Map user addresses to their documents
    mapping(address => Document[]) public userDocuments;
    
    // Map institution addresses to their verification rights
    mapping(address => bool) public verifiers;
    
    // Contract owner
    address public owner;
    
    // Events for tracking actions
    event DocumentUploaded(address indexed user, string documentType, string documentHash);
    event DocumentVerified(address indexed user, address indexed verifier, uint docIndex, string status);
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    
    constructor() {
        owner = msg.sender;
    }
    
    // Only owner can call this function
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // Only verified institutions can call this function
    modifier onlyVerifier() {
        require(verifiers[msg.sender], "Only authorized verifiers can call this function");
        _;
    }
    
    // Add a new institution that can verify documents
    function addVerifier(address _verifier) public onlyOwner {
        verifiers[_verifier] = true;
        emit VerifierAdded(_verifier);
    }
    
    // Remove a verifier
    function removeVerifier(address _verifier) public onlyOwner {
        verifiers[_verifier] = false;
        emit VerifierRemoved(_verifier);
    }
    
    // Upload a document for verification
    function uploadDocument(string memory _documentHash, string memory _documentType) public {
        Document memory newDoc = Document({
            documentHash: _documentHash,
            documentType: _documentType,
            status: "Pending",
            timestamp: block.timestamp,
            verifier: address(0),
            notes: ""
        });
        
        userDocuments[msg.sender].push(newDoc);
        emit DocumentUploaded(msg.sender, _documentType, _documentHash);
    }
    
    // Verify a document
    function verifyDocument(address _user, uint _docIndex, string memory _status, string memory _notes) public onlyVerifier {
        require(_docIndex < userDocuments[_user].length, "Document does not exist");
        
        Document storage doc = userDocuments[_user][_docIndex];
        doc.status = _status;
        doc.verifier = msg.sender;
        doc.notes = _notes;
        
        emit DocumentVerified(_user, msg.sender, _docIndex, _status);
    }
    
    // Get the number of documents for a user
    function getDocumentCount(address _user) public view returns (uint) {
        return userDocuments[_user].length;
    }
    
    // Get a document's details
    function getDocument(address _user, uint _index) public view returns (
        string memory documentHash,
        string memory documentType,
        string memory status,
        uint256 timestamp,
        address verifier,
        string memory notes
    ) {
        require(_index < userDocuments[_user].length, "Document does not exist");
        
        Document storage doc = userDocuments[_user][_index];
        return (
            doc.documentHash,
            doc.documentType,
            doc.status,
            doc.timestamp,
            doc.verifier,
            doc.notes
        );
    }
    
    // Check if an address is a verifier
    function isVerifier(address _addr) public view returns (bool) {
        return verifiers[_addr];
    }
}
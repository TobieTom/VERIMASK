const IdentityVerification = artifacts.require("IdentityVerification");

contract("IdentityVerification", accounts => {
  const owner = accounts[0];
  const institution = accounts[1];
  const client = accounts[2];
  
  let identityVerification;
  
  beforeEach(async () => {
    identityVerification = await IdentityVerification.new({ from: owner });
  });
  
  it("should allow the owner to add verifiers", async () => {
    await identityVerification.addVerifier(institution, { from: owner });
    const isVerifier = await identityVerification.isVerifier(institution);
    assert.equal(isVerifier, true, "Institution should be a verifier");
  });
  
  it("should allow clients to upload documents", async () => {
    const docHash = "QmXb5M6qCMKRRKqjARKb5XBgtaDfbvCt7uCYgECgVJDXXX";
    const docType = "passport";
    
    await identityVerification.uploadDocument(docHash, docType, { from: client });
    
    const docCount = await identityVerification.getDocumentCount(client);
    assert.equal(docCount, 1, "Document count should be 1");
    
    const document = await identityVerification.getDocument(client, 0);
    assert.equal(document.documentHash, docHash, "Document hash should match");
    assert.equal(document.documentType, docType, "Document type should match");
    assert.equal(document.status, "Pending", "Status should be Pending");
  });
  
  it("should allow verifiers to verify documents", async () => {
    // Add institution as verifier
    await identityVerification.addVerifier(institution, { from: owner });
    
    // Upload a document
    const docHash = "QmXb5M6qCMKRRKqjARKb5XBgtaDfbvCt7uCYgECgVJDXXX";
    const docType = "passport";
    await identityVerification.uploadDocument(docHash, docType, { from: client });
    
    // Verify the document
    const status = "Verified";
    const notes = "All looks good";
    await identityVerification.verifyDocument(client, 0, status, notes, { from: institution });
    
    // Check document status
    const document = await identityVerification.getDocument(client, 0);
    assert.equal(document.status, status, "Status should be updated");
    assert.equal(document.notes, notes, "Notes should be updated");
    assert.equal(document.verifier, institution, "Verifier should be the institution");
  });
});
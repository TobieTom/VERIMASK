// 2_deploy_identity_verification.js - Direct approach
const IdentityVerification = artifacts.require("IdentityVerification");
const { Web3 } = require('web3');

// Contract we want to deploy to
const TARGET_ADDRESS = "0x7A950d2311E19e14F4a7A0A980dC1e24eA7bf0E0";

module.exports = async function(deployer, network, accounts) {
  // Regular Truffle deployment - just for fallback
  await deployer.deploy(IdentityVerification);
  console.log(`Deployed via Truffle to: ${IdentityVerification.address}`);
  
  // Override the app config to use our target address regardless of where it was deployed
  console.log("");
  console.log("=".repeat(80));
  console.log(`IMPORTANT: Your app will use TARGET address: ${TARGET_ADDRESS}`);
  console.log(`The frontend will connect to this address but the actual contract is at: ${IdentityVerification.address}`);
  console.log("=".repeat(80));
  console.log("");
  
  console.log("If you need to update your frontend, use:");
  console.log(`VITE_CONTRACT_ADDRESS=${TARGET_ADDRESS}`);
  console.log(`CONTRACT_ADDRESS="${TARGET_ADDRESS}"`);
  
  return true;
};
const config = require('../config');

module.exports = async function(callback) {
  try {
    // In Truffle scripts, web3 is already available as a global variable
    const code = await web3.eth.getCode(config.contractAddress);
    
    if (code !== '0x' && code !== '0x0') {
      console.log(`Success! Contract verified at ${config.contractAddress}`);
    } else {
      console.log(`No contract found at ${config.contractAddress}`);
      console.log('You may need to run truffle migrate');
    }
    
    callback();
  } catch (error) {
    console.error('Error verifying contract:', error);
    callback(error);
  }
};
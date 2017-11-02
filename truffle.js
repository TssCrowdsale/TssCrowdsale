require('babel-register');
require('babel-polyfill');
var HDWalletProvider = require("truffle-hdwallet-provider");

let credentials = require('./.credentials.json');
let mnemonic = credentials.mnemonic;
let infura_apikey = credentials.infura_apikey;

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },

   ropsten: {
     provider: new HDWalletProvider(mnemonic, "https://ropsten.infura.io/"+infura_apikey),
     network_id: 3,
     gas: 4612388
   }
    
// ropsten: {
//       host: "localhost",
//       port: 8545,
//       network_id: "3",
//       from: "0x3313F6036c214Aab173f6DE0E11Cd3d0bB722669",
//       gas: 3012388
//     }
  }


};



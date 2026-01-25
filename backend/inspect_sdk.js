const sdk = require("@stellar/stellar-sdk");
console.log("Keys:", Object.keys(sdk));
if (sdk.rpc) console.log("Has sdk.rpc");
if (sdk.SorobanRpc) console.log("Has sdk.SorobanRpc");

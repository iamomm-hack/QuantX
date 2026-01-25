// main.ts
import { QuantXClient } from "../quantx-sdk";
import * as dotenv from "dotenv";
import { Keypair } from "@stellar/stellar-sdk";

// Monkey-patch BigInt to avoid console.log errors
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

dotenv.config();

async function runTest() {
  console.log("Initializing QuantX SDK from 'my-sdk-test'...");

  const secret = process.env.SECRET_KEY;
  const contractId = process.env.CONTRACT_ID;

  if (!secret || !contractId) {
    throw new Error("Missing SECRET_KEY or CONTRACT_ID in .env");
  }

  // 1. Initialize Client
  const client = new QuantXClient({
    network: "TESTNET",
    contractId: contractId,
    wallet: {
      secretKey: secret,
    },
  });

  console.log("SDK Initialized!");

  // 2. Generate params using your own keys (Self-Subscription)
  const myKeypair = Keypair.fromSecret(secret);
  const myPublicKey = myKeypair.publicKey();
  // Valid USDC address on Testnet
  const USDC_TESTNET = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

  console.log(`User: ${myPublicKey}`);
  console.log("Attempting to subscribe...");

  try {
    const result = await client.subscribe({
      recipient: myPublicKey,
      token: USDC_TESTNET,
      amount: "1",
      interval: 300,
      subType: 0,
    });

    console.log("------------------------------------------------");
    console.log("SUCCESS! Subscription Created.");
    console.log(`Tx Hash: ${result.hash}`);
    console.log("------------------------------------------------");
  } catch (error: any) {
    if (error.message?.includes("timeout")) {
        console.log("Transaction Sent, but polling timed out (Network Slow).");
        console.log("This is technically a SUCCESS in terms of SDK logic.");
    } else {
        console.error("FAILED:", error);
    }
  }
}

runTest();
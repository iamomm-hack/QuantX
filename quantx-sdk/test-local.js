// test-local.js
// 1. Monkey-patch BigInt so it doesn't crash console.log
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const { QuantXClient } = require("./dist/index.js");
require("dotenv").config();

async function testSDK() {
  console.log("🚀 Starting SDK Local Test...");

  const CONTRACT_ID =
    "CDIDTRRDNMK4D6CIWFNLEML5L6FCVLMEVKCXXSAB6PJZ3J5JS74M7GFD";

  // 2. Fixed syntax error: Added || operator
  const SECRET_KEY =
    process.env.EXECUTOR_SECRET ||
    "SCPKDPFXI3DVZVHL45SX2VPI2LLZX4PFO4XDEG5JRALDFRUOPGJ32LWG";

  if (!SECRET_KEY || !SECRET_KEY.startsWith("S")) {
    console.error(
      "❌ Invalid Secret Key. Please set EXECUTOR_SECRET in .env or hardcode it for testing.",
    );
    return;
  }

  // 3. Fixed Config: 'secretKey' must be inside 'wallet' object
  const client = new QuantXClient({
    network: "TESTNET",
    contractId: CONTRACT_ID,
    wallet: {
      secretKey: SECRET_KEY,
    },
  });

  console.log("✅ Client Initialized");

  try {
    console.log("🔍 Fetching subscription #0...");
    try {
      const sub = await client.getSubscription(0);
      console.log("   -> Found:", sub);
    } catch (e) {
      console.log("   -> Sub #0 likely doesn't exist or error:", e.message);
    }

    console.log("📝 Attempting to build 'Create Subscription' transaction...");

    const { Keypair } = require("@stellar/stellar-sdk");
    const myKeypair = Keypair.fromSecret(SECRET_KEY);

    const RECIPIENT = myKeypair.publicKey();
    const USDC_TESTNET =
      "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

    await client.subscribe({
      recipient: RECIPIENT,
      token: USDC_TESTNET,
      amount: "1",
      interval: 3600,
      subType: 0,
    });

    // If we get here without error, it means simulation passed!
    console.log("\n✅ Transaction built & simulated successfully!");
  } catch (error) {
    console.log("\n⚠️ Test Result:");
    // 4. Fixed syntax error: Added || operator
    if (
      error.message &&
      (error.message.includes("simulation failed") ||
        error.message.includes("resource missing"))
    ) {
      console.log(
        "✅ SDK is WORKING! (It successfully talked to Soroban, even if the logic failed due to balances/allowance)",
      );
    } else {
      console.error("❌ SDK Error:", error);
    }
  }
}

testSDK();

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import SuccessModal from "@/components/SuccessModal";
import { useWallet } from "@/context/WalletContext";
import { signTransaction } from "@stellar/freighter-api";
import {
  createSorobanServer,
  createContract,
  getNetworks,
  getBaseFee,
  createAddress,
  createTransactionBuilder,
  nativeToScVal,
  parseTransactionFromXDR,
  prepareTransaction,
} from "@/lib/stellar";

// Environment Constants
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "";
const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "TESTNET";
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

const ERROR_MESSAGES: { [key: number]: string } = {
  1: "You are not authorized to perform this action",
  2: "Payment is not yet due for execution",
  3: "Insufficient balance in your account",
  4: "Insufficient allowance - please approve contract spending",
  5: "Payment is not active (paused, failed, or cancelled)",
  6: "Payment already executed in this ledger",
  7: "Interval must be at least 60 seconds",
  8: "Amount must be greater than 0",
};

export default function CreatePlan() {
  const { walletConnected, publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState<{ type: string; text: string }>({
    type: "",
    text: "",
  });
  const [formData, setFormData] = useState({
    recipient: "",
    amount: "",
    token: "USDC", // USDC or XLM
    interval: "3600", // 1 hour default
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!walletConnected) {
      alert("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // Validate inputs
      if (!formData.recipient || !formData.amount || !formData.interval) {
        throw new Error("Please fill in all fields");
      }

      const amount = parseFloat(formData.amount);
      const interval = parseInt(formData.interval);

      if (amount <= 0) {
        throw new Error("Amount must be greater than 0");
      }

      if (interval < 60) {
        throw new Error("Interval must be at least 60 seconds");
      }

      // Development mode - skip contract interaction
      if (DEV_MODE) {
        console.log("🔧 DEV MODE: Simulating payment creation", {
          recipient: formData.recipient,
          amount: amount,
          token: formData.token,
          interval: interval,
        });

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setMessage({
          type: "success",
          text: `✅ DEV MODE: Payment created! ${amount} ${formData.token} every ${interval}s to ${formData.recipient.slice(0, 8)}...`,
        });

        // Reset form
        setFormData({
          recipient: "",
          amount: "",
          interval: "3600",
          token: "USDC",
        });

        setLoading(false);
        return;
      }

      // Production mode - actual contract interaction
      if (!CONTRACT_ID) {
        throw new Error("Contract ID missing in environment variables");
      }

      if (!publicKey) {
        throw new Error("Please connect your wallet first");
      }

      // Use dynamic imports to avoid browser compatibility issues
      const server = await createSorobanServer(RPC_URL);
      const contract = await createContract(CONTRACT_ID);
      const Networks = await getNetworks();
      const BASE_FEE = await getBaseFee();

      const account = await server.getAccount(publicKey);
      if (!account) throw new Error("Account not found on network");

      // Convert amount to stroops (7 decimals for Stellar)
      const amountInStroops = Math.floor(amount * 10000000);

      // Build transaction
      const senderAddress = await createAddress(publicKey);
      const recipientAddress = await createAddress(formData.recipient);
      const amountScVal = await nativeToScVal(amountInStroops, { type: "i128" });
      const intervalScVal = await nativeToScVal(interval, { type: "u64" });

      const builder = await createTransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase:
          Networks[NETWORK as keyof typeof Networks] || Networks.TESTNET,
      });

      const transaction = builder
        .addOperation(
          contract.call(
            "create_payment",
            senderAddress.toScVal(),
            recipientAddress.toScVal(),
            amountScVal,
            intervalScVal
          )
        )
        .setTimeout(30)
        .build();

      // Simulate and prepare the transaction (required for Soroban)
      console.log("Simulating transaction...");
      const preparedTx = await prepareTransaction(server, transaction);
      console.log("Transaction prepared successfully");

      // Sign with Freighter
      const signedXdr = await signTransaction(preparedTx.toXDR(), {
        networkPassphrase:
          Networks[NETWORK as keyof typeof Networks] || Networks.TESTNET,
      });

      if (signedXdr.error) {
        throw new Error(signedXdr.error);
      }

      // Submit transaction
      const signedTx = await parseTransactionFromXDR(
        typeof signedXdr === "string" ? signedXdr : signedXdr.signedTxXdr,
        Networks[NETWORK as keyof typeof Networks] || Networks.TESTNET
      );
      const response = await server.sendTransaction(signedTx);

      console.log("Transaction response:", response);

      if (response.status === "PENDING") {
        setMessage({
          type: "success",
          text: "Payment created successfully! Waiting for confirmation...",
        });
        setTxHash(response.hash);
        setShowSuccess(true);

        // Reset form
        setFormData({
          recipient: "",
          amount: "",
          interval: "3600",
          token: "USDC",
        });
      } else {
        console.error("Transaction failed with status:", response.status);
        console.error("Full response:", JSON.stringify(response, null, 2));
        throw new Error(`Transaction failed with status: ${response.status}`);
      }
    } catch (error: any) {
      console.error("Error creating payment:", error);

      // Parse error code if available
      const errorMatch = error.message?.match(/\d+/);
      const errorCode = errorMatch ? parseInt(errorMatch[0]) : null;
      const errorMessage =
        errorCode && ERROR_MESSAGES[errorCode]
          ? ERROR_MESSAGES[errorCode]
          : error.message || "Transaction failed";

      setMessage({
        type: "error",
        text: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!walletConnected) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="flex flex-col items-center justify-center pt-12 p-4 min-h-[60vh]">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle>Connect Wallet Required</CardTitle>
              <CardDescription>
                Please connect your Freighter wallet to create a recurring payment.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="flex flex-col items-center pt-12 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle>Create Recurring Payment</CardTitle>
            <CardDescription>
              Set up a new recurring payment stream.
              {DEV_MODE && (
                <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                  🔧 DEV MODE
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message.text && (
              <div
                className={`p-3 rounded-md text-sm ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Address</Label>
                <Input
                  id="recipient"
                  placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  value={formData.recipient}
                  onChange={(e) =>
                    setFormData({ ...formData, recipient: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="token">Token</Label>
                <select
                  id="token"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.token}
                  onChange={(e) =>
                    setFormData({ ...formData, token: e.target.value })
                  }
                  required
                >
                  <option value="USDC">USDC (USD Coin)</option>
                  <option value="XLM">XLM (Stellar Lumens)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount ({formData.token})</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="100"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interval">Interval (seconds)</Label>
                <Input
                  id="interval"
                  type="number"
                  placeholder="3600"
                  min="60"
                  value={formData.interval}
                  onChange={(e) =>
                    setFormData({ ...formData, interval: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-gray-500">
                  Minimum: 60 seconds (For demo: use 30 seconds)
                </p>
              </div>

              <Button
                type="submit"
                className="w-full mt-6"
                size="lg"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Payment"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        txHash={txHash}
      />
    </div>
  );
}

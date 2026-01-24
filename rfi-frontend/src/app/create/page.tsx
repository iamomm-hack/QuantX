"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useWallet } from "@/context/WalletContext";
import {
  Contract,
  rpc as SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";
import { useRouter } from "next/navigation";

// --- Configuration ---
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "";
const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "TESTNET";
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

export default function CreatePaymentPage() {
  const { walletConnected, publicKey } = useWallet();
  const router = useRouter();

  const [formStep, setFormStep] = useState<"form" | "confirmation">("form");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    receiver: "",
    token: "USDC",
    amount: "",
    interval: "monthly",
    startDate: "",
    endDate: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletConnected || !publicKey) {
      alert("Please connect your wallet first.");
      return;
    }

    setLoading(true);

    try {
      if (DEV_MODE) {
        // Mock success for UI testing
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setFormStep("confirmation");
        setTimeout(() => {
          setFormStep("form");
          router.push("/dashboard");
        }, 3000);
        return;
      }

      // --- Stellar Contract Logic ---
      const server = new SorobanRpc.Server(RPC_URL);
      const contract = new Contract(CONTRACT_ID);
      const account = await server.getAccount(publicKey);

      // Convert interval string to seconds
      let intervalSeconds = 2592000; // Monthly default
      if (formData.interval === "weekly") intervalSeconds = 604800;
      if (formData.interval === "custom") intervalSeconds = 60; // Just as an example placeholder

      // Amount with decimals (assuming 7 decimals for USDC/Stellar tokens usually)
      const amountBigInt = BigInt(
        Math.floor(parseFloat(formData.amount) * 10000000),
      );

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase:
          Networks[NETWORK as keyof typeof Networks] || Networks.TESTNET,
      })
        .addOperation(
          contract.call(
            "create_payment",
            nativeToScVal(formData.receiver, { type: "address" }),
            nativeToScVal(amountBigInt, { type: "i128" }), // Usually amounts are i128
            nativeToScVal(intervalSeconds, { type: "u64" }),
            nativeToScVal(Math.floor(Date.now() / 1000), { type: "u64" }), // Start now for simplicity
          ),
        )
        .setTimeout(30)
        .build();

      const signedResult = await signTransaction(transaction.toXDR(), {
        networkPassphrase:
          Networks[NETWORK as keyof typeof Networks] || Networks.TESTNET,
      });

      if ("error" in signedResult && signedResult.error) {
        throw new Error(signedResult.error);
      }

      // Determine correct XDR string
      let signedXdrString = "";
      if (typeof signedResult === "string") {
        signedXdrString = signedResult;
      } else if ("signedTxXdr" in signedResult) {
        // @ts-ignore
        signedXdrString = signedResult.signedTxXdr;
      } else if ("signedXDR" in signedResult) {
        // @ts-ignore
        signedXdrString = signedResult.signedXDR;
      }

      if (!signedXdrString) {
        throw new Error("Failed to sign transaction");
      }

      const signedTx = TransactionBuilder.fromXDR(
        signedXdrString,
        Networks[NETWORK as keyof typeof Networks] || Networks.TESTNET,
      );

      await server.sendTransaction(signedTx);

      // Success!
      setFormStep("confirmation");
      setTimeout(() => {
        setFormStep("form");
        router.push("/dashboard");
      }, 3000);
    } catch (error: any) {
      console.error("Payment Creation Failed:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Render Confirmation View ---
  if (formStep === "confirmation") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        {/* FIX: Added pt-24 here */}
        <div className="max-w-2xl mx-auto px-6 pt-24 pb-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse" />
                  <CheckCircle2 className="w-20 h-20 text-primary relative z-10" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Payment Created Successfully
              </h2>
              <p className="text-muted-foreground mb-6">
                Your recurring payment has been scheduled on-chain
              </p>
              <div className="bg-secondary/50 border border-border rounded-lg p-6 text-left mb-8">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receiver</span>
                    <span className="font-mono text-foreground text-sm">
                      {formData.receiver}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold text-foreground">
                      {formData.amount} {formData.token}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Interval</span>
                    <span className="text-foreground capitalize">
                      {formData.interval}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Redirecting you back to dashboard...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Render Form View ---
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* FIX: Added pt-24 here */}
      <div className="max-w-2xl mx-auto px-6 pt-24 pb-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Create Recurring Payment
          </h1>
          <p className="text-muted-foreground">
            Set up a new automated on-chain payment using stablecoins
          </p>
        </div>

        <Card className="p-8 border-border bg-card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Receiver Wallet Address */}
            <div className="space-y-2">
              <Label htmlFor="receiver" className="text-foreground">
                Receiver Wallet Address
              </Label>
              <Input
                id="receiver"
                placeholder="G..."
                value={formData.receiver}
                onChange={(e) => handleInputChange("receiver", e.target.value)}
                className="bg-secondary/20 border-border text-foreground placeholder:text-muted-foreground"
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the recipient's Stellar Public Key (starting with G)
              </p>
            </div>

            {/* Token Selector */}
            <div className="space-y-2">
              <Label htmlFor="token" className="text-foreground">
                Token
              </Label>
              <Select
                value={formData.token}
                onValueChange={(value) => handleInputChange("token", value)}
              >
                <SelectTrigger className="bg-secondary/20 border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="XLM">XLM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-foreground">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="1000"
                value={formData.amount}
                onChange={(e) => handleInputChange("amount", e.target.value)}
                className="bg-secondary/20 border-border text-foreground placeholder:text-muted-foreground"
                required
              />
              <p className="text-xs text-muted-foreground">
                Amount in {formData.token} to send each interval
              </p>
            </div>

            {/* Interval Selector */}
            <div className="space-y-2">
              <Label htmlFor="interval" className="text-foreground">
                Interval
              </Label>
              <Select
                value={formData.interval}
                onValueChange={(value) => handleInputChange("interval", value)}
              >
                <SelectTrigger className="bg-secondary/20 border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom (Demo: 60s)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || !walletConnected}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base disabled:opacity-50"
            >
              {loading
                ? "Processing..."
                : walletConnected
                  ? "Create Recurring Payment"
                  : "Connect Wallet First"}
            </Button>
          </form>
        </Card>

        {/* Info Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 border-border bg-secondary/20">
            <h3 className="font-semibold text-foreground mb-3">Security</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All transactions are non-custodial and verified on-chain. You
              maintain complete control over your funds.
            </p>
          </Card>
          <Card className="p-6 border-border bg-secondary/20">
            <h3 className="font-semibold text-foreground mb-3">
              Gas Optimization
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Payments are batched and optimized to minimize gas costs while
              maintaining reliability.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

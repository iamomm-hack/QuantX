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
import { useWallet } from "@/context/wallet-provider";
import {
  Contract,
  rpc as SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
  StrKey,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";
import { useRouter } from "next/navigation";
import { useQuantX } from "@/hooks/use-quantx";

// --- Configuration ---
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "";
const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "TESTNET";
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

export default function CreatePaymentPage() {
  const { isConnected: walletConnected, address: publicKey } = useWallet();
  const client = useQuantX();
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

    // Validate Stellar receiver address
    const receiverAddress = formData.receiver.trim().toUpperCase();
    if (!StrKey.isValidEd25519PublicKey(receiverAddress)) {
      alert("Invalid Stellar address. Please enter a valid G... address (56 characters, uppercase).");
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

      // === Use SDK ===
      if (!client) throw new Error("QuantX Client not initialized");
      
      // Determine token contract based on selection
      const isXLM = formData.token === "XLM";
      const tokenAddress = isXLM 
        ? "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC" // Native XLM (Testnet)
        : (process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"); // USDC (Testnet)

      // Verify and Approve Allowance
      console.log("Step 1: Approving token spending...");
      const approvalTx = await client.approveAllowance(tokenAddress, formData.amount);
      if (approvalTx.status !== "SUCCESS") {
          throw new Error(`Approval failed: ${approvalTx.error}`);
      }
      console.log("Approval confirmed:", approvalTx.hash);

      // Create Payment
      console.log("Step 2: Creating recurring payment...");
      let intervalSeconds = 2592000;
      if (formData.interval === "weekly") intervalSeconds = 604800;
      if (formData.interval === "custom") intervalSeconds = 60;

      const paymentTx = await client.subscribe({
          recipient: receiverAddress,
          token: tokenAddress,
          amount: formData.amount,
          interval: intervalSeconds,
          subType: 0
      });

      if (paymentTx.status !== "SUCCESS") {
           throw new Error(`Payment creation failed: ${paymentTx.error}`);
      }
      
      if (paymentTx.error) {
          console.warn("Payment Warning:", paymentTx.error);
          alert("Transaction sent but confirmation timed out. Please check the explorer.");
      } else {
          console.log("Payment confirmed:", paymentTx.hash);
      }

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
      <div className="flex flex-col items-center justify-center p-8 bg-background h-full">
            <div className="text-center slide-up-text">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse" />
                  <CheckCircle2 className="w-20 h-20 text-primary relative z-10" />
                </div>
              </div>
              <h2 className="text-3xl font-display text-foreground mb-2">
                PAYMENT INITIALIZED
              </h2>
              <p className="text-muted-foreground mb-6 font-bold">
                ON-CHAIN SCHEDULE CONFIRMED
              </p>
              
              <div className="bg-canvas border-[3px] border-ink p-6 text-left mb-8 shadow-sm">
                 {/* Details... */}
                 <p className="font-mono text-sm">Target: {formData.receiver}</p>
                 <p className="font-mono text-xl font-bold">{formData.amount} {formData.token}</p>
                 <p className="font-mono text-sm uppercase">{formData.interval}</p>
              </div>

              <p className="text-sm font-bold animate-pulse">
                REDIRECTING TO GRID...
              </p>
            </div>
      </div>
    );
  }

  // --- Render Form View ---
  return (
    <div className="max-w-3xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8 border-b-[3px] border-ink pb-4">
          <h1 className="text-5xl mb-2 text-primary">
            NEW FORM
          </h1>
          <p className="font-bold text-xl">
            AUTO-PAYMENT PROTOCOL
          </p>
        </div>

        <Card className="p-8 bg-accent shadow-[15px_15px_0_rgba(20,20,20,0.1)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Receiver Wallet Address */}
            <div className="space-y-2">
              <Label htmlFor="receiver" className="text-foreground font-bold uppercase">
                Receiver Public Key
              </Label>
              <Input
                id="receiver"
                placeholder="G..."
                value={formData.receiver}
                onChange={(e) => handleInputChange("receiver", e.target.value)}
                required
              />
            </div>

            {/* Token Selector */}
            <div className="space-y-2">
              <Label htmlFor="token" className="text-foreground font-bold uppercase">
                Asset
              </Label>
              <Select
                value={formData.token}
                onValueChange={(value: string) => handleInputChange("token", value)}
              >
                <SelectTrigger className="bg-white border-[1px] border-ink rounded-none h-12 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDC">USDC (Testnet)</SelectItem>
                  <SelectItem value="XLM">XLM (Native)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-foreground font-bold uppercase">
                Volume (Amount)
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleInputChange("amount", e.target.value)}
                required
              />
            </div>

            {/* Interval Selector */}
            <div className="space-y-2">
              <Label htmlFor="interval" className="text-foreground font-bold uppercase">
                Frequency
              </Label>
              <Select
                value={formData.interval}
                onValueChange={(value: string) => handleInputChange("interval", value)}
              >
                <SelectTrigger className="bg-white border-[1px] border-ink rounded-none h-12 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">WEEKLY</SelectItem>
                  <SelectItem value="monthly">MONTHLY</SelectItem>
                  <SelectItem value="custom">CUSTOM (TEST)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || !walletConnected}
              className="w-full text-xl h-14 mt-8"
              size="lg"
            >
              {loading
                ? "PROCESSING..."
                : walletConnected
                  ? "CONFIRM TRANSACTION"
                  : "WALLET DISCONNECTED"}
            </Button>
          </form>
        </Card>

        {/* Info Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 border-l-[3px] border-ink">
            <h3 className="font-bold text-lg mb-2">SECURITY PROTOCOL</h3>
            <p className="text-sm">
              Non-custodial. Verified on-chain execution.
            </p>
          </div>
          <div className="p-4 border-l-[3px] border-ink">
            <h3 className="font-bold text-lg mb-2">OPTIMIZATION</h3>
            <p className="text-sm">
              Batch processing active. Gas efficiency max.
            </p>
          </div>
        </div>
    </div>
  );
}

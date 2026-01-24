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

// --- Configuration ---
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "";
const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "TESTNET";
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

export default function CreatePaymentPage() {
  const { isConnected: walletConnected, address: publicKey } = useWallet();
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

      // --- Stellar Contract Logic ---
      const server = new SorobanRpc.Server(RPC_URL);
      const contract = new Contract(CONTRACT_ID);
      const tokenContract = new Contract(process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2EZ4YXL");
      
      // Convert interval string to seconds
      let intervalSeconds = 2592000; // Monthly default
      if (formData.interval === "weekly") intervalSeconds = 604800;
      if (formData.interval === "custom") intervalSeconds = 60;

      // Amount with decimals (assuming 7 decimals for USDC/Stellar tokens usually)
      const amountBigInt = BigInt(
        Math.floor(parseFloat(formData.amount) * 10000000),
      );

      // For AutoPay, we need to approve the contract to spend tokens
      const approvalAmount = amountBigInt * BigInt(100);

      // Get current ledger for approval expiration
      const ledgerResponse = await server.getLatestLedger();
      const currentLedger = ledgerResponse.sequence;
      // Max allowed is ~3.1M ledgers, so use 2M (~115 days at 5s/ledger) to be safe
      const expirationLedger = currentLedger + 2000000;

      // === STEP 1: Approve Token Spending ===
      console.log("Step 1: Approving token spending...");
      const account1 = await server.getAccount(publicKey);
      
      const approvalTx = new TransactionBuilder(account1, {
        fee: BASE_FEE,
        networkPassphrase: Networks[NETWORK as keyof typeof Networks] || Networks.TESTNET,
      })
        .addOperation(
          tokenContract.call(
            "approve",
            nativeToScVal(publicKey, { type: "address" }),
            nativeToScVal(CONTRACT_ID, { type: "address" }),
            nativeToScVal(approvalAmount, { type: "i128" }),
            nativeToScVal(expirationLedger, { type: "u32" }),
          )
        )
        .setTimeout(30)
        .build();

      // Simulate approval transaction
      const simulatedApproval = await server.simulateTransaction(approvalTx);
      if (SorobanRpc.Api.isSimulationError(simulatedApproval)) {
        throw new Error(`Approval simulation failed: ${simulatedApproval.error}`);
      }

      const preparedApprovalTx = SorobanRpc.assembleTransaction(approvalTx, simulatedApproval).build();

      // Sign and send approval
      const approvalSignedResult = await signTransaction(preparedApprovalTx.toXDR(), {
        networkPassphrase: Networks[NETWORK as keyof typeof Networks] || Networks.TESTNET,
      });

      let approvalSignedXdr = "";
      if (typeof approvalSignedResult === "string") {
        approvalSignedXdr = approvalSignedResult;
      } else if ("signedTxXdr" in approvalSignedResult) {
        approvalSignedXdr = (approvalSignedResult as any).signedTxXdr;
      }

      if (!approvalSignedXdr) {
        throw new Error("Failed to sign approval transaction");
      }

      const signedApprovalTx = TransactionBuilder.fromXDR(
        approvalSignedXdr,
        Networks[NETWORK as keyof typeof Networks] || Networks.TESTNET,
      );

      console.log("Sending approval transaction...");
      await server.sendTransaction(signedApprovalTx);
      
      // Wait a bit for approval to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // === STEP 2: Create Payment ===
      console.log("Step 2: Creating recurring payment...");
      const account2 = await server.getAccount(publicKey);

      const paymentTx = new TransactionBuilder(account2, {
        fee: BASE_FEE,
        networkPassphrase: Networks[NETWORK as keyof typeof Networks] || Networks.TESTNET,
      })
        .addOperation(
          contract.call(
            "subscribe_to_plan",
            nativeToScVal(publicKey, { type: "address" }), // payer
            nativeToScVal(1, { type: "u32" }), // plan_id (using plan 1)
            nativeToScVal(receiverAddress, { type: "address" }), // recipient
            nativeToScVal(BigInt(0), { type: "u64" }), // total_cycles (0 = unlimited)
            nativeToScVal("AutoPay", { type: "symbol" }), // sub_type
          ),
        )
        .setTimeout(30)
        .build();

      // Simulate payment creation
      const simulatedPayment = await server.simulateTransaction(paymentTx);
      if (SorobanRpc.Api.isSimulationError(simulatedPayment)) {
        throw new Error(`Payment creation simulation failed: ${simulatedPayment.error}`);
      }

      const preparedPaymentTx = SorobanRpc.assembleTransaction(paymentTx, simulatedPayment).build();

      // Sign and send payment creation
      const paymentSignedResult = await signTransaction(preparedPaymentTx.toXDR(), {
        networkPassphrase: Networks[NETWORK as keyof typeof Networks] || Networks.TESTNET,
      });

      let paymentSignedXdr = "";
      if (typeof paymentSignedResult === "string") {
        paymentSignedXdr = paymentSignedResult;
      } else if ("signedTxXdr" in paymentSignedResult) {
        paymentSignedXdr = (paymentSignedResult as any).signedTxXdr;
      }

      if (!paymentSignedXdr) {
        throw new Error("Failed to sign payment transaction");
      }

      const signedPaymentTx = TransactionBuilder.fromXDR(
        paymentSignedXdr,
        Networks[NETWORK as keyof typeof Networks] || Networks.TESTNET,
      );

      console.log("Sending payment creation transaction...");
      await server.sendTransaction(signedPaymentTx);

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

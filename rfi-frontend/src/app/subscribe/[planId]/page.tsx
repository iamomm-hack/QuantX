"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { useWallet } from "@/context/wallet-provider";
import {
  Contract,
  rpc as SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "";
const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "TESTNET";

export default function SubscribePage() {
  const params = useParams();
  const router = useRouter();
  const { address: publicKey, isConnected } = useWallet();
  
  const planId = parseInt(params.planId as string);

  // Plan data (hardcoded Plan 1 for now)
  const plan = {
    id: 1,
    name: "Basic Plan",
    amount: 10,
    interval: 2592000,
    token: "USDC",
  };

  // Form state
  const [recipient, setRecipient] = useState("");
  const [subType, setSubType] = useState<"AutoPay" | "Prepaid">("AutoPay");
  const [chargeStart, setChargeStart] = useState<"Immediate" | "Delayed">("Immediate");
  const [totalCycles, setTotalCycles] = useState("12");
  
  // UI state
  const [step, setStep] = useState<"config" | "approve" | "subscribe" | "success">("config");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const totalAmount = subType === "Prepaid" ? plan.amount * parseInt(totalCycles || "0") : plan.amount;

  const handleApprove = async () => {
    if (!publicKey || !isConnected) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const server = new SorobanRpc.Server(RPC_URL);
      const tokenContract = new Contract(TOKEN_ADDRESS);
      const account = await server.getAccount(publicKey);

      const approvalAmount = BigInt(Math.floor(plan.amount * 100 * 10000000)); // 100 payments worth

      const ledgerResponse = await server.getLatestLedger();
      const expirationLedger = ledgerResponse.sequence + 2000000;

      const approvalTx = new TransactionBuilder(account, {
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

      const simulatedApproval = await server.simulateTransaction(approvalTx);
      if (SorobanRpc.Api.isSimulationError(simulatedApproval)) {
        throw new Error(`Approval simulation failed: ${simulatedApproval.error}`);
      }

      const preparedApprovalTx = SorobanRpc.assembleTransaction(approvalTx, simulatedApproval).build();

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

      await server.sendTransaction(signedApprovalTx);
      
      // Move to subscribe step
      setStep("subscribe");
    } catch (err: any) {
      console.error("Approval error:", err);
      setError(err.message || "Failed to approve tokens");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!publicKey || !isConnected) {
      setError("Please connect your wallet first");
      return;
    }

    if (!recipient.trim()) {
      setError("Please enter a recipient address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const server = new SorobanRpc.Server(RPC_URL);
      const contract = new Contract(CONTRACT_ID);
      const account = await server.getAccount(publicKey);

      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for approval to settle

      const paymentTx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks[NETWORK as keyof typeof Networks] || Networks.TESTNET,
      })
        .addOperation(
          contract.call(
            "subscribe_to_plan",
            nativeToScVal(publicKey, { type: "address" }),
            nativeToScVal(planId, { type: "u32" }),
            nativeToScVal(recipient.trim().toUpperCase(), { type: "address" }),
            nativeToScVal(BigInt(subType === "Prepaid" ? parseInt(totalCycles) : 0), { type: "u64" }),
            nativeToScVal(subType, { type: "symbol" }),
          ),
        )
        .setTimeout(30)
        .build();

      const simulatedPayment = await server.simulateTransaction(paymentTx);
      if (SorobanRpc.Api.isSimulationError(simulatedPayment)) {
        throw new Error(`Subscription simulation failed: ${simulatedPayment.error}`);
      }

      const preparedPaymentTx = SorobanRpc.assembleTransaction(paymentTx, simulatedPayment).build();

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
        throw new Error("Failed to sign subscription transaction");
      }

      const signedPaymentTx = TransactionBuilder.fromXDR(
        paymentSignedXdr,
        Networks[NETWORK as keyof typeof Networks] || Networks.TESTNET,
      );

      const sendResponse = await server.sendTransaction(signedPaymentTx);
      setTxHash(sendResponse.hash);
      setStep("success");

      // Redirect after 3 seconds
      setTimeout(() => router.push("/dashboard"), 3000);
    } catch (err: any) {
      console.error("Subscribe error:", err);
      setError(err.message || "Failed to create subscription");
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Alert className="border-[3px] border-ink">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-lg">
            Please connect your wallet to subscribe to a plan
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="container mx-auto py-12 px-4 max-w-2xl">
        <Card className="border-[3px] border-ink shadow-[12px_12px_0_rgba(0,0,0,1)] text-center p-12">
          <CheckCircle2 className="h-20 w-20 text-green-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Subscription Created!</h2>
          <p className="text-muted-foreground mb-6">
            Your subscription has been successfully created. Redirecting to dashboard...
          </p>
          {txHash && (
            <p className="text-xs font-mono bg-accent p-2 rounded break-all">
              TX: {txHash}
            </p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/plans" className="text-sm text-primary hover:underline mb-2 inline-block">
          ← Back to Plans
        </Link>
        <h1 className="text-4xl font-bold mb-2">Subscribe to {plan.name}</h1>
        <p className="text-muted-foreground">
          Configure your subscription preferences
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="md:col-span-2 space-y-6">
          {/* Plan Summary */}
          <Card className="border-[3px] border-ink">
            <CardHeader>
              <CardTitle>Plan Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-bold">{plan.amount} {plan.token}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Interval:</span>
                <span className="font-bold">Monthly</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token:</span>
                <span className="font-bold">{plan.token}</span>
              </div>
            </CardContent>
          </Card>

          {/* Recipient */}
          <Card className="border-[3px] border-ink">
            <CardHeader>
              <CardTitle>Recipient Address</CardTitle>
              <CardDescription>Who will receive the payments?</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="G..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="font-mono"
              />
            </CardContent>
          </Card>

          {/* Subscription Type */}
          <Card className="border-[3px] border-ink">
            <CardHeader>
              <CardTitle>Subscription Type</CardTitle>
              <CardDescription>Choose how you want to pay</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={subType} onValueChange={(v: string) => setSubType(v as any)}>
                <div className="flex items-start space-x-3 p-4 border-[2px] border-ink rounded mb-3 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="AutoPay" id="autopay" />
                  <div className="flex-1">
                    <Label htmlFor="autopay" className="font-bold cursor-pointer">
                      AutoPay
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Pay per cycle automatically. Requires one-time token approval.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 border-[2px] border-ink rounded cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="Prepaid" id="prepaid" />
                  <div className="flex-1">
                    <Label htmlFor="prepaid" className="font-bold cursor-pointer">
                      Prepaid
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Pay upfront for multiple cycles. Get refunded for unused cycles.
                    </p>
                    {subType === "Prepaid" && (
                      <div>
                        <Label htmlFor="cycles" className="text-sm">Total Cycles</Label>
                        <Input
                          id="cycles"
                          type="number"
                          min="1"
                          value={totalCycles}
                          onChange={(e) => setTotalCycles(e.target.value)}
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Total: {totalAmount} {plan.token}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Charge Start */}
          <Card className="border-[3px] border-ink">
            <CardHeader>
              <CardTitle>First Charge</CardTitle>
              <CardDescription>When should the first payment happen?</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={chargeStart} onValueChange={(v: string) => setChargeStart(v as any)}>
                <div className="flex items-start space-x-3 p-4 border-[2px] border-ink rounded mb-3 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="Immediate" id="immediate" />
                  <div className="flex-1">
                    <Label htmlFor="immediate" className="font-bold cursor-pointer">
                      Immediate
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      First payment executes immediately after subscription
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 border-[2px] border-ink rounded cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="Delayed" id="delayed" />
                  <div className="flex-1">
                    <Label htmlFor="delayed" className="font-bold cursor-pointer">
                      Delayed
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      First payment happens after one billing interval
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <Alert variant="destructive" className="border-[3px]">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            {step === "config" && subType === "AutoPay" && (
              <Button
                size="lg"
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 h-14 text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    Approve Tokens
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            )}
            
            {(step === "subscribe" || subType === "Prepaid") && (
              <Button
                size="lg"
                onClick={handleSubscribe}
                disabled={loading || !recipient.trim()}
                className="flex-1 h-14 text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Subscription
                    <CheckCircle2 className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="border-[2px] border-ink sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="outline">{subType}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">First Charge:</span>
                <Badge variant="outline">{chargeStart}</Badge>
              </div>
              {subType === "Prepaid" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cycles:</span>
                  <span className="font-bold">{totalCycles}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between font-bold">
                <span>Total:</span>
                <span>{totalAmount} {plan.token}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[2px] border-ink p-4 text-xs text-muted-foreground">
            <p className="mb-2">✓ Cancel anytime</p>
            <p className="mb-2">✓ Refunds for prepaid</p>
            <p>✓ Secure on-chain</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

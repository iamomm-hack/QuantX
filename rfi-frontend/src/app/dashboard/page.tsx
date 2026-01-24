"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Navbar from "@/components/Navbar";
import { useWallet } from "@/context/WalletContext";
import api from "@/lib/api";
import {
  createSorobanServer,
  createContract,
  getNetworks,
  getBaseFee,
  createTransactionBuilder,
  parseTransactionFromXDR,
} from "@/lib/stellar";
import { signTransaction } from "@stellar/freighter-api";

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "";
const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "TESTNET";
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

const STATUS_LABELS: { [key: number]: { label: string; className: string } } = {
  0: { label: "Active", className: "bg-green-500" },
  1: { label: "Paused", className: "bg-yellow-500" },
  2: { label: "Failed", className: "bg-red-500" },
  3: { label: "Cancelled", className: "bg-gray-500" },
};

interface Payment {
  id: number;
  recipient: string;
  amount: number;
  interval: number;
  next_execution: number;
  status: number;
  created_at: number;
  token?: string;
}

export default function Dashboard() {
  const { walletConnected, publicKey } = useWallet();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    if (walletConnected && publicKey) {
      loadPayments();
      const interval = setInterval(loadPayments, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [walletConnected, publicKey]);

  const loadPayments = async () => {
    if (!publicKey) return;

    try {
      // Development mode - use mock data
      if (DEV_MODE) {
        console.log("DEV MODE: Using mock payment data");

        const mockPayments: Payment[] = [
          {
            id: 1,
            recipient: "GCUOCLOPD3I7ECINEXFOJVGFGFNJILYYW26BERBCCQBG7WHJMICHR2WPM",
            amount: 100 * 10000000,
            interval: 3600,
            next_execution: Math.floor(Date.now() / 1000) + 1800,
            status: 0,
            created_at: Math.floor(Date.now() / 1000) - 86400,
            token: "USDC",
          },
          {
            id: 2,
            recipient: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
            amount: 50 * 10000000,
            interval: 86400,
            next_execution: Math.floor(Date.now() / 1000) + 43200,
            status: 0,
            created_at: Math.floor(Date.now() / 1000) - 172800,
            token: "XLM",
          },
        ];

        setPayments(mockPayments);
        setLoading(false);
        return;
      }

      // Production mode - fetch from backend API
      try {
        const response = await api.getPaymentsByUser(publicKey);
        if (response.success && response.payments) {
          setPayments(response.payments);
        }
      } catch (apiError) {
        console.error("API Error:", apiError);
        // Fallback to empty array
        setPayments([]);
      }
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (
    paymentId: number,
    action: string,
    loadingText: string
  ) => {
    if (!publicKey) {
      alert("Please connect your wallet");
      return;
    }

    setActionLoading(paymentId);

    try {
      if (DEV_MODE) {
        console.log(`DEV MODE: Simulating ${action} for payment ${paymentId}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // Reload payments after action
        setTimeout(loadPayments, 500);
        setActionLoading(null);
        return;
      }

      const server = await createSorobanServer(RPC_URL);
      const contract = await createContract(CONTRACT_ID);
      const Networks = await getNetworks();
      const BASE_FEE = await getBaseFee();

      const account = await server.getAccount(publicKey);

      const builder = await createTransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase:
          Networks[NETWORK as keyof typeof Networks] || Networks.TESTNET,
      });

      const transaction = builder
        .addOperation(contract.call(action, paymentId))
        .setTimeout(30)
        .build();

      const xdr = transaction.toXDR();
      const signedXdr = await signTransaction(xdr, {
        networkPassphrase:
          Networks[NETWORK as keyof typeof Networks] || Networks.TESTNET,
      });

      if (signedXdr.error) {
        throw new Error(signedXdr.error);
      }

      const signedTx = await parseTransactionFromXDR(
        typeof signedXdr === "string" ? signedXdr : signedXdr.signedTxXdr,
        Networks[NETWORK as keyof typeof Networks] || Networks.TESTNET
      );
      await server.sendTransaction(signedTx);

      // Reload payments after action
      setTimeout(loadPayments, 2000);
    } catch (error: any) {
      console.error(`Error executing ${action}:`, error);
      alert(`Failed to ${action.replace("_", " ")}: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause = async (paymentId: number) => {
    await executeAction(paymentId, "pause_payment", "Pausing...");
  };

  const handleResume = async (paymentId: number) => {
    await executeAction(paymentId, "resume_payment", "Resuming...");
  };

  const handleCancel = async (paymentId: number) => {
    if (!confirm("Are you sure you want to cancel this payment?")) {
      return;
    }
    await executeAction(paymentId, "cancel_payment", "Cancelling...");
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const formatInterval = (seconds: number) => {
    if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} minutes`;
    } else if (seconds < 86400) {
      return `${Math.floor(seconds / 3600)} hours`;
    } else {
      return `${Math.floor(seconds / 86400)} days`;
    }
  };

  if (!walletConnected) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="container mx-auto py-10 px-4">
          <Card>
            <CardHeader>
              <CardTitle>Connect Wallet Required</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Please connect your Freighter wallet to view your payments.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="container mx-auto py-10 px-4">
          <Card>
            <CardContent className="py-10">
              <div className="text-center">Loading payments...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="container mx-auto py-10 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Your Recurring Payments</h1>
          <Link href="/create">
            <Button>+ New Payment</Button>
          </Link>
        </div>

        {payments.length === 0 ? (
          <Card>
            <CardContent className="py-10">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">
                  No Recurring Payments
                </h3>
                <p className="text-gray-500 mb-4">
                  Create your first recurring payment to get started
                </p>
                <Link href="/create">
                  <Button>Create Payment</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Outgoing Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Next Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => {
                    const statusInfo = STATUS_LABELS[payment.status] || {
                      label: "Unknown",
                      className: "bg-gray-500",
                    };
                    const isActive = payment.status === 0;
                    const isPaused = payment.status === 1;
                    const isFailed = payment.status === 2;
                    const isCancelled = payment.status === 3;

                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-sm">
                          {payment.recipient.slice(0, 8)}...
                          {payment.recipient.slice(-8)}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {payment.amount / 10000000}{" "}
                          {payment.token || "USDC"}
                        </TableCell>
                        <TableCell>{formatInterval(payment.interval)}</TableCell>
                        <TableCell>
                          {formatTime(payment.next_execution)}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {isActive && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePause(payment.id)}
                                disabled={actionLoading === payment.id}
                              >
                                {actionLoading === payment.id
                                  ? "Pausing..."
                                  : "Pause"}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleCancel(payment.id)}
                                disabled={actionLoading === payment.id}
                              >
                                Cancel
                              </Button>
                            </>
                          )}

                          {(isPaused || isFailed) && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResume(payment.id)}
                                disabled={actionLoading === payment.id}
                              >
                                {actionLoading === payment.id
                                  ? "Resuming..."
                                  : "Resume"}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleCancel(payment.id)}
                                disabled={actionLoading === payment.id}
                              >
                                Cancel
                              </Button>
                            </>
                          )}

                          {isCancelled && (
                            <span className="text-gray-500 text-sm">
                              Cancelled
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

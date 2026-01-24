"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  MoreHorizontal,
  Plus,
  Play,
  Pause,
  Trash2,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useWallet } from "@/context/wallet-provider";
import api from "@/lib/api";
import {
  Contract,
  rpc as SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

// --- Configuration ---
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "TESTNET";

// --- Types ---
type SubscriptionStatus = "Active" | "Paused" | "Failed" | "Cancelled" | "Completed";

interface Subscription {
  id: string;
  recipient: string;
  token: string;
  amount: number;
  interval: string;
  nextExecution: number;
  status: SubscriptionStatus;
  paidCycles: number;
  totalCycles: number;
}

// Map contract status (0-4) to readable status
const statusMap: Record<number, SubscriptionStatus> = {
  0: "Active",
  1: "Paused",
  2: "Failed",
  3: "Cancelled",
  4: "Completed",
};

// Format interval seconds to readable string
const formatInterval = (seconds: number): string => {
  if (seconds >= 2592000) return "Monthly";
  if (seconds >= 604800) return "Weekly";
  if (seconds >= 86400) return `${Math.floor(seconds / 86400)} days`;
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)} hours`;
  return `${Math.floor(seconds / 60)} mins`;
};

export default function DashboardPage() {
  const { address, isConnected } = useWallet();
  const [data, setData] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch real subscriptions from API/contract
  const fetchSubscriptions = async () => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("Fetching subscriptions for:", address);
      const response = await api.getPaymentsByUser(address, 0, 50);
      console.log("API Response:", response);
      
      if (response.success && response.payments && response.payments.length > 0) {
        const subscriptions: Subscription[] = response.payments.map((p: any) => {
          // Handle status - backend returns string like "ACTIVE", "PAUSED", etc.
          let status: SubscriptionStatus = "Active";
          if (typeof p.status === "string") {
            // Map backend string status to frontend format
            const statusStrMap: Record<string, SubscriptionStatus> = {
              "ACTIVE": "Active",
              "PAUSED": "Paused", 
              "FAILED": "Failed",
              "CANCELLED": "Cancelled",
              "COMPLETED": "Completed",
            };
            status = statusStrMap[p.status.toUpperCase()] || "Active";
          } else if (typeof p.status === "number" || typeof p.statusCode === "number") {
            const code = p.statusCode ?? p.status;
            status = statusMap[code] || "Active";
          }

          return {
            id: p.id.toString(),
            recipient: p.recipient || p.payer || "Unknown",
            token: "USDC",
            amount: (p.amount || 0) / 10000000,
            interval: p.intervalFormatted || formatInterval(p.interval || 0),
            nextExecution: p.nextExecution || p.next_execution || 0,
            status,
            paidCycles: p.paidCycles || p.paid_cycles || 0,
            totalCycles: p.totalCycles || p.total_cycles || 0,
          };
        });
        console.log("Mapped subscriptions:", subscriptions);
        setData(subscriptions);
      } else {
        console.log("No payments found or empty response");
        setData([]);
      }
    } catch (err: any) {
      console.error("Error fetching subscriptions:", err);
      setError("Failed to load subscriptions. Is the backend running?");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchSubscriptions();
    } else {
      setLoading(false);
    }
  }, [isConnected, address]);

  // --- Real Action Handlers ---
  const executeContractAction = async (
    paymentId: string,
    action: "pause_payment" | "resume_payment" | "cancel_payment"
  ) => {
    if (!address) return;
    
    setActionLoading(paymentId);
    
    try {
      const server = new SorobanRpc.Server(RPC_URL);
      const contract = new Contract(CONTRACT_ID);
      const account = await server.getAccount(address);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks[NETWORK as keyof typeof Networks] || Networks.TESTNET,
      })
        .addOperation(
          contract.call(
            action,
            nativeToScVal(BigInt(paymentId), { type: "u64" }),
          )
        )
        .setTimeout(30)
        .build();

      // Simulate first
      const simulated = await server.simulateTransaction(transaction);
      if ("error" in simulated) {
        throw new Error(`Simulation failed: ${simulated.error}`);
      }

      // Sign with Freighter
      const signedResult = await signTransaction(transaction.toXDR(), {
        networkPassphrase: Networks[NETWORK as keyof typeof Networks] || Networks.TESTNET,
      });

      let signedXdr = "";
      if (typeof signedResult === "string") {
        signedXdr = signedResult;
      } else if ("signedTxXdr" in signedResult) {
        signedXdr = (signedResult as any).signedTxXdr;
      }

      if (!signedXdr) {
        throw new Error("Failed to sign transaction");
      }

      const signedTx = TransactionBuilder.fromXDR(
        signedXdr,
        Networks[NETWORK as keyof typeof Networks] || Networks.TESTNET
      );

      await server.sendTransaction(signedTx);
      
      // Refresh data after successful action
      setTimeout(fetchSubscriptions, 2000);
      
    } catch (err: any) {
      console.error(`${action} failed:`, err);
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause = async (id: string) => {
    await executeContractAction(id, "pause_payment");
  };

  const handleResume = async (id: string) => {
    await executeContractAction(id, "resume_payment");
  };

  const handleCancel = async (id: string) => {
    if (confirm("Are you sure you want to cancel this subscription? This action cannot be undone.")) {
      await executeContractAction(id, "cancel_payment");
    }
  };

  if (!isConnected) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
        <div className="text-center">
          <h3 className="mt-2 text-sm font-semibold text-slate-900">
            Wallet not connected
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Please connect your wallet to view subscriptions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Subscriptions
          </h2>
          <p className="text-sm text-slate-500">
            Manage your recurring crypto payments.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSubscriptions}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
            <Link href="/create">
              <Plus className="mr-2 h-4 w-4" /> Create New
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="p-6 pb-2">
          {/* Optional header content if needed */}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : data.length === 0 ? (
            // --- Empty State ---
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                <Plus className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">
                No subscriptions found
              </h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                You haven't set up any recurring payments yet. Create one to get
                started.
              </p>
              <Button asChild variant="outline" className="mt-6">
                <Link href="/create">Create Subscription</Link>
              </Button>
            </div>
          ) : (
            // --- Data Table ---
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead>Recipient / ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Next Execution</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((sub) => (
                  <TableRow key={sub.id} className="hover:bg-slate-50/50">
                    {/* Status Badge */}
                    <TableCell>
                      <StatusBadge status={sub.status} />
                    </TableCell>

                    {/* ID & Recipient */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">
                          #{sub.id}
                        </span>
                        <span className="text-xs text-slate-500 font-mono truncate max-w-[120px]">
                          {sub.recipient.slice(0, 8)}...{sub.recipient.slice(-4)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="font-medium text-slate-900">
                      {sub.amount.toFixed(2)}{" "}
                      <span className="text-slate-500 text-xs">
                        {sub.token}
                      </span>
                    </TableCell>

                    {/* Interval */}
                    <TableCell className="text-slate-600">
                      {sub.interval}
                    </TableCell>

                    {/* Next Execution Date */}
                    <TableCell className="text-slate-600">
                      {sub.status === "Active" && sub.nextExecution > 0
                        ? format(new Date(sub.nextExecution * 1000), "MMM d, yyyy")
                        : "-"}
                    </TableCell>

                    {/* Actions Dropdown */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="h-8 w-8 p-0"
                            disabled={actionLoading === sub.id}
                          >
                            {actionLoading === sub.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() =>
                              navigator.clipboard.writeText(sub.id)
                            }
                          >
                            Copy ID
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              navigator.clipboard.writeText(sub.recipient)
                            }
                          >
                            Copy Recipient
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />

                          {sub.status === "Active" && (
                            <DropdownMenuItem
                              onClick={() => handlePause(sub.id)}
                            >
                              <Pause className="mr-2 h-4 w-4" /> Pause
                            </DropdownMenuItem>
                          )}

                          {sub.status === "Paused" && (
                            <DropdownMenuItem
                              onClick={() => handleResume(sub.id)}
                            >
                              <Play className="mr-2 h-4 w-4" /> Resume
                            </DropdownMenuItem>
                          )}

                          {(sub.status === "Active" || sub.status === "Paused") && (
                            <DropdownMenuItem
                              onClick={() => handleCancel(sub.id)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Cancel
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Component for Status Badges
function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const styles: Record<SubscriptionStatus, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Paused: "bg-amber-50 text-amber-700 border-amber-200",
    Failed: "bg-red-50 text-red-700 border-red-200",
    Cancelled: "bg-slate-100 text-slate-700 border-slate-200",
    Completed: "bg-blue-50 text-blue-700 border-blue-200",
  };

  const dotStyles: Record<SubscriptionStatus, string> = {
    Active: "bg-emerald-500",
    Paused: "bg-amber-500",
    Failed: "bg-red-500",
    Cancelled: "bg-slate-400",
    Completed: "bg-blue-500",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${styles[status]}`}
    >
      <span
        className={`mr-1.5 flex h-2 w-2 rounded-full ${dotStyles[status]}`}
      />
      {status}
    </span>
  );
}

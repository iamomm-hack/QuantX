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

            // Dynamic token display (basic check)
            const isUSDC = p.token.includes("CBIELTK"); // Testnet USDC check
            const tokenSymbol = isUSDC ? "USDC" : "XLM"; 
            
            return {
              id: p.id.toString(),
              recipient: p.recipient || p.payer || "Unknown",
              token: tokenSymbol,
              amount: p.amountFormatted || (p.amount || 0) / 10000000,
              interval: p.intervalFormatted || formatInterval(p.interval || 0),
              nextExecution: p.nextExecution || p.next_execution || 0,
              status,
              paidCycles: p.paidCycles || p.paid_cycles || 0,
              totalCycles: p.totalCycles || p.total_cycles || 0,
            };
        });
        console.log("Mapped subscriptions:", subscriptions);
        
        // Filter out Cancelled and Completed payments
        const activeSubscriptions = subscriptions.filter(
          sub => sub.status !== "Cancelled" && sub.status !== "Completed"
        );
        
        setData(activeSubscriptions);
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

      // Prepare transaction (simulate + assemble with auth and fees)
      const preparedTx = await server.prepareTransaction(transaction);

      // Sign with Freighter
      const signedResult = await signTransaction(preparedTx.toXDR(), {
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

      // Helper to wait for transaction confirmation
      const waitForTransaction = async (hash: string) => {
        let status = "PENDING";
        let result;
        // Poll every 2 seconds
        while (status === "PENDING" || status === "NOT_FOUND") {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          try {
            result = await server.getTransaction(hash);
            status = result.status;
          } catch (e) {
            console.log("Waiting for transaction index...");
          }
        }
        if (status === "FAILED") {
          throw new Error(`Transaction failed: ${JSON.stringify(result)}`);
        }
        return result;
      };

      console.log(`Sending action ${action} for payment ${paymentId}...`);
      const response = await server.sendTransaction(signedTx);
      
      if (response.status === "PENDING") {
          console.log(`Action sent (${response.hash}). Waiting for confirmation...`);
          await waitForTransaction(response.hash);
          console.log("Action confirmed!");
      } else if (response.status === "ERROR") {
           throw new Error(`Action failed: ${JSON.stringify(response)}`);
      }
      
      // Refresh data after successful action (with delay to ensure backend updates)
      setTimeout(async () => {
        await fetchSubscriptions();
      }, 1000);
      
    } catch (err: any) {
      console.error(`${action} failed:`, err);
      
      // Parse contract errors for user-friendly messages
      let errorMessage = err.message || "Unknown error occurred";
      
      if (errorMessage.includes("Error(Contract, #5)")) {
        if (action === "pause_payment") {
          errorMessage = "This payment is already paused or inactive.";
        } else if (action === "cancel_payment") {
          errorMessage = "This payment is already cancelled or inactive.";
        } else {
          errorMessage = "This payment is not active.";
        }
      } else if (errorMessage.includes("Error(Contract, #13)")) {
        errorMessage = "This payment is already cancelled.";
      } else if (errorMessage.includes("Error(Contract, #1)")) {
        errorMessage = "Not authorized to perform this action.";
      }
      
      alert(`Action failed: ${errorMessage}`);
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
      <div className="flex h-[400px] items-center justify-center border-[3px] border-ink border-dashed bg-muted/20">
        <div className="text-center">
          <h3 className="mt-2 text-xl font-bold font-display uppercase">
            Wallet Disconnected
          </h3>
          <p className="mt-1 text-sm font-medium">
            Connect your wallet to access the Grid.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b-[3px] border-ink pb-6">
        <div>
          <h2 className="text-4xl font-display text-primary mb-2">
            GRID VIEW
          </h2>
          <p className="text-sm font-bold tracking-wider uppercase text-muted-foreground">
            Active Protocols & Recurring Streams
          </p>
        </div>
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={fetchSubscriptions}
            disabled={loading}
            className="border-[2px]"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            SYNC
          </Button>
          <Button asChild>
            <Link href="/create">
              <Plus className="mr-2 h-4 w-4" /> INITIATE NEW
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border-[3px] border-destructive text-destructive px-4 py-3 font-bold">
          {error}
        </div>
      )}

      <Card className="min-h-[400px]">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : data.length === 0 ? (
            // --- Empty State ---
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-muted p-6 rounded-full mb-6 border-[3px] border-ink">
                <Plus className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold font-display uppercase mb-2">
                Grid Empty
              </h3>
              <p className="text-muted-foreground mb-8 max-w-sm font-medium">
                No active streams detected on the network.
              </p>
              <Button asChild size="lg">
                <Link href="/create">INITIALIZE PROTOCOL</Link>
              </Button>
            </div>
          ) : (
            // --- Data Table ---
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">STATUS</TableHead>
                  <TableHead>TARGET ID</TableHead>
                  <TableHead>VOLUME</TableHead>
                  <TableHead>FREQUENCY</TableHead>
                  <TableHead>NEXT EVENT</TableHead>
                  <TableHead className="text-right">CONTROLS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((sub) => (
                  <TableRow key={sub.id}>
                    {/* Status Badge */}
                    <TableCell>
                      <StatusBadge status={sub.status} />
                    </TableCell>

                    {/* ID & Recipient */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-lg font-display">
                          #{sub.id}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[140px] bg-muted/30 p-1">
                          {sub.recipient.slice(0, 8)}...{sub.recipient.slice(-4)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="font-bold text-lg">
                      {sub.amount.toFixed(2)}{" "}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        {sub.token}
                      </span>
                    </TableCell>

                    {/* Interval */}
                    <TableCell className="uppercase font-bold tracking-wider text-sm">
                      {sub.interval}
                    </TableCell>

                    {/* Next Execution Date */}
                    <TableCell className="font-mono text-sm">
                      {sub.status === "Active" && sub.nextExecution > 0
                        ? format(new Date(sub.nextExecution * 1000), "yyyy-MM-dd")
                        : "-"}
                    </TableCell>

                    {/* Actions Dropdown */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="h-10 w-10 p-0 border-[2px] border-transparent hover:border-ink hover:bg-transparent"
                            disabled={actionLoading === sub.id}
                          >
                            {actionLoading === sub.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-5 w-5" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-[3px] border-ink rounded-none p-0">
                          <DropdownMenuLabel className="bg-muted/50 border-b border-ink">ACTIONS</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() =>
                              navigator.clipboard.writeText(sub.id)
                            }
                            className="focus:bg-primary focus:text-white rounded-none cursor-pointer"
                          >
                            COPY ID
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              navigator.clipboard.writeText(sub.recipient)
                            }
                            className="focus:bg-primary focus:text-white rounded-none cursor-pointer"
                          >
                            COPY ADDRESS
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-ink" />

                          {sub.status === "Active" && (
                            <DropdownMenuItem
                              onClick={() => handlePause(sub.id)}
                              className="focus:bg-accent focus:text-ink rounded-none cursor-pointer"
                            >
                              <Pause className="mr-2 h-4 w-4" /> PAUSE
                            </DropdownMenuItem>
                          )}

                          {sub.status === "Paused" && (
                            <DropdownMenuItem
                              onClick={() => handleResume(sub.id)}
                              className="focus:bg-accent focus:text-ink rounded-none cursor-pointer"
                            >
                              <Play className="mr-2 h-4 w-4" /> RESUME
                            </DropdownMenuItem>
                          )}

                          {(sub.status === "Active" || sub.status === "Paused") && (
                            <DropdownMenuItem
                              onClick={() => handleCancel(sub.id)}
                              className="text-destructive focus:bg-destructive focus:text-white rounded-none cursor-pointer font-bold"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> TERMINATE
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
    Active: "bg-emerald-100 text-emerald-900 border-emerald-900",
    Paused: "bg-red-100 text-red-900 border-red-900",
    Failed: "bg-red-100 text-red-900 border-red-900",
    Cancelled: "bg-slate-200 text-slate-900 border-slate-900",
    Completed: "bg-blue-100 text-blue-900 border-blue-900",
  };

  return (
    <span
      className={`inline-flex items-center border-[2px] px-3 py-1 text-xs font-bold uppercase ${styles[status]}`}
    >
      {status}
    </span>
  );
}

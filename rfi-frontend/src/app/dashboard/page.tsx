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

// --- Types & Mock Data (Replace with real contract calls) ---
type SubscriptionStatus = "Active" | "Paused" | "Cancelled";

interface Subscription {
  id: string;
  recipient: string;
  token: string;
  amount: number;
  interval: string; // e.g., "Monthly"
  nextExecution: number; // Unix timestamp
  status: SubscriptionStatus;
}

// Mock fetching function
const fetchSubscriptions = async (address: string): Promise<Subscription[]> => {
  await new Promise((r) => setTimeout(r, 1000));
  // Return empty array [] to test empty state
  return [
    {
      id: "1",
      recipient: "GABC...1234",
      token: "USDC",
      amount: 50.0,
      interval: "Monthly",
      nextExecution: Math.floor(Date.now() / 1000) + 86400 * 5,
      status: "Active",
    },
    {
      id: "2",
      recipient: "GXYZ...9876",
      token: "XLM",
      amount: 100.0,
      interval: "Weekly",
      nextExecution: Math.floor(Date.now() / 1000) + 86400 * 2,
      status: "Paused",
    },
    {
      id: "3",
      recipient: "GDEF...5678",
      token: "USDC",
      amount: 10.0,
      interval: "Daily",
      nextExecution: Math.floor(Date.now() / 1000) - 86400, // Past
      status: "Cancelled",
    },
  ];
};

// --- Action Handlers (Mock) ---
const handlePause = async (id: string) => {
  console.log(`Pausing ${id}...`);
  // await contract.pause(id);
};
const handleResume = async (id: string) => {
  console.log(`Resuming ${id}...`);
  // await contract.resume(id);
};
const handleCancel = async (id: string) => {
  console.log(`Cancelling ${id}...`);
  // await contract.cancel(id);
};

export default function DashboardPage() {
  const { address, isConnected } = useWallet();
  const [data, setData] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && address) {
      setLoading(true);
      fetchSubscriptions(address)
        .then(setData)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isConnected, address]);

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
        <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
          <Link href="/dashboard/create">
            <Plus className="mr-2 h-4 w-4" /> Create New
          </Link>
        </Button>
      </div>

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
                <Link href="/dashboard/create">Create Subscription</Link>
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
                          {sub.recipient}
                        </span>
                      </div>
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="font-medium text-slate-900">
                      {sub.amount}{" "}
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
                      {format(
                        new Date(sub.nextExecution * 1000),
                        "MMM d, yyyy",
                      )}
                    </TableCell>

                    {/* Actions Dropdown */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
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

                          <DropdownMenuItem
                            onClick={() => handleCancel(sub.id)}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Cancel
                          </DropdownMenuItem>
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
  const styles = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Paused: "bg-amber-50 text-amber-700 border-amber-200",
    Cancelled: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const dotStyles = {
    Active: "bg-emerald-500",
    Paused: "bg-amber-500",
    Cancelled: "bg-slate-400",
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

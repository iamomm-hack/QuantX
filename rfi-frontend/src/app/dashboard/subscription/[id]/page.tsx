"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Coins,
  History,
  Ban,
  Loader2,
  ArrowLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useWallet } from "@/context/wallet-provider";

// --- Types & Mock Data ---

type Status = "Active" | "Paused" | "Cancelled";

interface ExecutionEvent {
  id: string;
  date: number; // Unix timestamp
  amount: number;
  token: string;
  status: "Success" | "Failed";
  txHash: string;
}

interface SubscriptionDetail {
  id: string;
  recipient: string;
  token: string;
  amount: number;
  interval: string;
  nextExecution: number;
  status: Status;
  totalPaid: number;
  remainingAllowance: number;
  history: ExecutionEvent[];
}

// Mock Fetcher
const fetchSubscriptionDetail = async (
  id: string,
): Promise<SubscriptionDetail> => {
  await new Promise((r) => setTimeout(r, 800)); // Simulate latency
  return {
    id: id,
    recipient: "GABC...1234",
    token: "USDC",
    amount: 50.0,
    interval: "Monthly",
    nextExecution: Math.floor(Date.now() / 1000) + 86400 * 12,
    status: "Active",
    totalPaid: 250.0,
    remainingAllowance: 500.0,
    history: [
      {
        id: "e1",
        date: Math.floor(Date.now() / 1000) - 86400 * 30,
        amount: 50,
        token: "USDC",
        status: "Success",
        txHash: "tx_123",
      },
      {
        id: "e2",
        date: Math.floor(Date.now() / 1000) - 86400 * 60,
        amount: 50,
        token: "USDC",
        status: "Success",
        txHash: "tx_456",
      },
      {
        id: "e3",
        date: Math.floor(Date.now() / 1000) - 86400 * 90,
        amount: 50,
        token: "USDC",
        status: "Failed",
        txHash: "tx_789",
      },
    ],
  };
};

export default function SubscriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isConnected } = useWallet();
  const id = params?.id as string;

  const [data, setData] = useState<SubscriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchSubscriptionDetail(id)
        .then(setData)
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this subscription?")) return;
    console.log("Cancelling subscription", id);
    // await contract.cancel(id);
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!data) return <div>Subscription not found</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* --- 1. Header Section --- */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-8 w-8 -ml-2 text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Subscription #{data.id}
            </h1>
            <StatusBadge status={data.status} />
          </div>
          <p className="text-sm text-slate-500 ml-9">
            Sending to{" "}
            <span className="font-mono text-slate-700">{data.recipient}</span>
          </p>
        </div>

        {data.status !== "Cancelled" && (
          <Button
            variant="destructive"
            onClick={handleCancel}
            className="w-full md:w-auto bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 shadow-none"
          >
            <Ban className="mr-2 h-4 w-4" />
            Cancel Subscription
          </Button>
        )}
      </div>

      <Separator />

      {/* --- 2. Overview Cards --- */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.totalPaid}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {data.token}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Lifetime volume</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Payment</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {format(new Date(data.nextExecution * 1000), "MMM d")}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(data.nextExecution * 1000), "yyyy")} •{" "}
              {data.interval}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Allowance Left
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.remainingAllowance}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {data.token}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Authorized limit</p>
          </CardContent>
        </Card>
      </div>

      {/* --- 3. Execution History (Vertical Timeline) --- */}
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Execution History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative pl-6 border-l border-slate-200 space-y-8 py-2">
            {data.history.map((event, index) => (
              <div key={event.id} className="relative group">
                {/* Timeline Dot */}
                <span
                  className={`absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-white ring-1 ring-offset-2 ${
                    event.status === "Success"
                      ? "bg-emerald-500 ring-emerald-500"
                      : "bg-red-500 ring-red-500"
                  }`}
                />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Payment of {event.amount} {event.token}
                    </p>
                    <p className="text-xs text-slate-500">
                      {format(
                        new Date(event.date * 1000),
                        "MMMM d, yyyy 'at' h:mm a",
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={
                        event.status === "Success"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                          : "border-red-200 bg-red-50 text-red-700 hover:bg-red-50"
                      }
                    >
                      {event.status}
                    </Badge>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-slate-400"
                      asChild
                    >
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${event.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Tx
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Status Badge Helper ---
function StatusBadge({ status }: { status: Status }) {
  const styles = {
    Active: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80",
    Paused: "bg-amber-100 text-amber-700 hover:bg-amber-100/80",
    Cancelled: "bg-slate-100 text-slate-700 hover:bg-slate-100/80",
  };
  return (
    <Badge className={`rounded-full shadow-none border-0 ${styles[status]}`}>
      {status}
    </Badge>
  );
}

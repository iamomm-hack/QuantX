"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Heart,
  RefreshCw,
  Terminal,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// --- Types & Mock Data ---

interface LogEntry {
  id: string;
  timestamp: number;
  level: "INFO" | "SUCCESS" | "ERROR";
  message: string;
}

interface ExecutorStats {
  status: "ONLINE" | "OFFLINE";
  lastRun: number;
  executions24h: number;
  failedTx: number;
  logs: LogEntry[];
}

const fetchExecutorStats = async (): Promise<ExecutorStats> => {
  // Simulate API call
  await new Promise((r) => setTimeout(r, 1000));

  const now = Date.now();
  return {
    status: "ONLINE",
    lastRun: now - 1000 * 45, // 45 seconds ago
    executions24h: 142,
    failedTx: 3,
    logs: Array.from({ length: 25 }).map((_, i) => ({
      id: `log-${i}`,
      timestamp: now - i * 1000 * 60 * 5, // Every 5 mins
      level: i === 4 ? "ERROR" : i % 3 === 0 ? "SUCCESS" : "INFO",
      message:
        i === 4
          ? "Tx Failed: Op_underfunded (ID: 9928)"
          : i % 3 === 0
            ? `Successfully executed sub #${1000 + i}`
            : `Scanning block ${400000 + i}... found 0 dues.`,
    })),
  };
};

export default function ExecutorStatusPage() {
  const [stats, setStats] = useState<ExecutorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const data = await fetchExecutorStats();
      setStats(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 30s
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Activity className="h-8 w-8 animate-pulse text-indigo-600" />
      </div>
    );
  }

  if (!stats) return <div>Failed to load stats</div>;

  const isHealthy = stats.status === "ONLINE";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Executor Status
          </h2>
          <p className="text-sm text-slate-500">
            Monitor the off-chain bot processing subscriptions.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={refreshing}
        >
          <RefreshCw
            className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {/* --- 1. Health & Stats Grid --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Heartbeat Card */}
        <Card
          className={cn(
            "border-l-4",
            isHealthy ? "border-l-emerald-500" : "border-l-red-500",
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Heart
              className={cn(
                "h-4 w-4",
                isHealthy
                  ? "text-emerald-500 fill-emerald-500 animate-pulse"
                  : "text-red-500",
              )}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.status}</div>
            <p className="text-xs text-muted-foreground">
              {isHealthy ? "Bot is active & polling" : "Bot may be down"}
            </p>
          </CardContent>
        </Card>

        {/* Last Run */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Run</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor((Date.now() - stats.lastRun) / 1000)}s ago
            </div>
            <p className="text-xs text-muted-foreground">
              {format(stats.lastRun, "h:mm:ss a")}
            </p>
          </CardContent>
        </Card>

        {/* Executions 24h */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Executions (24h)
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.executions24h}</div>
            <p className="text-xs text-muted-foreground">Successful payments</p>
          </CardContent>
        </Card>

        {/* Failed Tx */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Tx</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failedTx}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* --- 2. Live Logs Console --- */}
      <Card className="bg-slate-950 text-slate-50 border-slate-800">
        <CardHeader className="border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-indigo-400" />
            <CardTitle className="text-base font-mono text-slate-100">
              Live Logs
            </CardTitle>
          </div>
          <CardDescription className="text-slate-400">
            Real-time output from the executor service.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] w-full p-4">
            <div className="space-y-1.5 font-mono text-xs md:text-sm">
              {stats.logs.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <span className="text-slate-500 shrink-0 select-none">
                    {format(log.timestamp, "HH:mm:ss.SSS")}
                  </span>
                  <div className="flex-1 break-all">
                    <span
                      className={cn(
                        "font-bold mr-2",
                        log.level === "INFO" && "text-blue-400",
                        log.level === "SUCCESS" && "text-emerald-400",
                        log.level === "ERROR" && "text-red-400",
                      )}
                    >
                      [{log.level}]
                    </span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                </div>
              ))}

              {/* Typewriter cursor effect at the end */}
              <div className="animate-pulse text-indigo-500 font-bold mt-2">
                _
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

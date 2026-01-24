"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Zap, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useWallet } from "@/context/WalletContext";
import api from "@/lib/api";

interface Payment {
  id: string;
  recipient: string;
  amount: number;
  token: string;
  lastExecution: string;
  nextExecution: string;
  interval: number;
  status: number; // 0: Active, 1: Paused, 2: Cancelled
}

export default function PaymentsPage() {
  const { walletConnected, publicKey } = useWallet();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [executeHover, setExecuteHover] = useState<string | null>(null);

  useEffect(() => {
    if (walletConnected && publicKey) {
      loadPayments();
    } else {
      setLoading(false);
    }
  }, [walletConnected, publicKey]);

  const loadPayments = async () => {
    if (!publicKey) return;
    try {
      // Fetch real data from your API
      const response = await api.getPaymentsByUser(publicKey);
      if (response.success && response.payments) {
        // Map API response to UI model if needed
        const formattedPayments = response.payments.map((p: any) => ({
          id: p.id.toString(),
          recipient: p.recipient,
          amount: p.amount / 10000000,
          token: p.token || "USDC",
          lastExecution: "N/A", // API might not return this yet
          nextExecution: new Date(p.next_execution * 1000).toLocaleDateString(),
          interval: p.interval,
          status: p.status,
        }));
        setPayments(formattedPayments);
      }
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: // Active
        return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400";
      case 1: // Paused
        return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400";
      case 2: // Cancelled
        return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400";
      default:
        return "bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-400";
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0:
        return "Active";
      case 1:
        return "Paused";
      case 2:
        return "Cancelled";
      default:
        return "Unknown";
    }
  };

  const formatInterval = (seconds: number) => {
    if (seconds === 604800) return "Weekly";
    if (seconds === 2592000) return "Monthly";
    return `${Math.floor(seconds / 86400)} days`;
  };

  return (
    <div className="min-h-screen bg-background animate-in fade-in duration-500">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            All Payments
          </h1>
          <p className="text-muted-foreground">
            Complete history of all payment agreements and executions
          </p>
        </div>

        {/* Filter/Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 border-border bg-secondary/20">
            <p className="text-sm text-muted-foreground mb-1">
              Total Agreements
            </p>
            <p className="text-2xl font-bold text-foreground">
              {payments.length}
            </p>
          </Card>
          <Card className="p-4 border-border bg-secondary/20">
            <p className="text-sm text-muted-foreground mb-1">Active</p>
            <p className="text-2xl font-bold text-foreground">
              {payments.filter((p) => p.status === 0).length}
            </p>
          </Card>
          <Card className="p-4 border-border bg-secondary/20">
            <p className="text-sm text-muted-foreground mb-1">Cancelled/Past</p>
            <p className="text-2xl font-bold text-foreground">
              {payments.filter((p) => p.status === 2).length}
            </p>
          </Card>
        </div>

        {/* Payments Table */}
        <Card className="border-border bg-card overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">
              Payment Agreements
            </h2>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground flex justify-center items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading history...
              </div>
            ) : payments.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                No payment history found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">
                      Receiver
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Amount
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Interval
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Next Execution
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="text-right text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow
                      key={payment.id}
                      className="border-border hover:bg-secondary/20"
                    >
                      <TableCell>
                        <div className="font-mono text-sm">
                          <span className="text-foreground">
                            {payment.recipient.slice(0, 6)}
                          </span>
                          <span className="text-muted-foreground">...</span>
                          <span className="text-foreground">
                            {payment.recipient.slice(-4)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {payment.amount} {payment.token}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatInterval(payment.interval)}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {payment.nextExecution}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${getStatusColor(payment.status)} border-0`}
                          variant="secondary"
                        >
                          {getStatusText(payment.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {payment.status === 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-2 text-muted-foreground hover:text-foreground cursor-not-allowed opacity-50"
                            disabled
                            title="Auto-execution handled by network"
                          >
                            <Zap className="w-4 h-4" />
                            <span className="hidden sm:inline">Auto</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>

        {/* Telegram Integration Section */}
        <Card className="mt-8 p-6 border-primary/30 bg-primary/5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/20">
                <span className="text-lg">📱</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Telegram Integration
              </h3>
              <p className="text-muted-foreground mb-4">
                Create and manage recurring on-chain payments directly from
                Telegram.
              </p>
              <div className="space-y-2 text-sm mb-4">
                <p className="text-foreground">
                  <strong>Bot:</strong>{" "}
                  <code className="bg-secondary/50 px-2 py-1 rounded text-primary">
                    @QuantX_Bot
                  </code>
                </p>
                <p className="text-muted-foreground">
                  Available commands:{" "}
                  <code className="bg-secondary/50 px-2 py-1 rounded text-primary">
                    /create_payment
                  </code>
                  ,{" "}
                  <code className="bg-secondary/50 px-2 py-1 rounded text-primary">
                    /my_payments
                  </code>
                </p>
              </div>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Open in Telegram
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

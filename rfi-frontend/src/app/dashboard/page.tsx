"use client";

import { useState } from "react";
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
import Navbar from "@/components/Navbar"; // <--- Import Navbar

const MOCK_PLANS = [
  {
    id: 1,
    recipient: "GAB...73J",
    amount: "50 USDC",
    interval: "Weekly",
    next: "Oct 24, 2025",
    status: "Active",
  },
  {
    id: 2,
    recipient: "GDX...92L",
    amount: "1200 USDC",
    interval: "Monthly",
    next: "Nov 01, 2025",
    status: "Paused",
  },
];

export default function Dashboard() {
  const [plans, setPlans] = useState(MOCK_PLANS);

  const handleCancel = (id: number) => {
    if (confirm("Cancel subscription?"))
      setPlans(plans.filter((p) => p.id !== id));
  };

  const handlePause = (id: number) => {
    setPlans(
      plans.map((p) =>
        p.id === id
          ? { ...p, status: p.status === "Active" ? "Paused" : "Active" }
          : p,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar /> {/* <--- Replaced old nav */}
      <main className="container mx-auto py-10 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Your Active Subscriptions</h1>
          <Link href="/create">
            <Button>+ New Plan</Button>
          </Link>
        </div>

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
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-mono">
                      {plan.recipient}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {plan.amount}
                    </TableCell>
                    <TableCell>{plan.interval}</TableCell>
                    <TableCell>{plan.next}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          plan.status === "Active"
                            ? "bg-green-500"
                            : "bg-yellow-500"
                        }
                      >
                        {plan.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePause(plan.id)}
                      >
                        {plan.status === "Active" ? "Pause" : "Resume"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancel(plan.id)}
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

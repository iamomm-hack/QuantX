"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Navbar from "@/components/Navbar"; // <--- Import the new component
import SuccessModal from "@/components/SuccessModal";

export default function CreatePlan() {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    recipient: "",
    amount: "",
    token: "USDC",
    interval: "604800",
  });

  const handleSubmit = async () => {
    setLoading(true);
    // Simulation
    setTimeout(() => {
      setLoading(false);
      setShowSuccess(true);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Reusable Navbar */}
      <Navbar />

      <main className="flex flex-col items-center pt-12 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle>Create Subscription</CardTitle>
            <CardDescription>
              Set up a new recurring payment stream.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Form Inputs ... (No changes here) */}
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                placeholder="G..."
                value={formData.recipient}
                onChange={(e) =>
                  setFormData({ ...formData, recipient: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USDC)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interval">Payment Frequency</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.interval}
                onChange={(e) =>
                  setFormData({ ...formData, interval: e.target.value })
                }
              >
                <option value="60">Every Minute (Demo)</option>
                <option value="604800">Weekly</option>
                <option value="2628000">Monthly</option>
              </select>
            </div>

            <Button
              className="w-full mt-6"
              size="lg"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Processing..." : "Start Subscription"}
            </Button>
          </CardContent>
        </Card>
      </main>

      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
}

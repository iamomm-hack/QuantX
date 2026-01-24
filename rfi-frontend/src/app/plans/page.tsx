"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, Clock, Coins } from "lucide-react";

export default function PlansPage() {
  // Hardcoded Plan 1 for now (since we created it in the contract)
  const plans = [
    {
      id: 1,
      name: "Basic Plan",
      amount: 10, // 10 USDC
      interval: 2592000, // Monthly (30 days)
      token: "USDC",
      description: "Perfect for getting started with recurring payments",
      active: true,
    },
  ];

  const formatInterval = (seconds: number): string => {
    if (seconds >= 2592000) return "Monthly";
    if (seconds >= 604800) return "Weekly";
    if (seconds >= 86400) return `${Math.floor(seconds / 86400)} days`;
    return `${Math.floor(seconds / 3600)} hours`;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Subscription Plans</h1>
        <p className="text-muted-foreground text-lg">
          Choose a plan that fits your needs. Cancel anytime.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className="border-[3px] border-ink shadow-[8px_8px_0_rgba(0,0,0,1)] hover:shadow-[12px_12px_0_rgba(0,0,0,1)] transition-all"
          >
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <Badge variant="outline" className="font-mono">
                  Plan #{plan.id}
                </Badge>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Price */}
              <div className="bg-accent p-4 border-[2px] border-ink">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{plan.amount}</span>
                  <span className="text-xl text-muted-foreground">{plan.token}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  per {formatInterval(plan.interval).toLowerCase()}
                </p>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Billing: {formatInterval(plan.interval)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Coins className="h-4 w-4 text-primary" />
                  <span>Token: {plan.token}</span>
                </div>
              </div>

              {/* CTA */}
              <Link href={`/subscribe/${plan.id}`} className="block">
                <Button
                  size="lg"
                  className="w-full h-12 text-lg font-bold group"
                >
                  Subscribe Now
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              {/* Info */}
              <p className="text-xs text-center text-muted-foreground">
                One-time approval • Cancel anytime • Refunds available
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State (if no plans) */}
      {plans.length === 0 && (
        <Card className="border-[3px] border-ink p-12 text-center">
          <p className="text-xl text-muted-foreground mb-4">
            No plans available at the moment
          </p>
          <p className="text-sm text-muted-foreground">
            Check back later or contact support
          </p>
        </Card>
      )}

      {/* Info Section */}
      <div className="mt-12 grid md:grid-cols-3 gap-6">
        <Card className="border-[2px] border-ink p-6">
          <h3 className="font-bold text-lg mb-2">✓ One-Time Approval</h3>
          <p className="text-sm text-muted-foreground">
            Approve once, payments happen automatically
          </p>
        </Card>
        <Card className="border-[2px] border-ink p-6">
          <h3 className="font-bold text-lg mb-2">✓ Cancel Anytime</h3>
          <p className="text-sm text-muted-foreground">
            No commitments. Stop your subscription whenever you want
          </p>
        </Card>
        <Card className="border-[2px] border-ink p-6">
          <h3 className="font-bold text-lg mb-2">✓ Prepaid Refunds</h3>
          <p className="text-sm text-muted-foreground">
            Get refunded for unused cycles on prepaid plans
          </p>
        </Card>
      </div>
    </div>
  );
}

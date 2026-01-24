"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Bell, Lock, Palette, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useWallet } from "@/context/WalletContext";

export default function Settings() {
  const { publicKey, walletConnected } = useWallet();

  return (
    <div className="min-h-screen bg-background animate-in fade-in duration-500">
      <Navbar />
      {/* FIX: Added pt-24 here */}
      <div className="max-w-2xl mx-auto px-6 pt-24 pb-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences and configuration
          </p>
        </div>

        {/* Account Settings */}
        <Card className="border-border bg-card mb-6">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Account Settings
              </h2>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="primaryWallet" className="text-foreground">
                Primary Wallet Address
              </Label>
              <Input
                id="primaryWallet"
                type="text"
                value={
                  walletConnected && publicKey
                    ? publicKey
                    : "No wallet connected"
                }
                readOnly
                className="bg-secondary/20 border-border text-foreground font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                This is your primary account wallet currently connected via
                Freighter.
              </p>
            </div>

            <Separator className="bg-border" />

            <div className="space-y-2">
              <Label htmlFor="backupWallet" className="text-foreground">
                Backup Wallet Address
              </Label>
              <Input
                id="backupWallet"
                type="text"
                placeholder="G..."
                className="bg-secondary/20 border-border text-foreground placeholder:text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Add a backup Stellar wallet for enhanced security (Coming Soon)
              </p>
            </div>

            <div className="pt-4">
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled
              >
                Update Wallet
              </Button>
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="border-border bg-card mb-6">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Notifications
              </h2>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-medium">Payment Executed</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when a recurring payment is executed
                </p>
              </div>
              <Switch
                defaultChecked
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <Separator className="bg-border" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-medium">Payment Failed</p>
                <p className="text-sm text-muted-foreground">
                  Get notified if a payment fails to execute
                </p>
              </div>
              <Switch
                defaultChecked
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <Separator className="bg-border" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-medium">Weekly Summary</p>
                <p className="text-sm text-muted-foreground">
                  Receive a weekly summary of all payments
                </p>
              </div>
              <Switch
                defaultChecked
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>
        </Card>

        {/* Gas Settings */}
        <Card className="border-border bg-card mb-6">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">
                Network Settings
              </h2>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <p className="text-foreground font-medium">Active Network</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/20 cursor-pointer hover:bg-secondary/30 transition-colors">
                  <input
                    type="radio"
                    name="network"
                    value="testnet"
                    defaultChecked
                    className="w-4 h-4"
                  />
                  <span className="text-foreground">Stellar Testnet</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/20 cursor-not-allowed opacity-60">
                  <input
                    type="radio"
                    name="network"
                    value="mainnet"
                    disabled
                    className="w-4 h-4"
                  />
                  <span className="text-foreground">
                    Stellar Mainnet (Coming Soon)
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-4">
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Save Network Settings
              </Button>
            </div>
          </div>
        </Card>

        {/* Appearance Settings */}
        <Card className="border-border bg-card mb-6">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">
                Appearance
              </h2>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <p className="text-foreground font-medium">Theme</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/20 cursor-pointer hover:bg-secondary/30 transition-colors">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    defaultChecked
                    className="w-4 h-4"
                  />
                  <span className="text-foreground">Dark</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/20 cursor-pointer hover:bg-secondary/30 transition-colors">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    className="w-4 h-4"
                  />
                  <span className="text-foreground">Light</span>
                </label>
              </div>
            </div>

            <div className="pt-4">
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Save Theme
              </Button>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-border bg-card border-destructive/30">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-destructive">
              Danger Zone
            </h2>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              These actions cannot be undone. Please proceed with caution.
            </p>
            <div className="flex gap-4">
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/50 text-destructive hover:bg-destructive/10 bg-transparent"
              >
                Clear All Payments
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/50 text-destructive hover:bg-destructive/10 bg-transparent"
              >
                Delete Account
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

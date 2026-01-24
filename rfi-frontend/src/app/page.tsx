"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/FakeAuthContext";
import { useWallet } from "@/context/wallet-provider";
import Navbar from "@/components/Navbar"; // Ensure Navbar is included if you want it on Home

export default function Home() {
  const { user, logout } = useAuth();
  const { isConnected: walletConnected, address: publicKey } = useWallet();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Optional: Add Navbar here if you want consistency */}
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-8 relative">
        {/* Top Right User Profile (Demo) - Only if not using Navbar */}
        {/* 
        {user && (
          <div className="absolute top-5 right-10 flex items-center gap-4">
             ... (Keep this if you aren't using the standard Navbar)
          </div>
        )}
        */}

        <div className="text-center space-y-6 max-w-2xl animate-in fade-in zoom-in duration-700">
          <h1 className="text-6xl font-extrabold tracking-tight text-foreground">
            ⚡ QuantX
          </h1>
          <p className="text-2xl text-muted-foreground">
            Recurring Finance Infrastructure. <br />
            <span className="text-lg text-muted-foreground/80">
              Automated payroll and subscriptions on Stellar.
            </span>
          </p>
          {process.env.NEXT_PUBLIC_DEV_MODE === "true" && (
            <span className="inline-block px-3 py-1 bg-accent/20 text-accent-foreground rounded-lg text-sm font-semibold border border-accent/20">
              🔧 DEV MODE
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4 items-center mt-8">
          {!user ? (
            // IF NOT LOGGED IN
            <Link href="/login">
              <Button
                size="lg"
                className="px-10 py-6 text-lg shadow-xl transition-all hover:scale-105"
              >
                Get Started →
              </Button>
            </Link>
          ) : !walletConnected ? (
            // IF LOGGED IN BUT WALLET NOT CONNECTED
            <div className="text-center space-y-4 bg-card p-6 rounded-xl border border-border shadow-sm">
              <p className="text-card-foreground font-medium">
                Please connect your Freighter wallet to continue
              </p>
              <p className="text-sm text-muted-foreground">
                Click the "Connect Wallet" button in the navigation bar
              </p>
            </div>
          ) : (
            // IF LOGGED IN AND WALLET CONNECTED
            <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Link href="/dashboard">
                <Button
                  variant="secondary"
                  size="lg"
                  className="px-8 shadow-sm"
                >
                  View Dashboard
                </Button>
              </Link>
              <Link href="/create">
                <Button size="lg" className="px-8 shadow-lg">
                  Create New Plan +
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

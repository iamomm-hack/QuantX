"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/FakeAuthContext";
import { useWallet } from "@/context/wallet-provider";

export default function Home() {
  const { user } = useAuth();
  const { isConnected: walletConnected } = useWallet();

  return (
    <div className="flex flex-col justify-center h-full min-h-[60vh]">
       {/* Hero Section */}
       <section className="p-0 relative">
          {/* Decorative Circle */}
          <div className="absolute top-0 right-10 w-[150px] h-[150px] bg-destructive rounded-full -z-10 hidden md:block" />
          
          <span className="txt-small text-primary block mb-2">Protocol V1.0</span>
          <h1 className="leading-[0.8] mb-6">
            QUANT X<br />
            FINANCE
          </h1>
          
          <p className="text-xl font-medium max-w-[45ch] mb-8 slide-reveal" style={{animationDelay: '0.1s'}}>
            Automated recurring payments on Stellar.
            <span className="bg-destructive text-white px-2 mx-1">Trustless</span>
            payroll, subscriptions, and allowances. Zero friction. Total control.
          </p>

          <div className="flex flex-wrap gap-4 slide-reveal" style={{animationDelay: '0.3s'}}>
             {!user ? (
                <Link href="/login">
                  <Button size="lg" className="h-16 text-2xl px-12">
                    ACCESS TERMINAL
                  </Button>
                </Link>
             ) : !walletConnected ? (
                <div className="p-6 border-[3px] border-ink bg-yellow-100 max-w-md">
                   <p className="font-bold font-display text-xl mb-2">Wallet Disconnected</p>
                   <p className="text-sm font-mono">Connect Freighter wallet in header to proceed.</p>
                </div>
             ) : (
                <>
                  <Link href="/dashboard">
                    <Button size="lg" className="h-16 text-2xl px-12">
                      OPEN DASHBOARD
                    </Button>
                  </Link>
                  <Link href="/plans">
                    <Button variant="outline" size="lg" className="h-16 text-2xl px-12 hover:bg-primary hover:text-white transition-all">
                      VIEW PLANS
                    </Button>
                  </Link>
                  <Link href="/create">
                    <Button variant="outline" size="lg" className="h-16 text-2xl px-12 hover:bg-ink hover:text-white transition-all">
                      NEW STREAM
                    </Button>
                  </Link>
                </>
             )}
          </div>
       </section>

       {/* Divider */}
       <div className="my-12 h-5 w-full border-t-[3px] border-b-[3px] border-ink" 
            style={{
              background: `repeating-linear-gradient(90deg, var(--color-ink), var(--color-ink) 2px, transparent 2px, transparent 10px)`
            }} 
       />

       {/* Secondary Section */}
       <section className="grid md:grid-cols-2 gap-12">
         <div>
            <h2 className="mb-4">NETWORK STATUS</h2>
            <div className="p-8 bg-accent border-[3px] border-ink shadow-[15px_15px_0_rgba(0,0,0,0.1)]">
              <div className="space-y-4 font-bold">
                 <div className="border-b border-ink py-2 flex justify-between">
                    <span>PROTOCOL</span>
                    <span>SOROBAN SMART CONTRACT</span>
                 </div>
                 <div className="border-b border-ink py-2 flex justify-between">
                    <span>NETWORK</span>
                    <span>STELLAR TESTNET</span>
                 </div>
                 <div className="border-b border-ink py-2 flex justify-between">
                    <span>STATUS</span>
                    <span className="text-emerald-700 bg-emerald-100 px-2">OPERATIONAL</span>
                 </div>
              </div>
            </div>
         </div>
         
         <div>
            <h2 className="mb-4">CORE FEATURES</h2>
            <ul className="list-none counter-reset-list">
               <li className="flex items-center text-xl font-bold border-b border-ink py-4">
                  <span className="w-8 h-8 rounded-full bg-ink text-canvas flex items-center justify-center mr-4 text-sm">1</span>
                  Non-Custodial Assets
               </li>
               <li className="flex items-center text-xl font-bold border-b border-ink py-4">
                  <span className="w-8 h-8 rounded-full bg-ink text-canvas flex items-center justify-center mr-4 text-sm">2</span>
                  Low-Cost Execution
               </li>
               <li className="flex items-center text-xl font-bold border-b border-ink py-4">
                  <span className="w-8 h-8 rounded-full bg-ink text-canvas flex items-center justify-center mr-4 text-sm">3</span>
                  Automated Scheduling
               </li>
            </ul>
         </div>
       </section>
    </div>
  );
}

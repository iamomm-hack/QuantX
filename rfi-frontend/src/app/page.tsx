"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/FakeAuthContext"; // Ensure this path is correct

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 gap-8 bg-slate-50 relative">
      {/* Top Right User Profile (Demo) */}
      {user && (
        <div className="absolute top-5 right-10 flex items-center gap-4">
          <div className="flex flex-col text-right">
            <span className="text-sm font-bold text-gray-900">{user.name}</span>
            <span className="text-xs text-gray-500">{user.email}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="hover:bg-red-50 hover:text-red-600 border-red-200"
          >
            Sign Out
          </Button>
        </div>
      )}

      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-6xl font-extrabold tracking-tight text-gray-900">
          RFI
        </h1>
        <p className="text-2xl text-gray-500">
          Recurring Finance Infrastructure. <br />
          <span className="text-lg text-gray-400">
            Automated payroll and subscriptions on Stellar.
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-4 items-center mt-8">
        {!user ? (
          // IF NOT LOGGED IN: Show "Get Started" which goes to Login
          <Link href="/login">
            <Button
              size="lg"
              className="px-10 py-6 text-lg bg-black text-white hover:bg-gray-800 shadow-xl transition-all hover:scale-105"
            >
              Get Started →
            </Button>
          </Link>
        ) : (
          // IF LOGGED IN: Show Dashboard & Create buttons
          <div className="flex gap-4 animate-in fade-in zoom-in duration-500">
            <Link href="/dashboard">
              <Button variant="secondary" size="lg" className="px-8 shadow-sm">
                View Dashboard
              </Button>
            </Link>
            <Link href="/create">
              <Button
                size="lg"
                className="px-8 bg-blue-600 hover:bg-blue-700 shadow-lg text-white"
              >
                Create New Plan +
              </Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

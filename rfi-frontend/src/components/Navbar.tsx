"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import WalletConnect from "@/components/WalletConnect";
import { useAuth } from "@/context/FakeAuthContext"; // Import auth hook

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="w-full bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity"
        >
          RFI
        </Link>

        {/* Only show links if logged in */}
        {user && (
          <div className="hidden md:flex gap-6">
            <Link
              href="/create"
              className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
            >
              Create Plan
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
            >
              My Subscriptions
            </Link>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <WalletConnect />

        {/* User Profile / Logout */}
        {user ? (
          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-gray-900">
                {user.name}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              Sign Out
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button size="sm">Sign In</Button>
          </Link>
        )}
      </div>
    </nav>
  );
}

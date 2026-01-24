"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import WalletConnect from "@/components/WalletConnect";
import { useAuth } from "@/context/FakeAuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 bg-background/80 border-b border-border h-16 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo Area */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-lg">
                Q
              </span>
            </div>
            <span className="text-xl font-bold text-foreground hidden sm:inline">
              QuantX
            </span>
          </Link>

          {/* Navigation Links - Only if logged in */}
          {user && (
            <div className="hidden md:flex gap-6 items-center">
              <Link
                href="/create"
                className={`text-sm font-medium transition-colors ${
                  pathname === "/create"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create Plan
              </Link>
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors ${
                  pathname === "/dashboard"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Dashboard
              </Link>
            </div>
          )}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          <WalletConnect />

          {/* User Profile / Logout */}
          {user ? (
            <div className="flex items-center gap-3 pl-4 border-l border-border ml-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-foreground">
                  {user.name}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/context/FakeAuthContext";
import Link from "next/link";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Fake network delay for realism
    setTimeout(() => {
      login(name || "Demo User");
      setIsLoading(false);
    }, 1000);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Sign in to RFI
          </CardTitle>
          <CardDescription className="text-center">
            Enter your name to access the demo dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Ex: Alice"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <Button
              className="w-full bg-black text-white hover:bg-gray-800"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Continue with Email"}
            </Button>
            <div className="text-center text-xs text-gray-500 mt-4">
              <Link href="/" className="hover:underline">
                ← Back to Home
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

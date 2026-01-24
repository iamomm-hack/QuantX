"use client";

import { AuthProvider } from "@/context/FakeAuthContext";
import { WalletProvider } from "@/context/WalletContext";
import Footer from "@/components/Footer";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WalletProvider>
        <div className="flex-grow">{children}</div>
        <Footer />
      </WalletProvider>
    </AuthProvider>
  );
}

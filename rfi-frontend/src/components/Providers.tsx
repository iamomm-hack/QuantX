"use client";

import { AuthProvider } from "@/context/FakeAuthContext";
import Footer from "@/components/Footer";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex-grow">{children}</div>
      <Footer />
    </AuthProvider>
  );
}

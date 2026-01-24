import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { WalletProvider } from "@/context/wallet-provider"; // Import the wallet context

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RFI - Recurring Finance",
  description: "Automated On-Chain Subscriptions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Providers>
          {/* 
            Wrapping children with WalletProvider here makes 
            the wallet state available throughout the app 
          */}
          <WalletProvider>{children}</WalletProvider>
        </Providers>
      </body>
    </html>
  );
}

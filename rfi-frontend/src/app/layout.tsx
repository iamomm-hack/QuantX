import type { Metadata } from "next";
import { Koulen, Syne } from "next/font/google"; // Import fonts
import "./globals.css";
import Providers from "@/components/Providers";
import { WalletProvider } from "@/context/wallet-provider";
import Navbar from "@/components/Navbar"; // Add Navbar to layout

// Define fonts
const koulen = Koulen({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "The Edge // Construct",
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
        className={`${koulen.variable} ${syne.variable} antialiased min-h-screen flex flex-col bg-background text-foreground`}
      >
        <Providers>
          <WalletProvider>
            {/* Header Strip is part of layout now */}
            <Navbar />
            
            {/* Main Grid Wrapper */}
            <div className="bauhaus-grid flex-1">
              {/* Left Sidebar - Decorative */}
              <aside className="col-sidebar">
                <span className="txt-small tracking-[0.5em]">
                  Est. 2025 // Constructivist Design System
                </span>
              </aside>

              {/* Main Content Area */}
              <main className="col-main w-full">
                {children}
              </main>

              {/* Right Panel - Info/Stats (Can be populated by specific pages via portals, or just static for now) */}
              <aside className="col-panel p-8 hidden lg:block">
                <div className="border border-[3px] border-ink bg-white h-full flex flex-col">
                  <div className="h-[200px] relative border-b-[3px] border-ink" style={{
                    background: `repeating-linear-gradient(45deg, var(--color-blue), var(--color-blue) 10px, var(--color-canvas) 10px, var(--color-canvas) 20px)`
                  }}>
                    <div className="absolute -bottom-5 -right-5 w-20 h-20 rounded-full bg-destructive border-[3px] border-ink flex items-center justify-center text-white font-display rotate-[15deg] shadow-lg">
                      NEW
                    </div>
                  </div>
                  <div className="p-8">
                    <h3 className="text-2xl mb-4 text-primary">Status</h3>
                    <p className="font-medium text-sm">
                      System operational. Wallet connectivity active.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
            
            {/* Footer - Strictly Aligned */}
            <footer className="border-t-[3px] border-ink bg-ink text-canvas">
              <div className="bauhaus-grid" style={{ minHeight: 'auto', borderBottom: 'none' }}>
                  {/* Left Column */}
                  <div className="col-sidebar border-r-[3px] border-canvas/20 hidden md:flex items-center justify-center p-4">
                     <span className="text-2xl font-display">|||</span>
                  </div>
                  
                  {/* Main Footer Content */}
                  <div className="col-main p-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-ink text-canvas">
                    <div className="text-left">
                       <h4 className="text-2xl font-display text-canvas mb-1">QUANT X</h4>
                       <p className="txt-small text-canvas/60">
                         DECENTRALIZED RECURRING PAYMENTS
                       </p>
                    </div>
                    <div className="text-right">
                       <p className="txt-small text-canvas">
                         © 2026 BUILT ON STELLAR
                       </p>
                    </div>
                  </div>

                   {/* Right Column */}
                   <div className="col-panel hidden lg:block border-l-[3px] border-canvas/20 bg-ink">
                      {/* Empty for grid structure */}
                   </div>
              </div>
            </footer>
          </WalletProvider>
        </Providers>
      </body>
    </html>
  );
}

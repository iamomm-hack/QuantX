import { Sidebar } from "@/components/dashboard/sidebar";

// Placeholder for your wallet button
function WalletConnectButton() {
  return (
    <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
      Connect Wallet
    </button>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar - Fixed Left */}
      <Sidebar />

      {/* Main Content Wrapper - Pushed right by 250px */}
      <div className="pl-[250px] transition-all duration-300">
        {/* Top Navigation - Sticky Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-slate-800">Dashboard</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Future Notification Bell or User Menu could go here */}
            <WalletConnectButton />
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto max-w-7xl p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

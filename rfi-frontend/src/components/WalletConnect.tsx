"use client";

import { useWallet } from "@/context/wallet-provider";
import { Button } from "@/components/ui/button";

export default function WalletConnect() {
  const { isConnected, address, connect, disconnect } = useWallet();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="font-mono bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
        >
          <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
          {address.slice(0, 4)}...{address.slice(-4)}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={disconnect}
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={() => connect("freighter")}>Connect Wallet</Button>
  );
}

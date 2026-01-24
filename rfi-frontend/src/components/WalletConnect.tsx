"use client";

import { useWallet } from "@/context/WalletContext";
import { Button } from "@/components/ui/button";

export default function WalletConnect() {
  const { walletConnected, publicKey, connectWallet, disconnectWallet } =
    useWallet();

  return (
    <div>
      {walletConnected && publicKey ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="font-mono bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
            {publicKey.slice(0, 4)}...{publicKey.slice(-4)}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={disconnectWallet}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <Button onClick={connectWallet}>Connect Wallet</Button>
      )}
    </div>
  );
}

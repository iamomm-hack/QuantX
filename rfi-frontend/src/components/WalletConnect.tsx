"use client";

import { useWallet } from "@/context/wallet-provider";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function WalletConnect() {
  const { isConnected, address, connect, disconnect } = useWallet();

  if (isConnected && address) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="font-mono bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
            {address.slice(0, 4)}...{address.slice(-4)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Wallet Details</h4>
                <p className="text-sm text-muted-foreground break-all">
                  {address}
                </p>
              </div>
              <Button
                variant="destructive"
                className="w-full"
                onClick={disconnect}
              >
                Disconnect
              </Button>
            </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Button onClick={() => connect("freighter")}>Connect Wallet</Button>
  );
}

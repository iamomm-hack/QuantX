"use client";

import { useState } from "react";
import { useWallet } from "@/context/wallet-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, LogOut, ExternalLink } from "lucide-react";

export function WalletConnectButton() {
  const { isConnected, address, connect, disconnect, walletType } = useWallet();
  const [isOpen, setIsOpen] = useState(false);

  // Helper to truncate address
  const truncateAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  // Handle connection selection
  const handleConnect = async (type: "freighter" | "albedo") => {
    await connect(type);
    setIsOpen(false);
  };

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          >
            {/* Simple Avatar Placeholder */}
            <div className="h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white">
              {address[0]}
            </div>
            <span className="font-mono">{truncateAddress(address)}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Wallet</DropdownMenuLabel>
          <div className="px-2 py-1 text-xs text-slate-500 break-all">
            {walletType === "freighter" ? "Freighter" : "Albedo"} Connected
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(address)}
          >
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={disconnect}
            className="text-red-600 focus:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Wallet className="mr-2 h-4 w-4" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button
            variant="outline"
            className="h-16 justify-start px-4 text-base hover:bg-slate-50 hover:border-indigo-600"
            onClick={() => handleConnect("freighter")}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-3">
                {/* SVG Icon for Freighter would go here */}
                <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                  F
                </span>
                <div className="flex flex-col items-start">
                  <span className="font-semibold">Freighter</span>
                  <span className="text-xs text-slate-500">
                    Browser Extension
                  </span>
                </div>
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-16 justify-start px-4 text-base hover:bg-slate-50 hover:border-indigo-600"
            onClick={() => handleConnect("albedo")}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-3">
                {/* SVG Icon for Albedo would go here */}
                <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                  A
                </span>
                <div className="flex flex-col items-start">
                  <span className="font-semibold">Albedo</span>
                  <span className="text-xs text-slate-500">
                    Universal Login
                  </span>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-400" />
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

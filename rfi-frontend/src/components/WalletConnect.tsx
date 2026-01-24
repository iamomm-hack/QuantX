"use client";

import { useState, useEffect } from "react";
import { isConnected, requestAccess, getAddress } from "@stellar/freighter-api";
import { Button } from "@/components/ui/button";

export default function WalletConnect() {
  const [address, setAddress] = useState<string>("");
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    async function checkFreighter() {
      try {
        // Fix 1: Handle the object returned by isConnected
        const connectionStatus = await isConnected();
        // @ts-ignore - The type definition might be slightly off in the library version, so we check safely
        const connected =
          typeof connectionStatus === "object"
            ? connectionStatus.isConnected
            : !!connectionStatus;

        setIsInstalled(connected);

        if (connected) {
          // Fix 2: Handle the object returned by getAddress
          const addressObj = await getAddress();
          // @ts-ignore
          const addr =
            typeof addressObj === "object" ? addressObj.address : addressObj;

          if (typeof addr === "string" && addr) {
            setAddress(addr);
          }
        }
      } catch (e) {
        console.error("Freighter check failed", e);
      }
    }
    checkFreighter();
  }, []);

  const handleConnect = async () => {
    if (!isInstalled) {
      alert("Please install the Freighter Wallet extension to use RFI.");
      window.open("https://www.freighter.app/", "_blank");
      return;
    }

    try {
      const keyObj = await requestAccess();

      // FIX: Access only 'address' since TS knows it's the only property
      // @ts-ignore
      const key = typeof keyObj === "object" ? keyObj.address : keyObj;

      if (typeof key === "string" && key) {
        setAddress(key);
      } else {
        // Fallback
        const addressObj = await getAddress();
        // @ts-ignore
        const addr =
          typeof addressObj === "object" ? addressObj.address : addressObj;
        if (typeof addr === "string" && addr) setAddress(addr);
      }
    } catch (e) {
      console.error("Connection failed", e);
    }
  };

  return (
    <div>
      {address ? (
        <Button
          variant="outline"
          className="font-mono bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
        >
          <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
          {address.slice(0, 4)}...{address.slice(-4)}
        </Button>
      ) : (
        <Button onClick={handleConnect}>Connect Wallet</Button>
      )}
    </div>
  );
}

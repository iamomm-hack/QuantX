"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  isConnected,
  setAllowed,
  getAddress,
  getNetwork,
} from "@stellar/freighter-api";

type WalletType = "freighter" | null;
type Network = "PUBLIC" | "TESTNET" | "UNKNOWN";

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  network: Network;
  walletType: WalletType;
  connect: (type: WalletType) => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<{
    isConnected: boolean;
    address: string | null;
    network: Network;
    walletType: WalletType;
  }>({
    isConnected: false,
    address: null,
    network: "TESTNET", // default
    walletType: null,
  });

  const setWalletState = (
    isConnected: boolean,
    address: string | null,
    walletType: WalletType,
    network: Network = "TESTNET",
  ) => {
    setStatus({ isConnected, address, walletType, network });
    if (isConnected && walletType) {
      localStorage.setItem("walletType", walletType);
    } else {
      localStorage.removeItem("walletType");
    }
  };

  // ✅ Freighter connect
  const connectFreighter = async () => {
    try {
      const isAppConnected = await isConnected();
      if (!isAppConnected) {
        alert("Freighter is not installed!");
        return;
      }

      await setAllowed();

      const { address } = await getAddress();
      const net = await getNetwork();

      const networkName = net?.network?.toUpperCase();

      const network: Network =
        networkName === "PUBLIC"
          ? "PUBLIC"
          : networkName === "TESTNET"
            ? "TESTNET"
            : "UNKNOWN";

      if (address) {
        setWalletState(true, address, "freighter", network);
      }
    } catch (e) {
      console.error("Freighter connection failed:", e);
    }
  };

  const connect = async (type: WalletType) => {
    if (type === "freighter") await connectFreighter();
  };

  const disconnect = () => {
    setWalletState(false, null, null, "TESTNET");
  };

  // ✅ Auto-connect
  useEffect(() => {
    const attemptAutoConnect = async () => {
      const savedType = localStorage.getItem("walletType");

      if (savedType === "freighter") {
        const isAppConnected = await isConnected();
        if (isAppConnected) {
          try {
            const { address } = await getAddress();
            const net = await getNetwork();

            const networkName = net?.network?.toUpperCase();
            const network: Network =
              networkName === "PUBLIC"
                ? "PUBLIC"
                : networkName === "TESTNET"
                  ? "TESTNET"
                  : "UNKNOWN";

            if (address) {
              setStatus({
                isConnected: true,
                address,
                walletType: "freighter",
                network,
              });
            }
          } catch {
            localStorage.removeItem("walletType");
          }
        }
      }
    };

    attemptAutoConnect();
  }, []);

  return (
    <WalletContext.Provider value={{ ...status, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context)
    throw new Error("useWallet must be used within a WalletProvider");
  return context;
};

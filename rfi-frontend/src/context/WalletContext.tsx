"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import { isConnected, requestAccess, getAddress } from "@stellar/freighter-api";

interface WalletContextType {
  walletConnected: boolean;
  publicKey: string;
  loading: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  checkWalletConnection: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletConnected, setWalletConnected] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [loading, setLoading] = useState(true);

  // ✅ Auto-check wallet
  const checkWalletConnection = async () => {
    try {
      const connected = await isConnected();
      const isConn =
        typeof connected === "object"
          ? connected.isConnected
          : Boolean(connected);

      if (isConn) {
        const res = await getAddress();

        if (!res.error && res.address) {
          setPublicKey(res.address);
          setWalletConnected(true);
        }
      }
    } catch (error) {
      console.error("Error checking wallet:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkWalletConnection();
  }, []);

  // ✅ Connect wallet
  const connectWallet = async () => {
    try {
      setLoading(true);

      const access = await requestAccess();

      if (access?.error) {
        alert("Failed to connect wallet: " + access.error);
        return;
      }

      const res = await getAddress();

      if (!res.error && res.address) {
        setPublicKey(res.address);
        setWalletConnected(true);
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Please install or unlock Freighter wallet");
    } finally {
      setLoading(false);
    }
  };

  // ℹ️ Freighter has no hard disconnect
  const disconnectWallet = () => {
    setWalletConnected(false);
    setPublicKey("");
  };

  return (
    <WalletContext.Provider
      value={{
        walletConnected,
        publicKey,
        loading,
        connectWallet,
        disconnectWallet,
        checkWalletConnection,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ✅ Hook
export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

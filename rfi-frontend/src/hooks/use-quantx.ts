import { useWallet } from "@/context/wallet-provider";
import { QuantXClient } from "quantx-sdk";
import { signTransaction } from "@stellar/freighter-api";
import { useEffect, useState } from "react";

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK = (process.env.NEXT_PUBLIC_NETWORK || "TESTNET") as "TESTNET" | "MAINNET";

export function useQuantX() {
  const { isConnected, address } = useWallet();
  const [client, setClient] = useState<QuantXClient | null>(null);

  useEffect(() => {
    if (isConnected && address && CONTRACT_ID) {
      const c = new QuantXClient({
        network: NETWORK,
        contractId: CONTRACT_ID,
        rpcUrl: RPC_URL,
        
        // ---------------------------------------------------------
        // FIX: Move keys inside the 'wallet' object
        // ---------------------------------------------------------
        wallet: {
          publicKey: address,
          signTransaction: async (xdr: string) => {
            const result = await signTransaction(xdr, {
               networkPassphrase: NETWORK === "MAINNET" 
                 ? "Public Global Stellar Network ; September 2015" 
                 : "Test SDF Network ; September 2015"
            });
            
            if(!result) throw new Error("User rejected signature");
            
            // Freighter returns object { signedTxXdr } or string
            if (typeof result === "string") return result;
            if ("signedTxXdr" in result) return result.signedTxXdr;
            
            throw new Error("Invalid signature response from wallet");
          }
        }
        // ---------------------------------------------------------
      });
      setClient(c);
    } else {
        setClient(null);
    }
  }, [isConnected, address]);

  return client;
}
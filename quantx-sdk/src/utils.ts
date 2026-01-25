import {
  scValToNative,
  nativeToScVal,
  Address,
  xdr,
} from "@stellar/stellar-sdk";

/**
 * Convert human readable amount to contract integer (7 decimals)
 * @param amount - String amount (e.g. "10.5")
 * @returns BigInt for contract
 */
export function toContractAmount(amount: string): bigint {
  const decimals = 7;
  const multiplier = Math.pow(10, decimals);
  const val = parseFloat(amount) * multiplier;
  return BigInt(Math.floor(val));
}

/**
 * Convert contract integer to human readable string
 * @param amount - BigInt or Number from contract
 * @returns formatted string
 */
export function fromContractAmount(amount: bigint | number | string): string {
  const decimals = 7;
  const val = Number(amount) / Math.pow(10, decimals);
  return val.toString();
}

/**
 * Check if a string is a valid Contract ID or Public Key
 */
export function isValidAddress(address: string): boolean {
  try {
    Address.fromString(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse a Soroban return value
 */
export function parseScVal(val: xdr.ScVal): any {
  try {
    return scValToNative(val);
  } catch (e) {
    console.warn("Failed to parse ScVal:", e);
    return null;
  }
}

/**
 * Create ScVal arguments for the contract
 */
export function createArgs(args: any[]): xdr.ScVal[] {
  return args.map((arg) => {
    if (typeof arg === "bigint") return nativeToScVal(arg, { type: "i128" }); // Usually i128 for amounts
    if (typeof arg === "number") return nativeToScVal(arg, { type: "u64" }); // ID/Time usually u64
    if (typeof arg === "string" && arg.startsWith("G")) return nativeToScVal(arg, { type: "address" });
    if (typeof arg === "string" && arg.startsWith("C")) return nativeToScVal(arg, { type: "address" });
    return nativeToScVal(arg);
  });
}

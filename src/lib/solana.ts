import { Connection, clusterApiUrl } from "@solana/web3.js";

export function makeConnection() {
  const fromEnv = process.env.NEXT_PUBLIC_RPC_URL;
  const url = fromEnv && fromEnv.trim().length > 0 ? fromEnv : clusterApiUrl("devnet");
  return new Connection(url, "confirmed");
}

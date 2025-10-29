export type PQKeyPair = { publicKey: string; privateKey: string };

export type WalletKeys = {
  kem: PQKeyPair; // ML-KEM-768 (base64)
  dsa: PQKeyPair; // ML-DSA-65 (base64)
};

export type KemBundle = {
  ctB64: string;
  ivB64: string;
  tagB64: string;
  dataB64: string; // encapsulated shared secret + maybe metadata
};

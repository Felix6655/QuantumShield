"use client";
import type { EncBlob } from "./secure";
import { decryptJSON, encryptJSON } from "./secure";

export type QsKeyFile = {
  v: 1;
  kemPub: string;
  dsaPub: string;
  enc: EncBlob; // contains both private keys
};

export async function buildQsKey(
  pass: string,
  kem: { scheme: string; publicKey: string; privateKey: string },
  dsa: { scheme: string; publicKey: string; privateKey: string }
): Promise<QsKeyFile> {
  const enc = await encryptJSON(
    { kem: { scheme: kem.scheme, privateKey: kem.privateKey }, dsa: { scheme: dsa.scheme, privateKey: dsa.privateKey } },
    pass
  );
  return { v: 1, kemPub: kem.publicKey, dsaPub: dsa.publicKey, enc };
}

export async function openQsKey(qs: QsKeyFile, pass: string) {
  const secret = await decryptJSON(qs.enc, pass);
  return {
    kem: { scheme: secret.kem.scheme as string, publicKey: qs.kemPub, privateKey: secret.kem.privateKey as string },
    dsa: { scheme: secret.dsa.scheme as string, publicKey: qs.dsaPub, privateKey: secret.dsa.privateKey as string },
  };
}

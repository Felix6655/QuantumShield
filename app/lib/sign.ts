// Server-only util: no 'use client'

export async function signPayload({ msg }: { msg: string }) {
  // do your server logic here (crypto, db, etc.)
  return { signature: Buffer.from(msg).toString('base64') };
}

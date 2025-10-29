

export type NewWalletReq = { name: string; password: string };
export type NewWalletRes = { name: string; address: string };
export type AddressRes   = { address: string };
export type SignReq      = { password: string; message: string };
export type SignRes      = { signed_hex: string };
export type VerifyReq    = { signed_hex: string };
export type VerifyRes    = { ok: boolean; message?: string };

const BASE = process.env.NEXT_PUBLIC_QS_WALLETD_URL || "http://127.0.0.1:8787";

async function check<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

export const qsWalletd = {
  async health() { return (await fetch(`${BASE}/healthz`)).text(); },
  async ready() { return (await fetch(`${BASE}/readyz`)).text(); },
  async newWallet(req: NewWalletReq) {
    return check<NewWalletRes>(
      await fetch(`${BASE}/wallets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req),
      })
    );
  },
  async address(name: string) {
    return check<AddressRes>(await fetch(`${BASE}/wallets/${name}/address`));
  },
  async sign(name: string, req: SignReq) {
    return check<SignRes>(
      await fetch(`${BASE}/wallets/${name}/sign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req),
      })
    );
  },
  async verify(name: string, req: VerifyReq) {
    return check<VerifyRes>(
      await fetch(`${BASE}/wallets/${name}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req),
      })
    );
  },
};

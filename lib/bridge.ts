export async function bridgeToNova(publicKey: string, amount: number) {
  const res = await fetch("https://api.novatok.tech/bridge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      public_key: publicKey,
      amount,
      token: "NOVA",
    }),
  });
  return await res.json();
}

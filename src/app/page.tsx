export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center">
      <section className="max-w-3xl mx-auto p-8 space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight">
          NovaTok + <span className="text-white/70">QuantumShield</span>
        </h1>
        <p className="text-white/70">
          Quantum-resistant wallet experiments. Connect and ping Solana devnet.
        </p>
        <div>
          <a
            href="/wallet"
            className="inline-block rounded-2xl border border-white/20 px-5 py-2.5 hover:bg-white hover:text-black transition"
          >
            Open Wallet
          </a>
        </div>
      </section>
    </main>
    );
}
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/wallet");
}
}

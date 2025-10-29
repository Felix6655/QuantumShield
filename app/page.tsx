import Link from "next/link";
import QuantumShieldButton from "@/components/QuantumShieldButton";

export default function Page() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-bold mb-4">NovaTok + QuantumShield</h1>
      <QuantumShieldButton />
    </main>
  );
}

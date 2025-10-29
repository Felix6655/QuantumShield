import dynamic from "next/dynamic";

const ClientWalletPage = dynamic(() => import("./Client"), { ssr: false });

export default function Page() {
  return <ClientWalletPage />;
}

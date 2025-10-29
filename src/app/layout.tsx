import "./globals.css";
import Providers from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0b0b12] text-[#e6e6f0]">
        <header className="border-b border-[#3b3b55]">
          <nav className="max-w-5xl mx-auto p-4 flex gap-6">
            <a href="/" className="opacity-90 hover:opacity-100">Home</a>
            <a href="/wallet" className="opacity-90 hover:opacity-100">Wallet</a>
          </nav>
        </header>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import Link from "next/link";
import { Github, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-gray-200 py-8 mt-auto">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Brand */}
        <div className="flex flex-col items-center md:items-start">
          <span className="font-bold text-lg tracking-tight">RFI</span>
          <span className="text-sm text-gray-500">
            Recurring Finance Infrastructure
          </span>
        </div>

        {/* Links */}
        <div className="flex gap-6 text-sm font-medium text-gray-600">
          <Link href="https://github.com/iamomm-hack/QuantX/blob/main/README.md" className="hover:text-black transition-colors">
            Documentation
          </Link>
          <Link href="https://github.com/iamomm-hack/QuantX/blob/main/contracts/recurring_payment/target/wasm32-unknown-unknown/release/recurring_payment.wasm" className="hover:text-black transition-colors">
            Smart Contracts
          </Link>
          <Link href="https://github.com/iamomm-hack/QuantX/blob/main/LICENSE" className="hover:text-black transition-colors">
            Privacy
          </Link>
        </div>

        {/* Socials */}
        <div className="flex gap-4">
          <Link
            href="https://github.com/iamomm-hack/QuantX"
            target="_blank"
            className="text-gray-400 hover:text-black transition-colors"
          >
            <Github className="h-5 w-5" />
          </Link>
          <Link
            href="https://x.com/omdotcmd"
            target="_blank"
            className="text-gray-400 hover:text-black transition-colors"
          >
            <Twitter className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <div className="text-center mt-8 text-xs text-gray-400">
        Built for Stellar Hackathon 2026. Running on Soroban Testnet.
      </div>
    </footer>
  );
}

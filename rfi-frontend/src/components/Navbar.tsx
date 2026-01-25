"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import WalletConnect from "@/components/WalletConnect";
// Remove useAuth if not using real auth, or keep it. Steps showed useAuth usage.
import { useAuth } from "@/context/FakeAuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-background border-b-[3px] border-ink px-8 py-4 flex justify-between items-center">
      {/* Skewed Logo */}
      <Link href="/" className="font-display text-2xl bg-ink text-canvas px-2 -skew-x-[10deg] hover:bg-primary transition-colors">
        QUANT X
      </Link>

      <nav className="hidden md:flex items-center">
        {user && (
          <div className="flex gap-8 mr-8">
            <NavLink href="/" active={pathname === "/"}>
              HOME
            </NavLink>
            <NavLink href="/dashboard" active={pathname === "/dashboard"}>
              DASHBOARD
            </NavLink>
            <NavLink href="/create" active={pathname === "/create"}>
              STREAM
            </NavLink>
          </div>
        )}
      </nav>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        <WalletConnect />

        {user ? (
          <div className="flex items-center gap-4 pl-4 border-l-[3px] border-ink ml-2">
             <span className="text-xl font-bold font-mono hidden sm:inline-block">
                {user.name}
             </span>
            <Button
              variant="ghost"
              onClick={logout}
              className="text-destructive hover:text-white text-xl font-bold"
            >
              EXIT
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button>
              ENTER
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`relative font-bold uppercase text-ink no-underline hover:text-primary transition-colors group ${active ? 'text-primary' : ''}`}
    >
      {children}
      <span className={`absolute -bottom-1 left-0 w-full h-[3px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left ${active ? 'scale-x-100' : ''}`} />
    </Link>
  );
}

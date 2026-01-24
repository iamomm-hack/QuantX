"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  CreditCard,
  PlusCircle,
  ShieldCheck,
  Settings,
} from "lucide-react";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Subscriptions", href: "/dashboard", icon: CreditCard },
  { name: "Create Subscription", href: "/dashboard/create", icon: PlusCircle },
  { name: "Executor Status", href: "/admin/executor", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-[250px] flex-col bg-slate-900 text-white flex">
      {/* Brand / Logo Area */}
      <div className="flex h-16 items-center px-6 border-b border-slate-800">
        <div className="text-xl font-bold tracking-tight text-white">
          Stellar<span className="text-indigo-400">Sub</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-6 px-3">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white",
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive
                      ? "text-white"
                      : "text-slate-400 group-hover:text-white",
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom User/Settings Placeholder */}
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-300">
          <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white">
            JD
          </div>
          <div>
            <p className="text-white">John Doe</p>
            <p className="text-xs text-slate-500">View Profile</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

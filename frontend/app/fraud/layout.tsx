"use client";

import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/fraud", label: "Overview", icon: "📊" },
  { href: "/fraud/rules", label: "Rules", icon: "📋" },
  { href: "/fraud/alerts", label: "Alerts", icon: "🚨" },
];

export default function FraudLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AuthGuard>
      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside className="w-56 min-h-full bg-white border-r border-gray-200 flex-shrink-0">
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fraud Portal</p>
          </div>
          <nav className="p-4 space-y-1">
            {links.map(({ href, label, icon }) => {
              const active = pathname === href || (href !== "/fraud" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? "bg-red-50 text-red-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span>{icon}</span>
                  {label}
                </Link>
              );
            })}
            <div className="pt-4 border-t border-gray-100 mt-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
              >
                ← Customer Dashboard
              </Link>
            </div>
          </nav>
        </aside>
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </AuthGuard>
  );
}

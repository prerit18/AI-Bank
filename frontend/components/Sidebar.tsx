"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Overview", icon: "🏠" },
  { href: "/dashboard/add-funds", label: "Add Funds", icon: "💰" },
  { href: "/dashboard/beneficiaries", label: "Beneficiaries", icon: "👥" },
  { href: "/dashboard/transfer", label: "Transfer", icon: "💸" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-full bg-white border-r border-gray-200 flex-shrink-0">
      <nav className="p-4 space-y-1">
        {links.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

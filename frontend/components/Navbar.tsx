"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";

export default function Navbar() {
  const { customer, logout } = useSession();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="bg-indigo-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={customer ? "/dashboard" : "/"} className="text-xl font-bold tracking-tight">
          AI-Bank
        </Link>
        {customer && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-indigo-200">
              {customer.first_name} {customer.last_name}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

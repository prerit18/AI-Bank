"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/context/SessionContext";
import { dashboard, DashboardSummary } from "@/lib/api";
import AccountCard from "@/components/AccountCard";
import TransactionList from "@/components/TransactionList";

export default function DashboardPage() {
  const { customer } = useSession();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer) return;
    dashboard
      .summary(customer.customer_id)
      .then(setSummary)
      .finally(() => setLoading(false));
  }, [customer]);

  if (loading) return <div className="text-gray-400 text-sm">Loading…</div>;

  if (!summary?.account) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <div className="text-5xl mb-4">🏦</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">No bank account yet</h2>
        <p className="text-gray-500 text-sm mb-6">Open your first account to get started.</p>
        <Link
          href="/dashboard/open-account"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          Open Account
        </Link>
      </div>
    );
  }

  const { account, recent_transactions } = summary;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Good day, {customer?.first_name}
        </h1>
        <p className="text-sm text-gray-500">Here&apos;s your account overview.</p>
      </div>

      <div className="flex flex-wrap gap-6 items-start">
        <AccountCard account={account} />

        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard/add-funds"
            className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 font-medium px-5 py-3 rounded-xl transition-colors text-sm"
          >
            💰 Add Funds
          </Link>
          <Link
            href="/dashboard/transfer"
            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium px-5 py-3 rounded-xl transition-colors text-sm"
          >
            💸 Make a Transfer
          </Link>
          <Link
            href="/dashboard/beneficiaries"
            className="flex items-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium px-5 py-3 rounded-xl transition-colors text-sm"
          >
            👥 Manage Beneficiaries
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Recent Transactions</h2>
        <TransactionList transactions={recent_transactions} />
      </div>
    </div>
  );
}

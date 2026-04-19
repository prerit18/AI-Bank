"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { accounts, AccountType } from "@/lib/api";
import { useSession } from "@/context/SessionContext";

interface OpenAccountForm {
  account_type: AccountType;
  currency: string;
}

function randomAccountNumber(): string {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

export default function OpenAccountPage() {
  const { customer } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm<OpenAccountForm>({
    defaultValues: { account_type: "current", currency: "GBP" },
  });

  const onSubmit = async (data: OpenAccountForm) => {
    if (!customer) return;
    setLoading(true);
    try {
      await accounts.create({
        customer_id: customer.customer_id,
        account_number: randomAccountNumber(),
        sort_code: "040004",
        account_type: data.account_type,
        balance: "0.00",
        currency: data.currency,
      });
      toast.success("Account opened successfully!");
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to open account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Open a bank account</h1>
      <p className="text-sm text-gray-500 mb-6">Choose your account type to get started.</p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account type</label>
            <select
              {...register("account_type")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="current">Current Account</option>
              <option value="savings">Savings Account</option>
              <option value="isa">ISA</option>
              <option value="business">Business Account</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              {...register("currency")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="GBP">GBP — British Pound</option>
              <option value="EUR">EUR — Euro</option>
              <option value="USD">USD — US Dollar</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? "Opening account…" : "Open account"}
          </button>
        </form>
      </div>
    </div>
  );
}

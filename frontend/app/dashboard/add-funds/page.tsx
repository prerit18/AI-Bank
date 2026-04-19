"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { accounts, payments, Account } from "@/lib/api";
import { useSession } from "@/context/SessionContext";

interface AddFundsForm {
  amount: number;
}

export default function AddFundsPage() {
  const { customer } = useSession();
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<AddFundsForm>();

  useEffect(() => {
    if (!customer) return;
    accounts.getByCustomer(customer.customer_id).then((accs) => {
      setAccount(accs.find((a) => a.status === "active") ?? accs[0] ?? null);
    });
  }, [customer]);

  const onSubmit = async (data: AddFundsForm) => {
    if (!account || !customer) return;
    setLoading(true);
    try {
      await payments.deposit({
        account_id: account.account_id,
        customer_id: customer.customer_id,
        amount: parseFloat(String(data.amount)).toFixed(2),
      });
      toast.success(`£${parseFloat(String(data.amount)).toFixed(2)} added successfully!`);
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add funds");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Add Funds</h1>
      <p className="text-sm text-gray-500 mb-6">
        {account
          ? `Current balance: ${parseFloat(account.balance).toLocaleString("en-GB", { style: "currency", currency: account.currency })}`
          : "Loading account…"}
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount to deposit</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                {...register("amount", {
                  required: "Amount is required",
                  min: { value: 0.01, message: "Minimum deposit is £0.01" },
                })}
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="0.00"
              />
            </div>
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || !account}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? "Adding funds…" : "Add Funds"}
          </button>
        </form>
      </div>
    </div>
  );
}

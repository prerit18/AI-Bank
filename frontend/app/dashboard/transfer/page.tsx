"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { accounts, beneficiaries as beneApi, transactions, Account, Beneficiary } from "@/lib/api";
import { useSession } from "@/context/SessionContext";

interface TransferForm {
  beneficiary_id: number;
  amount: number;
  reference: string;
  description: string;
}

export default function TransferPage() {
  const { customer } = useSession();
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [benes, setBenes] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<TransferForm>();
  const amount = watch("amount");

  useEffect(() => {
    if (!customer) return;
    Promise.all([
      accounts.getByCustomer(customer.customer_id),
      beneApi.getByCustomer(customer.customer_id),
    ]).then(([accs, b]) => {
      setAccount(accs.find((a) => a.status === "active") ?? accs[0] ?? null);
      setBenes(b.filter((b) => b.status === "active"));
    });
  }, [customer]);

  const balance = account ? parseFloat(account.balance) : 0;

  const onSubmit = async (data: TransferForm) => {
    if (!account || !customer) return;
    const amt = parseFloat(String(data.amount));
    if (amt > balance) {
      toast.error("Insufficient funds");
      return;
    }
    setLoading(true);
    try {
      const newBalance = (balance - amt).toFixed(2);
      await transactions.create({
        account_id: account.account_id,
        customer_id: customer.customer_id,
        beneficiary_id: Number(data.beneficiary_id),
        transaction_type: "payment",
        amount: amt.toFixed(2),
        currency: account.currency,
        description: data.description || undefined,
        reference: data.reference || undefined,
        status: "completed",
        transaction_date: new Date().toISOString().split("T")[0],
        balance_after: newBalance,
      });
      await accounts.update(account.account_id, { balance: newBalance });
      toast.success("Payment sent successfully!");
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  const insufficient = amount && parseFloat(String(amount)) > balance;

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Make a Transfer</h1>
      <p className="text-sm text-gray-500 mb-6">
        {account
          ? `Available balance: ${balance.toLocaleString("en-GB", { style: "currency", currency: account.currency })}`
          : "Loading…"}
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {benes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No beneficiaries yet.{" "}
            <a href="/dashboard/beneficiaries" className="text-indigo-600 hover:underline">
              Add one first.
            </a>
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pay to</label>
              <select
                {...register("beneficiary_id", { required: "Select a beneficiary" })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">— select beneficiary —</option>
                {benes.map((b) => (
                  <option key={b.beneficiary_id} value={b.beneficiary_id}>
                    {b.name} ({b.account_number} · {b.sort_code.replace(/(\d{2})(\d{2})(\d{2})/, "$1-$2-$3")})
                  </option>
                ))}
              </select>
              {errors.beneficiary_id && <p className="text-red-500 text-xs mt-1">{errors.beneficiary_id.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 0.01, message: "Minimum is £0.01" },
                  })}
                  className={`w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                    insufficient ? "border-red-400" : "border-gray-300"
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
              {insufficient && <p className="text-red-500 text-xs mt-1">Insufficient funds</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
              <input
                {...register("reference")}
                placeholder="e.g. Rent April"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <input
                {...register("description")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !account || !!insufficient}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? "Sending…" : "Send Payment"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

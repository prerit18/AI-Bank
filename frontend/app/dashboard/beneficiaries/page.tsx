"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { beneficiaries as beneApi, Beneficiary } from "@/lib/api";
import { useSession } from "@/context/SessionContext";

interface AddBeneficiaryForm {
  name: string;
  account_number: string;
  sort_code: string;
  bank_name: string;
  bank_id: string;
  reference: string;
}

export default function BeneficiariesPage() {
  const { customer } = useSession();
  const [benes, setBenes] = useState<Beneficiary[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddBeneficiaryForm>();

  const fetchBenes = async () => {
    if (!customer) return;
    const all = await beneApi.getByCustomer(customer.customer_id);
    setBenes(all.filter((b) => b.status === "active"));
  };

  useEffect(() => {
    fetchBenes();
  }, [customer]);

  const onAdd = async (data: AddBeneficiaryForm) => {
    if (!customer) return;
    setLoadingAdd(true);
    try {
      await beneApi.create({
        customer_id: customer.customer_id,
        name: data.name,
        account_number: data.account_number,
        sort_code: data.sort_code.replace(/-/g, ""),
        bank_name: data.bank_name || undefined,
        bank_id: data.bank_id || undefined,
        reference: data.reference || undefined,
        is_internal: false,
        status: "active",
      });
      toast.success("Beneficiary added!");
      reset();
      setShowForm(false);
      await fetchBenes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add beneficiary");
    } finally {
      setLoadingAdd(false);
    }
  };

  const onRemove = async (id: number) => {
    setRemovingId(id);
    try {
      await beneApi.update(id, { status: "inactive" });
      toast.success("Beneficiary removed.");
      setBenes((prev) => prev.filter((b) => b.beneficiary_id !== id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove beneficiary");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Beneficiaries</h1>
          <p className="text-sm text-gray-500">People you can send money to.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? "Cancel" : "+ Add Beneficiary"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">New beneficiary</h2>
          <form onSubmit={handleSubmit(onAdd)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input
                {...register("name", { required: "Required" })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account number</label>
                <input
                  {...register("account_number", {
                    required: "Required",
                    pattern: { value: /^\d{8}$/, message: "Must be 8 digits" },
                  })}
                  maxLength={8}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {errors.account_number && <p className="text-red-500 text-xs mt-1">{errors.account_number.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort code</label>
                <input
                  {...register("sort_code", {
                    required: "Required",
                    pattern: { value: /^\d{2}-?\d{2}-?\d{2}$/, message: "e.g. 04-00-04" },
                  })}
                  placeholder="04-00-04"
                  maxLength={8}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {errors.sort_code && <p className="text-red-500 text-xs mt-1">{errors.sort_code.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank name</label>
                <input
                  {...register("bank_name")}
                  placeholder="e.g. Barclays"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank ID / BIC</label>
                <input
                  {...register("bank_id")}
                  placeholder="e.g. BARCGB22"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference (optional)</label>
              <input
                {...register("reference")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <button
              type="submit"
              disabled={loadingAdd}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loadingAdd ? "Adding…" : "Add beneficiary"}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {benes.length === 0 ? (
          <p className="text-center py-10 text-gray-400 text-sm">No beneficiaries yet.</p>
        ) : (
          benes.map((b) => (
            <div key={b.beneficiary_id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-medium text-gray-800">{b.name}</p>
                <p className="text-xs text-gray-500 font-mono">
                  {b.account_number} · {b.sort_code.replace(/(\d{2})(\d{2})(\d{2})/, "$1-$2-$3")}
                  {b.bank_name ? ` · ${b.bank_name}` : ""}
                </p>
                {b.reference && <p className="text-xs text-gray-400">Ref: {b.reference}</p>}
              </div>
              <button
                onClick={() => onRemove(b.beneficiary_id)}
                disabled={removingId === b.beneficiary_id}
                className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-40 transition-colors"
              >
                {removingId === b.beneficiary_id ? "Removing…" : "Remove"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

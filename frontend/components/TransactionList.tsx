import { Transaction } from "@/lib/api";

const typeColors: Record<string, string> = {
  credit: "text-green-600 bg-green-50",
  debit: "text-red-600 bg-red-50",
  transfer: "text-blue-600 bg-blue-50",
  payment: "text-orange-600 bg-orange-50",
  refund: "text-green-600 bg-green-50",
  fee: "text-gray-600 bg-gray-50",
};

export default function TransactionList({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">No transactions yet.</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="pb-3 font-medium">Date</th>
            <th className="pb-3 font-medium">Description</th>
            <th className="pb-3 font-medium">Reference</th>
            <th className="pb-3 font-medium">Type</th>
            <th className="pb-3 font-medium text-right">Amount</th>
            <th className="pb-3 font-medium text-right">Balance</th>
            <th className="pb-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {transactions.map((t) => {
            const amount = parseFloat(t.amount).toLocaleString("en-GB", {
              style: "currency",
              currency: t.currency,
            });
            const balAfter = t.balance_after
              ? parseFloat(t.balance_after).toLocaleString("en-GB", {
                  style: "currency",
                  currency: t.currency,
                })
              : "—";
            const isCredit = ["credit", "refund"].includes(t.transaction_type);
            return (
              <tr key={t.transaction_id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 text-gray-500">{t.transaction_date}</td>
                <td className="py-3 text-gray-800">{t.description ?? "—"}</td>
                <td className="py-3 text-gray-500">{t.reference ?? "—"}</td>
                <td className="py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      typeColors[t.transaction_type] ?? "text-gray-600 bg-gray-50"
                    }`}
                  >
                    {t.transaction_type}
                  </span>
                </td>
                <td className={`py-3 text-right font-mono font-medium ${isCredit ? "text-green-600" : "text-red-600"}`}>
                  {isCredit ? "+" : "-"}{amount}
                </td>
                <td className="py-3 text-right font-mono text-gray-600">{balAfter}</td>
                <td className="py-3">
                  <span className="text-xs text-gray-500 capitalize">{t.status}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

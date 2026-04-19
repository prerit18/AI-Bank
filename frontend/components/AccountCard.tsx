import { Account } from "@/lib/api";

export default function AccountCard({ account }: { account: Account }) {
  const balance = parseFloat(account.balance).toLocaleString("en-GB", {
    style: "currency",
    currency: account.currency,
  });

  const sortCode = account.sort_code.replace(/(\d{2})(\d{2})(\d{2})/, "$1-$2-$3");

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-2xl p-6 shadow-lg w-full max-w-sm">
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-indigo-200 text-xs uppercase tracking-wider">Account Type</p>
          <p className="font-semibold capitalize">{account.account_type}</p>
        </div>
        <span className="text-xs bg-white/20 px-2 py-1 rounded-full capitalize">
          {account.status}
        </span>
      </div>
      <div className="mb-6">
        <p className="text-indigo-200 text-xs uppercase tracking-wider mb-1">Balance</p>
        <p className="text-3xl font-bold">{balance}</p>
      </div>
      <div className="flex gap-8 text-sm">
        <div>
          <p className="text-indigo-200 text-xs uppercase tracking-wider">Account No.</p>
          <p className="font-mono font-semibold">{account.account_number}</p>
        </div>
        <div>
          <p className="text-indigo-200 text-xs uppercase tracking-wider">Sort Code</p>
          <p className="font-mono font-semibold">{sortCode}</p>
        </div>
      </div>
    </div>
  );
}

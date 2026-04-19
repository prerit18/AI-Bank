"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { fraud, FraudAlert } from "@/lib/api";
import { useSession } from "@/context/SessionContext";

const severityColors: Record<string, string> = {
  critical: "text-red-700 bg-red-50",
  high: "text-orange-700 bg-orange-50",
  medium: "text-yellow-700 bg-yellow-50",
  low: "text-blue-700 bg-blue-50",
};

const actionColors: Record<string, string> = {
  block: "text-red-700 bg-red-100",
  review: "text-orange-700 bg-orange-100",
  flag: "text-yellow-700 bg-yellow-100",
};

const statusColors: Record<string, string> = {
  open: "text-red-700 bg-red-50",
  investigating: "text-purple-700 bg-purple-50",
  approved: "text-green-700 bg-green-50",
  rejected: "text-gray-700 bg-gray-100",
  false_positive: "text-blue-700 bg-blue-50",
};

const RESOLVED_STATUSES = new Set(["approved", "rejected", "false_positive"]);

export default function AlertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { customer } = useSession();
  const alertId = Number(params.id);

  const [alert, setAlert] = useState<FraudAlert | null>(null);
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState(false);

  const reload = () =>
    fraud.getAlert(alertId).then(setAlert).catch(() => toast.error("Failed to load alert"));

  useEffect(() => { reload(); }, [alertId]);

  const act = async (action: "approve" | "reject" | "investigate" | "false-positive") => {
    setActing(true);
    try {
      const analyst_email = customer?.email ?? "analyst@bank.com";
      if (action === "approve") await fraud.approveAlert(alertId, analyst_email, notes || undefined);
      else if (action === "reject") await fraud.rejectAlert(alertId, analyst_email, notes || undefined);
      else if (action === "investigate") await fraud.investigateAlert(alertId, analyst_email, notes || undefined);
      else await fraud.falsePositiveAlert(alertId, analyst_email, notes || undefined);
      toast.success(`Alert marked as ${action}`);
      await reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActing(false);
    }
  };

  if (!alert) return <div className="text-gray-400 text-sm">Loading…</div>;

  const resolved = RESOLVED_STATUSES.has(alert.status);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alert #{alert.alert_id}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${severityColors[alert.severity] ?? ""}`}>
              {alert.severity}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${actionColors[alert.action] ?? ""}`}>
              {alert.action}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[alert.status] ?? ""}`}>
              {alert.status.replace("_", " ")}
            </span>
          </div>
        </div>
        <button onClick={() => router.push("/fraud/alerts")}
          className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
      </div>

      {/* Info grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <Row label="Rule" value={alert.rule_name ?? `#${alert.rule_id}`} />
        <Row label="Transaction" value={`#${alert.transaction_id}`} />
        <Row label="Customer" value={`#${alert.customer_id}`} />
        <Row label="Triggered at" value={new Date(alert.created_at).toLocaleString()} />
        {alert.reviewed_at && <Row label="Reviewed at" value={new Date(alert.reviewed_at).toLocaleString()} />}
        {alert.reviewed_by && <Row label="Reviewed by" value={alert.reviewed_by} />}
        {alert.analyst_notes && <Row label="Notes" value={alert.analyst_notes} />}
      </div>

      {/* Context snapshot */}
      {alert.context_snapshot && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Transaction context</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {Object.entries(alert.context_snapshot).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{k}</span>
                <span className="font-medium text-gray-800">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rule snapshot */}
      {alert.rule_snapshot && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Rule condition (at time of alert)</h2>
          <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 overflow-x-auto">
            {JSON.stringify(alert.rule_snapshot, null, 2)}
          </pre>
        </div>
      )}

      {/* Action panel */}
      {!resolved && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Analyst action</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              placeholder="Add context or reasoning…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => act("approve")}
              disabled={acting}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              Approve transaction
            </button>
            <button
              onClick={() => act("reject")}
              disabled={acting}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              Reject transaction
            </button>
            <button
              onClick={() => act("investigate")}
              disabled={acting}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              Mark investigating
            </button>
            <button
              onClick={() => act("false-positive")}
              disabled={acting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              False positive
            </button>
          </div>
        </div>
      )}

      {resolved && (
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-500">This alert has been resolved — no further actions available.</p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between text-sm">
      <span className="text-gray-500 w-32 flex-shrink-0">{label}</span>
      <span className="text-gray-800 font-medium text-right">{value}</span>
    </div>
  );
}

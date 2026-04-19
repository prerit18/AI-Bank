"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fraud, FraudAlert } from "@/lib/api";

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

const STATUS_OPTIONS = ["", "open", "investigating", "approved", "rejected", "false_positive"];
const SEVERITY_OPTIONS = ["", "critical", "high", "medium", "low"];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");

  const fetchAlerts = () => {
    setLoading(true);
    fraud.listAlerts({ status: statusFilter || undefined, severity: severityFilter || undefined })
      .then(setAlerts)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAlerts(); }, [statusFilter, severityFilter]);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fraud Alerts</h1>
          <p className="text-sm text-gray-500">{alerts.length} alerts</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s === "" ? "All statuses" : s.replace("_", " ")}</option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {SEVERITY_OPTIONS.map(s => (
              <option key={s} value={s}>{s === "" ? "All severities" : s}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-gray-400 text-sm">No alerts found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {alerts.map((alert) => (
            <div key={alert.alert_id} className="px-6 py-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-gray-900 text-sm">Alert #{alert.alert_id}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${severityColors[alert.severity] ?? ""}`}>
                    {alert.severity}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${actionColors[alert.action] ?? ""}`}>
                    {alert.action}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${statusColors[alert.status] ?? ""}`}>
                    {alert.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-0.5">
                  Rule: <span className="font-medium">{alert.rule_name ?? `#${alert.rule_id}`}</span>
                  {" · "}Txn #{alert.transaction_id}
                  {" · "}Customer #{alert.customer_id}
                </p>
                <p className="text-xs text-gray-400">{new Date(alert.created_at).toLocaleString()}</p>
              </div>
              <Link
                href={`/fraud/alerts/${alert.alert_id}`}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex-shrink-0"
              >
                Review →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

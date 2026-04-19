"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fraud, FraudStats } from "@/lib/api";

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

export default function FraudOverviewPage() {
  const [stats, setStats] = useState<FraudStats | null>(null);

  useEffect(() => {
    fraud.getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fraud Analytics Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor fraud rule activity and alert volumes.</p>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total Alerts" value={stats.total_alerts} color="text-gray-800" />
            <StatCard label="Open Alerts" value={stats.open_alerts} color="text-red-600" />
            <StatCard label="Blocked" value={stats.by_action.block ?? 0} color="text-red-700" />
            <StatCard label="Flagged" value={stats.by_action.flag ?? 0} color="text-yellow-700" />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Alerts by Severity</h2>
              <div className="space-y-2">
                {Object.entries(stats.by_severity).map(([sev, count]) => (
                  <div key={sev} className="flex items-center justify-between">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${severityColors[sev] ?? ""}`}>
                      {sev}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Triggered Rules</h2>
              {stats.top_rules.length === 0 ? (
                <p className="text-sm text-gray-400">No rules triggered yet.</p>
              ) : (
                <div className="space-y-3">
                  {stats.top_rules.map((r) => (
                    <div key={r.name} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 truncate">{r.name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${actionColors[r.action] ?? ""}`}>
                          {r.action}
                        </span>
                        <span className="text-sm font-semibold text-gray-600">{r.hit_count}×</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="flex gap-4">
        <Link href="/fraud/rules" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
          Manage Rules
        </Link>
        <Link href="/fraud/alerts" className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
          Review Alerts
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

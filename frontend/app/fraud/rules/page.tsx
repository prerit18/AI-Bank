"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { fraud, FraudRule } from "@/lib/api";

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

export default function RulesPage() {
  const [rules, setRules] = useState<FraudRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = () => fraud.listRules().then(setRules).finally(() => setLoading(false));

  useEffect(() => { fetchRules(); }, []);

  const toggleActive = async (rule: FraudRule) => {
    try {
      await fraud.updateRule(rule.rule_id, { is_active: !rule.is_active });
      toast.success(rule.is_active ? "Rule disabled" : "Rule enabled");
      fetchRules();
    } catch {
      toast.error("Failed to update rule");
    }
  };

  if (loading) return <div className="text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fraud Rules</h1>
          <p className="text-sm text-gray-500">{rules.length} rules · {rules.filter(r => r.is_active).length} active</p>
        </div>
        <Link
          href="/fraud/rules/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + New Rule
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {rules.map((rule) => (
          <div key={rule.rule_id} className={`px-6 py-4 flex items-start gap-4 ${!rule.is_active ? "opacity-50" : ""}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900 text-sm">{rule.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${severityColors[rule.severity]}`}>{rule.severity}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${actionColors[rule.action]}`}>{rule.action}</span>
              </div>
              {rule.description && <p className="text-xs text-gray-500 mb-1">{rule.description}</p>}
              <p className="text-xs text-gray-400">Priority {rule.priority} · {rule.hit_count} hits</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => toggleActive(rule)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  rule.is_active
                    ? "bg-gray-100 hover:bg-gray-200 text-gray-600"
                    : "bg-green-100 hover:bg-green-200 text-green-700"
                }`}
              >
                {rule.is_active ? "Disable" : "Enable"}
              </button>
              <Link
                href={`/fraud/rules/${rule.rule_id}`}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                Edit →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

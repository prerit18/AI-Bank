"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import toast from "react-hot-toast";
import { fraud, FraudAction, FraudSeverity } from "@/lib/api";
import { useSession } from "@/context/SessionContext";

const FIELDS = ["amount","is_new_beneficiary","beneficiary_added_days_ago","is_external_beneficiary",
  "amount_pct_of_balance","account_age_days","hour_of_day","day_of_week",
  "transactions_1h","transactions_24h","transactions_7d","amount_sent_1h","amount_sent_24h","amount_sent_7d"];
const OPERATORS = ["gt","gte","lt","lte","eq","neq"];

interface ConditionRow { field: string; operator: string; value: string; }
interface RuleForm {
  name: string;
  description: string;
  match_type: "and" | "or" | "simple";
  conditions: ConditionRow[];
  action: FraudAction;
  severity: FraudSeverity;
  priority: number;
}

function buildCondition(data: RuleForm): Record<string, unknown> {
  const simple = (c: ConditionRow) => ({
    type: "simple",
    field: c.field,
    operator: c.operator,
    value: isNaN(Number(c.value)) ? c.value : Number(c.value),
  });
  if (data.conditions.length === 1 || data.match_type === "simple")
    return simple(data.conditions[0]);
  return { type: data.match_type, conditions: data.conditions.map(simple) };
}

export default function NewRulePage() {
  const { customer } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ matched: boolean } | null>(null);

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<RuleForm>({
    defaultValues: {
      match_type: "simple",
      conditions: [{ field: "amount", operator: "gt", value: "1000" }],
      action: "flag",
      severity: "medium",
      priority: 50,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "conditions" });
  const conditions = watch("conditions");
  const matchType = watch("match_type");

  const onSubmit = async (data: RuleForm) => {
    setLoading(true);
    try {
      const condition = buildCondition(data);
      await fraud.createRule({
        name: data.name,
        description: data.description || undefined,
        condition,
        action: data.action,
        severity: data.severity,
        priority: data.priority,
        is_active: true,
        created_by: customer?.email ?? "analyst",
      });
      toast.success("Rule created!");
      router.push("/fraud/rules");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create rule");
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    const sampleContext: Record<string, number> = {
      amount: 1500, is_new_beneficiary: 1, beneficiary_added_days_ago: 0,
      is_external_beneficiary: 1, amount_pct_of_balance: 75, account_age_days: 10,
      hour_of_day: 2, day_of_week: 6, transactions_1h: 3, transactions_24h: 5,
      amount_sent_24h: 2000,
    };
    try {
      const condition = buildCondition({ ...watch(), conditions });
      const res = await fraud.testRule(condition, sampleContext);
      setTestResult(res);
    } catch {
      toast.error("Test failed");
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Fraud Rule</h1>
        <p className="text-sm text-gray-500">Define the condition, action, and severity.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule name</label>
              <input {...register("name", { required: "Required" })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input {...register("description")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          {/* Condition builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Match{" "}
                {fields.length > 1 && (
                  <select {...register("match_type")}
                    className="ml-1 border border-gray-300 rounded px-1 py-0.5 text-sm">
                    <option value="and">ALL</option>
                    <option value="or">ANY</option>
                  </select>
                )}{" "}
                of the following:
              </label>
              <button type="button" onClick={() => append({ field: "amount", operator: "gt", value: "0" })}
                className="text-xs text-indigo-600 hover:underline">+ Add condition</button>
            </div>
            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={f.id} className="flex items-center gap-2">
                  <select {...register(`conditions.${i}.field`)}
                    className="border border-gray-300 rounded-lg px-2 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    {FIELDS.map(fl => <option key={fl} value={fl}>{fl}</option>)}
                  </select>
                  <select {...register(`conditions.${i}.operator`)}
                    className="border border-gray-300 rounded-lg px-2 py-2 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                  <input {...register(`conditions.${i}.value`, { required: true })}
                    className="border border-gray-300 rounded-lg px-2 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select {...register("action")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="block">Block</option>
                <option value="review">Review (hold)</option>
                <option value="flag">Flag</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select {...register("severity")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <input type="number" {...register("priority", { valueAsNumber: true })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          {/* Test panel */}
          <div className="border border-dashed border-gray-300 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Dry-run test <span className="text-xs text-gray-400">(against sample context)</span></p>
              <button type="button" onClick={handleTest}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                Run test
              </button>
            </div>
            {testResult !== null && (
              <p className={`text-sm font-semibold ${testResult.matched ? "text-red-600" : "text-green-600"}`}>
                {testResult.matched ? "✓ Rule MATCHES sample context" : "✗ Rule does NOT match sample context"}
              </p>
            )}
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors">
            {loading ? "Creating…" : "Create rule"}
          </button>
        </form>
      </div>
    </div>
  );
}

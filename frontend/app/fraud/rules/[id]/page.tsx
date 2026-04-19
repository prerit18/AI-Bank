"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import toast from "react-hot-toast";
import { fraud, FraudAction, FraudSeverity, FraudRule } from "@/lib/api";

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

function parseCondition(condition: Record<string, unknown>): { match_type: "and" | "or" | "simple"; conditions: ConditionRow[] } {
  if (condition.type === "and" || condition.type === "or") {
    const rows = (condition.conditions as Record<string, unknown>[]).map((c) => ({
      field: c.field as string,
      operator: c.operator as string,
      value: String(c.value),
    }));
    return { match_type: condition.type as "and" | "or", conditions: rows };
  }
  return {
    match_type: "simple",
    conditions: [{ field: condition.field as string, operator: condition.operator as string, value: String(condition.value) }],
  };
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

export default function EditRulePage() {
  const params = useParams();
  const router = useRouter();
  const ruleId = Number(params.id);
  const [loading, setLoading] = useState(false);
  const [rule, setRule] = useState<FraudRule | null>(null);
  const [testResult, setTestResult] = useState<{ matched: boolean } | null>(null);

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<RuleForm>({
    defaultValues: { match_type: "simple", conditions: [{ field: "amount", operator: "gt", value: "1000" }], action: "flag", severity: "medium", priority: 50 },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "conditions" });
  const conditions = watch("conditions");

  useEffect(() => {
    fraud.getRule(ruleId).then((r) => {
      setRule(r);
      const { match_type, conditions: conds } = parseCondition(r.condition as Record<string, unknown>);
      reset({ name: r.name, description: r.description ?? "", match_type, conditions: conds, action: r.action, severity: r.severity, priority: r.priority });
    }).catch(() => toast.error("Failed to load rule"));
  }, [ruleId, reset]);

  const onSubmit = async (data: RuleForm) => {
    setLoading(true);
    try {
      const condition = buildCondition(data);
      await fraud.updateRule(ruleId, { name: data.name, description: data.description || undefined, condition, action: data.action, severity: data.severity, priority: data.priority });
      toast.success("Rule updated!");
      router.push("/fraud/rules");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update rule");
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    const sampleContext: Record<string, number> = {
      amount: 1500, is_new_beneficiary: 1, beneficiary_added_days_ago: 0,
      is_external_beneficiary: 1, amount_pct_of_balance: 75, account_age_days: 10,
      hour_of_day: 2, day_of_week: 6, transactions_1h: 3, transactions_24h: 5, amount_sent_24h: 2000,
    };
    try {
      const condition = buildCondition({ ...watch(), conditions });
      const res = await fraud.testRule(condition, sampleContext);
      setTestResult(res);
    } catch {
      toast.error("Test failed");
    }
  };

  if (!rule) return <div className="text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Rule</h1>
        <p className="text-sm text-gray-500">Rule ID #{ruleId} · {rule.hit_count} hits</p>
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

          <div className="flex gap-3">
            <button type="submit" disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors">
              {loading ? "Saving…" : "Save changes"}
            </button>
            <button type="button" onClick={() => router.push("/fraud/rules")}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

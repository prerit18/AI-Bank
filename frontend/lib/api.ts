const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type CustomerStatus = "active" | "inactive" | "suspended";
export type AccountType = "current" | "savings" | "isa" | "business";
export type AccountStatus = "active" | "frozen" | "closed";
export type TransactionType = "credit" | "debit" | "transfer" | "payment" | "refund" | "fee";
export type TransactionStatus = "pending" | "completed" | "failed" | "reversed";

export interface Customer {
  customer_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postcode?: string;
  country: string;
  date_of_birth: string;
  status: CustomerStatus;
  created_at: string;
  updated_at: string;
}

export interface Account {
  account_id: number;
  customer_id: number;
  account_number: string;
  sort_code: string;
  account_type: AccountType;
  balance: string;
  currency: string;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface Beneficiary {
  beneficiary_id: number;
  customer_id: number;
  name: string;
  account_number: string;
  sort_code: string;
  bank_id?: string;
  bank_name?: string;
  is_internal: boolean;
  internal_customer_id?: number;
  internal_account_id?: number;
  reference?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  transaction_id: number;
  account_id: number;
  customer_id: number;
  beneficiary_id?: number;
  transaction_type: TransactionType;
  amount: string;
  currency: string;
  description?: string;
  reference?: string;
  status: TransactionStatus;
  transaction_date: string;
  balance_after?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentResult {
  account: Account;
  transaction: Transaction;
}

export interface DashboardSummary {
  customer: Customer;
  account: Account | null;
  recent_transactions: Transaction[];
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const auth = {
  login: (email: string) =>
    request<Customer>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
};

// ── Customers ─────────────────────────────────────────────────────────────────

export const customers = {
  create: (data: Omit<Customer, "customer_id" | "created_at" | "updated_at">) =>
    request<Customer>("/customers/", { method: "POST", body: JSON.stringify(data) }),
  get: (id: number) => request<Customer>(`/customers/${id}`),
};

// ── Accounts ──────────────────────────────────────────────────────────────────

export const accounts = {
  create: (data: { customer_id: number; account_type: AccountType; currency: string }) =>
    request<Account>("/accounts/", { method: "POST", body: JSON.stringify(data) }),
  getByCustomer: (customerId: number) =>
    request<Account[]>(`/accounts/customer/${customerId}`),
  updateStatus: (id: number, status: AccountStatus) =>
    request<Account>(`/accounts/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
};

// ── Beneficiaries ─────────────────────────────────────────────────────────────

export const beneficiaries = {
  getByCustomer: (customerId: number) =>
    request<Beneficiary[]>(`/beneficiaries/customer/${customerId}`),
  create: (data: Omit<Beneficiary, "beneficiary_id" | "created_at" | "updated_at">) =>
    request<Beneficiary>("/beneficiaries/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: { name?: string; reference?: string; status?: string }) =>
    request<Beneficiary>(`/beneficiaries/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

// ── Transactions ──────────────────────────────────────────────────────────────

export const transactions = {
  getByAccount: (accountId: number, limit = 10) =>
    request<Transaction[]>(`/transactions/account/${accountId}?limit=${limit}`),
};

// ── Payments (atomic) ─────────────────────────────────────────────────────────

export const payments = {
  deposit: (data: {
    account_id: number;
    customer_id: number;
    amount: string;
    description?: string;
  }) =>
    request<PaymentResult>("/payments/deposit", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  transfer: (data: {
    account_id: number;
    customer_id: number;
    beneficiary_id: number;
    amount: string;
    reference?: string;
    description?: string;
  }) =>
    request<PaymentResult>("/payments/transfer", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboard = {
  summary: (customerId: number) =>
    request<DashboardSummary>(`/dashboard/summary/${customerId}`),
};

// ── Fraud Analytics ───────────────────────────────────────────────────────────

export type FraudAction = "block" | "review" | "flag";
export type FraudSeverity = "low" | "medium" | "high" | "critical";
export type FraudAlertStatus = "open" | "investigating" | "approved" | "rejected" | "false_positive";

export interface FraudRule {
  rule_id: number;
  name: string;
  description?: string;
  condition: Record<string, unknown>;
  action: FraudAction;
  severity: FraudSeverity;
  priority: number;
  is_active: boolean;
  created_by: string;
  hit_count: number;
  last_hit_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FraudAlert {
  alert_id: number;
  transaction_id: number;
  customer_id: number;
  rule_id: number;
  rule_name?: string;
  action: FraudAction;
  severity: FraudSeverity;
  status: FraudAlertStatus;
  rule_snapshot?: Record<string, unknown>;
  context_snapshot?: Record<string, string>;
  analyst_notes?: string;
  reviewed_by?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface FraudStats {
  total_alerts: number;
  open_alerts: number;
  by_severity: Record<string, number>;
  by_action: Record<string, number>;
  top_rules: { name: string; hit_count: number; action: string }[];
}

export const fraud = {
  listRules: () => request<FraudRule[]>("/fraud/rules"),
  getRule: (id: number) => request<FraudRule>(`/fraud/rules/${id}`),
  createRule: (data: Omit<FraudRule, "rule_id" | "hit_count" | "last_hit_at" | "created_at" | "updated_at">) =>
    request<FraudRule>("/fraud/rules", { method: "POST", body: JSON.stringify(data) }),
  updateRule: (id: number, data: Partial<FraudRule>) =>
    request<FraudRule>(`/fraud/rules/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteRule: (id: number) =>
    request<void>(`/fraud/rules/${id}`, { method: "DELETE" }),
  testRule: (condition: Record<string, unknown>, context: Record<string, unknown>) =>
    request<{ matched: boolean; context: Record<string, unknown> }>("/fraud/rules/test", {
      method: "POST",
      body: JSON.stringify({ condition, context }),
    }),
  listAlerts: (params?: { status?: string; severity?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.severity) qs.set("severity", params.severity);
    return request<FraudAlert[]>(`/fraud/alerts${qs.toString() ? "?" + qs : ""}`);
  },
  getAlert: (id: number) => request<FraudAlert>(`/fraud/alerts/${id}`),
  approveAlert: (id: number, analyst_email: string, notes?: string) =>
    request(`/fraud/alerts/${id}/approve`, { method: "PATCH", body: JSON.stringify({ analyst_email, notes }) }),
  rejectAlert: (id: number, analyst_email: string, notes?: string) =>
    request(`/fraud/alerts/${id}/reject`, { method: "PATCH", body: JSON.stringify({ analyst_email, notes }) }),
  investigateAlert: (id: number, analyst_email: string, notes?: string) =>
    request(`/fraud/alerts/${id}/investigate`, { method: "PATCH", body: JSON.stringify({ analyst_email, notes }) }),
  falsePositiveAlert: (id: number, analyst_email: string, notes?: string) =>
    request(`/fraud/alerts/${id}/false-positive`, { method: "PATCH", body: JSON.stringify({ analyst_email, notes }) }),
  getStats: () => request<FraudStats>("/fraud/stats"),
};

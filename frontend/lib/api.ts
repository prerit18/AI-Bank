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

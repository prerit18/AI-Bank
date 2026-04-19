# AB-8 — API Integration Plan

## Problem Statement

The current frontend and backend are **functionally connected but not safely integrated**. Three critical issues exist:

1. **Non-atomic operations** — both "Add Funds" and "Transfer" make two separate API calls. If the second call fails, the database is left in an inconsistent state (e.g. balance deducted but no transaction record, or vice versa).
2. **No server-side balance validation** — the backend blindly accepts any balance value; the only guard is a frontend check that can be bypassed.
3. **Account number generated on the frontend** — collision-prone; should be server-side.

Additionally:
- The dashboard makes 2 serial API calls (accounts + transactions) that can be collapsed into 1.
- `PATCH /accounts/` allows arbitrary balance overwrites — a security gap that should be closed.

---

## Step 1 — New atomic payments router (backend)

Create `backend/routers/payments.py` with two endpoints that run inside a single SQLAlchemy DB transaction so they are all-or-nothing.

### `POST /payments/deposit`

**Purpose:** Add funds to an account.

**Request body:**
```json
{ "account_id": 1, "customer_id": 1, "amount": "500.00", "description": "Top up" }
```

**Server logic (atomic):**
1. Validate `amount > 0`
2. Fetch account — verify it exists, is `active`, belongs to `customer_id`
3. Add `amount` to `account.balance`
4. Insert a `credit` transaction with `status=completed` and `balance_after`
5. Commit both writes together

**Response:** `{ account, transaction }`

---

### `POST /payments/transfer`

**Purpose:** Pay a beneficiary from an account.

**Request body:**
```json
{
  "account_id": 1,
  "customer_id": 1,
  "beneficiary_id": 2,
  "amount": "250.00",
  "reference": "Rent April",
  "description": "Monthly rent"
}
```

**Server logic (atomic):**
1. Validate `amount > 0`
2. Fetch account — verify active, owned by `customer_id`
3. Validate `account.balance >= amount` — return `422` with `"Insufficient funds"` if not
4. Fetch beneficiary — verify it belongs to `customer_id` and is `active`
5. Deduct `amount` from `account.balance`
6. Insert a `payment` transaction (debit) with `status=completed` and `balance_after`
7. If beneficiary `is_internal`: credit the recipient's internal account and create a `credit` transaction for them too
8. Commit all writes together

**Response:** `{ account, transaction }`

---

## Step 2 — Dashboard summary endpoint (backend)

Create `GET /dashboard/summary/{customer_id}` in a new `backend/routers/dashboard.py`.

**Purpose:** Reduce the dashboard from 2 serial round-trips to 1.

**Server logic:**
1. Fetch customer — 404 if not found
2. Fetch active account for customer
3. Fetch last 10 transactions for that account (ordered by date desc)
4. Return combined payload

**Response:**
```json
{
  "customer": { ... },
  "account": { ... } | null,
  "recent_transactions": [ ... ]
}
```

---

## Step 3 — Server-side account number generation (backend)

Update `backend/routers/accounts.py`:
- Remove `account_number` from the required fields in `AccountCreate`
- Generate a random unique 8-digit account number server-side, retrying if it collides

Update `backend/schemas.py`:
- Make `account_number` optional in `AccountCreate` (default `None`)

---

## Step 4 — Lock down `PATCH /accounts/`

The generic `PATCH /accounts/{id}` currently allows any client to set `balance` to any value — a critical data integrity gap.

**Change:** Remove `balance` from `AccountUpdate`. Only allow `status` changes via this endpoint. Balance is now only ever modified by `/payments/deposit` and `/payments/transfer`.

---

## Step 5 — Wire new routers into `main.py`

Add to `backend/main.py`:
```python
from routers import payments, dashboard
app.include_router(payments.router)
app.include_router(dashboard.router)
```

---

## Step 6 — Update frontend API client (`lib/api.ts`)

Add new typed wrappers:

```typescript
// New payments namespace
export const payments = {
  deposit: (data: { account_id, customer_id, amount, description? }) =>
    request<{ account: Account; transaction: Transaction }>("/payments/deposit", { method: "POST", ... }),

  transfer: (data: { account_id, customer_id, beneficiary_id, amount, reference?, description? }) =>
    request<{ account: Account; transaction: Transaction }>("/payments/transfer", { method: "POST", ... }),
};

// New dashboard namespace
export const dashboard = {
  summary: (customerId: number) =>
    request<{ customer: Customer; account: Account | null; recent_transactions: Transaction[] }>(
      `/dashboard/summary/${customerId}`
    ),
};
```

Remove `balance` from `accounts.update()` type signature (now only `status` allowed).

---

## Step 7 — Update frontend pages

### `dashboard/page.tsx`
- Replace the two `await` calls (accounts + transactions) with a single `dashboard.summary(customer_id)` call
- Fewer round trips, simpler loading state

### `dashboard/add-funds/page.tsx`
- Replace: `accounts.update()` + `transactions.create()`
- With: `payments.deposit({ account_id, customer_id, amount })`
- Server handles atomicity and balance calculation

### `dashboard/transfer/page.tsx`
- Replace: `transactions.create()` + `accounts.update()`
- With: `payments.transfer({ account_id, customer_id, beneficiary_id, amount, reference, description })`
- Remove frontend balance validation (server now returns `422` with a clear message)
- Keep the real-time insufficient funds indicator as UX (it's fine for it to also live on client)

### `dashboard/open-account/page.tsx`
- Remove `account_number` from the payload sent to `POST /accounts/`
- Server now generates it

---

## Delivery Order

1. Step 1 — `payments.py` router (deposit + transfer, atomic)
2. Step 2 — `dashboard.py` summary endpoint
3. Step 3 — Server-side account number generation
4. Step 4 — Lock down `PATCH /accounts/`
5. Step 5 — Wire routers into `main.py`
6. Step 6 — Update `lib/api.ts`
7. Step 7 — Update frontend pages (dashboard, add-funds, transfer, open-account)

---

## What stays the same

- All existing CRUD endpoints (`/customers`, `/beneficiaries`, `/transactions` GET routes) are unchanged
- `POST /accounts/` stays — just loses the required `account_number` field
- `POST /auth/login` unchanged
- Frontend session management, routing, and UI components unchanged

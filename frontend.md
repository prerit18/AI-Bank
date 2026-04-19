# AB-7 — AI-Bank Frontend Plan

## Overview
Next.js (TypeScript) web app that connects to the existing FastAPI backend.
Users can register, open an account, deposit funds, manage beneficiaries, and make payments.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| HTTP client | fetch (native, wrapped in a typed API client) |
| State / session | React Context + localStorage (simple email-based session, no OAuth needed for test site) |
| Forms | react-hook-form |

---

## Step 1 — Project Scaffold

- Create `frontend/` via `npx create-next-app@latest` with TypeScript + Tailwind
- Add `NEXT_PUBLIC_API_URL=http://localhost:8000` to `.env.local`
- Create `frontend/lib/api.ts` — typed fetch wrapper for all backend endpoints

---

## Step 2 — Backend: Add a Login Endpoint

The existing backend has no auth. Add a minimal `/auth/login` route to `backend/routers/auth.py`:

- `POST /auth/login` — accepts `{ email }`, looks up customer by email, returns customer object
- This is sufficient for a test site (no passwords required)
- Wire the new router into `main.py`

---

## Step 3 — Page Structure

```
/                          Landing page  (Login + Register CTAs)
/register                  New customer registration form
/login                     Login by email
/dashboard                 Home dashboard  (protected)
/dashboard/open-account    Open a bank account
/dashboard/add-funds       Deposit money into account
/dashboard/beneficiaries   View + add beneficiaries
/dashboard/transfer        Make a payment to a beneficiary
```

All `/dashboard/*` routes are protected — unauthenticated users are redirected to `/login`.

---

## Step 4 — Shared Components

| Component | Purpose |
|---|---|
| `Navbar` | Top bar with logo, logged-in user name, logout |
| `Sidebar` | Dashboard nav links (Account, Beneficiaries, Transfer, Transactions) |
| `AccountCard` | Displays account number, sort code, balance |
| `TransactionList` | Renders last 10 transactions in a table |
| `BeneficiaryList` | Lists saved beneficiaries with add/remove |
| `PageHeader` | Consistent page title + breadcrumb |

---

## Step 5 — Page-by-Page Detail

### `/` Landing
- Hero section with bank name and tagline
- Two CTA buttons: **Register** and **Login**

### `/register`
- Fields: First name, Last name, Email, Date of birth, Phone, Address, Postcode
- On success → POST `/customers/` → redirect to `/login`

### `/login`
- Field: Email only
- On submit → POST `/auth/login` → store `customer` in localStorage → redirect to `/dashboard`

### `/dashboard`
- If customer has no account → prompt to open one (button → `/dashboard/open-account`)
- If account exists:
  - `AccountCard` (account number, sort code, balance, currency)
  - `TransactionList` (last 10 via `GET /transactions/account/{id}?limit=10`)
  - Quick-action buttons: Add Funds, Transfer, Beneficiaries

### `/dashboard/open-account`
- Fields: Account type (current / savings / ISA), Currency (default GBP)
- Account number auto-generated (8 random digits)
- On submit → POST `/accounts/` → redirect to `/dashboard`

### `/dashboard/add-funds`
- Field: Amount (£)
- On submit → PATCH `/accounts/{id}` with updated balance → redirect to `/dashboard`
- Also creates a `credit` transaction record via POST `/transactions/`

### `/dashboard/beneficiaries`
- Lists existing beneficiaries (`GET /beneficiaries/customer/{id}`)
- Add Beneficiary form:
  - Name, Account number, Sort code, Bank name
  - Toggle: Internal (AI-Bank) vs External
  - On submit → POST `/beneficiaries/`
- Remove button → PATCH `/beneficiaries/{id}` with `status: inactive`

### `/dashboard/transfer`
- Dropdown: select beneficiary from saved list
- Field: Amount (£), Reference, Description
- Validation: amount ≤ current balance
- On submit:
  1. POST `/transactions/` (type: `payment`, status: `completed`)
  2. PATCH `/accounts/{id}` with deducted balance
- Redirect to `/dashboard` showing updated balance + transaction in list

---

## Step 6 — Session & Auth Guard

- `SessionContext` (React Context) wraps the app — reads customer from localStorage on mount
- `useSession()` hook used by all dashboard pages
- `AuthGuard` component: if no session → `router.push('/login')`

---

## Step 7 — API Client (`lib/api.ts`)

Typed wrapper functions for each backend resource:

```
auth.login(email)
customers.create(data)
accounts.create(data) / update(id, data)
beneficiaries.list(customerId) / create(data) / update(id, data)
transactions.listByAccount(accountId, limit) / create(data)
```

---

## Step 8 — Polish & Error Handling

- Loading spinners on all async actions
- Inline form validation errors (react-hook-form)
- Toast notifications for success / failure (e.g. payment sent, insufficient funds)
- Responsive layout (mobile-friendly sidebar collapses to bottom nav)

---

## Delivery Order

1. Step 1 — Scaffold + API client
2. Step 2 — Backend login endpoint
3. Step 3–4 — Shared layout, Navbar, Sidebar, AuthGuard
4. Step 5a — Register + Login pages
5. Step 5b — Dashboard home + Open Account
6. Step 5c — Add Funds
7. Step 5d — Beneficiaries page
8. Step 5e — Transfer page
9. Step 8 — Polish, validation, toasts

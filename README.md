# CasinFreight

Philippine trucking and fleet management SaaS for dispatch, billing, and operations.

CasinFreight is a React + Vite operations console built for PH freight companies: live trip Kanban, load/payload checks, digital POD, VAT + EWT calculator on freight bills (12% VAT + 2% EWT), double-entry ledger, fleet/fuel tracking, and role-based access. CasinFreight does not register, transmit, or certify invoices with BIR. This is not a Sales Invoice, Official Receipt, or CAS/PTU e-invoice.

## Product surface

| Area | What it covers |
| --- | --- |
| Trip Board | Kanban for Pending → Loaded → In Transit → Delivered → Invoiced |
| Load Calculator | GVWR / tare / payload, volume, overweight alerts, zone rate cards |
| Invoices | Itemized bills, accessorials, payment reconciliation, retraction workflow |
| General Ledger | Chart of accounts, journal vouchers, trial balance |
| Fleet | Truck registry, fuel logs (km/L), Petron / Shell / Caltex fleet cards |
| Drivers | LTO licenses, restrictions, approval status, driver-app email |
| Driver app | Flutter phone app: live GPS, seal/parcel photos, dispatch & POD signatures |
| Rate Cards | Origin/destination zone tariffs for Luzon and ports |
| Owner Dashboard | Profitability, efficiency, and driver leaderboard |
| RBAC | Custom roles and permission matrix |
| Billing (backend) | Supabase schema + PayMongo checkout / webhook / cancel functions |

The UI uses Firebase Auth and Firestore for companies, RBAC, trucks, and trips. Free plan includes every module with 1 truck, 1 account, and 10 transactions. Founding (₱499/mo) removes those caps.

## Stack

- React 19 + TypeScript + Vite 6
- Firebase Auth + Cloud Firestore
- Tailwind CSS 4
- Recharts, Lucide, Motion

## Firebase setup

1. Create a Firebase project.
2. Enable **Authentication → Email/Password**. Add `casin-freight.vercel.app` under Authentication → Settings → Authorized domains. Team invites use a join link (`/?join=1&email=...`); the hire sets a password on that page.
3. Create a **Cloud Firestore** database.
4. Register a Web app and copy the config into `.env`:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

5. Publish Firestore rules (required — production mode denies all writes until you do):
   - Console: Firestore → Rules → paste `firestore.rules` → **Publish**
   - Or CLI: `npx -p firebase-tools firebase deploy --only firestore:rules --project casinfreight`
6. Restart `npm run dev`.

Create a company from the login screen. Invite teammates from Company & Team, copy the join link, and send it to them. They choose a password on that page and join your company — they must not tap Create company.

## PayMongo billing

Founding (₱499/mo) stays locked until PayMongo confirms payment.

Use **API keys** on Vercel. Payment Links have no success redirect, so they cannot send the customer back into CasinFreight. You do not set a success URL in the PayMongo dashboard — the production checkout API sends it.

In Vercel → Project → Settings → Environment Variables (Production):

```
VITE_PAYMONGO_USE_API=true
VITE_PAYMONGO_TEST_MODE=true
PAYMONGO_SECRET_KEY=sk_test_...
```

Leave `VITE_PAYMONGO_PAYMENT_LINK` empty. Redeploy after saving `VITE_*` values (they are baked in at build time). Subscribe on https://casin-freight.vercel.app then opens PayMongo hosted checkout and returns to `/?billing=success`.

## Run locally

**Prerequisites:** Node.js 18+

```bash
npm install
cp .env.example .env
# set GEMINI_API_KEY if you need AI features
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

Sign up with your company name to start on the Free plan.

```bash
npm run build    # production build
npm run lint     # TypeScript check
```

## Repo layout

```
src/
  components/   dashboard, fleet, invoices, ledger, trips, rbac, auth
  context/      FreightContext — app state, permissions, CRUD
  data/         mock company, trips, invoices, fuel, chart of accounts
  services/     Firebase company store + RBAC helpers
  lib/          Firebase app init
  types/        domain models
firestore.rules Firestore security rules
supabase/
  functions/    create-paymongo-checkout, paymongo-webhook, cancel-paymongo-subscription
  migrations/   plans, subscriptions, billing_history + RLS
```

## Notes

- `.env` is gitignored. Copy `.env.example` and add Firebase keys.
- Free: 1 truck, 1 account/role, 10 trip transactions, full module access.
- Founding: ₱499/mo, unlimited trucks, seats, roles, and transactions.

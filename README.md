# CasinFreight

Philippine trucking and fleet management SaaS for dispatch, billing, and operations.

CasinFreight is a React + Vite operations console built for PH freight companies: live trip Kanban, load/payload checks, digital POD, BIR-style invoicing (12% VAT + 2% EWT), double-entry ledger, fleet/fuel tracking, and role-based access.

## Product surface

| Area | What it covers |
| --- | --- |
| Trip Board | Kanban for Pending → Loaded → In Transit → Delivered → Invoiced |
| Load Calculator | GVWR / tare / payload, volume, overweight alerts, zone rate cards |
| Invoices | Itemized bills, accessorials, payment reconciliation, retraction workflow |
| General Ledger | Chart of accounts, journal vouchers, trial balance |
| Fleet | Truck registry, fuel logs (km/L), Petron / Shell / Caltex fleet cards |
| Drivers | LTO licenses, restrictions, approval status |
| Rate Cards | Origin/destination zone tariffs for Luzon and ports |
| Owner Dashboard | Profitability, efficiency, and driver leaderboard |
| RBAC | Custom roles and permission matrix |
| Billing (backend) | Supabase schema + PayMongo checkout / webhook / cancel functions |

The UI currently runs on in-memory mock data (`src/data/mockData.ts` + `src/context/FreightContext.tsx`). Supabase/PayMongo files under `supabase/` are the start of a real billing backend, not yet wired into the React app.

## Stack

- React 19 + TypeScript + Vite 6
- Tailwind CSS 4
- Recharts, Lucide, Motion
- Supabase Edge Functions (PayMongo)
- Gemini API hook (via `GEMINI_API_KEY`)

## Run locally

**Prerequisites:** Node.js 18+

```bash
npm install
cp .env.example .env
# set GEMINI_API_KEY if you need AI features
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

Demo login (Owner): `tj.casin@casinfreight.ph` / `password123`

Other seeded roles: Dispatcher, Loading Staff, Billing, Fleet Manager.

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
  services/     local RBAC store
  types/        domain models
supabase/
  functions/    create-paymongo-checkout, paymongo-webhook, cancel-paymongo-subscription
  migrations/   plans, subscriptions, billing_history + RLS
```

## Notes

- `.env` is gitignored. Copy `.env.example`.
- `node_modules/` and `dist/` are not committed.
- Subscription tiers in mock data: Free, Starter, Growth, Fleet. Founding plan seed in SQL is ₱499/mo.

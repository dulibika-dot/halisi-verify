# Halisi Verify — SMS-Based Counterfeit Product Verification and Tracking System

React + TypeScript + Tailwind CSS + Recharts, with a Supabase backend and an Africa's Talking
SMS gateway. Runs in two modes:

| Mode | Setting in `.env` | What it uses |
|---|---|---|
| **Demo (offline)** | `VITE_USE_MOCK_API=true` or no `.env` | Demo data in the browser; resets on refresh |
| **Live** | `VITE_USE_MOCK_API=false` + Supabase keys | Real database, real logins, real SMS via Africa's Talking |

**To go live, follow [SETUP.md](SETUP.md).**

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

Pages: `/login` (one login form for manufacturers and admins) · `/sms` (public SMS simulator, no login).

Demo mode accounts (offline mode only; the login page shows no demo or admin hints):

| Role         | Email                   | Password    |
|--------------|-------------------------|-------------|
| Manufacturer | `manufacturer@xyz.demo` | `demo1234`  |
| Admin        | `admin@halisi.demo`     | `admin1234` |

In live mode you create these users yourself in Supabase (SETUP.md, Part A) with your own passwords.

SMS demo codes: `510482736` genuine · `839274615` suspicious (52 checks) · `123456789` invalid ·
`404040404` deactivated · `REPORT 839274615 <reason>` files a report · add a town at the end,
e.g. `VERIFY 510482736 Mombasa`, to record the location. A code checked more than 3 times turns **Suspicious**.

## How it works

```
Customer SMS "VERIFY 839274615"
  → Africa's Talking → Supabase Edge Function  supabase/functions/sms-incoming
  → database function process_sms()  (supabase/schema.sql)
      looks up the code, counts the check, logs it, decides GENUINE / SUSPICIOUS / INVALID
  → reply SMS back through Africa's Talking
Dashboards and the /sms simulator read and call the same database.
```

## Where things are

```
supabase/
  schema.sql                  tables, security rules (RLS), create_product_batch(), process_sms()
  seed.sql                    demo data (generated — run `npm run seed:generate` to rebuild)
  setup_demo_users.sql        links login accounts to roles
  functions/sms-incoming/     Edge Function called by Africa's Talking
scripts/generate-seed.ts      builds seed.sql from src/data
src/
  services/api.ts             the ONLY data API pages use; switches mock ↔ Supabase
  services/supabase/          Supabase data source
  services/mock/              offline data source (mockApi, mockSms, mockDb)
  services/analytics.ts       dashboard/trend/suspicious/hotspot calculations shared by both
  services/authService.ts     login (demo accounts or Supabase Auth)
  services/smsService.ts      SMS simulator → process_sms()
  data/                       demo seed data (fictional companies)
  types/                      TypeScript types
  components/ pages/ layouts/ hooks/ context/ utils/
```

## Security

- Row Level Security: a manufacturer can only read and change its own products, batches, codes,
  verifications and reports; admins see everything; visitors see nothing but public settings.
- Manufacturers cannot change check counts, admin reviews or their own approval status.
- Codes are generated in the database with a cryptographically secure random generator.
- Phone numbers are stored masked (`0712 *** 678`).
- The SMS function is protected by a secret token; the public simulator is rate-limited.

## Prototype limits

- Up to 10,000 units (codes) per batch. The pre-loaded demo batches include 20 sample codes each.
- Location comes from the town the customer adds to the SMS (or picks in the simulator).
- Africa's Talking sandbox replies go to its web simulator, not real phones. Moving to real
  phones only needs a live Africa's Talking account (see the end of SETUP.md).

All company names and data in this project are fictional.

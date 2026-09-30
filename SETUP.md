# Going live: Supabase + Africa's Talking + Vercel

Follow the parts in order. Everything here uses free plans.
Menu names on these websites change from time to time — if a button is named slightly
differently, look for the closest match.

```
Customer SMS ─► Africa's Talking (sandbox) ─► Supabase Edge Function "sms-incoming"
                                                   │  process_sms() checks the code in the database
Customer ◄──── reply SMS ◄──── Africa's Talking ◄──┘
Dashboards + public simulator (Vercel) ─► same Supabase database
```

> **Keep secret:** the Supabase `service_role` key, the Africa's Talking API key and your
> webhook token. Never put them in `.env`, in the frontend, in screenshots or in chat.
> The `anon` / publishable key is fine in the frontend.

---

## Part A — Supabase database (about 10 minutes)

1. Go to **supabase.com** → sign up → **New project**. Name it `halisi-verify`, set a database
   password (save it somewhere safe), pick the nearest region, and wait for it to finish.
2. Open **SQL Editor** → **New query**. Open `supabase/schema.sql` from this project, copy
   everything, paste it and press **Run**. You should see "Success".
3. New query again → paste all of `supabase/seed.sql` → **Run**. This loads the demo data.
4. Create the **admin** login: **Authentication → Users → Add user → Create new user**
   - `admin@halisi.demo` (or your own email) with a password you choose — tick **Auto Confirm User**
5. SQL Editor → run the admin part of `supabase/setup_demo_users.sql` (the second `insert`,
   plus the check at the end). The result must show the admin email with role `admin`.
6. Manufacturer logins are then created **inside the app**: sign in as the admin →
   **Manufacturers** → **Add manufacturer** (new company + login), or the key icon /
   **Create login** on an existing company such as XYZ Ltd. This uses the Edge Function
   `admin-users` — deploy it the same way as `sms-incoming` in Part B.
7. Get the frontend keys: **Project Settings → API** (or the **Connect** button). Copy:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public** key (or **publishable** key)
8. In the project folder, copy `.env.example` to a new file named `.env` and paste those two
   values. Keep `VITE_USE_MOCK_API=false`.
9. Run `npm run dev`, open http://localhost:5173 and sign in with the manufacturer or admin
   account. You should see the demo data, and the top bar should say **Live data**.
10. Open http://localhost:5173/sms and send `VERIFY 510482736`. The reply comes from your database,
   and the check appears under **Verification Logs** for the admin.

✅ At this point the project runs on a real database.

---

## Part B — The SMS function (Edge Function)

**Easiest: with the Supabase command line** (run in the project folder):

```bash
npx supabase login
npx supabase functions deploy sms-incoming --no-verify-jwt --project-ref YOUR-PROJECT-REF
npx supabase functions deploy admin-users --no-verify-jwt --project-ref YOUR-PROJECT-REF
npx supabase functions deploy register-manufacturer --no-verify-jwt --project-ref YOUR-PROJECT-REF
```

(`register-manufacturer` powers the public "Register your company" page; accounts always start as *pending*.)

(`admin-users` checks inside the code that the caller is a signed-in admin.)

`YOUR-PROJECT-REF` is the `xxxx` part of your Project URL. `--no-verify-jwt` is required:
Africa's Talking can't send a Supabase login token, so the function checks its own secret instead.

**Or in the dashboard:** Edge Functions → **Deploy a new function** → **Via Editor** → name it
`sms-incoming` → paste `supabase/functions/sms-incoming/index.ts` → Deploy. Then open the
function's settings and turn **off** "Verify JWT" / "Enforce JWT verification".

Add the secrets: **Edge Functions → Secrets** (or Project Settings → Edge Functions):

| Name | Value |
|---|---|
| `AT_USERNAME` | `sandbox` |
| `AT_API_KEY` | from Part C, step 2 |
| `AT_SHORTCODE` | from Part C, step 3 |
| `SMS_WEBHOOK_TOKEN` | any long random text you make up, e.g. `halisi-7f3k9q2m8x4w` |

Your function address is:
```
https://YOUR-PROJECT-REF.supabase.co/functions/v1/sms-incoming?token=YOUR_SMS_WEBHOOK_TOKEN
```

---

## Part C — Africa's Talking sandbox

1. Sign up at **account.africastalking.com** and open the **Sandbox** app
   (https://account.africastalking.com/apps/sandbox).
2. **Settings → API Key** → generate a key → paste it into the Supabase secret `AT_API_KEY`.
   (Generating a new key cancels the old one.)
3. **SMS → Shortcodes → Create shortcode.** Pick an available number (e.g. `22384`) → put the
   same number in the Supabase secret `AT_SHORTCODE`. In the admin **System Settings** page,
   set the SMS shortcode to the same number so the instructions match.
4. **SMS → SMS Callback URLs → Incoming Messages** → paste your function address from Part B
   (including `?token=...`) → Save.
5. Open the simulator: **https://simulator.africastalking.com:1517/** → type any test phone
   number, e.g. `+254711000111` → **Launch** → **Message** → send `VERIFY 839274615` to your
   shortcode. The reply should arrive within a few seconds, and the check shows up on the
   admin dashboard (channel **SMS**).

**Try also:** `VERIFY 510482736` (genuine) · `VERIFY 123456789` (invalid) ·
`VERIFY 404040404` (deactivated) · `REPORT 839274615 packaging looks different` ·
`VERIFY 510482736 Mombasa` (records the town for the hotspot map).

---

## Part D — Publish the website (Vercel)

Using the Vercel command line from the project folder:

```bash
npx vercel            # first time: log in, accept the defaults (framework: Vite)
```

Then in the Vercel dashboard → your project → **Settings → Environment Variables** add the
same three values as your `.env` (`VITE_USE_MOCK_API`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`) and deploy to production:

```bash
npx vercel --prod
```

You get a permanent link such as `https://halisi-verify.vercel.app`:
- `/login` — manufacturer and admin dashboards (one login form for everyone)
- `/sms` — **public SMS simulator** anyone can use from their own phone, no account needed

Finally, in Supabase → **Authentication → URL Configuration**, set **Site URL** to your Vercel
link (used by password-reset emails).

(If you use GitHub instead: push the project to a repository and import it at vercel.com →
Add New Project; add the same environment variables.)

---

## Demo-day checklist

- [ ] Open the Supabase dashboard the day before — free projects pause after about a week of no use; press **Restore** if needed.
- [ ] Optional fresh start: run `supabase/seed.sql` again (resets demo data; removes batches created during testing).
- [ ] Open the Africa's Talking simulator on the venue's Wi-Fi. If port 1517 is blocked, use mobile data/hotspot.
- [ ] Send one test SMS and confirm it appears on the admin dashboard.
- [ ] Have the `/sms` link ready (or a QR code of it) for people to try on their own phones.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Supabase is not configured" | `.env` missing or wrong — check the two values, then restart `npm run dev`. |
| Login says "not set up yet" | Run `setup_demo_users.sql` again; the email must match exactly. |
| Dashboards empty after login | Did `seed.sql` run? Check the user's role in the `profiles` table. |
| No reply in the AT simulator | Supabase → Edge Functions → sms-incoming → **Logs**. 401 = token in the callback URL doesn't match `SMS_WEBHOOK_TOKEN`. "send failed" = check `AT_API_KEY`, `AT_USERNAME=sandbox` and `AT_SHORTCODE`. |
| Refreshing a page on Vercel gives 404 | `vercel.json` must be in the project root (it is). Redeploy. |
| "Too many requests" reply | Built-in protection: max 10 messages per phone per minute. Wait a minute. |

## What changes when moving from sandbox to real phones

1. Apply for a live account and a shortcode (or shared shortcode + keyword) with Africa's Talking.
2. Change the Supabase secrets: `AT_USERNAME` = your live app username, new `AT_API_KEY`, live `AT_SHORTCODE`.
3. Set the live app's incoming-messages callback to the same function address.

No code changes are needed.

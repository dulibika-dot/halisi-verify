/**
 * Supabase Edge Function: register-manufacturer  (PUBLIC — no login needed)
 *
 * Lets a company register itself from the "Register your company" page.
 * The account is ALWAYS created as a manufacturer with status "pending":
 * they can sign in, but cannot create batches or codes until an admin approves them.
 *
 * Protections: input checks, duplicate company check, a hidden "website" field that
 * bots fill in (honeypot), and a limit on new registrations per hour.
 * Deployed with "Verify JWT" off because visitors are not signed in.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const MAX_REGISTRATIONS_PER_HOUR = 20;
const clean = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: { company?: Record<string, unknown>; login?: Record<string, unknown>; website?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  // Bots fill every field, including this invisible one — pretend success and do nothing
  if (clean(body.website)) return json({ ok: true });

  const c = body.company ?? {};
  const l = body.login ?? {};
  const company = {
    name: clean(c.name, 120),
    registrationNo: clean(c.registrationNo, 60),
    industry: clean(c.industry, 80),
    county: clean(c.county, 60),
    address: clean(c.address, 200),
    phone: clean(c.phone, 30),
  };
  const login = { name: clean(l.name, 80), email: clean(l.email, 120).toLowerCase(), password: typeof l.password === 'string' ? l.password : '' };

  if (company.name.length < 2) return json({ error: 'Enter your company name.' }, 400);
  if (company.registrationNo.length < 3) return json({ error: 'Enter your company registration number.' }, 400);
  if (!/^\+?[\d\s]{9,16}$/.test(company.phone)) return json({ error: 'Enter a valid company phone number.' }, 400);
  if (!login.name) return json({ error: 'Enter your full name.' }, 400);
  if (!/^\S+@\S+\.\S+$/.test(login.email)) return json({ error: 'Enter a valid email address.' }, 400);
  if (login.password.length < 8) return json({ error: 'Your password must be at least 8 characters.' }, 400);

  // Limit sign-ups per hour (stops mass fake registrations)
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin.from('manufacturers').select('id', { count: 'exact', head: true }).gte('joined_at', hourAgo);
  if ((count ?? 0) >= MAX_REGISTRATIONS_PER_HOUR) {
    return json({ error: 'Too many registrations right now. Please try again in an hour.' }, 429);
  }

  // Same company registered twice?
  const exact = (v: string) => v.replace(/[\\%_]/g, (ch) => `\\${ch}`); // case-insensitive exact match
  const [{ data: sameName }, { data: sameReg }] = await Promise.all([
    admin.from('manufacturers').select('id').ilike('name', exact(company.name)).limit(1),
    admin.from('manufacturers').select('id').ilike('registration_no', exact(company.registrationNo)).limit(1),
  ]);
  if (sameName?.length || sameReg?.length) {
    return json({ error: 'A company with this name or registration number is already registered. Contact the administrator.' }, 409);
  }

  // 1. Company (always pending)
  const { data: created, error: mErr } = await admin
    .from('manufacturers')
    .insert({
      name: company.name,
      registration_no: company.registrationNo,
      contact_person: login.name,
      email: login.email,
      phone: company.phone,
      county: company.county,
      address: company.address,
      industry: company.industry,
      status: 'pending',
    })
    .select('id')
    .single();
  if (mErr || !created) return json({ error: 'Could not register the company. Please try again.' }, 500);

  // 2. Login (email marked confirmed — the admin's approval is the real check)
  const { data: user, error: uErr } = await admin.auth.admin.createUser({
    email: login.email,
    password: login.password,
    email_confirm: true,
  });
  if (uErr || !user.user) {
    await admin.from('manufacturers').delete().eq('id', created.id);
    const msg = uErr?.message ?? '';
    return json({ error: /already/i.test(msg) ? 'An account with this email already exists. Try signing in.' : 'Could not create your login. Please try again.' }, 400);
  }

  // 3. Profile — role is fixed to manufacturer here, never taken from the request
  const { error: pErr } = await admin.from('profiles').insert({
    id: user.user.id,
    name: login.name,
    email: login.email,
    role: 'manufacturer',
    manufacturer_id: created.id,
  });
  if (pErr) {
    await admin.auth.admin.deleteUser(user.user.id);
    await admin.from('manufacturers').delete().eq('id', created.id);
    return json({ error: 'Could not finish registration. Please try again.' }, 500);
  }

  return json({ ok: true });
});

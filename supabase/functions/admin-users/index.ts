/**
 * Supabase Edge Function: admin-users
 *
 * Lets an ADMIN (signed in to the dashboard) create manufacturer companies and their
 * login accounts. Creating logins needs the service-role key, which must never be in the
 * browser — so it happens here, after checking the caller is really an admin.
 *
 * Actions (POST JSON):
 *   { action: "create_manufacturer", manufacturer: {...}, login: { email, password, name } }
 *   { action: "create_login", manufacturerId, login: { email, password, name } }
 *
 * The caller's Supabase session token (sent automatically by supabase.functions.invoke)
 * is checked inside the function, so it is deployed with "Verify JWT" off.
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

interface LoginInput {
  email?: string;
  password?: string;
  name?: string;
}

function checkLogin(login: LoginInput | undefined): string | null {
  if (!login?.email || !/^\S+@\S+\.\S+$/.test(login.email)) return 'Enter a valid login email.';
  if (!login.password || login.password.length < 8) return 'The temporary password must be at least 8 characters.';
  if (!login.name?.trim()) return 'Enter the name of the person who will use this login.';
  return null;
}

/** Creates the Auth user + profile row for a manufacturer. Undoes the user if the profile fails. */
async function createLogin(manufacturerId: string, login: Required<LoginInput>) {
  const { data, error } = await admin.auth.admin.createUser({
    email: login.email.trim().toLowerCase(),
    password: login.password,
    email_confirm: true,
  });
  if (error || !data.user) {
    const msg = error?.message ?? 'Could not create the login.';
    throw new Error(/already/i.test(msg) ? 'A login with this email already exists.' : msg);
  }
  const { error: profileError } = await admin.from('profiles').insert({
    id: data.user.id,
    name: login.name.trim(),
    email: login.email.trim().toLowerCase(),
    role: 'manufacturer',
    manufacturer_id: manufacturerId,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error(profileError.message);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // 1. Who is calling? Must be a signed-in admin.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: caller } = await admin.auth.getUser(token);
  if (!caller?.user) return json({ error: 'Please sign in again.' }, 401);
  const { data: profile } = await admin.from('profiles').select('role').eq('id', caller.user.id).maybeSingle();
  if (profile?.role !== 'admin') return json({ error: 'Only administrators can do this.' }, 403);

  let body: {
    action?: string;
    manufacturerId?: string;
    manufacturer?: Record<string, string>;
    login?: LoginInput;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  const loginProblem = checkLogin(body.login);
  if (loginProblem) return json({ error: loginProblem }, 400);
  const login = body.login as Required<LoginInput>;

  try {
    // 2a. New company + its login
    if (body.action === 'create_manufacturer') {
      const m = body.manufacturer ?? {};
      if (!m.name?.trim()) return json({ error: 'Enter the company name.' }, 400);
      const { data: created, error } = await admin
        .from('manufacturers')
        .insert({
          name: m.name.trim(),
          registration_no: (m.registrationNo ?? '').trim(),
          contact_person: (m.contactPerson ?? login.name).trim(),
          email: (m.email ?? login.email).trim(),
          phone: (m.phone ?? '').trim(),
          county: (m.county ?? '').trim(),
          address: (m.address ?? '').trim(),
          industry: (m.industry ?? '').trim(),
          status: m.status === 'pending' ? 'pending' : 'active',
        })
        .select('id')
        .single();
      if (error || !created) return json({ error: error?.message ?? 'Could not create the manufacturer.' }, 400);
      try {
        await createLogin(created.id, login);
      } catch (e) {
        await admin.from('manufacturers').delete().eq('id', created.id); // undo
        throw e;
      }
      return json({ manufacturerId: created.id });
    }

    // 2b. Login for an existing company
    if (body.action === 'create_login') {
      if (!body.manufacturerId) return json({ error: 'Missing manufacturer.' }, 400);
      const { data: exists } = await admin.from('manufacturers').select('id').eq('id', body.manufacturerId).maybeSingle();
      if (!exists) return json({ error: 'Manufacturer not found.' }, 404);
      await createLogin(body.manufacturerId, login);
      return json({ manufacturerId: body.manufacturerId });
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Something went wrong.' }, 400);
  }
});

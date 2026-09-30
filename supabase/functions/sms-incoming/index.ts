/**
 * Supabase Edge Function: sms-incoming
 *
 * Africa's Talking calls this URL every time someone sends an SMS to your shortcode:
 *   Customer SMS "VERIFY 839274615"
 *     → Africa's Talking → POST https://<project>.supabase.co/functions/v1/sms-incoming?token=<SMS_WEBHOOK_TOKEN>
 *     → process_sms() in the database (checks the code, logs it, builds the reply)
 *     → reply sent back to the customer through Africa's Talking
 *
 * Secrets to set (Supabase → Edge Functions → Secrets):
 *   AT_USERNAME        "sandbox" while testing (your app username when live)
 *   AT_API_KEY         API key from the Africa's Talking dashboard
 *   AT_SHORTCODE       your shortcode, e.g. 22384 (optional; defaults to the number the SMS was sent to)
 *   SMS_WEBHOOK_TOKEN  any long random text; must match ?token= in the callback URL
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
 *
 * Deploy with "Verify JWT" turned OFF — Africa's Talking can't send a Supabase login token,
 * so the ?token= secret protects this function instead.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const AT_USERNAME = Deno.env.get('AT_USERNAME') ?? 'sandbox';
const AT_API_KEY = Deno.env.get('AT_API_KEY') ?? '';
const AT_SHORTCODE = Deno.env.get('AT_SHORTCODE') ?? '';
const WEBHOOK_TOKEN = Deno.env.get('SMS_WEBHOOK_TOKEN') ?? '';

const AT_SMS_URL =
  AT_USERNAME === 'sandbox'
    ? 'https://api.sandbox.africastalking.com/version1/messaging'
    : 'https://api.africastalking.com/version1/messaging';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

/** Africa's Talking posts form data; accept JSON too for easy testing. */
async function readBody(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get('content-type') ?? '';
  if (type.includes('application/json')) return (await req.json()) as Record<string, string>;
  const form = await req.formData();
  return Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
}

async function sendSms(to: string, message: string, from: string) {
  const body = new URLSearchParams({ username: AT_USERNAME, to, message });
  if (from) body.set('from', from);
  const res = await fetch(AT_SMS_URL, {
    method: 'POST',
    headers: { apiKey: AT_API_KEY, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await res.text();
  if (!res.ok) console.error('Africa’s Talking send failed', res.status, text);
  else console.log('Reply sent', text);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const url = new URL(req.url);
  if (!WEBHOOK_TOKEN || url.searchParams.get('token') !== WEBHOOK_TOKEN) {
    return new Response('Unauthorized', { status: 401 });
  }

  let sms: Record<string, string>;
  try {
    sms = await readBody(req);
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  // Fields Africa's Talking sends: from, to, text, date, id, linkId
  const from = sms.from?.trim();
  const text = sms.text?.trim();
  if (!from || !text) return new Response('Missing from/text', { status: 400 });

  const { data, error } = await supabase.rpc('process_sms', {
    p_message: text,
    p_phone: from,
    p_location: null,
    p_channel: 'sms',
  });
  if (error) {
    console.error('process_sms failed', error);
    return new Response('Server error', { status: 500 });
  }

  const reply =
    data?.kind === 'verification' || data?.kind === 'report' ? data.data.replyText : (data?.replyText ?? 'Halisi: Please try again.');

  await sendSms(from, reply, AT_SHORTCODE || sms.to || '');

  // Africa's Talking only needs a 200 OK
  return new Response('OK', { status: 200 });
});

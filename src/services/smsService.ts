/**
 * SMS service used by the SMS simulator pages.
 *
 * Mock mode:     the message is processed in the browser (mock/mockSms.ts).
 * Supabase mode: the message is processed by the database function process_sms()
 *                — the SAME function the real SMS gateway uses via the Edge Function
 *                supabase/functions/sms-incoming. So the simulator shows exactly what a
 *                real customer would get back.
 */
import { USE_MOCK_API } from './config';
import { processIncomingSms, type SmsReply } from './mock/mockSms';
import { invalidateCache } from './supabase/supabaseApi';
import { getSupabase } from './supabaseClient';

export type { SmsReply };

export async function simulateIncomingSms(message: string, phone: string, location: string): Promise<SmsReply> {
  if (USE_MOCK_API) return processIncomingSms(message, phone, location);

  const { data, error } = await getSupabase().rpc('process_sms', {
    p_message: message,
    p_phone: phone,
    p_location: location,
    p_channel: 'simulator',
  });
  if (error) throw new Error(error.message);
  invalidateCache(); // the check should show on the dashboards straight away
  return data as SmsReply;
}

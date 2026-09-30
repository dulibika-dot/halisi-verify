/**
 * MOCK (offline) version of the SMS logic, used when VITE_USE_MOCK_API is not "false".
 *
 * The REAL version is the database function process_sms() in supabase/schema.sql:
 *   Customer SMS "VERIFY 839274615"
 *     → Africa's Talking → Supabase Edge Function supabase/functions/sms-incoming
 *     → process_sms() checks the code in PostgreSQL and builds the reply
 *     → reply sent back through Africa's Talking
 * Keep the rules and reply texts here in step with process_sms().
 */
import type { CounterfeitReport, SmsReportResponse, SmsVerificationResponse, Verification } from '../../types';
import { formatDate } from '../../utils/format';
import { db, delay } from './mockDb';

export type SmsReply =
  | { kind: 'verification'; data: SmsVerificationResponse }
  | { kind: 'report'; data: SmsReportResponse }
  | { kind: 'help'; replyText: string };

export async function processIncomingSms(message: string, phone: string, location: string): Promise<SmsReply> {
  const text = message.trim().replace(/\s+/g, ' ').toUpperCase();
  const { verifyKeyword, reportKeyword } = db.settings;

  // "VERIFY 839274615" or "VERIFY 839274615 Mombasa" (optional town) or just "839274615"
  const verifyMatch = text.match(new RegExp(`^(?:${verifyKeyword} )?(\\d{6,12})(?: (.+))?$`));
  if (verifyMatch) {
    const town = verifyMatch[2] ? verifyMatch[2].charAt(0) + verifyMatch[2].slice(1).toLowerCase() : null;
    return delay({ kind: 'verification', data: verifyCode(verifyMatch[1]!, phone, location || town || 'Unknown') }, 900);
  }

  const reportMatch = message.trim().match(new RegExp(`^${reportKeyword}\\s+(\\d{6,12})\\s*(.*)$`, 'i'));
  if (reportMatch) return delay({ kind: 'report', data: createReport(reportMatch[1]!, reportMatch[2] ?? '', phone, location) }, 900);

  return delay(
    {
      kind: 'help',
      replyText: `Halisi: Message not understood. To check a product send ${verifyKeyword} <code>. To report a fake send ${reportKeyword} <code> <reason>.`,
    },
    700,
  );
}

function verifyCode(code: string, phone: string, location: string): SmsVerificationResponse {
  const { suspiciousThreshold, reportKeyword } = db.settings;
  const timestamp = new Date().toISOString();
  const record = db.codes.find((c) => c.code === code);

  const log = (result: Verification['result'], count: number) => {
    db.verifications.unshift({
      id: `v${Date.now()}`,
      code,
      productId: record?.productId ?? null,
      batchId: record?.batchId ?? null,
      manufacturerId: record?.manufacturerId ?? null,
      phone,
      location,
      timestamp,
      result,
      countAtTime: count,
      channel: 'simulator',
    });
  };

  // 1. Code does not exist → INVALID
  if (!record) {
    const previous = db.verifications.filter((v) => v.code === code).length;
    log('invalid', previous + 1);
    return {
      result: 'invalid',
      code,
      verificationCount: previous + 1,
      location,
      timestamp,
      replyText: `Halisi: INVALID. Code ${code} is not registered. This product may be FAKE. Do not use it. Send ${reportKeyword} ${code} <reason> to report.`,
    };
  }

  const product = db.products.find((p) => p.id === record.productId)!;
  const manufacturer = db.manufacturers.find((m) => m.id === record.manufacturerId)!;
  const batch = db.batches.find((b) => b.id === record.batchId)!;
  const details = {
    product: { name: product.name, category: product.category },
    manufacturer: manufacturer.name,
    batchNumber: batch.batchNumber,
    expiryDate: batch.expiryDate,
  };

  // 2. Code deactivated (recalled batch or blocked by admin)
  if (record.status === 'deactivated') {
    log('invalid', record.verificationCount + 1);
    return {
      result: 'deactivated',
      code,
      verificationCount: record.verificationCount,
      location,
      timestamp,
      ...details,
      replyText: `Halisi: WARNING. Code ${code} (${product.name}) has been DEACTIVATED by the manufacturer or regulator. Do not use this product.`,
    };
  }

  // 3. Genuine code → count it, and flag if checked too many times
  record.verificationCount += 1;
  record.lastVerifiedAt = timestamp;
  const count = record.verificationCount;
  const suspicious = count > suspiciousThreshold;
  log(suspicious ? 'suspicious' : 'verified', count);

  return {
    result: suspicious ? 'suspicious' : 'verified',
    code,
    verificationCount: count,
    location,
    timestamp,
    ...details,
    replyText: suspicious
      ? `Halisi: CAUTION. Code ${code} for ${product.name} has been checked ${count} times. This may be a COPIED code on a counterfeit product. Send ${reportKeyword} ${code} <reason> to report.`
      : `Halisi: GENUINE. ${product.name}, Batch ${batch.batchNumber}, by ${manufacturer.name}. Expiry ${formatDate(batch.expiryDate)}. Thank you for verifying.`,
  };
}

function createReport(code: string, reason: string, phone: string, location: string): SmsReportResponse {
  const record = db.codes.find((c) => c.code === code);
  const product = db.products.find((p) => p.id === record?.productId);
  const reference = `CR-${String(2641 + db.reports.length).padStart(5, '0')}`;
  const report: CounterfeitReport = {
    id: `r${Date.now()}`,
    reference,
    code,
    productId: product?.id ?? null,
    productName: product?.name ?? 'Unknown product',
    manufacturerId: product?.manufacturerId ?? null,
    reason: reason.trim() ? capitalise(reason.trim()) : 'Other',
    description: reason.trim() || 'Reported via SMS without details.',
    location,
    reporterPhone: phone,
    createdAt: new Date().toISOString(),
    status: 'pending',
    notes: [],
  };
  db.reports.unshift(report);
  return {
    reference,
    replyText: `Halisi: Thank you. Your report ${reference} for code ${code} has been received and will be investigated.`,
  };
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

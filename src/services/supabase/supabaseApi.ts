/**
 * SUPABASE data source: the same functions as mock/mockApi.ts, but reading and
 * writing the real database. Row Level Security in supabase/schema.sql makes sure
 * a manufacturer only ever receives its own rows; admins receive everything.
 */
import type {
  ActivityItem,
  BatchWithProduct,
  CodeWithDetails,
  CounterfeitReport,
  CreateBatchInput,
  DashboardStats,
  Hotspot,
  Manufacturer,
  ManufacturerStatus,
  ManufacturerWithStats,
  NewLoginInput,
  NewManufacturerInput,
  Product,
  RegisterManufacturerInput,
  ProductActivity,
  ProductBatch,
  ProductWithStats,
  ReportStatus,
  SuspiciousActivity,
  SuspiciousStatus,
  SystemSettings,
  TrendPoint,
  Verification,
  VerificationCode,
  VerificationWithDetails,
} from '../../types';
import { FunctionsHttpError } from '@supabase/supabase-js';
import * as a from '../analytics';
import { getSupabase } from '../supabaseClient';

/* ---------------- database rows (snake_case) → app types (camelCase) ---------------- */

interface ManufacturerRow {
  id: string; name: string; registration_no: string; contact_person: string; email: string; phone: string;
  county: string; address: string; industry: string; status: Manufacturer['status']; joined_at: string;
}
interface ProductRow {
  id: string; manufacturer_id: string; name: string; category: string; description: string; sku: string;
  status: Product['status']; created_at: string;
}
interface BatchRow {
  id: string; product_id: string; manufacturer_id: string; batch_number: string; quantity: number;
  manufacturing_date: string; expiry_date: string; codes_generated: number; code_status: ProductBatch['codeStatus'];
  code_first: string | null; code_last: string | null; status: ProductBatch['status']; created_at: string;
}
interface CodeRow {
  code: string; batch_id: string; product_id: string; manufacturer_id: string; status: VerificationCode['status'];
  review_status: VerificationCode['reviewStatus']; verification_count: number; created_at: string; last_verified_at: string | null;
}
interface VerificationRow {
  id: number; code: string; product_id: string | null; batch_id: string | null; manufacturer_id: string | null;
  phone: string; location: string; created_at: string; result: Verification['result']; count_at_time: number;
  channel: Verification['channel'];
}
interface ReportRow {
  id: string; reference: string; code: string; product_id: string | null; product_name: string; manufacturer_id: string | null;
  reason: string; description: string; location: string; reporter_phone: string; created_at: string;
  status: ReportStatus; notes: string[] | null;
}
interface SettingsRow {
  suspicious_threshold: number; high_risk_threshold: number; sms_shortcode: string; verify_keyword: string;
  report_keyword: string; auto_flag_suspicious: boolean; notify_manufacturers: boolean; email_alerts: boolean;
  data_retention_days: number;
}

const toManufacturer = (r: ManufacturerRow): Manufacturer => ({
  id: r.id, name: r.name, registrationNo: r.registration_no, contactPerson: r.contact_person, email: r.email,
  phone: r.phone, county: r.county, address: r.address, industry: r.industry, status: r.status, joinedAt: r.joined_at,
});
const toProduct = (r: ProductRow): Product => ({
  id: r.id, manufacturerId: r.manufacturer_id, name: r.name, category: r.category, description: r.description,
  sku: r.sku, status: r.status, createdAt: r.created_at,
});
const toBatch = (r: BatchRow): ProductBatch => ({
  id: r.id, productId: r.product_id, manufacturerId: r.manufacturer_id, batchNumber: r.batch_number, quantity: r.quantity,
  manufacturingDate: r.manufacturing_date, expiryDate: r.expiry_date, codesGenerated: r.codes_generated,
  codeStatus: r.code_status, codeRange: r.code_first && r.code_last ? { first: r.code_first, last: r.code_last } : null,
  status: r.status, createdAt: r.created_at,
});
const toCode = (r: CodeRow): VerificationCode => ({
  code: r.code, batchId: r.batch_id, productId: r.product_id, manufacturerId: r.manufacturer_id, status: r.status,
  reviewStatus: r.review_status, verificationCount: r.verification_count, createdAt: r.created_at, lastVerifiedAt: r.last_verified_at,
});
const toVerification = (r: VerificationRow): Verification => ({
  id: String(r.id), code: r.code, productId: r.product_id, batchId: r.batch_id, manufacturerId: r.manufacturer_id,
  phone: r.phone, location: r.location, timestamp: r.created_at, result: r.result, countAtTime: r.count_at_time, channel: r.channel,
});
const toReport = (r: ReportRow): CounterfeitReport => ({
  id: r.id, reference: r.reference, code: r.code, productId: r.product_id, productName: r.product_name,
  manufacturerId: r.manufacturer_id, reason: r.reason, description: r.description, location: r.location,
  reporterPhone: r.reporter_phone, createdAt: r.created_at, status: r.status, notes: r.notes ?? [],
});
const toSettings = (r: SettingsRow): SystemSettings => ({
  suspiciousThreshold: r.suspicious_threshold, highRiskThreshold: r.high_risk_threshold, smsShortcode: r.sms_shortcode,
  verifyKeyword: r.verify_keyword, reportKeyword: r.report_keyword, autoFlagSuspicious: r.auto_flag_suspicious,
  notifyManufacturers: r.notify_manufacturers, emailAlerts: r.email_alerts, dataRetentionDays: r.data_retention_days,
});

/* ---------------- loading helpers ---------------- */

function check<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

/** Supabase returns at most 1000 rows per request, so read big tables page by page. */
async function fetchAll<Row>(table: string, orderBy: string, filter?: { column: string; gte: number }): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    let query = getSupabase().from(table).select('*');
    if (filter) query = query.gte(filter.column, filter.gte);
    const page = check<Row[]>(await query.order(orderBy, { ascending: false }).range(from, from + 999));
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

// A dashboard asks for several things at once; share identical reads for a few seconds.
const cache = new Map<string, { at: number; value: Promise<unknown> }>();
function cached<T>(key: string, load: () => Promise<T>, ttlMs = 4000): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = load().catch((e) => {
    cache.delete(key);
    throw e;
  });
  cache.set(key, { at: Date.now(), value });
  return value;
}
/** Call after every change so the next read is fresh */
export const invalidateCache = () => cache.clear();

const loadManufacturers = () => cached('manufacturers', async () => (await fetchAll<ManufacturerRow>('manufacturers', 'joined_at')).map(toManufacturer));
const loadProducts = () => cached('products', async () => (await fetchAll<ProductRow>('products', 'created_at')).map(toProduct));
const loadBatches = () => cached('batches', async () => (await fetchAll<BatchRow>('batches', 'created_at')).map(toBatch));
const loadVerifications = () => cached('verifications', async () => (await fetchAll<VerificationRow>('verifications', 'created_at')).map(toVerification));
const loadReports = () => cached('reports', async () => (await fetchAll<ReportRow>('reports', 'created_at')).map(toReport));
const loadCodes = () => cached('codes', async () => (await fetchAll<CodeRow>('verification_codes', 'created_at')).map(toCode));
const loadSettings = () =>
  cached('settings', async () => toSettings(check<SettingsRow>(await getSupabase().from('settings').select('*').eq('id', 1).single())));

const scoped = <T extends { manufacturerId: string | null }>(rows: T[], mId?: string) => a.byManufacturer(rows, mId);

/* ---------------- dashboard ---------------- */

export async function getDashboardStats(manufacturerId?: string): Promise<DashboardStats> {
  const [manufacturers, products, batches, verifications, reports] = await Promise.all([
    loadManufacturers(), loadProducts(), loadBatches(), loadVerifications(), loadReports(),
  ]);
  return a.computeStats({ manufacturers, products, batches, verifications, reports }, manufacturerId);
}

export async function getVerificationTrend(days: number, manufacturerId?: string): Promise<TrendPoint[]> {
  return a.computeTrend(scoped(await loadVerifications(), manufacturerId), days);
}

export async function getProductActivity(manufacturerId?: string): Promise<ProductActivity[]> {
  const [verifications, products] = await Promise.all([loadVerifications(), loadProducts()]);
  return a.computeProductActivity(scoped(verifications, manufacturerId), products);
}

export async function getRecentActivity(limit = 8, manufacturerId?: string): Promise<ActivityItem[]> {
  const [verifications, products] = await Promise.all([loadVerifications(), loadProducts()]);
  return a.toActivityItems(scoped(verifications, manufacturerId).slice(0, limit), products);
}

/* ---------------- manufacturers ---------------- */

export async function getManufacturers(): Promise<ManufacturerWithStats[]> {
  const [m, p, b, v, profiles] = await Promise.all([
    loadManufacturers(), loadProducts(), loadBatches(), loadVerifications(),
    // admins can read every profile; used to show which companies have a login
    cached('profiles', () => fetchAll<{ email: string; role: string; manufacturer_id: string | null }>('profiles', 'email')),
  ]);
  const logins = new Map(profiles.filter((x) => x.role === 'manufacturer' && x.manufacturer_id).map((x) => [x.manufacturer_id!, x.email]));
  return a.withManufacturerStats(m, p, b, v, logins);
}

/** Calls the admin-users Edge Function (creating logins needs the server-side service key). */
async function adminUsers(body: Record<string, unknown>): Promise<{ manufacturerId: string }> {
  const { data, error } = await getSupabase().functions.invoke('admin-users', { body });
  if (error) {
    let message = error.message;
    if (error instanceof FunctionsHttpError) {
      const details = await error.context.json().catch(() => null);
      if (details?.error) message = details.error;
    }
    throw new Error(message);
  }
  invalidateCache();
  return data as { manufacturerId: string };
}

export async function createManufacturer(input: NewManufacturerInput, login: NewLoginInput): Promise<Manufacturer> {
  const { manufacturerId } = await adminUsers({ action: 'create_manufacturer', manufacturer: input, login });
  return getManufacturer(manufacturerId);
}

/** Public self-registration via the register-manufacturer Edge Function (no login needed). */
export async function registerManufacturer(input: RegisterManufacturerInput): Promise<void> {
  const { error } = await getSupabase().functions.invoke('register-manufacturer', { body: input });
  if (error) {
    let message = error.message;
    if (error instanceof FunctionsHttpError) {
      const details = await error.context.json().catch(() => null);
      if (details?.error) message = details.error;
    }
    throw new Error(message);
  }
}

export async function createManufacturerLogin(manufacturerId: string, login: NewLoginInput): Promise<void> {
  await adminUsers({ action: 'create_login', manufacturerId, login });
}

export async function getManufacturer(id: string): Promise<Manufacturer> {
  return toManufacturer(check<ManufacturerRow>(await getSupabase().from('manufacturers').select('*').eq('id', id).single()));
}

export async function updateManufacturer(id: string, patch: Partial<Manufacturer>): Promise<Manufacturer> {
  const row: Partial<ManufacturerRow> = {
    name: patch.name, contact_person: patch.contactPerson, email: patch.email, phone: patch.phone,
    county: patch.county, address: patch.address, industry: patch.industry, status: patch.status,
  };
  // leave out fields that were not changed
  Object.keys(row).forEach((k) => row[k as keyof ManufacturerRow] === undefined && delete row[k as keyof ManufacturerRow]);
  const updated = check<ManufacturerRow>(await getSupabase().from('manufacturers').update(row).eq('id', id).select('*').single());
  invalidateCache();
  return toManufacturer(updated);
}

export const updateManufacturerStatus = (id: string, status: ManufacturerStatus) => updateManufacturer(id, { status });

/* ---------------- products & batches ---------------- */

export async function getProducts(manufacturerId?: string): Promise<ProductWithStats[]> {
  const [p, m, b, v] = await Promise.all([loadProducts(), loadManufacturers(), loadBatches(), loadVerifications()]);
  return a.withProductStats(scoped(p, manufacturerId), m, b, v);
}

export async function getBatches(manufacturerId?: string): Promise<BatchWithProduct[]> {
  const [b, p, m] = await Promise.all([loadBatches(), loadProducts(), loadManufacturers()]);
  return a.joinBatches(scoped(b, manufacturerId), p, m);
}

/** The database creates the product (if new), the batch and one unique code per unit. */
export async function createProductBatch(_manufacturerId: string, input: CreateBatchInput): Promise<ProductBatch> {
  const row = check<BatchRow>(
    await getSupabase().rpc('create_product_batch', {
      p_product_name: input.productName,
      p_category: input.category,
      p_description: input.description,
      p_batch_number: input.batchNumber,
      p_quantity: input.quantity,
      p_manufacturing_date: input.manufacturingDate,
      p_expiry_date: input.expiryDate,
    }),
  );
  invalidateCache();
  return toBatch(row);
}

/* ---------------- codes ---------------- */

export async function getVerificationCodes(manufacturerId?: string): Promise<CodeWithDetails[]> {
  const [c, p, b] = await Promise.all([loadCodes(), loadProducts(), loadBatches()]);
  return a.joinCodes(scoped(c, manufacturerId), p, b);
}

export async function setCodeStatus(code: string, status: VerificationCode['status']): Promise<VerificationCode> {
  const row = check<CodeRow>(await getSupabase().from('verification_codes').update({ status }).eq('code', code).select('*').single());
  invalidateCache();
  return toCode(row);
}

/* ---------------- verification logs ---------------- */

export async function getVerificationLogs(manufacturerId?: string): Promise<VerificationWithDetails[]> {
  const [v, p, m, b] = await Promise.all([loadVerifications(), loadProducts(), loadManufacturers(), loadBatches()]);
  return a.joinLogs(scoped(v, manufacturerId), p, m, b);
}

/* ---------------- suspicious activity ---------------- */

export async function getSuspiciousActivity(manufacturerId?: string): Promise<SuspiciousActivity[]> {
  const settings = await loadSettings();
  // only codes near/over the limit are needed, not every code ever printed
  const flaggedCodes = await cached(`codes>=${settings.suspiciousThreshold}`, async () =>
    (await fetchAll<CodeRow>('verification_codes', 'verification_count', { column: 'verification_count', gte: settings.suspiciousThreshold })).map(toCode),
  );
  const [verifications, products, manufacturers, batches] = await Promise.all([loadVerifications(), loadProducts(), loadManufacturers(), loadBatches()]);
  return a.computeSuspicious({ codes: scoped(flaggedCodes, manufacturerId), verifications, products, manufacturers, batches, settings });
}

export async function updateSuspiciousStatus(code: string, status: SuspiciousStatus): Promise<void> {
  check(
    await getSupabase()
      .from('verification_codes')
      .update({ review_status: status === 'suspicious' ? null : status, status: status === 'blocked' ? 'deactivated' : 'active' })
      .eq('code', code),
  );
  invalidateCache();
}

/* ---------------- reports ---------------- */

export async function getReports(manufacturerId?: string): Promise<CounterfeitReport[]> {
  return scoped(await loadReports(), manufacturerId);
}

export async function updateReportStatus(id: string, status: ReportStatus, note?: string): Promise<CounterfeitReport> {
  const current = check<ReportRow>(await getSupabase().from('reports').select('*').eq('id', id).single());
  const notes = [...(current.notes ?? []), note?.trim() ? note.trim() : `Status changed to ${status}.`];
  const updated = check<ReportRow>(await getSupabase().from('reports').update({ status, notes }).eq('id', id).select('*').single());
  invalidateCache();
  return toReport(updated);
}

/* ---------------- hotspots ---------------- */

export async function getHotspots(): Promise<Hotspot[]> {
  const [v, r, p] = await Promise.all([loadVerifications(), loadReports(), loadProducts()]);
  return a.computeHotspots(v, r, p);
}

/* ---------------- settings ---------------- */

export const getSettings = (): Promise<SystemSettings> => loadSettings();

export async function updateSettings(s: SystemSettings): Promise<SystemSettings> {
  const row = check<SettingsRow>(
    await getSupabase()
      .from('settings')
      .update({
        suspicious_threshold: s.suspiciousThreshold, high_risk_threshold: s.highRiskThreshold, sms_shortcode: s.smsShortcode,
        verify_keyword: s.verifyKeyword, report_keyword: s.reportKeyword, auto_flag_suspicious: s.autoFlagSuspicious,
        notify_manufacturers: s.notifyManufacturers, email_alerts: s.emailAlerts, data_retention_days: s.dataRetentionDays,
      })
      .eq('id', 1)
      .select('*')
      .single(),
  );
  invalidateCache();
  return toSettings(row);
}

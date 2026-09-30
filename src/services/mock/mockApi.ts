/**
 * MOCK data source: every API call answered from the in-memory `db`
 * (used when VITE_USE_MOCK_API is not "false"). The calculations live in
 * ../analytics.ts and are shared with the Supabase data source.
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
  ProductActivity,
  RegisterManufacturerInput,
  ProductBatch,
  ProductWithStats,
  ReportStatus,
  SuspiciousActivity,
  SuspiciousStatus,
  SystemSettings,
  TrendPoint,
  VerificationCode,
  VerificationWithDetails,
} from '../../types';
import { SAMPLE_CODES_PER_BATCH } from '../../data/generated';
import { DEMO_ACCOUNTS } from '../../data/users';
import { runtimeRandom } from '../../utils/random';
import * as a from '../analytics';
import { db, delay } from './mockDb';

const scoped = <T extends { manufacturerId: string | null }>(rows: T[], mId?: string) => a.byManufacturer(rows, mId);

/* ---------------- dashboard ---------------- */

export async function getDashboardStats(manufacturerId?: string): Promise<DashboardStats> {
  return delay(a.computeStats(db, manufacturerId));
}

export async function getVerificationTrend(days: number, manufacturerId?: string): Promise<TrendPoint[]> {
  return delay(a.computeTrend(scoped(db.verifications, manufacturerId), days));
}

export async function getProductActivity(manufacturerId?: string): Promise<ProductActivity[]> {
  return delay(a.computeProductActivity(scoped(db.verifications, manufacturerId), db.products));
}

export async function getRecentActivity(limit = 8, manufacturerId?: string): Promise<ActivityItem[]> {
  return delay(a.toActivityItems(scoped(db.verifications, manufacturerId).slice(0, limit), db.products));
}

/* ---------------- manufacturers ---------------- */

export async function getManufacturers(): Promise<ManufacturerWithStats[]> {
  const logins = new Map(
    DEMO_ACCOUNTS.filter((u) => u.role === 'manufacturer' && u.manufacturerId).map((u) => [u.manufacturerId!, u.email]),
  );
  return delay(a.withManufacturerStats(db.manufacturers, db.products, db.batches, db.verifications, logins));
}

function addMockLogin(manufacturerId: string, login: NewLoginInput) {
  const email = login.email.trim().toLowerCase();
  if (DEMO_ACCOUNTS.some((u) => u.email === email)) throw new Error('A login with this email already exists.');
  DEMO_ACCOUNTS.push({
    id: `u${Date.now()}`,
    name: login.name.trim(),
    email,
    role: 'manufacturer',
    manufacturerId,
    password: login.password,
  });
}

export async function createManufacturer(input: NewManufacturerInput, login: NewLoginInput): Promise<Manufacturer> {
  const m: Manufacturer = {
    id: `m${Date.now()}`,
    ...input,
    contactPerson: input.contactPerson || login.name,
    email: input.email || login.email,
    joinedAt: new Date().toISOString(),
  };
  addMockLogin(m.id, login);
  db.manufacturers.unshift(m);
  return delay(m, 800);
}

/** Public self-registration: always pending until the admin approves */
export async function registerManufacturer(input: RegisterManufacturerInput): Promise<void> {
  const taken = db.manufacturers.some(
    (m) =>
      m.name.toLowerCase() === input.company.name.trim().toLowerCase() ||
      (input.company.registrationNo && m.registrationNo.toLowerCase() === input.company.registrationNo.trim().toLowerCase()),
  );
  if (taken) throw new Error('A company with this name or registration number is already registered. Contact the administrator.');
  await createManufacturer({ ...input.company, email: input.login.email, contactPerson: input.login.name, status: 'pending' }, input.login);
}

export async function createManufacturerLogin(manufacturerId: string, login: NewLoginInput): Promise<void> {
  addMockLogin(manufacturerId, login);
  return delay(undefined, 800);
}

export async function getManufacturer(id: string): Promise<Manufacturer> {
  const m = db.manufacturers.find((x) => x.id === id);
  if (!m) throw new Error('Manufacturer not found');
  return delay(m);
}

export async function updateManufacturer(id: string, patch: Partial<Manufacturer>): Promise<Manufacturer> {
  const m = db.manufacturers.find((x) => x.id === id);
  if (!m) throw new Error('Manufacturer not found');
  Object.assign(m, patch);
  return delay(m, 600);
}

export async function updateManufacturerStatus(id: string, status: ManufacturerStatus): Promise<Manufacturer> {
  return updateManufacturer(id, { status });
}

/* ---------------- products & batches ---------------- */

export async function getProducts(manufacturerId?: string): Promise<ProductWithStats[]> {
  return delay(a.withProductStats(scoped(db.products, manufacturerId), db.manufacturers, db.batches, db.verifications));
}

export async function getBatches(manufacturerId?: string): Promise<BatchWithProduct[]> {
  return delay(a.joinBatches(scoped(db.batches, manufacturerId), db.products, db.manufacturers));
}

export async function createProductBatch(manufacturerId: string, input: CreateBatchInput): Promise<ProductBatch> {
  const exists = db.batches.some(
    (b) => b.manufacturerId === manufacturerId && b.batchNumber.toLowerCase() === input.batchNumber.trim().toLowerCase(),
  );
  if (exists) throw new Error(`Batch number ${input.batchNumber} already exists.`);

  // Re-use the product if it already exists, otherwise register it
  let product = db.products.find(
    (p) => p.manufacturerId === manufacturerId && p.name.toLowerCase() === input.productName.trim().toLowerCase(),
  );
  if (!product) {
    product = {
      id: `p${Date.now()}`,
      manufacturerId,
      name: input.productName.trim(),
      category: input.category,
      description: input.description.trim(),
      sku: input.productName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 14),
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    db.products.unshift(product);
  }

  const batch: ProductBatch = {
    id: `b${Date.now()}`,
    productId: product.id,
    manufacturerId,
    batchNumber: input.batchNumber.trim().toUpperCase(),
    quantity: input.quantity,
    manufacturingDate: new Date(input.manufacturingDate).toISOString(),
    expiryDate: new Date(input.expiryDate).toISOString(),
    codesGenerated: input.quantity,
    codeStatus: 'generated',
    codeRange: null,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  // Generate a sample of unique codes (the Supabase version generates all of them)
  const existing = new Set(db.codes.map((c) => c.code));
  const newCodes: VerificationCode[] = [];
  while (newCodes.length < Math.min(input.quantity, SAMPLE_CODES_PER_BATCH)) {
    const code = runtimeRandom.code();
    if (existing.has(code)) continue;
    existing.add(code);
    newCodes.push({
      code,
      batchId: batch.id,
      productId: product.id,
      manufacturerId,
      status: 'active',
      reviewStatus: null,
      verificationCount: 0,
      createdAt: batch.createdAt,
      lastVerifiedAt: null,
    });
  }
  batch.codeRange = { first: newCodes[0]!.code, last: newCodes[newCodes.length - 1]!.code };
  db.batches.unshift(batch);
  db.codes.unshift(...newCodes);
  return delay(batch, 900);
}

/* ---------------- codes ---------------- */

export async function getVerificationCodes(manufacturerId?: string): Promise<CodeWithDetails[]> {
  return delay(a.joinCodes(scoped(db.codes, manufacturerId), db.products, db.batches));
}

export async function setCodeStatus(code: string, status: VerificationCode['status']): Promise<VerificationCode> {
  const c = db.codes.find((x) => x.code === code);
  if (!c) throw new Error('Code not found');
  c.status = status;
  return delay(c);
}

/* ---------------- verification logs ---------------- */

export async function getVerificationLogs(manufacturerId?: string): Promise<VerificationWithDetails[]> {
  return delay(a.joinLogs(scoped(db.verifications, manufacturerId), db.products, db.manufacturers, db.batches));
}

/* ---------------- suspicious activity ---------------- */

export async function getSuspiciousActivity(manufacturerId?: string): Promise<SuspiciousActivity[]> {
  return delay(a.computeSuspicious({ ...db, codes: scoped(db.codes, manufacturerId) }));
}

export async function updateSuspiciousStatus(code: string, status: SuspiciousStatus): Promise<void> {
  const c = db.codes.find((x) => x.code === code);
  if (c) {
    c.reviewStatus = status === 'suspicious' ? null : status;
    c.status = status === 'blocked' ? 'deactivated' : 'active';
  }
  return delay(undefined, 500);
}

/* ---------------- reports ---------------- */

export async function getReports(manufacturerId?: string): Promise<CounterfeitReport[]> {
  return delay(scoped(db.reports, manufacturerId).sort((x, y) => y.createdAt.localeCompare(x.createdAt)));
}

export async function updateReportStatus(id: string, status: ReportStatus, note?: string): Promise<CounterfeitReport> {
  const r = db.reports.find((x) => x.id === id);
  if (!r) throw new Error('Report not found');
  r.status = status;
  r.notes.push(note?.trim() ? note.trim() : `Status changed to ${status}.`);
  return delay(r, 500);
}

/* ---------------- hotspots ---------------- */

export async function getHotspots(): Promise<Hotspot[]> {
  return delay(a.computeHotspots(db.verifications, db.reports, db.products));
}

/* ---------------- settings ---------------- */

export async function getSettings(): Promise<SystemSettings> {
  return delay(db.settings);
}

export async function updateSettings(settings: SystemSettings): Promise<SystemSettings> {
  db.settings = { ...settings };
  return delay(db.settings, 600);
}

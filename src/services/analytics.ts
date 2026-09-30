/**
 * Pure calculations shared by BOTH data sources (mock and Supabase):
 * dashboard totals, trends, suspicious-code list, hotspots and joined rows.
 * They take plain arrays and return the shapes the UI expects.
 */
import { KENYA_LOCATIONS } from '../data/locations';
import type {
  ActivityItem,
  BatchWithProduct,
  CodeWithDetails,
  CounterfeitReport,
  DashboardStats,
  Hotspot,
  Manufacturer,
  ManufacturerWithStats,
  Product,
  ProductActivity,
  ProductBatch,
  ProductWithStats,
  SuspiciousActivity,
  SuspiciousStatus,
  SystemSettings,
  TrendPoint,
  Verification,
  VerificationCode,
  VerificationWithDetails,
} from '../types';
import { DAY, dayKey } from '../utils/dates';

export const byManufacturer = <T extends { manufacturerId: string | null }>(rows: T[], manufacturerId?: string) =>
  manufacturerId ? rows.filter((r) => r.manufacturerId === manufacturerId) : rows;

const indexById = <T extends { id: string }>(rows: T[]) => new Map(rows.map((r) => [r.id, r]));

function countBetween(rows: Verification[], fromMs: number, toMs: number, result?: Verification['result']) {
  return rows.filter((v) => {
    const t = new Date(v.timestamp).getTime();
    return t >= fromMs && t < toMs && (!result || v.result === result);
  }).length;
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
}

/* ---------------- dashboard ---------------- */

export function computeStats(
  d: { manufacturers: Manufacturer[]; products: Product[]; batches: ProductBatch[]; verifications: Verification[]; reports: CounterfeitReport[] },
  manufacturerId?: string,
): DashboardStats {
  const logs = byManufacturer(d.verifications, manufacturerId);
  const now = Date.now();
  const week = 7 * DAY;
  return {
    manufacturers: d.manufacturers.length,
    products: byManufacturer(d.products, manufacturerId).length,
    batches: byManufacturer(d.batches, manufacturerId).length,
    verifications: logs.length,
    verified: logs.filter((v) => v.result === 'verified').length,
    suspicious: logs.filter((v) => v.result === 'suspicious').length,
    invalid: logs.filter((v) => v.result === 'invalid').length,
    reports: byManufacturer(d.reports, manufacturerId).length,
    verificationsChange: pctChange(countBetween(logs, now - week, now), countBetween(logs, now - 2 * week, now - week)),
    suspiciousChange: pctChange(
      countBetween(logs, now - week, now, 'suspicious'),
      countBetween(logs, now - 2 * week, now - week, 'suspicious'),
    ),
  };
}

export function computeTrend(verifications: Verification[], days: number): TrendPoint[] {
  const points = new Map<string, TrendPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY);
    points.set(dayKey(d), {
      date: dayKey(d),
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      verified: 0,
      suspicious: 0,
      invalid: 0,
    });
  }
  for (const v of verifications) {
    const point = points.get(dayKey(v.timestamp));
    if (point) point[v.result]++;
  }
  return [...points.values()];
}

export function computeProductActivity(verifications: Verification[], products: Product[], limit = 8): ProductActivity[] {
  const names = indexById(products);
  const map = new Map<string, ProductActivity>();
  for (const v of verifications) {
    if (!v.productId) continue;
    const row = map.get(v.productId) ?? {
      productId: v.productId,
      productName: names.get(v.productId)?.name ?? '—',
      verified: 0,
      suspicious: 0,
      invalid: 0,
      total: 0,
    };
    row[v.result]++;
    row.total++;
    map.set(v.productId, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

export function toActivityItems(verifications: Verification[], products: Product[]): ActivityItem[] {
  const names = indexById(products);
  return verifications.map((v) => ({
    id: v.id,
    productName: (v.productId && names.get(v.productId)?.name) || 'Unregistered code',
    code: v.code,
    result: v.result,
    location: v.location,
    timestamp: v.timestamp,
  }));
}

/* ---------------- joined lists ---------------- */

export function withManufacturerStats(
  manufacturers: Manufacturer[],
  products: Product[],
  batches: ProductBatch[],
  verifications: Verification[],
  /** manufacturerId → login email */
  logins: Map<string, string> = new Map(),
): ManufacturerWithStats[] {
  return manufacturers.map((m) => {
    const logs = verifications.filter((v) => v.manufacturerId === m.id);
    return {
      ...m,
      loginEmail: logins.get(m.id) ?? null,
      productCount: products.filter((p) => p.manufacturerId === m.id).length,
      batchCount: batches.filter((b) => b.manufacturerId === m.id).length,
      verificationCount: logs.length,
      suspiciousCount: logs.filter((v) => v.result === 'suspicious').length,
    };
  });
}

export function withProductStats(
  products: Product[],
  manufacturers: Manufacturer[],
  batches: ProductBatch[],
  verifications: Verification[],
): ProductWithStats[] {
  const mfrs = indexById(manufacturers);
  return products.map((p) => {
    const productBatches = batches.filter((b) => b.productId === p.id);
    const logs = verifications.filter((v) => v.productId === p.id);
    return {
      ...p,
      manufacturerName: mfrs.get(p.manufacturerId)?.name ?? '—',
      batchCount: productBatches.length,
      totalUnits: productBatches.reduce((s, b) => s + b.quantity, 0),
      verificationCount: logs.length,
      suspiciousCount: logs.filter((v) => v.result === 'suspicious').length,
    };
  });
}

export function joinBatches(batches: ProductBatch[], products: Product[], manufacturers: Manufacturer[]): BatchWithProduct[] {
  const prods = indexById(products);
  const mfrs = indexById(manufacturers);
  return batches
    .map((b) => {
      const p = prods.get(b.productId);
      return {
        ...b,
        productName: p?.name ?? '—',
        category: p?.category ?? '—',
        manufacturerName: mfrs.get(b.manufacturerId)?.name ?? '—',
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function joinCodes(codes: VerificationCode[], products: Product[], batches: ProductBatch[]): CodeWithDetails[] {
  const prods = indexById(products);
  const bs = indexById(batches);
  return codes.map((c) => ({
    ...c,
    productName: prods.get(c.productId)?.name ?? '—',
    batchNumber: bs.get(c.batchId)?.batchNumber ?? '—',
  }));
}

export function joinLogs(
  verifications: Verification[],
  products: Product[],
  manufacturers: Manufacturer[],
  batches: ProductBatch[],
): VerificationWithDetails[] {
  const prods = indexById(products);
  const mfrs = indexById(manufacturers);
  const bs = indexById(batches);
  return verifications.map((v) => ({
    ...v,
    productName: (v.productId && prods.get(v.productId)?.name) || null,
    manufacturerName: (v.manufacturerId && mfrs.get(v.manufacturerId)?.name) || null,
    batchNumber: (v.batchId && bs.get(v.batchId)?.batchNumber) || null,
  }));
}

/* ---------------- counterfeit tracking ---------------- */

/** Codes checked at least `suspiciousThreshold` times (borderline "normal" ones included for comparison). */
export function computeSuspicious(d: {
  codes: VerificationCode[];
  verifications: Verification[];
  products: Product[];
  manufacturers: Manufacturer[];
  batches: ProductBatch[];
  settings: SystemSettings;
}): SuspiciousActivity[] {
  const { suspiciousThreshold, highRiskThreshold } = d.settings;
  const prods = indexById(d.products);
  const mfrs = indexById(d.manufacturers);
  const bs = indexById(d.batches);
  const logsByCode = new Map<string, Verification[]>();
  d.verifications.forEach((v) => logsByCode.set(v.code, [...(logsByCode.get(v.code) ?? []), v]));

  return d.codes
    .filter((c) => c.verificationCount >= suspiciousThreshold)
    .map((c) => {
      const logs = logsByCode.get(c.code) ?? [];
      const times = logs.map((l) => l.timestamp).sort();
      const count = c.verificationCount;
      const status: SuspiciousStatus =
        c.reviewStatus ?? (c.status === 'deactivated' ? 'blocked' : count > suspiciousThreshold ? 'suspicious' : 'normal');
      return {
        code: c.code,
        productId: c.productId,
        productName: prods.get(c.productId)?.name ?? '—',
        manufacturerName: mfrs.get(c.manufacturerId)?.name ?? '—',
        batchNumber: bs.get(c.batchId)?.batchNumber ?? '—',
        verificationCount: count,
        primaryLocation: mostCommon(logs.map((l) => l.location)),
        locations: [...new Set(logs.map((l) => l.location))],
        uniquePhones: new Set(logs.map((l) => l.phone)).size,
        firstSeen: times[0] ?? c.createdAt,
        lastSeen: times[times.length - 1] ?? c.createdAt,
        riskLevel: count >= highRiskThreshold ? 'high' : count > suspiciousThreshold ? 'medium' : 'low',
        status,
      } satisfies SuspiciousActivity;
    })
    .sort((a, b) => b.verificationCount - a.verificationCount);
}

export function computeHotspots(verifications: Verification[], reports: CounterfeitReport[], products: Product[]): Hotspot[] {
  const prods = indexById(products);
  return KENYA_LOCATIONS.map((loc) => {
    const logs = verifications.filter((v) => v.location.toLowerCase() === loc.name.toLowerCase());
    const suspiciousLogs = logs.filter((v) => v.result === 'suspicious');
    const top = suspiciousLogs.length ? mostCommon(suspiciousLogs.map((v) => v.productId ?? '')) : null;
    return {
      ...loc,
      totalVerifications: logs.length,
      suspicious: suspiciousLogs.length,
      invalid: logs.filter((v) => v.result === 'invalid').length,
      reports: reports.filter((r) => r.location.toLowerCase() === loc.name.toLowerCase()).length,
      topProduct: top ? (prods.get(top)?.name ?? null) : null,
    };
  }).sort((a, b) => b.suspicious + b.invalid - (a.suspicious + a.invalid));
}

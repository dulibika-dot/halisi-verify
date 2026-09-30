/**
 * Generates the larger mock datasets (verification codes + verification logs)
 * with a fixed seed, so every demo shows the same numbers.
 *
 * In production these rows live in PostgreSQL tables:
 *   verification_codes, verifications
 */
import type { ProductBatch, Verification, VerificationCode } from '../types';
import { createRandom } from '../utils/random';
import { DAY, MINUTE } from '../utils/dates';
import { BATCHES } from './batches';
import { LOCATION_NAMES, LOCATION_WEIGHTS } from './locations';

/** A code verified more than this many times is flagged as suspicious. */
export const DEFAULT_SUSPICIOUS_THRESHOLD = 3;
/** Codes shown per batch in the prototype (a real batch has thousands). */
export const SAMPLE_CODES_PER_BATCH = 20;

/** Codes you can type into the SMS simulator during a demo. */
export const DEMO_CODES = {
  genuine: '510482736', // Raha Milk — never verified before
  suspicious: '839274615', // XYZ Cooking Oil 1L — verified 52 times
  invalid: '123456789', // not in the database
  deactivated: '404040404', // from a recalled batch
} as const;

interface FlaggedCode {
  code: string;
  batchId: string;
  count: number;
  primary: string;
  others: string[];
  spanDays: number;
}

// Codes that are being "cloned" onto counterfeit packaging in the demo story
const FLAGGED: FlaggedCode[] = [
  // count 51 + one "4 minutes ago" check added below = 52 attempts
  { code: '839274615', batchId: 'b1', count: 51, primary: 'Nairobi', others: ['Thika', 'Machakos'], spanDays: 12 },
  { code: '462918305', batchId: 'b20', count: 38, primary: 'Garissa', others: ['Nairobi'], spanDays: 10 },
  { code: '375620194', batchId: 'b16', count: 27, primary: 'Mombasa', others: ['Malindi'], spanDays: 14 },
  { code: '914283570', batchId: 'b13', count: 19, primary: 'Kisumu', others: ['Kakamega'], spanDays: 9 },
  { code: '603175928', batchId: 'b23', count: 14, primary: 'Nakuru', others: ['Eldoret'], spanDays: 7 },
  { code: '281946037', batchId: 'b10', count: 9, primary: 'Mombasa', others: [], spanDays: 6 },
  { code: '157392846', batchId: 'b6', count: 7, primary: 'Nairobi', others: ['Nyeri'], spanDays: 5 },
];

// Hand-placed codes with a fixed number of normal checks
const FIXED: Array<{ code: string; batchId: string; count: number; location: string }> = [
  { code: '728194632', batchId: 'b10', count: 3, location: 'Mombasa' },
  { code: DEMO_CODES.genuine, batchId: 'b14', count: 0, location: 'Nairobi' },
  { code: '246813579', batchId: 'b2', count: 1, location: 'Nakuru' },
];

const rand = createRandom(20260926);
const now = Date.now();

function buildCodes(batches: ProductBatch[]): VerificationCode[] {
  const codes: VerificationCode[] = [];
  const used = new Set<string>();
  const special = [...FLAGGED, ...FIXED, { code: DEMO_CODES.deactivated, batchId: 'b18' }];
  special.forEach((s) => used.add(s.code));
  used.add(DEMO_CODES.invalid);

  for (const [bi, batch] of batches.entries()) {
    const batchCodes = special.filter((s) => s.batchId === batch.id).map((s) => s.code);
    while (batchCodes.length < SAMPLE_CODES_PER_BATCH) {
      const c = rand.code();
      if (!used.has(c)) {
        used.add(c);
        batchCodes.push(c);
      }
    }
    batchCodes.forEach((code, i) => {
      const deactivated =
        code === DEMO_CODES.deactivated || (bi % 5 === 0 && i === SAMPLE_CODES_PER_BATCH - 1) || batch.status === 'recalled';
      codes.push({
        code,
        batchId: batch.id,
        productId: batch.productId,
        manufacturerId: batch.manufacturerId,
        status: deactivated ? 'deactivated' : 'active',
        reviewStatus: null,
        verificationCount: 0,
        createdAt: batch.createdAt,
        lastVerifiedAt: null,
      });
    });
    batch.codeRange = { first: batchCodes[0]!, last: batchCodes[batchCodes.length - 1]! };
  }
  return codes;
}

type RawLog = Omit<Verification, 'id' | 'result' | 'countAtTime'>;

function buildVerifications(codes: VerificationCode[], threshold: number): Verification[] {
  const raw: RawLog[] = [];
  const byCode = new Map(codes.map((c) => [c.code, c]));
  const batchAgeDays = new Map(BATCHES.map((b) => [b.id, (now - new Date(b.createdAt).getTime()) / DAY]));

  const push = (code: string, time: number, location: string, phone = rand.phone()) => {
    const c = byCode.get(code);
    raw.push({
      code,
      productId: c?.productId ?? null,
      batchId: c?.batchId ?? null,
      manufacturerId: c?.manufacturerId ?? null,
      phone,
      location,
      timestamp: new Date(time).toISOString(),
      channel: 'sms',
    });
  };

  // 1. Suspicious (cloned) codes: many checks, clustered in one area
  for (const f of FLAGGED) {
    const phones = Array.from({ length: Math.ceil(f.count * 0.8) }, () => rand.phone());
    for (let i = 0; i < f.count; i++) {
      const daysBack = f.spanDays * Math.pow(rand.next(), 0.7);
      const location = f.others.length && rand.next() < 0.25 ? rand.pick(f.others) : f.primary;
      push(f.code, now - daysBack * DAY - rand.int(1, 60) * MINUTE, location, rand.pick(phones));
    }
  }
  // Latest attempt on the headline code happened a few minutes ago
  push('839274615', now - 4 * MINUTE, 'Nairobi');

  // 2. Fixed codes
  for (const f of FIXED) {
    for (let i = 0; i < f.count; i++) push(f.code, now - rand.int(2, 20) * DAY - rand.int(1, 600) * MINUTE, f.location);
  }

  // 3. Normal genuine checks: most codes are checked 0-2 times
  const skip = new Set([...FLAGGED.map((f) => f.code), ...FIXED.map((f) => f.code)]);
  const normalStart = raw.length;
  for (const c of codes) {
    if (skip.has(c.code) || c.status === 'deactivated') continue;
    const times = rand.weighted([0, 1, 2], [33, 48, 19]);
    const maxAge = Math.max(1, (batchAgeDays.get(c.batchId) ?? 30) - 1);
    for (let i = 0; i < times; i++) {
      const daysBack = Math.min(maxAge, 30 * Math.pow(rand.next(), 1.3));
      push(c.code, now - daysBack * DAY, rand.weighted(LOCATION_NAMES, LOCATION_WEIGHTS));
    }
  }
  // Make the recent-activity feed look live: move a few checks into the last hour or two
  const recentMinutes = [2, 9, 15, 23, 38, 51, 67, 88, 104, 131];
  recentMinutes.forEach((m, i) => {
    const log = raw[normalStart + i * 37];
    if (log) log.timestamp = new Date(now - m * MINUTE).toISOString();
  });

  // 4. Invalid codes: numbers that were never issued (fake packaging / typos)
  const invalidLocations = ['Garissa', 'Mombasa', 'Nairobi', 'Kisumu', 'Eldoret', 'Malindi', 'Lodwar'];
  for (let i = 0; i < 85; i++) {
    let fake = rand.code();
    while (byCode.has(fake)) fake = rand.code();
    push(fake, now - 30 * Math.pow(rand.next(), 1.1) * DAY, rand.weighted(invalidLocations, [7, 6, 6, 3, 2, 2, 1]));
  }
  for (let i = 0; i < 3; i++) push(DEMO_CODES.invalid, now - rand.int(1, 12) * DAY, 'Garissa');

  // Work out the result of each check in time order (same rule the backend will use)
  raw.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const counts = new Map<string, number>();
  const logs: Verification[] = raw.map((r, i) => {
    const count = (counts.get(r.code) ?? 0) + 1;
    counts.set(r.code, count);
    const c = byCode.get(r.code);
    if (c) {
      c.verificationCount = count;
      c.lastVerifiedAt = r.timestamp;
    }
    return {
      ...r,
      id: `v${String(i + 1).padStart(5, '0')}`,
      countAtTime: count,
      result: !c ? 'invalid' : count > threshold ? 'suspicious' : 'verified',
    };
  });

  return logs.reverse(); // newest first
}

export const GENERATED_CODES = buildCodes(BATCHES);
export const GENERATED_VERIFICATIONS = buildVerifications(GENERATED_CODES, DEFAULT_SUSPICIOUS_THRESHOLD);

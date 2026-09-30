/**
 * In-memory "database" for the prototype.
 * It is a copy of the seed data in src/data, so changes made during a demo
 * (new batches, status updates, simulated SMS) show up everywhere in the app.
 * Refreshing the browser resets it.
 *
 * With VITE_USE_MOCK_API=false this file is not used — the data lives in Supabase.
 */
import { BATCHES } from '../../data/batches';
import { GENERATED_CODES, GENERATED_VERIFICATIONS } from '../../data/generated';
import { MANUFACTURERS } from '../../data/manufacturers';
import { PRODUCTS } from '../../data/products';
import { REPORTS } from '../../data/reports';
import { DEFAULT_SETTINGS } from '../../data/users';

export const db = {
  manufacturers: structuredClone(MANUFACTURERS),
  products: structuredClone(PRODUCTS),
  batches: structuredClone(BATCHES),
  codes: structuredClone(GENERATED_CODES),
  verifications: structuredClone(GENERATED_VERIFICATIONS),
  reports: structuredClone(REPORTS),
  settings: structuredClone(DEFAULT_SETTINGS),
};

/** Simulates network latency so loading states are visible in the demo */
export function delay<T>(value: T, ms = 300 + Math.random() * 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));
}

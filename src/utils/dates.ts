const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** ISO string for "n days ago" (relative to when the app was loaded) */
export const daysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();
export const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * MINUTE).toISOString();
export const addDays = (iso: string, days: number) => new Date(new Date(iso).getTime() + days * DAY).toISOString();

/** "2026-09-21" style key for grouping by day (local time) */
export function dayKey(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export { MINUTE, DAY };

/**
 * Small seeded random generator so the mock data is the same every time
 * the app loads (important for a repeatable demo).
 */
export function createRandom(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)]!,
    /** Pick using weights, e.g. weighted(['a','b'], [3,1]) */
    weighted: <T,>(items: readonly T[], weights: readonly number[]): T => {
      const total = weights.reduce((s, w) => s + w, 0);
      let r = next() * total;
      for (let i = 0; i < items.length; i++) {
        r -= weights[i]!;
        if (r <= 0) return items[i]!;
      }
      return items[items.length - 1]!;
    },
    /** Random 9-digit verification code (never starts with 0) */
    code: () => String(Math.floor(next() * 900_000_000) + 100_000_000),
    /** Masked Kenyan mobile number, e.g. 0712 *** 481 */
    phone: () => {
      const prefix = ['0701', '0708', '0712', '0722', '0733', '0745', '0757', '0768', '0790', '0110'];
      return `${prefix[Math.floor(next() * prefix.length)]} *** ${String(Math.floor(next() * 900) + 100)}`;
    },
  };
}

/** Random generator for runtime use (new codes created during the demo) */
export const runtimeRandom = createRandom(Date.now());

// Small, dependency-free helpers for time-based animation.

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** Progress 0..1 of t through [a, b]. */
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const smooth = (x: number) => x * x * (3 - 2 * x);
export const easeIn = (x: number) => x * x;
export const easeOut = (x: number) => 1 - (1 - x) * (1 - x);
export const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
export const easeOutBack = (x: number) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
/** 0 → 1 → 0 bump over [a, b]. */
export const bump = (t: number, a: number, b: number) => Math.sin(seg(t, a, b) * Math.PI);
/** Whether t is inside [a, b). */
export const within = (t: number, a: number, b: number) => t >= a && t < b;
/** Parabolic hop height for progress x in 0..1. */
export const hop = (x: number, h = 1) => 4 * h * x * (1 - x);
export const TAU = Math.PI * 2;

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
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
    range: (a: number, b: number) => a + (b - a) * next(),
    int: (a: number, b: number) => Math.floor(a + (b - a + 1) * next()),
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
    sign: () => (next() < 0.5 ? -1 : 1),
  };
}
export type Rng = ReturnType<typeof rng>;

/** Piecewise linear-eased interpolation through [time, value] keys. */
export function keys(t: number, k: [number, number][], ease: (x: number) => number = smooth): number {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 0; i < k.length - 1; i++) {
    const [t0, v0] = k[i];
    const [t1, v1] = k[i + 1];
    if (t < t1) return lerp(v0, v1, ease(seg(t, t0, t1)));
  }
  return k[k.length - 1][1];
}

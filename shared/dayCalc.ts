// Day arithmetic. Days roll over at midnight Japan Standard Time (UTC+9, no DST).

export const DEFAULT_OUTAGE_START = "2026-11-04T00:00:00+09:00";
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function jstDayIndex(ms: number): number {
  return Math.floor((ms + JST_OFFSET_MS) / DAY_MS);
}

/** Day number (1-based) that `now` falls in. Never less than 1. */
export function currentDay(now: Date | number, outageStart: string = DEFAULT_OUTAGE_START): number {
  const nowMs = typeof now === "number" ? now : now.getTime();
  const startMs = Date.parse(outageStart);
  if (Number.isNaN(startMs)) throw new Error(`invalid OUTAGE_START: ${outageStart}`);
  return Math.max(1, jstDayIndex(nowMs) - jstDayIndex(startMs) + 1);
}

/** Milliseconds until the next JST midnight. */
export function msUntilRollover(now: Date | number): number {
  const nowMs = typeof now === "number" ? now : now.getTime();
  return (jstDayIndex(nowMs) + 1) * DAY_MS - JST_OFFSET_MS - nowMs;
}

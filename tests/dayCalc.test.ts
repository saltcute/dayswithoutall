import { describe, expect, it } from "vitest";
import { currentDay, msUntilRollover } from "../shared/dayCalc";

const START = "2026-11-12T00:00:00+09:00";

describe("currentDay", () => {
  it("is day 1 at the start instant", () => {
    expect(currentDay(new Date(START), START)).toBe(1);
  });
  it("rolls over at JST midnight, not UTC", () => {
    expect(currentDay(new Date("2026-11-12T23:59:59+09:00"), START)).toBe(1);
    expect(currentDay(new Date("2026-11-13T00:00:00+09:00"), START)).toBe(2);
    // 2026-11-12T15:00Z is 2026-11-13 00:00 JST
    expect(currentDay(new Date("2026-11-12T14:59:59Z"), START)).toBe(1);
    expect(currentDay(new Date("2026-11-12T15:00:00Z"), START)).toBe(2);
  });
  it("counts later days", () => {
    expect(currentDay(new Date("2026-11-18T12:00:00+09:00"), START)).toBe(7);
    expect(currentDay(new Date("2026-12-11T09:00:00+09:00"), START)).toBe(30);
    expect(currentDay(new Date("2026-12-16T09:00:00+09:00"), START)).toBe(35);
  });
  it("clamps to 1 before the outage", () => {
    expect(currentDay(new Date("2026-01-01T00:00:00Z"), START)).toBe(1);
  });
  it("supports a mid-day start (day 1 is still the calendar day of the start)", () => {
    const s = "2026-11-12T18:30:00+09:00";
    expect(currentDay(new Date("2026-11-12T23:00:00+09:00"), s)).toBe(1);
    expect(currentDay(new Date("2026-11-13T00:10:00+09:00"), s)).toBe(2);
  });
});

describe("msUntilRollover", () => {
  it("counts to next JST midnight", () => {
    expect(msUntilRollover(new Date("2026-11-12T23:00:00+09:00"))).toBe(3600_000);
  });
});

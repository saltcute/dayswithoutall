import { describe, expect, it } from "vitest";
import { parseWords, toWords } from "../shared/numberWords";

describe("numberWords", () => {
  it("renders canonical labels", () => {
    expect(toWords(1)).toBe("one");
    expect(toWords(7)).toBe("seven");
    expect(toWords(15)).toBe("fifteen");
    expect(toWords(20)).toBe("twenty");
    expect(toWords(21)).toBe("twentyone");
    expect(toWords(30)).toBe("thirty");
    expect(toWords(100)).toBe("onehundred");
    expect(toWords(112)).toBe("onehundredtwelve");
    expect(toWords(1000)).toBe("onethousand");
    expect(toWords(2026)).toBe("twothousandtwentysix");
  });

  it("round-trips 1..5000", () => {
    for (let n = 1; n <= 5000; n++) expect(parseWords(toWords(n))).toBe(n);
  });

  it("accepts hyphens and case", () => {
    expect(parseWords("twenty-one")).toBe(21);
    expect(parseWords("Thirty-Five")).toBe(35);
    expect(parseWords("one-hundred-twelve")).toBe(112);
  });

  it("labels stay valid DNS labels (<= 63 chars)", () => {
    for (let n = 1; n <= 10000; n++) expect(toWords(n).length).toBeLessThanOrEqual(63);
  });

  it("rejects garbage", () => {
    for (const bad of ["", "www", "zero", "onetwo", "hundred", "twentyten", "seventeenone", "ones", "fourty", "1"]) {
      expect(parseWords(bad)).toBeNull();
    }
  });

  it("throws on out-of-range input", () => {
    expect(() => toWords(0)).toThrow();
    expect(() => toWords(1.5)).toThrow();
  });
});

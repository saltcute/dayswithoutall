import { describe, expect, it } from "vitest";
import catalog from "../src/i18n/catalog.json";
import ja from "../src/i18n/locales/ja.json";
import zhHans from "../src/i18n/locales/zh-Hans.json";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const keys = Object.keys(catalog);

for (const [name, dict] of [["zh-Hans", zhHans], ["ja", ja]] as const) {
  describe(`locale ${name}`, () => {
    const d = dict as Record<string, string>;
    it("translates every catalog string", () => {
      const missing = keys.filter((k) => typeof d[k] !== "string" || !d[k].trim());
      expect(missing).toEqual([]);
    });
    it("keeps placeholders intact", () => {
      const bad = keys.filter((k) => d[k] !== undefined && placeholders(k).join() !== placeholders(d[k]).join());
      expect(bad).toEqual([]);
    });
    it("has no stale keys", () => {
      expect(Object.keys(d).filter((k) => !(k in catalog))).toEqual([]);
    });
  });
}

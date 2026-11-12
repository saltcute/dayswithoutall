import { describe, expect, it } from "vitest";
import worker, { type Env } from "../worker/index";

const SHELL = '<!doctype html><html lang="en"><head><title>x</title></head><body></body></html>';
const env = (now: string): Env => ({
  ASSETS: { fetch: async () => new Response(SHELL, { headers: { "Content-Type": "text/html" } }) } as unknown as Fetcher,
  OUTAGE_START: "2026-11-12T00:00:00+09:00",
  BASE_DOMAIN: "dayswithoutall.net",
  DEV_NOW: now,
});
const DAY10 = "2026-11-21T12:00:00+09:00";

async function get(host: string, path = "/", now = DAY10, headers: Record<string, string> = {}) {
  const req = new Request(`https://${host}${path}`, { headers: { host, ...headers } });
  return worker.fetch(req, env(now));
}

describe("worker routing", () => {
  it("redirects the apex and www to today", async () => {
    for (const h of ["dayswithoutall.net", "www.dayswithoutall.net"]) {
      const r = await get(h);
      expect(r.status).toBe(302);
      expect(r.headers.get("location")).toBe("https://ten.dayswithoutall.net/");
      expect(r.headers.get("cache-control")).toBe("no-store");
    }
  });
  it("redirects future days and garbage labels to today", async () => {
    for (const h of ["eleven.dayswithoutall.net", "onehundred.dayswithoutall.net", "foo.dayswithoutall.net"]) {
      const r = await get(h);
      expect(r.status).toBe(302);
      expect(r.headers.get("location")).toBe("https://ten.dayswithoutall.net/");
    }
  });
  it("canonicalizes hyphenated labels with a 301", async () => {
    const r = await get("twenty-one.dayswithoutall.net", "/", "2026-12-15T00:00:00+09:00");
    expect(r.status).toBe(301);
    expect(r.headers.get("location")).toBe("https://twentyone.dayswithoutall.net/");
  });
  it("serves past and current days with injected state", async () => {
    for (const [h, n] of [["one.dayswithoutall.net", 1], ["ten.dayswithoutall.net", 10]] as const) {
      const r = await get(h);
      expect(r.status).toBe(200);
      const html = await r.text();
      expect(html).toContain(`window.__DAY__=${n};window.__TODAY__=10;`);
      expect(html).toContain("<title>Day " + n + " without ALL.Net:");
    }
  });
  it("redirects stray paths on a day to its root", async () => {
    const r = await get("three.dayswithoutall.net", "/whatever");
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toBe("https://three.dayswithoutall.net/");
  });
  it("handles localhost subdomains with port for local dev", async () => {
    const r = await get("localhost:8799");
    expect(r.headers.get("location")).toBe("http://ten.localhost:8799/");
  });
  it("rejects unknown hosts", async () => {
    expect((await get("example.com")).status).toBe(404);
  });
  it("rolls over at JST midnight", async () => {
    const before = await get("dayswithoutall.net", "/", "2026-11-21T14:59:59Z");
    const after = await get("dayswithoutall.net", "/", "2026-11-21T15:00:00Z");
    expect(before.headers.get("location")).toBe("https://ten.dayswithoutall.net/");
    expect(after.headers.get("location")).toBe("https://eleven.dayswithoutall.net/");
  });
});

describe("worker locale", () => {
  const lang = async (headers: Record<string, string>, path = "/") => {
    const r = await get("five.dayswithoutall.net", path, DAY10, headers);
    const html = await r.text();
    return { lang: html.match(/<html lang="([^"]+)">/)?.[1], injected: html.match(/__LANG__="([^"]+)"/)?.[1], header: r.headers.get("content-language") };
  };
  it("defaults to English", async () => {
    expect(await lang({})).toEqual({ lang: "en", injected: "en", header: "en" });
  });
  it("follows Accept-Language", async () => {
    expect((await lang({ "accept-language": "ja-JP,ja;q=0.9,en;q=0.8" })).lang).toBe("ja");
    expect((await lang({ "accept-language": "zh-TW,zh;q=0.9" })).lang).toBe("zh-Hans");
  });
  it("prefers the cookie over Accept-Language, and ?lang over both", async () => {
    expect((await lang({ "accept-language": "ja", cookie: "lang=zh-Hans" })).lang).toBe("zh-Hans");
    expect((await lang({ "accept-language": "ja", cookie: "lang=zh-Hans" }, "/?lang=en")).lang).toBe("en");
  });
  it("keeps ?lang through redirects", async () => {
    const r = await get("dayswithoutall.net", "/?lang=ja");
    expect(r.headers.get("location")).toBe("https://ten.dayswithoutall.net/?lang=ja");
  });
});

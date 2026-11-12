// Locale negotiation + lookup shared by the Worker and the browser.
// Dictionaries map the ENGLISH source text to its translation (gettext style).
// Text containing numbers is also looked up in "templated" form, e.g.
// "count #1,204" -> key "count #{0}", so dynamic numbers need no extra code.

export const LOCALES = ["en", "zh-Hans", "ja"] as const;
export type Locale = (typeof LOCALES)[number];
export type Dict = Record<string, string>;

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  "zh-Hans": "简体中文",
  ja: "日本語",
};

/** Map any BCP-47 tag to a supported locale (all Chinese variants -> Simplified). */
export function normalizeLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  const t = tag.trim().toLowerCase();
  if (t.startsWith("zh")) return "zh-Hans";
  if (t === "ja" || t.startsWith("ja-")) return "ja";
  if (t === "en" || t.startsWith("en-")) return "en";
  return null;
}

/** Ordered language tags from an Accept-Language header. */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag: tag.trim(), q: q ? Number(q.slice(2)) || 0 : 1, i };
    })
    .filter((x) => x.tag && x.tag !== "*" && x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i)
    .map((x) => x.tag);
}

/** First supported locale among candidates, else English. */
export function negotiate(candidates: (string | null | undefined)[]): Locale {
  for (const c of candidates) {
    const l = normalizeLocale(c);
    if (l) return l;
  }
  return "en";
}

export function readCookie(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

const NUM = /\d(?:[\d,.]*\d)?/g;

/** "count #1,204 of 60" -> { key: "count #{0} of {1}", args: ["1,204", "60"] } */
export function templateKey(text: string): { key: string; args: string[] } | null {
  const args: string[] = [];
  const key = text.replace(NUM, (m) => `{${args.push(m) - 1}}`);
  return args.length ? { key, args } : null;
}

function fill(s: string, vars: Record<string, string | number> | string[]): string {
  return s.replace(/\{(\w+)\}/g, (m, k) => {
    const v = (vars as Record<string, string | number>)[k];
    return v === undefined ? m : String(v);
  });
}

/** Explicit lookup with optional named/positional variables. */
export function translate(dict: Dict, key: string, vars?: Record<string, string | number>): string {
  const s = dict[key] ?? key;
  return vars ? fill(s, vars) : s;
}

/** Lookup for arbitrary rendered text: exact match, then number-templated match, else unchanged. */
export function translateAuto(dict: Dict, text: string): string {
  const exact = dict[text];
  if (exact !== undefined) return exact;
  const tk = templateKey(text);
  if (tk) {
    const tpl = dict[tk.key];
    if (tpl !== undefined) return fill(tpl, tk.args);
  }
  return text;
}

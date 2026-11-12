// Browser-side i18n: picks the locale, loads its dictionary, and translates text.
// The engine calls trAuto() on every caption and canvas text, so scenes are
// translated without touching scene code (see AGENTS.md → Internationalization).
import { type Dict, type Locale, LOCALES, negotiate, readCookie, translate, translateAuto } from "../../shared/i18n";

export type { Locale };
export { LOCALES };

const loaders: Record<Exclude<Locale, "en">, () => Promise<{ default: Dict }>> = {
  "zh-Hans": () => import("./locales/zh-Hans.json"),
  ja: () => import("./locales/ja.json"),
};

let locale: Locale = "en";
let dict: Dict = {};

// ---- collection mode (scripts/i18n-extract.mjs) ----
const collecting = typeof location !== "undefined" && new URLSearchParams(location.search).has("i18nCollect");
let collectCtx = "ui";
const collected = new Map<string, Set<string>>();
if (collecting) (window as unknown as { __i18nKeys: typeof collected }).__i18nKeys = collected;
export function setCollectContext(ctx: string) {
  collectCtx = ctx;
}
function record(key: string) {
  if (!collecting || !/[A-Za-z]/.test(key)) return;
  let s = collected.get(key);
  if (!s) collected.set(key, (s = new Set()));
  s.add(collectCtx);
}
const NUM = /\d(?:[\d,.]*\d)?/g;

// ---- cookies (shared across all day subdomains) ----
function cookieDomain(): string {
  const suffix = (window.__HOST_SUFFIX__ ?? "").split(":")[0];
  return suffix && suffix !== "localhost" ? `; Domain=.${suffix}` : "";
}
export function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${cookieDomain()}`;
}
export function getCookie(name: string) {
  return readCookie(document.cookie, name);
}

/** Decide the locale and load its dictionary. Call before building any scene. */
export async function initLocale(): Promise<Locale> {
  const params = new URLSearchParams(location.search);
  const fromQuery = params.get("lang");
  if (fromQuery) setCookie("lang", negotiate([fromQuery]));
  locale = negotiate([fromQuery, window.__LANG__, getCookie("lang"), ...navigator.languages, navigator.language]);
  if (locale !== "en") {
    try {
      dict = (await loaders[locale]()).default;
    } catch (e) {
      console.error("failed to load translations", e);
      locale = "en";
      dict = {};
    }
  }
  document.documentElement.lang = locale;
  return locale;
}

export function getLocale() {
  return locale;
}

/** Persist a new locale and reload (scenes bake text into textures at build time). */
export function switchLocale(l: Locale) {
  setCookie("lang", l);
  const url = new URL(location.href);
  url.searchParams.delete("lang");
  location.replace(url.toString());
}

/** Explicit translation of a known key, with {named} variables. */
export function tr(key: string, vars?: Record<string, string | number>): string {
  record(key);
  return translate(dict, key, vars);
}

/** Translate arbitrary rendered text (exact, then with numbers templated). */
export function trAuto(text: string): string {
  if (!text) return text;
  if (collecting) record(text.replace(NUM, (() => { let i = 0; return () => `{${i++}}`; })()));
  return translateAuto(dict, text);
}

/** CJK font fallbacks in locale-appropriate order (Han glyph shapes differ between zh and ja). */
export function cjkFonts(): string {
  const sc = `'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Noto Sans SC', 'Source Han Sans SC', 'Alibaba PuHuiTi 3.0', 'WenQuanYi Micro Hei'`;
  const jp = `'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Meiryo', 'Noto Sans CJK JP', 'Noto Sans JP', 'Source Han Sans JP', 'Alibaba Sans JP'`;
  return locale === "ja" ? `${jp}, ${sc}` : `${sc}, ${jp}`;
}

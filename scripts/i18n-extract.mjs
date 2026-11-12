// Collect every translatable string by actually running each scene headlessly.
// Usage: npm run build && npx vite preview --port 4173 &  then  node scripts/i18n-extract.mjs
// Writes src/i18n/catalog.json: { "<English key>": ["day07", ...] } (UI strings tagged "ui").
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const base = process.argv.find((a) => a.startsWith("--url="))?.slice(6) ?? "http://localhost:4173";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage();
page.setDefaultTimeout(120_000);
await page.addInitScript(() => { window.__noAutoplay = true; });
const all = new Map();
for (let day = 1; day <= 31; day++) {
  // today=40 so every day (and both nav links) render
  await page.goto(`${base}/?day=${day}&today=40&lang=en&i18nCollect`);
  await page.waitForFunction(() => window.__ready === true);
  const entries = await page.evaluate(() => {
    const s = window.__stage;
    s.seek(s["duration"] - 0.01); // run every update + cue
    return [...window.__i18nKeys].map(([k, v]) => [k, [...v]]);
  });
  for (const [k, ctxs] of entries) {
    if (!all.has(k)) all.set(k, new Set());
    for (const c of ctxs) all.get(k).add(c);
  }
  process.stdout.write(`day ${day}: ${entries.length} strings\n`);
}
await browser.close();
// UI strings that only appear in states the extraction run never reaches.
const EXTRA_UI = ["Unmute", "NETWORK ERROR", "Even this page couldn't connect. Fitting."];
for (const k of EXTRA_UI) {
  if (!all.has(k)) all.set(k, new Set());
  all.get(k).add("ui");
}
const catalog = Object.fromEntries([...all].map(([k, v]) => [k, [...v].sort()]));
writeFileSync("src/i18n/catalog.json", JSON.stringify(catalog, null, 2) + "\n");
console.log(`catalog: ${all.size} unique strings -> src/i18n/catalog.json`);

// Render scenes headlessly and save screenshots to ./shots for visual review.
// Usage: node scripts/screenshots.mjs [days...] [--times=5,15,25] [--url=http://localhost:5173]
// Requires a running dev server (`npm run dev`) unless --url points elsewhere.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split("=")[1];
const base = opt("url", "http://localhost:5173");
const fracs = opt("times", "0.15,0.5,0.85").split(",").map(Number);
const days = args.filter((a) => !a.startsWith("--")).flatMap((a) => {
  const [x, y] = a.split("-").map(Number);
  return y ? Array.from({ length: y - x + 1 }, (_, i) => x + i) : [x];
});
if (!days.length) for (let i = 1; i <= 31; i++) days.push(i);

mkdirSync("shots", { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let failures = 0;
for (const day of days) {
  const errors = [];
  const onConsole = (m) => m.type() === "error" && errors.push(m.text());
  const onError = (e) => errors.push(String(e));
  page.on("console", onConsole);
  page.on("pageerror", onError);
  await page.goto(`${base}/?day=${day}&today=40`, { waitUntil: "load" });
  try {
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  } catch {
    errors.push("timeout waiting for scene");
  }
  // hide the start overlay without unlocking audio
  await page.evaluate(() => document.querySelector(".overlay")?.remove());
  const dur = await page.evaluate(() => window.__stage?.["duration"] ?? 30);
  for (const f of fracs) {
    const t = +(dur * f).toFixed(2);
    await page.evaluate((t) => window.__stage.seek(t), t);
    await page.screenshot({ path: `shots/day${String(day).padStart(2, "0")}-${String(t).padStart(5, "0")}.png` });
  }
  const blank = await page.evaluate(() => {
    const c = document.querySelector("#stage canvas");
    const g = c.getContext("webgl2", { preserveDrawingBuffer: true }) ?? c.getContext("webgl");
    return !g;
  });
  if (blank) errors.push("no WebGL context");
  console.log(`day ${day}: dur=${dur}s ${errors.length ? "ERRORS:\n  " + errors.join("\n  ") : "ok"}`);
  if (errors.length) failures++;
  page.off("console", onConsole);
  page.off("pageerror", onError);
}
await browser.close();
process.exit(failures ? 1 : 0);

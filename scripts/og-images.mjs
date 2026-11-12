// Render the social preview image (og:image / twitter:image) for each day into
// public/og/dayNN.jpg (1200x630). The worker points og:image at these files.
//
//   npm run build && npx vite preview --port 4173 &
//   node scripts/og-images.mjs            # all days with a scene, plus generic.jpg
//   node scripts/og-images.mjs 10 12-14 generic   # selected days
//
// Each image is one frame from the middle of the scene with the "DAY N" title
// card on top and the HUD and captions hidden. Pick a better frame for a day by
// adding it to FRAME (fraction of the scene's duration).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const FRAME = {}; // e.g. { 13: 0.6 }
const DEFAULT_FRAME = 0.45;

const args = process.argv.slice(2);
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split("=")[1];
const base = opt("url", "http://localhost:4173");
const outDir = opt("out", "public/og");
let days = args.filter((a) => !a.startsWith("--")).flatMap((a) => {
  if (a === "generic") return [a];
  const [x, y] = a.split("-").map(Number);
  return y ? Array.from({ length: y - x + 1 }, (_, i) => x + i) : [x];
});
const { SCENE_COUNT } = await import("../shared/sceneMeta.ts");
if (!days.length) days = [...Array.from({ length: SCENE_COUNT }, (_, i) => i + 1), "generic"];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
page.setDefaultTimeout(120_000);
await page.addInitScript(() => { window.__noAutoplay = true; });

let failures = 0;
for (const d of days) {
  // Any day past the last scene renders the generic fallback.
  const day = d === "generic" ? SCENE_COUNT + 1 : d;
  const name = d === "generic" ? "generic" : `day${String(d).padStart(2, "0")}`;
  try {
    await page.goto(`${base}/?day=${day}&today=${day}&lang=en`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 60_000 });
    await page.evaluate(() => document.querySelector(".overlay")?.remove());
    await page.addStyleTag({
      content:
        ".hud,.caption,.controls,.nav,.hint{display:none!important}" +
        // A soft scrim keeps the title readable over bright or busy scenes.
        ".titlecard{transition:none!important;background:radial-gradient(ellipse 60% 55% at 50% 50%,rgba(0,0,0,.6),rgba(0,0,0,0))}" +
        // The generic image is shared by every day past the last scene, so it gets no day number.
        (d === "generic" ? ".titlecard .d{display:none!important}" : ""),
    });
    const dur = await page.evaluate(() => window.__stage?.["duration"] ?? 30);
    await page.evaluate((t) => window.__stage.seek(t), +(dur * (FRAME[d] ?? DEFAULT_FRAME)).toFixed(2));
    await page.evaluate(() => document.querySelector(".titlecard")?.classList.add("show"));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${outDir}/${name}.jpg`, type: "jpeg", quality: 82 });
    console.log(`${name}: ok`);
  } catch (e) {
    failures++;
    console.log(`${name}: FAILED ${e.message.split("\n")[0]}`);
  }
}
await browser.close();
process.exit(failures ? 1 : 0);

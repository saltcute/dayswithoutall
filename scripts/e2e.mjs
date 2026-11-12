// End-to-end check through the Worker. Needs `npm run build` and
// `npx wrangler dev --env local --port 8799 --var DEV_NOW:2026-12-16T09:00:00+09:00` (today = day 35).
import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } }); // phone-sized
const errs = []; p.on("pageerror", e => errs.push(String(e))); p.on("console", m => m.type()==="error" && errs.push(m.text()));
await p.goto("http://localhost:8799/");
console.log("apex ->", p.url());
await p.goto("http://one.localhost:8799/");
await p.waitForFunction(() => window.__ready);
console.log("day1 prev?", await p.$(".nav .prev") !== null, "next href:", await p.getAttribute(".nav .next", "href"));
await p.click(".overlay .start");
await p.waitForTimeout(1500);
console.log("audio ctx:", await p.evaluate(() => window.__stage.sfx.ctx?.state), "t>0:", await p.evaluate(() => window.__stage.t > 0));
await p.click(".nav .next"); await p.waitForFunction(() => window.__ready);
console.log("after next ->", p.url(), "title:", await p.title());
await p.keyboard.press("ArrowLeft"); await p.waitForFunction(() => window.__ready);
console.log("after ArrowLeft ->", p.url());
await p.goto("http://thirtyfive.localhost:8799/"); await p.waitForFunction(() => window.__ready);
console.log("day35 next slot:", (await p.textContent(".nav .next")).trim(), "| archive note:", await p.$(".archive-note") !== null);
await p.goto("http://thirty.localhost:8799/"); await p.waitForFunction(() => window.__ready);
console.log("day30 next href:", await p.getAttribute(".nav .next", "href"));
const w = await p.evaluate(() => document.documentElement.scrollWidth);
console.log("no horizontal overflow:", w <= 390, "errors:", errs);
await p.screenshot({ path: "shots/mobile-day30.png" });
await b.close();

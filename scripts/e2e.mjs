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
console.log("no start screen on load:", await p.evaluate(() => document.querySelector(".overlay").classList.contains("hide")), "title card:", await p.isVisible(".titlecard.show"));
await p.waitForFunction(() => window.__ready);
console.log("day1 prev?", await p.$(".nav .prev") !== null, "next href:", await p.getAttribute(".nav .next", "href"));
// autoplay: starts by itself ~2 s after load, silently (no gesture yet)
await p.waitForTimeout(3000);
console.log("autoplayed:", await p.evaluate(() => window.__stage.playing && window.__stage.t > 0),
  "overlay hidden:", await p.evaluate(() => document.querySelector(".overlay").classList.contains("hide")),
  "sound hint shown:", await p.isVisible(".sound-hint"));
// jump to the end -> start screen returns with REPLAY
await p.evaluate(() => { const s = window.__stage; s.t = s["duration"] - 0.05; });
await p.waitForFunction(() => !window.__stage.playing);
console.log("ended -> overlay shown:", await p.evaluate(() => !document.querySelector(".overlay").classList.contains("hide")),
  "button:", (await p.textContent(".overlay .start")).trim());
await p.click(".overlay .start");
await p.waitForTimeout(800);
console.log("replay -> playing:", await p.evaluate(() => window.__stage.playing), "audio:", await p.evaluate(() => window.__stage.sfx.ctx?.state),
  "hint hidden:", !(await p.isVisible(".sound-hint")));
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

// ---- i18n: Accept-Language, picker, cookie shared across day subdomains ----
const b2 = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctxJa = await b2.newContext({ locale: "ja-JP" });
const q = await ctxJa.newPage();
const errs2 = []; q.on("pageerror", (e) => errs2.push(String(e)));
await q.goto("http://three.localhost:8799/");
await q.waitForFunction(() => window.__ready);
console.log("ja browser -> lang:", await q.evaluate(() => document.documentElement.lang), "| title:", await q.title(), "| hud:", (await q.textContent(".hud")).replace(/\s+/g, " ").trim());
await Promise.all([q.waitForNavigation(), q.selectOption("#lang", "zh-Hans")]);
await q.waitForFunction(() => window.__ready);
console.log("picked zh-Hans -> lang:", await q.evaluate(() => document.documentElement.lang), "| nav:", (await q.textContent(".nav")).replace(/\s+/g, " ").trim());
// Note: browsers refuse Domain=.localhost cookies, so the choice can't carry across *.localhost
// subdomains here. On the real domain the cookie is Domain=.dayswithoutall.net and it does.
console.log("errors:", errs2);
await b2.close();

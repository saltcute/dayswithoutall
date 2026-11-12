import "./style.css";
import { currentDay } from "../shared/dayCalc";
import { toWords } from "../shared/numberWords";
import { LOCALE_NAMES } from "../shared/i18n";
import { metaFor } from "../shared/sceneMeta";
import { Stage } from "./engine/stage";
import { getCookie, initLocale, LOCALES, type Locale, setCookie, setCollectContext, switchLocale, tr } from "./i18n";
import { loadScene } from "./scenes";

const params = new URLSearchParams(location.search);
const today = window.__TODAY__ ?? (Number(params.get("today")) || currentDay(Date.now()));
const day = Math.min(today, Math.max(1, window.__DAY__ ?? (Number(params.get("day")) || today)));
const hostSuffix = window.__HOST_SUFFIX__;

function urlFor(n: number) {
  if (hostSuffix) return `${location.protocol}//${toWords(n)}.${hostSuffix}/`;
  return `?day=${n}&today=${today}`; // plain `vite` dev server (no Worker)
}

const pad = (n: number) => String(n).padStart(2, "0");
const el = (html: string) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
/** Translate, escape, then swap {name} placeholders for raw HTML snippets. */
const trHtml = (key: string, html: Record<string, string>) => {
  const marks: Record<string, string> = {};
  for (const k of Object.keys(html)) marks[k] = `\u0000${k}\u0000`;
  let out = esc(tr(key, marks));
  for (const [k, v] of Object.entries(html)) out = out.replace(`\u0000${k}\u0000`, v);
  return out;
};

const locale = await initLocale();
const raw = metaFor(day);
const meta = { title: tr(raw.title), subtitle: tr(raw.subtitle) };

const app = document.getElementById("app")!;
document.title = tr("Day {n} without ALL.Net: {title}", { n: day, title: meta.title });

const stageEl = el(`<div id="stage" aria-hidden="true"></div>`);
const flashEl = el(`<div class="flash"></div>`);
const captionEl = el(`<div class="caption" role="status" aria-live="polite"></div>`);
const hud = el(`
  <div class="hud" role="heading" aria-level="1">
    <div class="stripe"></div>
    <div>${esc(tr("THIS ARCADE HAS GONE"))}<small>${esc(tr("without incident*"))}</small></div>
    <div class="num" aria-label="${esc(tr("{n} days", { n: day }))}">${pad(day)}</div>
    <div>${esc(tr("DAYS WITHOUT"))}<br>ALL.NET<small>${esc(tr("*the incident is ongoing"))}</small></div>
  </div>`);
const controls = el(`
  <div class="controls">
    <label class="lang-wrap" title="${esc(tr("Language"))}">
      <span aria-hidden="true">🌐</span>
      <select id="lang" aria-label="${esc(tr("Language"))}">
        ${LOCALES.map((l) => `<option value="${l}"${l === locale ? " selected" : ""}>${LOCALE_NAMES[l]}</option>`).join("")}
      </select>
    </label>
    <button class="icon-btn" id="replay" title="${esc(tr("Replay (R)"))}" aria-label="${esc(tr("Replay scene"))}">↻</button>
    <button class="icon-btn" id="mute" title="${esc(tr("Mute (M)"))}" aria-label="${esc(tr("Mute"))}">🔊</button>
  </div>`);
const nav = el(`
  <nav class="nav" aria-label="${esc(tr("Day navigation"))}">
    ${day > 1 ? `<a class="prev" href="${urlFor(day - 1)}" rel="prev">${esc(tr("◀ Day {n}", { n: day - 1 }))}</a>` : `<span class="slot"></span>`}
    <div class="cur"><b>${esc(tr("DAY {n}", { n: day }))}</b><i>${esc(meta.title)}</i></div>
    ${day < today ? `<a class="next" href="${urlFor(day + 1)}" rel="next">${esc(tr("Day {n} ▶", { n: day + 1 }))}</a>` : `<span class="slot next live">${esc(tr("● LIVE"))}</span>`}
  </nav>`);
const titlecard = el(`
  <div class="titlecard"><div class="inner">
    <div class="d">${esc(tr("DAY {n}", { n: day }))}</div><div class="t">${esc(meta.title)}</div><div class="s">${esc(meta.subtitle)}</div>
  </div></div>`);
const overlay = el(`
  <div class="overlay hide ended" aria-hidden="true"><div class="box">
    <div class="eyebrow">${esc(tr("● ALL.Net status: unreachable"))}</div>
    <h1>${trHtml("Day {n}:", { n: `<span>${day}</span>` })}<br>${esc(meta.title)}</h1>
    <p>${esc(meta.subtitle)}</p>
    <button class="start" aria-label="${esc(tr("Replay scene"))}">${esc(tr("↻ REPLAY"))}</button>
    <div class="fine">${esc(tr("Sound on for maximum despair. Fan-made parody; not affiliated with SEGA."))}</div>
  </div></div>`);

app.append(stageEl, flashEl, titlecard, captionEl, hud, controls, nav, overlay);
if (day < today)
  app.append(el(`<div class="archive-note">${trHtml("📜 Archive. It is now {link}", { link: `<a href="${urlFor(today)}">${esc(tr("Day {n} →", { n: today }))}</a>` })}</div>`));

controls.querySelector<HTMLSelectElement>("#lang")!.onchange = (e) => switchLocale((e.target as HTMLSelectElement).value as Locale);

const stage = new Stage(stageEl, captionEl, flashEl);
window.__stage = stage;

// Mute preference lives in a cookie so it carries across all day subdomains.
let muted = getCookie("muted") === "1";
const muteBtn = controls.querySelector<HTMLButtonElement>("#mute")!;
const applyMute = () => {
  stage.sfx.setMuted(muted);
  muteBtn.textContent = muted ? "🔇" : "🔊";
  muteBtn.setAttribute("aria-label", tr(muted ? "Unmute" : "Mute"));
};
applyMute();
muteBtn.onclick = () => {
  muted = !muted;
  setCookie("muted", muted ? "1" : "0");
  applyMute();
};

const showTitle = () => {
  titlecard.classList.add("show");
  setTimeout(() => titlecard.classList.remove("show"), 3600);
};

// ---- Playback: autoplay after a short delay (no blocking start screen), play once,
// then show the title screen with "Replay" ----
const AUTOPLAY_DELAY_MS = 2000;
const startBtn = overlay.querySelector<HTMLButtonElement>(".start")!;
const soundHint = el(`<button class="sound-hint" hidden>${esc(tr("🔈 Click anywhere for sound"))}</button>`);
app.append(soundHint);
let loaded = false;
let pendingStart = false;
let autoplayTimer: number | undefined;

function unlockAudio() {
  stage.sfx.unlock();
  soundHint.hidden = true;
}
// Browsers only allow sound after a user gesture; the first one anywhere turns it on.
for (const ev of ["pointerdown", "keydown", "touchstart"] as const)
  addEventListener(ev, () => unlockAudio(), { once: true, capture: true });

function play(withGesture: boolean, title = true) {
  if (!loaded) {
    pendingStart = true;
    return;
  }
  clearTimeout(autoplayTimer);
  if (withGesture) unlockAudio();
  else if (!stage.sfx.ready) soundHint.hidden = false;
  overlay.classList.add("hide");
  overlay.setAttribute("aria-hidden", "true");
  stage.restart();
  stage.play();
  if (title) showTitle();
}

function showEndScreen() {
  stage.sfx.suspend();
  titlecard.classList.remove("show");
  captionEl.classList.remove("show");
  soundHint.hidden = true;
  overlay.classList.remove("hide");
  overlay.removeAttribute("aria-hidden");
  startBtn.focus({ preventScroll: true });
}
stage.onEnd = showEndScreen;

startBtn.onclick = () => play(true);
soundHint.onclick = () => unlockAudio();
controls.querySelector<HTMLButtonElement>("#replay")!.onclick = () => play(true);

addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.key === "ArrowLeft" && day > 1) location.href = urlFor(day - 1);
  else if (e.key === "ArrowRight" && day < today) location.href = urlFor(day + 1);
  else if (e.key === "m" || e.key === "M") muteBtn.click();
  else if (e.key === "r" || e.key === "R") play(true);
});

setCollectContext(`day${pad(day)}`);
loadScene(day)
  .then(async (def) => {
    await stage.load(def, day, today);
    // The opening frame is already rendered; show the title card over it while we wait.
    loaded = true;
    window.__ready = true;
    if (pendingStart) play(true);
    else if (!window.__noAutoplay) {
      showTitle();
      if (!stage.sfx.ready) soundHint.hidden = false;
      autoplayTimer = window.setTimeout(() => play(false, false), AUTOPLAY_DELAY_MS);
    }
  })
  .catch((err) => {
    console.error(err);
    app.append(el(`<div class="fatal"><div><h2>${esc(tr("NETWORK ERROR"))}</h2><p>${esc(tr("Even this page couldn't connect. Fitting."))}</p></div></div>`));
  });

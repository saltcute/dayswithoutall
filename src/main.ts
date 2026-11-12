import "./style.css";
import { currentDay } from "../shared/dayCalc";
import { toWords } from "../shared/numberWords";
import { metaFor } from "../shared/sceneMeta";
import { Stage } from "./engine/stage";
import { loadScene } from "./scenes";

declare global {
  interface Window {
    __DAY__?: number;
    __TODAY__?: number;
    __HOST_SUFFIX__?: string;
    __stage?: Stage;
    __ready?: boolean;
    /** Set by test scripts to keep the start screen up. */
    __noAutoplay?: boolean;
  }
}

const params = new URLSearchParams(location.search);
const today = window.__TODAY__ ?? (Number(params.get("today")) || currentDay(Date.now()));
const day = Math.min(today, Math.max(1, window.__DAY__ ?? (Number(params.get("day")) || today)));
const hostSuffix = window.__HOST_SUFFIX__;

function urlFor(n: number) {
  if (hostSuffix) return `${location.protocol}//${toWords(n)}.${hostSuffix}/`;
  return `?day=${n}&today=${today}`; // plain `vite` dev server (no Worker)
}

const pad = (n: number) => String(n).padStart(2, "0");
const meta = metaFor(day);
const el = (html: string) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const app = document.getElementById("app")!;
document.title = `Day ${day} without ALL.Net: ${meta.title}`;

const stageEl = el(`<div id="stage" aria-hidden="true"></div>`);
const flashEl = el(`<div class="flash"></div>`);
const captionEl = el(`<div class="caption" role="status" aria-live="polite"></div>`);
const hud = el(`
  <div class="hud" role="heading" aria-level="1">
    <div class="stripe"></div>
    <div>THIS ARCADE HAS GONE<small>without incident*</small></div>
    <div class="num" aria-label="${day} days">${pad(day)}</div>
    <div>DAYS WITHOUT<br>ALL.NET<small>*the incident is ongoing</small></div>
  </div>`);
const controls = el(`
  <div class="controls">
    <button class="icon-btn" id="replay" title="Replay (R)" aria-label="Replay scene">↻</button>
    <button class="icon-btn" id="mute" title="Mute (M)" aria-label="Mute">🔊</button>
  </div>`);
const nav = el(`
  <nav class="nav" aria-label="Day navigation">
    ${day > 1 ? `<a class="prev" href="${urlFor(day - 1)}" rel="prev">◀ Day ${day - 1}</a>` : `<span class="slot"></span>`}
    <div class="cur"><b>DAY ${day}</b><i>${esc(meta.title)}</i></div>
    ${day < today ? `<a class="next" href="${urlFor(day + 1)}" rel="next">Day ${day + 1} ▶</a>` : `<span class="slot next live">● LIVE</span>`}
  </nav>`);
const titlecard = el(`
  <div class="titlecard"><div class="inner">
    <div class="d">DAY ${day}</div><div class="t">${esc(meta.title)}</div><div class="s">${esc(meta.subtitle)}</div>
  </div></div>`);
const overlay = el(`
  <div class="overlay"><div class="box">
    <div class="eyebrow">● ALL.Net status: unreachable</div>
    <h1>Day <span>${day}</span>:<br>${esc(meta.title)}</h1>
    <p>${esc(meta.subtitle)}</p>
    <button class="start" autofocus>▶ ENTER THE ARCADE</button>
    <div class="autoplay-note">Starting automatically…</div>
    <div class="fine">Sound on for maximum despair. Fan-made parody; not affiliated with SEGA.</div>
  </div></div>`);

app.append(stageEl, flashEl, titlecard, captionEl, hud, controls, nav, overlay);
if (day < today) app.append(el(`<div class="archive-note">📜 Archive. It is now <a href="${urlFor(today)}">Day ${today} →</a></div>`));

const stage = new Stage(stageEl, captionEl, flashEl);
window.__stage = stage;

let muted = false;
try {
  muted = localStorage.getItem("dwa:muted") === "1";
} catch {
  /* storage unavailable */
}
const muteBtn = controls.querySelector<HTMLButtonElement>("#mute")!;
const applyMute = () => {
  stage.sfx.setMuted(muted);
  muteBtn.textContent = muted ? "🔇" : "🔊";
  muteBtn.setAttribute("aria-label", muted ? "Unmute" : "Mute");
};
applyMute();
muteBtn.onclick = () => {
  muted = !muted;
  try {
    localStorage.setItem("dwa:muted", muted ? "1" : "0");
  } catch {
    /* ignore */
  }
  applyMute();
};

const showTitle = () => {
  titlecard.classList.add("show");
  setTimeout(() => titlecard.classList.remove("show"), 3600);
};

// ---- Playback: autoplay after a short delay, play once, then show the start screen with "Replay" ----
const AUTOPLAY_DELAY_MS = 2000;
const startBtn = overlay.querySelector<HTMLButtonElement>(".start")!;
const soundHint = el(`<button class="sound-hint" hidden>🔈 Click anywhere for sound</button>`);
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

function play(withGesture: boolean) {
  if (!loaded) {
    pendingStart = true;
    return;
  }
  clearTimeout(autoplayTimer);
  if (withGesture) unlockAudio();
  else if (!stage.sfx.ready) soundHint.hidden = false;
  overlay.classList.add("hide");
  stage.restart();
  stage.play();
  showTitle();
}

function showEndScreen() {
  stage.sfx.suspend();
  titlecard.classList.remove("show");
  captionEl.classList.remove("show");
  soundHint.hidden = true;
  overlay.classList.add("ended");
  startBtn.textContent = "↻ REPLAY";
  startBtn.setAttribute("aria-label", "Replay scene");
  overlay.classList.remove("hide");
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

loadScene(day)
  .then(async (def) => {
    await stage.load(def, day, today);
    // Render a mid-scene still behind the start screen.
    stage.seek(def.duration * 0.35);
    loaded = true;
    window.__ready = true;
    if (pendingStart) play(true);
    else if (!window.__noAutoplay) autoplayTimer = window.setTimeout(() => play(false), AUTOPLAY_DELAY_MS);
  })
  .catch((err) => {
    console.error(err);
    app.append(el(`<div class="fatal"><div><h2>NETWORK ERROR</h2><p>Even this page couldn't connect. Fitting.</p></div></div>`));
  });

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
controls.querySelector<HTMLButtonElement>("#replay")!.onclick = () => {
  stage.restart();
  showTitle();
};

addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.key === "ArrowLeft" && day > 1) location.href = urlFor(day - 1);
  else if (e.key === "ArrowRight" && day < today) location.href = urlFor(day + 1);
  else if (e.key === "m" || e.key === "M") muteBtn.click();
  else if (e.key === "r" || e.key === "R") stage.restart();
});

let started = false;
function start() {
  if (started) return;
  started = true;
  stage.sfx.unlock();
  overlay.classList.add("hide");
  setTimeout(() => overlay.remove(), 600);
  stage.restart();
  stage.play();
  showTitle();
}
overlay.querySelector<HTMLButtonElement>(".start")!.onclick = start;

loadScene(day)
  .then(async (def) => {
    await stage.load(def, day, today);
    // Render a mid-scene still behind the start overlay.
    stage.seek(def.duration * 0.35);
    window.__ready = true;
  })
  .catch((err) => {
    console.error(err);
    app.append(el(`<div class="fatal"><div><h2>NETWORK ERROR</h2><p>Even this page couldn't connect. Fitting.</p></div></div>`));
  });

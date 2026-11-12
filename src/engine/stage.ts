import * as THREE from "three";
import { Sfx } from "../audio/sfx";
import { lerp, seg, smooth } from "./math";

export type V3 = [number, number, number];

export interface CamKey {
  t: number;
  pos: V3;
  look: V3;
  fov?: number;
  /** easing into this key (default smooth) */
  ease?: (x: number) => number;
}

/** Everything a scene's build() receives. */
export interface SceneCtx {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  sfx: Sfx;
  day: number;
  today: number;
  mobile: boolean;
  duration: number;
  /** Per-frame callback. t = seconds into the current loop; dt = frame delta. */
  update(fn: (t: number, dt: number) => void): void;
  /** Fire fn once per loop when t crosses `time` (sound cues, state resets). */
  at(time: number, fn: () => void): void;
  /** Show narration text from `time` for `dur` seconds. */
  caption(time: number, text: string, dur?: number): void;
  /** Camera path through keyframes (eased between consecutive keys). */
  cameraPath(keys: CamKey[]): void;
  /** Camera shake starting at `time`. */
  shake(time: number, strength?: number, dur?: number): void;
  /** Full-screen color flash at `time`. */
  flash(time: number, color?: string, dur?: number): void;
  /** Called at the start of every loop (including the first). */
  onLoop(fn: () => void): void;
}

export interface SceneDef {
  /** Loop length in seconds. */
  duration: number;
  build(ctx: SceneCtx): void | Promise<void>;
}

interface Caption {
  at: number;
  text: string;
  dur: number;
}

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
  readonly sfx = new Sfx();
  t = 0;
  loopCount = 0;
  playing = false;
  /** Loop forever (true) or stop at the end and call onEnd (false). */
  loop = false;
  onEnd?: () => void;
  private duration = 30;
  private updaters: ((t: number, dt: number) => void)[] = [];
  private cues: { at: number; fn: () => void }[] = [];
  private loopFns: (() => void)[] = [];
  private captions: Caption[] = [];
  private camKeys: CamKey[] = [];
  private shakes: { at: number; s: number; dur: number }[] = [];
  private flashes: { at: number; color: string; dur: number }[] = [];
  private lastFrame = 0;
  private activeCaption: Caption | null = null;
  private lookTmp = new THREE.Vector3();
  readonly mobile: boolean;

  constructor(
    private host: HTMLElement,
    private captionEl: HTMLElement,
    private flashEl: HTMLElement,
  ) {
    this.mobile = matchMedia("(max-width: 700px), (pointer: coarse)").matches;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.mobile ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);
    this.resize();
    addEventListener("resize", () => this.resize());
    this.camera.position.set(0, 3, 10);
  }

  ctx(day: number, today: number): SceneCtx {
    return {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      sfx: this.sfx,
      day,
      today,
      mobile: this.mobile,
      duration: this.duration,
      update: (fn) => this.updaters.push(fn),
      at: (at, fn) => this.cues.push({ at, fn }),
      caption: (at, text, dur = 4) => this.captions.push({ at, text, dur }),
      cameraPath: (keys) => (this.camKeys = [...keys].sort((a, b) => a.t - b.t)),
      shake: (at, s = 0.3, dur = 0.6) => this.shakes.push({ at, s, dur }),
      flash: (at, color = "#fff", dur = 0.4) => this.flashes.push({ at, color, dur }),
      onLoop: (fn) => this.loopFns.push(fn),
    };
  }

  async load(def: SceneDef, day: number, today: number) {
    this.duration = def.duration;
    await def.build(this.ctx(day, today));
    this.cues.sort((a, b) => a.at - b.at);
    this.captions.sort((a, b) => a.at - b.at);
    this.restart();
    this.renderFrame(0);
  }

  restart() {
    this.t = 0;
    this.loopFns.forEach((f) => f());
    this.fireCues(-1, 0);
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    this.lastFrame = performance.now();
    const tick = (now: number) => {
      if (!this.playing) return;
      const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
      this.lastFrame = now;
      this.advance(dt);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /** Advance by dt seconds. `draw=false` updates state without rendering (used by seek). */
  advance(dt: number, draw = true) {
    const prev = this.t;
    let next = prev + dt;
    if (next >= this.duration && !this.loop) {
      // Play once: finish the last frame, then stop.
      this.fireCues(prev, this.duration + 1);
      this.t = this.duration - 1e-3;
      this.renderFrame(dt, draw);
      this.playing = false;
      this.onEnd?.();
      return;
    }
    if (next >= this.duration) {
      this.fireCues(prev, this.duration + 1);
      next -= this.duration;
      this.loopCount++;
      this.loopFns.forEach((f) => f());
      this.fireCues(-1, next);
    } else {
      this.fireCues(prev, next);
    }
    this.t = next;
    this.renderFrame(dt, draw);
  }

  /** Jump directly to time t (used by tests/screenshots). */
  seek(t: number) {
    this.restart();
    const step = 1 / 30;
    while (this.t + step < t) this.advance(step, false);
    this.renderFrame(0, true);
  }

  private fireCues(from: number, to: number) {
    for (const c of this.cues) if (c.at > from && c.at <= to) c.fn();
  }

  private renderFrame(dt: number, draw = true) {
    const t = this.t;
    for (const u of this.updaters) u(t, dt);
    if (!draw) return;
    this.updateCamera(t);
    this.updateCaption(t);
    this.updateFlash(t);
    this.renderer.render(this.scene, this.camera);
  }

  private updateCamera(t: number) {
    const k = this.camKeys;
    if (k.length) {
      let a = k[0], b = k[0], p = 0;
      if (t >= k[k.length - 1].t) a = b = k[k.length - 1];
      else
        for (let i = 0; i < k.length - 1; i++) {
          if (t >= k[i].t && t < k[i + 1].t) {
            a = k[i];
            b = k[i + 1];
            p = (b.ease ?? smooth)(seg(t, a.t, b.t));
            break;
          }
        }
      this.camera.position.set(lerp(a.pos[0], b.pos[0], p), lerp(a.pos[1], b.pos[1], p), lerp(a.pos[2], b.pos[2], p));
      this.lookTmp.set(lerp(a.look[0], b.look[0], p), lerp(a.look[1], b.look[1], p), lerp(a.look[2], b.look[2], p));
      const fov = lerp(a.fov ?? 50, b.fov ?? 50, p);
      if (Math.abs(this.camera.fov - fov) > 1e-3) {
        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();
      }
      this.camera.lookAt(this.lookTmp);
    }
    for (const s of this.shakes) {
      if (t >= s.at && t < s.at + s.dur) {
        const k2 = (1 - (t - s.at) / s.dur) * s.s;
        this.camera.position.x += (Math.random() - 0.5) * k2;
        this.camera.position.y += (Math.random() - 0.5) * k2;
      }
    }
  }

  private updateCaption(t: number) {
    const c = this.captions.find((c) => t >= c.at && t < c.at + c.dur) ?? null;
    if (c !== this.activeCaption) {
      this.activeCaption = c;
      if (c) {
        this.captionEl.textContent = c.text;
        this.captionEl.classList.remove("show");
        void this.captionEl.offsetWidth;
        this.captionEl.classList.add("show");
        this.sfx.blip();
      } else this.captionEl.classList.remove("show");
    }
  }

  private updateFlash(t: number) {
    let op = 0;
    for (const f of this.flashes) {
      if (t >= f.at && t < f.at + f.dur) {
        op = Math.max(op, 1 - (t - f.at) / f.dur);
        this.flashEl.style.background = f.color;
      }
    }
    this.flashEl.style.opacity = String(op);
  }

  private resize() {
    const w = this.host.clientWidth || innerWidth;
    const h = this.host.clientHeight || innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    // Keep horizontal framing on portrait screens.
    this.camera.zoom = w / h < 1 ? Math.max(0.55, w / h) : 1;
    this.camera.updateProjectionMatrix();
  }
}

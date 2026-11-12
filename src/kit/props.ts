import * as THREE from "three";
import { box, glow, mat, mesh } from "../engine/materials";
import { rng } from "../engine/math";
import { textPlane, type TextStyle } from "../engine/textTexture";

// ---------- currency & cards ----------

const coinGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.015, 10);
export function coin() {
  const m = mesh(coinGeo, mat(0xffc93c, { emissive: 0x3a2a00 }));
  return m;
}

export function coinPile(n: number, seed = 1, radius = 0.25) {
  const g = new THREE.Group();
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const c = coin();
    const a = r.range(0, Math.PI * 2);
    const d = Math.sqrt(r.next()) * radius * (1 - i / n);
    c.position.set(Math.cos(a) * d, 0.01 + (i / n) * radius * 0.8, Math.sin(a) * d);
    c.rotation.set(r.range(-0.3, 0.3), 0, r.range(-0.3, 0.3));
    g.add(c);
  }
  return g;
}

const CARD_COLORS = [0x3a86ff, 0xff006e, 0xffbe0b, 0x8338ec, 0x06d6a0, 0xfb5607];
const cardGeo = new THREE.BoxGeometry(0.34, 0.01, 0.22);
let cardIdx = 0;
/** An arcade IC card. Without a color, cycles through CARD_COLORS deterministically. */
export function card(color?: number) {
  const c = mesh(cardGeo, mat(color ?? CARD_COLORS[cardIdx++ % CARD_COLORS.length]));
  const stripe = mesh(new THREE.BoxGeometry(0.34, 0.012, 0.04), mat(0xffffff), false, false);
  stripe.position.z = -0.06;
  c.add(stripe);
  return c;
}
export { CARD_COLORS };

// ---------- fire & light ----------

export interface Fire {
  group: THREE.Group;
  light: THREE.PointLight;
  update(t: number): void;
}

export function campfire(scale = 1): Fire {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const log = box(0.08, 0.08, 0.7, 0x5c3a1e);
    log.rotation.y = (i / 5) * Math.PI;
    log.position.y = 0.05;
    g.add(log);
  }
  for (let i = 0; i < 7; i++) {
    const rock = mesh(new THREE.DodecahedronGeometry(0.12, 0), mat(0x777777));
    const a = (i / 7) * Math.PI * 2;
    rock.position.set(Math.cos(a) * 0.45, 0.06, Math.sin(a) * 0.45);
    g.add(rock);
  }
  const flames: THREE.Mesh[] = [];
  [0xff4500, 0xff8c00, 0xffd23f].forEach((c, i) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.25 - i * 0.06, 0.7 - i * 0.15, 5), glow(c, 0.9));
    f.position.y = 0.38 - i * 0.05;
    flames.push(f);
    g.add(f);
  });
  const light = new THREE.PointLight(0xff8c3a, 6 * scale, 9 * scale, 1.6);
  light.position.y = 0.8;
  light.castShadow = false;
  g.add(light);
  g.scale.setScalar(scale);
  return {
    group: g,
    light,
    update(t) {
      flames.forEach((f, i) => {
        f.scale.set(1 + Math.sin(t * 13 + i) * 0.1, 1 + Math.sin(t * 17 + i * 2) * 0.2, 1 + Math.cos(t * 11 + i) * 0.1);
        f.rotation.y = t * (1 + i);
      });
      light.intensity = (5 + Math.sin(t * 20) * 0.8 + Math.sin(t * 7.3) * 0.6) * scale;
    },
  };
}

export function candle() {
  const g = new THREE.Group();
  g.add(box(0.05, 0.14, 0.05, 0xfff3d6, 0, 0.07, 0));
  const fl = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 4), glow(0xffb703));
  fl.position.y = 0.18;
  g.add(fl);
  const l = new THREE.PointLight(0xffb347, 1.2, 3, 2);
  l.position.y = 0.25;
  g.add(l);
  return Object.assign(g, { flame: fl, light: l });
}

export function torch() {
  const g = new THREE.Group();
  g.add(box(0.06, 1.2, 0.06, 0x5c3a1e, 0, 0.6, 0));
  const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 5), glow(0xff8c00));
  f.position.y = 1.35;
  g.add(f);
  const l = new THREE.PointLight(0xff8c3a, 2.5, 6, 1.8);
  l.position.y = 1.4;
  g.add(l);
  return Object.assign(g, { flame: f, light: l });
}

export function glowstick(color = 0x39ff14) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25, 6), glow(color));
  return m;
}

// ---------- furniture & structures ----------

export function table(w = 1.2, d = 0.7, color = 0x8b5a2b) {
  const g = new THREE.Group();
  g.add(box(w, 0.06, d, color, 0, 0.75, 0));
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) g.add(box(0.06, 0.75, 0.06, color, (x * (w - 0.1)) / 2, 0.375, (z * (d - 0.1)) / 2));
  return g;
}

export function bench(w = 1.6, color = 0x6b4423) {
  const g = new THREE.Group();
  g.add(box(w, 0.06, 0.35, color, 0, 0.45, 0));
  for (const x of [-1, 1]) g.add(box(0.06, 0.45, 0.3, color, (x * (w - 0.15)) / 2, 0.225, 0));
  return g;
}

export function stool(color = 0xd62828) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 8), mat(color)));
  g.children[0].position.y = 0.5;
  g.add(box(0.05, 0.5, 0.05, 0x555555, 0, 0.25, 0));
  return g;
}

export function crate(s = 0.6, color = 0xa0703c) {
  const g = new THREE.Group();
  g.add(box(s, s, s, color, 0, s / 2, 0));
  g.add(box(s * 1.02, s * 0.12, s * 1.02, 0x6b4423, 0, s * 0.85, 0));
  g.add(box(s * 1.02, s * 0.12, s * 1.02, 0x6b4423, 0, s * 0.15, 0));
  return g;
}

export function cardboardBox(w = 0.6, h = 0.5, d = 0.5) {
  const g = new THREE.Group();
  g.add(box(w, h, d, 0xc19a6b, 0, h / 2, 0));
  g.add(box(w * 1.01, 0.04, 0.08, 0xd9c4a0, 0, h, 0));
  return g;
}

export function plank(len = 1.6, color = 0x8b5a2b) {
  return box(len, 0.18, 0.05, color);
}

/** Boarded-up window/door: crossed planks. */
export function barricade(w = 2, h = 2) {
  const g = new THREE.Group();
  const r = rng(Math.floor(w * 100 + h));
  for (let i = 0; i < 5; i++) {
    const p = plank(w * 1.1, r.pick([0x8b5a2b, 0x7a4e24, 0x9c6b3a]));
    p.position.set(0, (i / 4 - 0.5) * h * 0.85 + h / 2, 0);
    p.rotation.z = r.range(-0.35, 0.35);
    g.add(p);
  }
  return g;
}

export function sign(lines: string | string[], w = 1.4, h = 0.8, style: TextStyle = {}, post = true) {
  const g = new THREE.Group();
  const p = textPlane(lines, w, h, { bg: "#f4ecd8", fg: "#2b2b2b", size: 44, ...style });
  p.position.y = post ? 1.4 : 0;
  g.add(p);
  if (post) g.add(box(0.07, 1.4 - h / 2 + 0.05, 0.05, 0x6b4423, 0, (1.4 - h / 2) / 2, -0.03));
  return Object.assign(g, { plane: p });
}

/** Hand-held placard (attach to player.handR / handL). */
export function placard(lines: string | string[], w = 0.9, h = 0.6, style: TextStyle = {}) {
  const g = new THREE.Group();
  const p = textPlane(lines, w, h, { bg: "#ffffff", fg: "#c1121f", size: 44, ...style });
  p.position.y = 0.75;
  g.add(p);
  g.add(box(0.04, 0.8, 0.04, 0x6b4423, 0, 0.3, -0.02));
  return Object.assign(g, { plane: p });
}

export function banner(text: string, color = "#e63946", w = 1, h = 1.6) {
  const g = new THREE.Group();
  g.add(box(0.06, h + 1.2, 0.06, 0x555555, 0, (h + 1.2) / 2, 0));
  const p = textPlane(text, w, h, { bg: color, fg: "#fff", size: 60 });
  p.position.set(w / 2 + 0.03, h / 2 + 1.1, 0);
  g.add(p);
  return Object.assign(g, { flag: p });
}

export function radio() {
  const g = new THREE.Group();
  g.add(box(0.5, 0.3, 0.18, 0x6b4f3a, 0, 0.15, 0));
  const grill = mesh(new THREE.CircleGeometry(0.09, 8), mat(0x222222));
  grill.position.set(-0.12, 0.15, 0.091);
  g.add(grill);
  g.add(box(0.15, 0.06, 0.01, glow(0xffb703), 0.12, 0.2, 0.091));
  const ant = box(0.01, 0.5, 0.01, 0xaaaaaa, 0.2, 0.5, 0);
  ant.rotation.z = -0.3;
  g.add(ant);
  return g;
}

export function altar(w = 2.2) {
  const g = new THREE.Group();
  g.add(box(w, 0.25, 1.1, 0x6c6c6c, 0, 0.125, 0));
  g.add(box(w * 0.85, 0.7, 0.8, 0x8a8a8a, 0, 0.6, 0));
  g.add(box(w * 0.95, 0.08, 0.95, 0x9a9a9a, 0, 0.99, 0));
  const cloth = box(w * 0.5, 0.02, 0.97, 0x9d0208, 0, 1.04, 0);
  g.add(cloth);
  return g;
}

export function rock(s = 0.5, seed = 1, color = 0x8d8d8d) {
  const r = rng(seed);
  const m = mesh(new THREE.DodecahedronGeometry(s, 0), mat(color));
  m.scale.set(r.range(0.8, 1.3), r.range(0.5, 0.9), r.range(0.8, 1.3));
  m.rotation.set(r.range(0, 3), r.range(0, 3), 0);
  m.position.y = s * 0.3;
  return m;
}

export function cactus(h = 1.6) {
  const g = new THREE.Group();
  const c = mat(0x3a7d44);
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.18, h, 6), c));
  g.children[0].position.y = h / 2;
  const arm = mesh(new THREE.CylinderGeometry(0.1, 0.1, h * 0.4, 6), c);
  arm.position.set(0.3, h * 0.6, 0);
  g.add(arm);
  g.add(box(0.2, 0.1, 0.1, c, 0.17, h * 0.42, 0));
  return g;
}

export function tree(h = 2.5, color = 0x2d6a4f) {
  const g = new THREE.Group();
  g.add(box(0.2, h * 0.45, 0.2, 0x6b4423, 0, h * 0.22, 0));
  const top = mesh(new THREE.ConeGeometry(h * 0.3, h * 0.7, 6), mat(color));
  top.position.y = h * 0.7;
  g.add(top);
  return g;
}

export function tumbleweed() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), new THREE.MeshLambertMaterial({ color: 0xa67c52, wireframe: true }));
  g.add(m);
  const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), new THREE.MeshLambertMaterial({ color: 0x8b6a45, wireframe: true }));
  g.add(inner);
  return g;
}

export function vines(h = 2, seed = 3) {
  const g = new THREE.Group();
  const r = rng(seed);
  for (let i = 0; i < 12; i++) {
    const leaf = mesh(new THREE.TetrahedronGeometry(r.range(0.1, 0.22), 0), mat(r.pick([0x2d6a4f, 0x40916c, 0x52b788])));
    leaf.position.set(r.range(-0.4, 0.4), r.range(0, h), r.range(-0.05, 0.05));
    g.add(leaf);
  }
  return g;
}

// ---------- machines ----------

export function vendingMachine(label = "DRINKS") {
  const g = new THREE.Group();
  g.add(box(0.9, 1.9, 0.75, 0xd62828, 0, 0.95, 0));
  const front = textPlane([label], 0.7, 0.3, { bg: "#ffffff", fg: "#d62828", size: 60 });
  front.position.set(0, 1.65, 0.38);
  g.add(front);
  const win = box(0.7, 0.9, 0.02, glow(0xbde0fe), 0, 1.05, 0.38);
  g.add(win);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) g.add(box(0.1, 0.18, 0.05, glow([0x2a9d8f, 0xf4a261, 0xe76f51, 0x8ecae6][c]), -0.24 + c * 0.16, 0.75 + r * 0.28, 0.4));
  g.add(box(0.5, 0.15, 0.04, 0x222222, 0, 0.3, 0.38));
  return g;
}

export function washingMachine() {
  const g = new THREE.Group();
  g.add(box(0.8, 0.9, 0.75, 0xf8f9fa, 0, 0.45, 0));
  const ring = mesh(new THREE.TorusGeometry(0.25, 0.04, 6, 14), mat(0xadb5bd));
  ring.position.set(0, 0.45, 0.38);
  g.add(ring);
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.22, 14), glow(0x90e0ef, 0.8));
  door.position.set(0, 0.45, 0.381);
  g.add(door);
  g.add(box(0.7, 0.08, 0.02, 0x495057, 0, 0.82, 0.38));
  return g;
}

export function router() {
  const g = new THREE.Group();
  g.add(box(0.5, 0.08, 0.3, 0x222222, 0, 0.04, 0));
  for (const x of [-0.18, 0.18]) {
    const a = box(0.02, 0.3, 0.02, 0x333333, x, 0.2, -0.13);
    g.add(a);
  }
  const leds: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.01), glow(0x33ff66));
    l.position.set(-0.12 + i * 0.08, 0.05, 0.151);
    leds.push(l);
    g.add(l);
  }
  return Object.assign(g, { leds });
}

export function tv(lines: string | string[] = "", w = 0.8, h = 0.6) {
  const g = new THREE.Group();
  g.add(box(w + 0.1, h + 0.1, 0.4, 0x333333, 0, h / 2 + 0.05, 0));
  const scr = textPlane(lines, w, h, { bg: "#112", fg: "#9cf", size: 36, scanlines: true });
  scr.position.set(0, h / 2 + 0.05, 0.201);
  g.add(scr);
  return Object.assign(g, { screen: scr });
}

// ---------- vehicles ----------

export function truck(color = 0x7f5539) {
  const g = new THREE.Group();
  g.add(box(1.4, 0.8, 3, color, 0, 0.8, 0));
  g.add(box(1.3, 0.7, 1.1, color, 0, 1.55, 0.85));
  g.add(box(1.2, 0.4, 0.02, glow(0x9bd0ff, 0.6), 0, 1.65, 1.41));
  for (const [x, z] of [[0.72, 1], [-0.72, 1], [0.72, -1], [-0.72, -1]]) {
    const w = mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 8), mat(0x222222));
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.35, z);
    g.add(w);
  }
  // spikes for wasteland flair
  for (let i = 0; i < 4; i++) {
    const s = mesh(new THREE.ConeGeometry(0.08, 0.4, 4), mat(0x999999));
    s.rotation.x = Math.PI / 2;
    s.position.set(-0.5 + i * 0.33, 0.6, 1.55);
    g.add(s);
  }
  return g;
}

export function helicopter() {
  const g = new THREE.Group();
  g.add(box(1.2, 0.9, 2, 0x3d5a40, 0, 0, 0));
  g.add(box(0.25, 0.25, 2.2, 0x3d5a40, 0, 0.15, -2));
  g.add(box(1.0, 0.5, 0.02, glow(0x9bd0ff, 0.6), 0, 0.15, 1.01));
  for (const x of [-0.5, 0.5]) g.add(box(0.06, 0.06, 2, 0x222222, x, -0.6, 0));
  const rotor = new THREE.Group();
  rotor.position.y = 0.6;
  rotor.add(box(5, 0.03, 0.18, 0x222222), box(0.18, 0.03, 5, 0x222222));
  g.add(rotor);
  const tail = new THREE.Group();
  tail.position.set(0.15, 0.3, -3);
  tail.add(box(0.02, 1, 0.12, 0x222222));
  g.add(tail);
  return Object.assign(g, { rotor, tail });
}

export function ufo() {
  const g = new THREE.Group();
  const disc = mesh(new THREE.CylinderGeometry(2.2, 0.8, 0.5, 12), mat(0xb0b7c3));
  g.add(disc);
  const rim = mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.1, 12), mat(0x7a8290));
  rim.position.y = 0.1;
  g.add(rim);
  const dome = mesh(new THREE.SphereGeometry(0.85, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x80ffdb, transparent: true, opacity: 0.6, flatShading: true }));
  dome.position.y = 0.25;
  g.add(dome);
  const lights: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), glow(0xffee66));
    const a = (i / 10) * Math.PI * 2;
    l.position.set(Math.cos(a) * 2.2, 0.05, Math.sin(a) * 2.2);
    lights.push(l);
    g.add(l);
  }
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.8, 6, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xaaffcc, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = -3.2;
  beam.visible = false;
  g.add(beam);
  return Object.assign(g, { lights, beam });
}

// ---------- idols (stylized homages, not official art) ----------

/** A round white bear idol with little ears. */
export function bearIdol(s = 1) {
  const g = new THREE.Group();
  const white = mat(0xf8f8f8);
  const body = mesh(new THREE.IcosahedronGeometry(0.55, 1), white);
  body.position.y = 0.55;
  body.scale.set(1, 0.95, 0.9);
  const head = mesh(new THREE.IcosahedronGeometry(0.42, 1), white);
  head.position.y = 1.3;
  g.add(body, head);
  for (const x of [-0.3, 0.3]) {
    const ear = mesh(new THREE.IcosahedronGeometry(0.13, 0), white);
    ear.position.set(x, 1.66, 0);
    g.add(ear);
    const cheek = mesh(new THREE.CircleGeometry(0.06, 8), mat(0xff9eb5));
    cheek.position.set(x * 0.8, 1.22, 0.38);
    g.add(cheek);
    const eye = box(0.06, 0.09, 0.02, 0x111111, x * 0.45, 1.36, 0.4);
    g.add(eye);
  }
  const muzzle = mesh(new THREE.IcosahedronGeometry(0.13, 0), mat(0xffe5ec));
  muzzle.position.set(0, 1.22, 0.36);
  g.add(muzzle);
  g.scale.setScalar(s);
  return g;
}

/** A stout penguin idol. */
export function penguinIdol(s = 1) {
  const g = new THREE.Group();
  const body = mesh(new THREE.IcosahedronGeometry(0.6, 1), mat(0x1d3557));
  body.position.y = 0.7;
  body.scale.set(0.95, 1.2, 0.9);
  const belly = mesh(new THREE.IcosahedronGeometry(0.47, 1), mat(0xf8f8f8));
  belly.position.set(0, 0.6, 0.18);
  belly.scale.set(0.9, 1.1, 0.8);
  const beak = mesh(new THREE.ConeGeometry(0.1, 0.25, 4), mat(0xffb703));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 1.12, 0.55);
  g.add(body, belly, beak);
  for (const x of [-0.2, 0.2]) {
    g.add(box(0.07, 0.09, 0.02, 0x111111, x, 1.25, 0.5));
    const wing = box(0.12, 0.6, 0.3, 0x1d3557, x * 3.2, 0.75, 0);
    wing.rotation.z = x > 0 ? -0.3 : 0.3;
    g.add(wing);
    const foot = box(0.2, 0.06, 0.25, 0xffb703, x, 0.03, 0.2);
    g.add(foot);
  }
  g.scale.setScalar(s);
  return g;
}

/** A stylized idol girl with a star emblem. */
export function starIdol(s = 1) {
  const g = new THREE.Group();
  const skin = mat(0xffe0c8);
  const hair = mat(0x2b2d42);
  const dress = mat(0xff4d6d);
  const skirt = mesh(new THREE.ConeGeometry(0.45, 0.8, 7), dress);
  skirt.position.y = 0.75;
  g.add(skirt);
  for (const x of [-0.1, 0.1]) g.add(box(0.1, 0.45, 0.1, skin, x, 0.22, 0));
  g.add(box(0.4, 0.45, 0.25, dress, 0, 1.3, 0));
  const head = box(0.36, 0.38, 0.34, skin, 0, 1.75, 0);
  g.add(head);
  g.add(box(0.4, 0.14, 0.38, hair, 0, 1.96, -0.01));
  g.add(box(0.42, 0.8, 0.12, hair, 0, 1.5, -0.18));
  for (const x of [-0.07, 0.07]) g.add(box(0.05, 0.08, 0.02, 0x2a9d8f, x, 1.78, 0.18));
  const star = mesh(new THREE.OctahedronGeometry(0.16, 0), glow(0xffd60a));
  star.position.set(0.16, 2.0, 0.12);
  g.add(star);
  for (const x of [-0.27, 0.27]) {
    const arm = box(0.1, 0.45, 0.1, skin, x, 1.3, 0);
    arm.rotation.z = x > 0 ? -0.5 : 0.5;
    g.add(arm);
  }
  g.scale.setScalar(s);
  return Object.assign(g, { star });
}

// ---------- animals & monsters ----------

export function deer() {
  const g = new THREE.Group();
  const c = mat(0xa0522d);
  g.add(box(0.4, 0.4, 1, c, 0, 0.9, 0));
  for (const [x, z] of [[0.13, 0.4], [-0.13, 0.4], [0.13, -0.4], [-0.13, -0.4]]) g.add(box(0.08, 0.7, 0.08, c, x, 0.35, z));
  const neck = new THREE.Group();
  neck.position.set(0, 1.05, 0.45);
  const n = box(0.16, 0.5, 0.16, c, 0, 0.2, 0.05);
  n.rotation.x = 0.4;
  neck.add(n);
  const head = box(0.2, 0.2, 0.35, c, 0, 0.45, 0.22);
  neck.add(head);
  for (const x of [-0.06, 0.06]) neck.add(box(0.03, 0.04, 0.02, 0x111111, x * 1.4, 0.5, 0.36));
  for (const x of [-1, 1]) {
    const ant = box(0.03, 0.35, 0.03, 0xe9d8a6, x * 0.08, 0.68, 0.15);
    ant.rotation.z = -x * 0.4;
    neck.add(ant);
  }
  g.add(neck);
  g.add(box(0.1, 0.12, 0.06, 0xffffff, 0, 1.0, -0.52));
  return Object.assign(g, { neck });
}

// ---------- particles ----------

export interface Particles {
  points: THREE.Points;
  update(dt: number): void;
}

/** Falling snow/ash/confetti in a box volume. */
export function fallingParticles(n: number, size: [number, number, number], color = 0xffffff, speed = 1, pSize = 0.08): Particles {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  const r = rng(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = r.range(-size[0] / 2, size[0] / 2);
    pos[i * 3 + 1] = r.range(0, size[1]);
    pos[i * 3 + 2] = r.range(-size[2] / 2, size[2] / 2);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: pSize, transparent: true, opacity: 0.9 }));
  return {
    points: pts,
    update(dt) {
      const a = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < n; i++) {
        let y = a.getY(i) - dt * speed * (0.6 + ((i * 7) % 10) / 10);
        let x = a.getX(i) + Math.sin(y * 2 + i) * dt * 0.3;
        if (y < 0) y += size[1];
        a.setXY(i, x, y);
      }
      a.needsUpdate = true;
    },
  };
}

/** Starfield dome. */
export function stars(n = 400, radius = 120) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  const r = rng(42);
  for (let i = 0; i < n; i++) {
    const th = r.range(0, Math.PI * 2);
    const ph = r.range(0.05, Math.PI / 2);
    pos[i * 3] = Math.cos(th) * Math.cos(ph) * radius;
    pos[i * 3 + 1] = Math.sin(ph) * radius;
    pos[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * radius;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, sizeAttenuation: true, fog: false }));
}

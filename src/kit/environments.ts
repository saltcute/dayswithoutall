import * as THREE from "three";
import { box, glow, mat, mesh } from "../engine/materials";
import { rng } from "../engine/math";
import type { SceneCtx } from "../engine/stage";
import { textPlane } from "../engine/textTexture";

export interface Lights {
  hemi: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
}

/** Sky color + fog + hemisphere/directional lights with shadows. */
export function setupWorld(
  ctx: SceneCtx,
  o: { sky?: number; fog?: [number, number]; ground?: number; sun?: number; sunIntensity?: number; hemi?: number; sunPos?: [number, number, number]; shadowSize?: number } = {},
): Lights {
  const { scene } = ctx;
  const sky = o.sky ?? 0x87ceeb;
  scene.background = new THREE.Color(sky);
  if (o.fog) scene.fog = new THREE.Fog(sky, o.fog[0], o.fog[1]);
  const hemi = new THREE.HemisphereLight(sky, o.ground ?? 0x444433, o.hemi ?? 1.2);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(o.sun ?? 0xffffff, o.sunIntensity ?? 1.8);
  const p = o.sunPos ?? [6, 12, 8];
  sun.position.set(...p);
  sun.castShadow = !ctx.mobile;
  const s = o.shadowSize ?? 14;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 60 });
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);
  return { hemi, sun };
}

/** Low-poly jittered ground plane. */
export function terrain(size: number, segs: number, amp: number, color: number, seed = 1, flatRadius = 0) {
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const r = rng(seed);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const d = Math.hypot(x, z);
    const k = flatRadius ? THREE.MathUtils.smoothstep(d, flatRadius, flatRadius * 1.8) : 1;
    pos.setY(i, (r.next() * amp + Math.sin(x * 0.3) * Math.cos(z * 0.25) * amp) * k);
  }
  geo.computeVertexNormals();
  const m = mesh(geo, mat(color), false, true);
  return m;
}

export function floor(w: number, d: number, color: number) {
  const m = mesh(new THREE.PlaneGeometry(w, d), mat(color), false, true);
  m.rotation.x = -Math.PI / 2;
  return m;
}

/** Checkered arcade floor + walls + ceiling lights. */
export function arcadeInterior(ctx: SceneCtx, o: { w?: number; d?: number; h?: number; lit?: boolean; neon?: string; decay?: number } = {}) {
  const w = o.w ?? 14, d = o.d ?? 10, h = o.h ?? 4;
  const g = new THREE.Group();
  const decay = o.decay ?? 0;
  // carpet-style floor with low-poly tile pattern
  const tiles = new THREE.Group();
  const cA = mat(decay > 0.5 ? 0x3a3530 : 0x2b1d4e), cB = mat(decay > 0.5 ? 0x2e2a26 : 0x1f1538);
  for (let x = 0; x < w; x++)
    for (let z = 0; z < d; z++) {
      const t = mesh(new THREE.PlaneGeometry(1, 1), (x + z) % 2 ? cA : cB, false, true);
      t.rotation.x = -Math.PI / 2;
      t.position.set(x - w / 2 + 0.5, 0, z - d / 2 + 0.5);
      tiles.add(t);
    }
  g.add(tiles);
  const wall = mat(decay > 0.5 ? 0x5a5550 : 0x3c2a6e);
  g.add(box(w, h, 0.2, wall, 0, h / 2, -d / 2));
  g.add(box(0.2, h, d, wall, -w / 2, h / 2, 0));
  g.add(box(0.2, h, d, wall, w / 2, h / 2, 0));
  // ceiling light strips
  const ceilingLights: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.05, 0.25), glow(o.lit === false ? 0x333333 : 0xf0f0ff));
    l.position.set(0, h - 0.05, -d / 2 + (i + 0.5) * (d / 4));
    ceilingLights.push(l);
    g.add(l);
  }
  // neon sign on back wall
  const neon = textPlane(o.neon ?? "GAME CENTER", 4.5, 0.8, { bg: "", fg: "#ff4fd8", size: 70, font: "'Trebuchet MS', sans-serif" });
  neon.position.set(0, h - 0.8, -d / 2 + 0.12);
  g.add(neon);
  ctx.scene.add(g);
  const lamp = new THREE.PointLight(0xd8d0ff, o.lit === false ? 0 : 8, 18, 1.5);
  lamp.position.set(0, h - 0.4, 0);
  ctx.scene.add(lamp);
  return { group: g, ceilingLights, neon, lamp };
}

/** City block with buildings on both sides of a road. */
export function street(ctx: SceneCtx, o: { ruined?: boolean; length?: number; seed?: number } = {}) {
  const g = new THREE.Group();
  const L = o.length ?? 40;
  const r = rng(o.seed ?? 7);
  const road = floor(6, L, o.ruined ? 0x3a3a3a : 0x2f2f2f);
  g.add(road);
  for (let i = 0; i < L / 3; i++) {
    const stripe = floor(0.15, 1.2, 0xdddd88);
    stripe.position.set(0, 0.01, -L / 2 + i * 3 + 1);
    g.add(stripe);
  }
  for (const side of [-1, 1]) {
    const walk = box(3, 0.15, L, 0x8d8d8d, side * 4.5, 0.075, 0);
    g.add(walk);
    for (let z = -L / 2; z < L / 2; z += r.range(3, 5)) {
      const bw = r.range(3, 5), bh = r.range(4, 12) * (o.ruined ? r.range(0.4, 1) : 1), bd = r.range(2.5, 4);
      const c = r.pick([0x6c757d, 0x8d99ae, 0xa5a58d, 0x7f5539, 0x5e548e, 0x9a8c98]);
      const b = box(bd, bh, bw, c, side * (6 + bd / 2), bh / 2, z + bw / 2);
      if (o.ruined) b.rotation.z = r.range(-0.04, 0.04);
      g.add(b);
      // windows
      for (let wy = 1.5; wy < bh - 0.5; wy += 1.4)
        for (let wz = -bw / 2 + 0.6; wz < bw / 2 - 0.3; wz += 1) {
          const lit = !o.ruined && r.next() < 0.3;
          const win = box(0.05, 0.7, 0.5, lit ? glow(0xffe8a3) : mat(o.ruined ? 0x222222 : 0x334455), side * 5.98, wy, z + bw / 2 + wz);
          g.add(win);
        }
    }
  }
  ctx.scene.add(g);
  return g;
}

/** Rolling dunes with a hot sky. */
export function desert(ctx: SceneCtx, o: { color?: number; seed?: number } = {}) {
  const t = terrain(200, 50, 1.6, o.color ?? 0xe9c46a, o.seed ?? 5, 6);
  ctx.scene.add(t);
  return t;
}

/** Enclosed cave: rough dome shell around origin. */
export function cave(ctx: SceneCtx, radius = 9) {
  const geo = new THREE.IcosahedronGeometry(radius, 2);
  const r = rng(9);
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const s = 1 + r.range(-0.08, 0.08);
    p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * 0.6, p.getZ(i) * s);
  }
  geo.computeVertexNormals();
  const shell = mesh(geo, mat(0x4a3f35, { side: THREE.BackSide }), false, true);
  ctx.scene.add(shell);
  const fl = terrain(radius * 2.2, 18, 0.15, 0x5a4a3a, 4);
  ctx.scene.add(fl);
  return { shell, floor: fl };
}

/** Distant skyline ring of boxes (silhouettes). */
export function skyline(ctx: SceneCtx, radius = 50, color = 0x30364a, n = 40, seed = 11) {
  const g = new THREE.Group();
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const h = r.range(6, 22);
    const b = box(r.range(3, 7), h, r.range(3, 7), color, Math.cos(a) * radius, h / 2, Math.sin(a) * radius);
    b.castShadow = false;
    g.add(b);
  }
  ctx.scene.add(g);
  return g;
}

/** The front of an arcade building (for exterior shots). */
export function arcadeFacade(name = "GAME CENTER", w = 8, h = 5) {
  const g = new THREE.Group();
  g.add(box(w, h, 0.4, 0x4a4e69, 0, h / 2, 0));
  const s = textPlane(name, w * 0.7, 0.9, { bg: "#14002b", fg: "#ff4fd8", size: 70, border: "#00f5d4", borderWidth: 6 });
  s.position.set(0, h - 0.7, 0.21);
  g.add(s);
  // doorway + windows
  const door = box(1.6, 2.4, 0.05, 0x111122, 0, 1.2, 0.21);
  g.add(door);
  for (const x of [-2.6, 2.6]) g.add(box(2, 1.6, 0.05, glow(0x2a1a4a), x, 1.6, 0.21));
  return Object.assign(g, { signPlane: s, door });
}

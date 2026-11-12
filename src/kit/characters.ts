import * as THREE from "three";
import { glow, mat, mesh } from "../engine/materials";
import { rng, type Rng } from "../engine/math";

export type HairStyle = "short" | "long" | "spiky" | "bald" | "twin" | "cap" | "bun" | "mohawk";
export type Accessory = "gloves" | "headband" | "glasses" | "beard" | "backpack" | "robe" | "hood" | "towel" | "cape" | "mask" | "crown" | "goggles";

export interface PlayerOpts {
  shirt?: number;
  pants?: number;
  skin?: number;
  hair?: number;
  shoes?: number;
  hairStyle?: HairStyle;
  accessories?: Accessory[];
  /** robe/hood/cape color */
  robe?: number;
  scale?: number;
  /** hollow glowing eyes etc. */
  eyeColor?: number;
}

export type PoseName =
  | "idle" | "walk" | "run" | "shiver" | "airTap" | "slide" | "kneel" | "bow" | "worship" | "sit" | "sitFloor"
  | "punch" | "faint" | "lie" | "cheer" | "point" | "crawl" | "shamble" | "chant" | "sad" | "talk"
  | "hold" | "knock" | "dance" | "fight" | "reach" | "stop" | "facepalm" | "huddle" | "dig" | "type";

export const SKINS = [0xf5d0b0, 0xe8b894, 0xc98e66, 0x9a6a48, 0xffe0c8, 0x7a5236];
export const SHIRTS = [0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261, 0x8e44ad, 0x1d3557, 0xff70a6, 0x06d6a0, 0xffd166, 0x3a86ff, 0xfb5607, 0x6c757d, 0xffffff, 0x222222];
export const PANTS = [0x22223b, 0x3d405b, 0x4a4e69, 0x264653, 0x5c4033, 0x1b1b1b, 0x6b705c];
export const HAIRS = [0x1a1a1a, 0x3b2a1a, 0x6b4423, 0xd4a017, 0xb5651d, 0xff66aa, 0x66ccff, 0xeeeeee, 0x9b5de5];

// Shared geometries
const G = {
  leg: new THREE.BoxGeometry(0.17, 0.72, 0.19).translate(0, -0.36, 0),
  shoe: new THREE.BoxGeometry(0.19, 0.09, 0.28).translate(0, -0.72, 0.04),
  torso: new THREE.BoxGeometry(0.46, 0.6, 0.28).translate(0, 0.3, 0),
  arm: new THREE.BoxGeometry(0.13, 0.58, 0.14).translate(0, -0.29, 0),
  hand: new THREE.BoxGeometry(0.13, 0.11, 0.14).translate(0, -0.62, 0),
  glove: new THREE.BoxGeometry(0.15, 0.15, 0.16).translate(0, -0.62, 0),
  head: new THREE.BoxGeometry(0.34, 0.36, 0.34).translate(0, 0.18, 0),
  eye: new THREE.BoxGeometry(0.05, 0.07, 0.02),
  hairTop: new THREE.BoxGeometry(0.37, 0.12, 0.37).translate(0, 0.38, -0.01),
  hairBack: new THREE.BoxGeometry(0.37, 0.5, 0.1).translate(0, 0.12, -0.16),
  hairTail: new THREE.BoxGeometry(0.1, 0.32, 0.1),
  spike: new THREE.ConeGeometry(0.07, 0.18, 4),
  capTop: new THREE.CylinderGeometry(0.19, 0.19, 0.12, 8).translate(0, 0.4, 0),
  capBrim: new THREE.BoxGeometry(0.34, 0.03, 0.2).translate(0, 0.35, 0.22),
  bun: new THREE.IcosahedronGeometry(0.11, 0).translate(0, 0.42, -0.12),
  band: new THREE.BoxGeometry(0.36, 0.06, 0.36).translate(0, 0.3, 0),
  beard: new THREE.ConeGeometry(0.15, 0.32, 5).rotateX(Math.PI).translate(0, -0.08, 0.13),
  glasses: new THREE.BoxGeometry(0.3, 0.06, 0.02).translate(0, 0.21, 0.18),
  goggles: new THREE.BoxGeometry(0.34, 0.1, 0.04).translate(0, 0.22, 0.18),
  pack: new THREE.BoxGeometry(0.36, 0.42, 0.18).translate(0, 0.3, -0.22),
  robe: new THREE.CylinderGeometry(0.28, 0.46, 1.15, 7).translate(0, -0.18, 0),
  hood: new THREE.ConeGeometry(0.26, 0.5, 6).translate(0, 0.36, -0.03),
  towel: new THREE.BoxGeometry(0.5, 0.08, 0.32).translate(0, 0.58, 0),
  cape: new THREE.BoxGeometry(0.5, 0.95, 0.04).translate(0, -0.2, 0),
  mask: new THREE.BoxGeometry(0.3, 0.12, 0.03).translate(0, 0.09, 0.18),
  crown: new THREE.CylinderGeometry(0.17, 0.17, 0.12, 5, 1, true).translate(0, 0.44, 0),
};

let nextSeed = 1000; // deterministic default seeds, in construction order

export class Player {
  readonly root = new THREE.Group();
  /** Whole-body pivot at the feet (used for faint/lie/crawl). */
  readonly body = new THREE.Group();
  readonly hips = new THREE.Group();
  readonly torso = new THREE.Group();
  readonly head = new THREE.Group();
  readonly armL = new THREE.Group();
  readonly armR = new THREE.Group();
  readonly legL = new THREE.Group();
  readonly legR = new THREE.Group();
  /** Attach held props here (moves with right hand). */
  readonly handR = new THREE.Group();
  readonly handL = new THREE.Group();
  readonly eyes: THREE.Mesh[] = [];
  private cape?: THREE.Object3D;
  readonly phase: number;

  constructor(o: PlayerOpts = {}, seed = nextSeed++) {
    const r = rng(seed);
    this.phase = r.range(0, 10);
    const skin = mat(o.skin ?? r.pick(SKINS));
    const shirt = mat(o.shirt ?? r.pick(SHIRTS));
    const pants = mat(o.pants ?? r.pick(PANTS));
    const hair = mat(o.hair ?? r.pick(HAIRS));
    const shoe = mat(o.shoes ?? 0x111111);
    const acc = new Set(o.accessories ?? []);
    const robeMat = mat(o.robe ?? 0x5a189a);

    this.root.add(this.body);
    this.body.add(this.hips);
    this.hips.position.y = 0.8;

    for (const [leg, x] of [[this.legL, 0.11], [this.legR, -0.11]] as const) {
      leg.position.set(x, 0, 0);
      leg.add(mesh(G.leg, pants), mesh(G.shoe, shoe));
      this.hips.add(leg);
    }
    this.hips.add(this.torso);
    this.torso.add(mesh(G.torso, shirt));

    for (const [arm, x, hand] of [[this.armL, 0.31, this.handL], [this.armR, -0.31, this.handR]] as const) {
      arm.position.set(x, 0.55, 0);
      arm.add(mesh(G.arm, shirt));
      arm.add(mesh(acc.has("gloves") ? G.glove : G.hand, acc.has("gloves") ? mat(0xffffff) : skin));
      hand.position.y = -0.65;
      arm.add(hand);
      this.torso.add(arm);
    }

    this.head.position.y = 0.62;
    this.torso.add(this.head);
    this.head.add(mesh(G.head, skin));
    const eyeMat = o.eyeColor !== undefined ? glow(o.eyeColor) : mat(0x111111);
    for (const x of [0.08, -0.08]) {
      const e = mesh(G.eye, eyeMat, false, false);
      e.position.set(x, 0.2, 0.175);
      this.eyes.push(e);
      this.head.add(e);
    }

    const style = o.hairStyle ?? r.pick(["short", "short", "long", "spiky", "cap", "twin", "bun", "bald"] as HairStyle[]);
    if (!acc.has("hood")) {
      if (style !== "bald") this.head.add(mesh(G.hairTop, style === "cap" ? mat(o.hair ?? r.pick(SHIRTS)) : hair));
      if (style === "long" || style === "twin") this.head.add(mesh(G.hairBack, hair));
      if (style === "twin")
        for (const x of [0.22, -0.22]) {
          const t = mesh(G.hairTail, hair);
          t.position.set(x, 0.2, -0.05);
          t.rotation.z = x > 0 ? -0.4 : 0.4;
          this.head.add(t);
        }
      if (style === "spiky" || style === "mohawk")
        for (let i = 0; i < (style === "mohawk" ? 4 : 5); i++) {
          const s = mesh(G.spike, hair);
          if (style === "mohawk") s.position.set(0, 0.47, 0.12 - i * 0.09);
          else s.position.set(-0.12 + (i % 3) * 0.12, 0.47, i < 3 ? 0.06 : -0.08);
          this.head.add(s);
        }
      if (style === "cap") this.head.add(mesh(G.capTop, mat(o.hair ?? 0xe63946)), mesh(G.capBrim, mat(o.hair ?? 0xe63946)));
      if (style === "bun") this.head.add(mesh(G.bun, hair));
    }
    if (acc.has("headband")) this.head.add(mesh(G.band, mat(0xffffff)));
    if (acc.has("beard")) this.head.add(mesh(G.beard, mat(0xdddddd)));
    if (acc.has("glasses")) this.head.add(mesh(G.glasses, mat(0x111111)));
    if (acc.has("goggles")) this.head.add(mesh(G.goggles, mat(0x333333)));
    if (acc.has("mask")) this.head.add(mesh(G.mask, mat(0xdddddd)));
    if (acc.has("crown")) this.head.add(mesh(G.crown, mat(0xffd700)));
    if (acc.has("backpack")) this.torso.add(mesh(G.pack, mat(0x6b4423)));
    if (acc.has("towel")) this.torso.add(mesh(G.towel, mat(0xffffff)));
    if (acc.has("robe")) this.hips.add(mesh(G.robe, robeMat));
    if (acc.has("hood")) this.head.add(mesh(G.hood, robeMat));
    if (acc.has("cape")) {
      const c = new THREE.Group();
      c.position.set(0, 0.58, -0.16);
      c.add(mesh(G.cape, robeMat));
      this.torso.add(c);
      this.cape = c;
    }

    if (o.scale) this.root.scale.setScalar(o.scale);
    // tag body parts so tooling (scripts/audit.mjs) can tell them apart from held props
    this.root.userData.player = seed;
    this.root.traverse((m) => (m.userData.part = true));
    for (const [g, n] of [[this.hips, "hips"], [this.torso, "torso"], [this.head, "head"], [this.armL, "armL"], [this.armR, "armR"], [this.legL, "legL"], [this.legR, "legR"]] as const) g.name = n;
    this.handR.userData.hand = "R";
    this.handL.userData.hand = "L";
  }

  at(x: number, z: number, rotY = 0) {
    this.root.position.set(x, 0, z);
    this.root.rotation.y = rotY;
    return this;
  }

  /** Rotate so the player faces world point (x, z). */
  face(x: number, z: number) {
    const p = this.root.position;
    this.root.rotation.y = Math.atan2(x - p.x, z - p.z);
    return this;
  }

  /** Move toward (x,z) by progress k (0..1) from (x0,z0), facing travel direction. */
  travel(x0: number, z0: number, x1: number, z1: number, k: number) {
    this.root.position.x = x0 + (x1 - x0) * k;
    this.root.position.z = z0 + (z1 - z0) * k;
    if (x1 !== x0 || z1 !== z0) this.root.rotation.y = Math.atan2(x1 - x0, z1 - z0);
    return this;
  }

  private reset() {
    for (const g of [this.body, this.hips, this.torso, this.head, this.armL, this.armR, this.legL, this.legR]) g.rotation.set(0, 0, 0);
    this.body.position.set(0, 0, 0);
    this.hips.position.set(0, 0.8, 0);
    this.head.position.set(0, 0.62, 0);
    if (this.cape) this.cape.rotation.x = 0.1;
  }

  /**
   * Apply a pose at time t. `k` is a pose-specific progress/intensity (0..1),
   * e.g. how far a faint has progressed.
   */
  pose(name: PoseName, t: number, k = 1) {
    this.reset();
    const tt = t + this.phase;
    const s = Math.sin;
    const { body, hips, torso, head, armL, armR, legL, legR } = this;
    switch (name) {
      case "idle":
        torso.rotation.x = s(tt * 1.5) * 0.02;
        armL.rotation.z = 0.08 + s(tt * 1.5) * 0.03;
        armR.rotation.z = -0.08 - s(tt * 1.5) * 0.03;
        head.rotation.y = s(tt * 0.4) * 0.3;
        break;
      case "walk":
      case "run": {
        const f = name === "run" ? 13 : 7.5;
        const a = name === "run" ? 0.9 : 0.55;
        legL.rotation.x = s(tt * f) * a;
        legR.rotation.x = -s(tt * f) * a;
        armL.rotation.x = -s(tt * f) * a * 0.9;
        armR.rotation.x = s(tt * f) * a * 0.9;
        hips.position.y = 0.8 + Math.abs(s(tt * f)) * 0.05;
        torso.rotation.x = name === "run" ? 0.25 : 0.04;
        if (this.cape) this.cape.rotation.x = 0.3 + s(tt * f) * 0.1;
        break;
      }
      case "shamble":
        legL.rotation.x = s(tt * 3) * 0.35;
        legR.rotation.x = -s(tt * 3) * 0.35;
        armL.rotation.x = -1.45 + s(tt * 2.2) * 0.12;
        armR.rotation.x = -1.4 + s(tt * 2.6) * 0.12;
        torso.rotation.z = s(tt * 1.5) * 0.12;
        torso.rotation.x = 0.15;
        head.rotation.z = 0.35 + s(tt * 1.1) * 0.1;
        head.rotation.x = 0.2;
        hips.position.y = 0.78 + Math.abs(s(tt * 3)) * 0.03;
        // zombie air-tapping fingers
        armL.rotation.z = s(tt * 9) * 0.08;
        break;
      case "shiver": {
        const j = () => (Math.random() - 0.5) * 0.08 * k;
        armL.rotation.set(-0.6, 0, -0.9);
        armR.rotation.set(-0.6, 0, 0.9);
        torso.rotation.set(0.15 + j(), j(), j());
        head.rotation.set(0.15 + j(), j(), j());
        body.position.x = j() * 0.5;
        break;
      }
      case "airTap": {
        // frantic rhythm-game tapping in front of the body
        const f = 14;
        armL.rotation.x = -1.25 + s(tt * f) * 0.25 * k;
        armR.rotation.x = -1.25 + s(tt * f + 1.7) * 0.25 * k;
        armL.rotation.z = -0.25;
        armR.rotation.z = 0.25;
        head.rotation.x = 0.25 + s(tt * f * 0.5) * 0.06;
        torso.rotation.x = 0.12;
        hips.position.y = 0.8 + Math.abs(s(tt * 4)) * 0.025;
        break;
      }
      case "slide": {
        // sweeping hands across an imaginary circle/slider
        const a = tt * 3;
        armL.rotation.x = -1.3 + s(a) * 0.3;
        armR.rotation.x = -1.3 + s(a + Math.PI) * 0.3;
        armL.rotation.z = -0.3 + Math.cos(a) * 0.5;
        armR.rotation.z = 0.3 + Math.cos(a) * 0.5;
        torso.rotation.y = Math.cos(a) * 0.25;
        head.rotation.y = Math.cos(a) * 0.2;
        break;
      }
      case "type":
        armL.rotation.x = -1.0 + s(tt * 18) * 0.06;
        armR.rotation.x = -1.0 + s(tt * 18 + 2) * 0.06;
        head.rotation.x = 0.3;
        break;
      case "kneel":
      case "bow":
      case "worship":
      case "chant": {
        // seiza: legs folded back, hips low
        legL.rotation.x = 1.55;
        legR.rotation.x = 1.55;
        hips.position.y = 0.28;
        hips.position.z = -0.1;
        if (name === "kneel") {
          torso.rotation.x = 0.1;
          armL.rotation.x = armR.rotation.x = -0.3;
        } else if (name === "bow") {
          torso.rotation.x = 0.6 + 0.4 * k;
          armL.rotation.x = armR.rotation.x = -1.6;
        } else if (name === "worship") {
          // arms up, then bow down — repeated
          const c = (s(tt * 2.2) + 1) / 2;
          torso.rotation.x = c * 1.2;
          armL.rotation.x = armR.rotation.x = -2.8 + c * 0.8;
          armL.rotation.z = 0.3; // raised arms splay outward, clear of the head
          armR.rotation.z = -0.3;
        } else {
          armL.rotation.x = armR.rotation.x = -2.6 + s(tt * 3) * 0.3;
          armL.rotation.z = 0.4;
          armR.rotation.z = -0.4;
          head.rotation.x = -0.3;
          torso.rotation.z = s(tt * 1.5) * 0.08;
        }
        break;
      }
      case "sit":
        legL.rotation.x = legR.rotation.x = -1.5;
        hips.position.y = 0.5;
        armL.rotation.x = armR.rotation.x = -0.5;
        torso.rotation.x = -0.05 + s(tt) * 0.02;
        head.rotation.x = 0.2;
        break;
      case "sitFloor":
        legL.rotation.x = legR.rotation.x = -1.5;
        legL.rotation.z = 0.15;
        legR.rotation.z = -0.15;
        hips.position.y = 0.1;
        armL.rotation.x = armR.rotation.x = -0.9;
        torso.rotation.x = 0.1;
        head.rotation.x = 0.15;
        break;
      case "huddle":
        legL.rotation.x = legR.rotation.x = -1.9;
        hips.position.y = 0.12;
        armL.rotation.set(-1.4, 0, -0.6);
        armR.rotation.set(-1.4, 0, 0.6);
        torso.rotation.x = 0.4;
        torso.rotation.z = (Math.random() - 0.5) * 0.04 * k;
        head.rotation.x = 0.2;
        break;
      case "punch":
      case "fight": {
        const f = name === "fight" ? 10 : 8;
        const p = s(tt * f);
        armR.rotation.x = -1.5 - Math.max(0, p) * 0.2;
        armL.rotation.x = -1.5 - Math.max(0, -p) * 0.2;
        armR.rotation.z = 0.4 - Math.max(0, p) * 0.4;
        armL.rotation.z = -0.4 + Math.max(0, -p) * 0.4;
        torso.rotation.y = p * 0.35;
        legL.rotation.x = 0.3;
        legR.rotation.x = -0.3;
        hips.position.y = 0.76;
        if (name === "fight") body.position.y = Math.abs(s(tt * 5)) * 0.15;
        break;
      }
      case "faint":
      case "lie": {
        const p = name === "lie" ? 1 : k;
        body.rotation.x = -p * Math.PI / 2;
        body.position.y = p * 0.15;
        // arms flop out to the sides (positive z swings the left arm outward)
        armL.rotation.z = p * 1.2;
        armR.rotation.z = -p * 1.2;
        legL.rotation.z = -p * 0.15;
        legR.rotation.z = p * 0.15;
        head.rotation.x = p * 0.25;
        break;
      }
      case "cheer": {
        const j = Math.abs(s(tt * 6));
        armL.rotation.set(-2.8 + s(tt * 12) * 0.2, 0, 0.3); // arms up in a V, clear of the head
        armR.rotation.set(-2.8 - s(tt * 12) * 0.2, 0, -0.3);
        body.position.y = j * 0.25 * k;
        head.rotation.x = -0.3;
        break;
      }
      case "point":
        armR.rotation.x = -1.7;
        armR.rotation.z = 0.1;
        armL.rotation.z = 0.1;
        head.rotation.x = -0.05;
        torso.rotation.y = s(tt * 2) * 0.05;
        break;
      case "stop":
        armR.rotation.set(-1.6, 0, 0.3);
        armL.rotation.set(-1.6, 0, -0.3);
        torso.rotation.x = -0.1;
        legL.rotation.x = 0.35;
        legR.rotation.x = -0.25;
        break;
      case "reach":
        armR.rotation.x = -1.4 - k * 0.3;
        armL.rotation.x = -1.1;
        torso.rotation.x = 0.25 * k;
        head.rotation.x = 0.2;
        break;
      case "crawl": {
        // body tipped forward; legs trail straight behind and drag
        body.rotation.x = Math.PI / 2 * 0.85;
        body.position.y = 0.26;
        body.position.z = -0.1;
        legL.rotation.x = 0.1 + s(tt * 4) * 0.25;
        legR.rotation.x = 0.1 - s(tt * 4) * 0.25;
        armL.rotation.x = -1.35 - s(tt * 4) * 0.3;
        armR.rotation.x = -1.35 + s(tt * 4) * 0.3;
        head.rotation.x = -0.9;
        break;
      }
      case "sad":
        torso.rotation.x = 0.25;
        head.rotation.x = 0.55;
        armL.rotation.z = 0.03;
        armR.rotation.z = -0.03;
        hips.position.y = 0.78;
        break;
      case "facepalm":
        armR.rotation.set(-2.3, 0.1, 0.65);
        head.rotation.x = 0.35;
        torso.rotation.x = 0.15;
        break;
      case "talk":
        armR.rotation.x = -0.9 + s(tt * 4) * 0.4;
        armR.rotation.z = 0.2 + s(tt * 3) * 0.2;
        armL.rotation.x = -0.4 + s(tt * 3.3) * 0.2;
        head.rotation.y = s(tt * 1.7) * 0.2;
        head.rotation.x = s(tt * 5) * 0.05;
        break;
      case "hold":
        armL.rotation.x = armR.rotation.x = -1.1;
        armL.rotation.z = -0.15;
        armR.rotation.z = 0.15;
        break;
      case "knock":
        armR.rotation.x = -1.9 + Math.max(0, s(tt * 11)) * 0.5;
        armR.rotation.z = 0.15;
        break;
      case "dig":
        armL.rotation.x = armR.rotation.x = -1.0 - s(tt * 4) * 0.6;
        torso.rotation.x = 0.4 + s(tt * 4) * 0.25;
        break;
      case "dance": {
        const b = s(tt * 6);
        hips.position.y = 0.76 + Math.abs(b) * 0.06;
        torso.rotation.z = b * 0.2;
        armL.rotation.set(-1.5 - b * 0.8, 0, -0.5);
        armR.rotation.set(-1.5 + b * 0.8, 0, 0.5);
        legL.rotation.x = Math.max(0, b) * 0.5;
        legR.rotation.x = Math.max(0, -b) * 0.5;
        head.rotation.z = -b * 0.15;
        break;
      }
    }
    return this;
  }
}

/** Build n randomized players (deterministic for a seed). */
export function crowd(n: number, seed: number, opts: PlayerOpts = {}): Player[] {
  const r: Rng = rng(seed);
  return Array.from({ length: n }, (_, i) => new Player({ ...opts }, Math.floor(r.next() * 1e9) + i));
}

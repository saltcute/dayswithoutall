import * as THREE from "three";
import { box, glow, mat, mesh } from "../engine/materials";
import { TextTexture, type TextStyle } from "../engine/textTexture";

export type CabKind = "round" | "slider" | "lever";
export type ScreenState = "error" | "offline" | "maintenance" | "online" | "boot" | "off" | "logo" | "insert" | "custom";

export interface Cabinet {
  group: THREE.Group;
  kind: CabKind;
  screen: TextTexture;
  /** Material on the screen (adjust .color for flicker/brightness). */
  screenMat: THREE.MeshBasicMaterial;
  setScreen(state: ScreenState, custom?: string | string[], style?: TextStyle): void;
  /** World-space height of the screen center (for camera targeting). */
  screenY: number;
}

const SCREENS: Record<Exclude<ScreenState, "custom">, [string[], TextStyle]> = {
  error: [["NETWORK", "ERROR", "code 6401"], { bg: "#1a0005", fg: "#ff3355", size: 44, scanlines: true }],
  offline: [["OFFLINE", "", "server not found"], { bg: "#0d0d18", fg: "#8899ff", size: 42, scanlines: true }],
  maintenance: [["MAINTENANCE", "IN PROGRESS", "please wait…"], { bg: "#1a1400", fg: "#ffcc00", size: 34, scanlines: true }],
  online: [["ONLINE", "♪ ♪ ♪"], { bg: "#00170a", fg: "#33ff88", size: 54, scanlines: true }],
  boot: [["BOOTING…", "▮▮▮▮▮▯▯▯"], { bg: "#000", fg: "#ffffff", size: 40, scanlines: true }],
  off: [[""], { bg: "#050505", fg: "#000" }],
  logo: [["★ ARCADE ★", "PRESS START"], { bg: "#220033", fg: "#ff88ff", size: 40, scanlines: true }],
  insert: [["INSERT", "CREDIT"], { bg: "#001a33", fg: "#66ddff", size: 54, scanlines: true }],
};

function makeScreen(round: boolean) {
  const tt = new TextTexture(256, round ? 256 : 192);
  const m = new THREE.MeshBasicMaterial({ map: tt.texture, transparent: round });
  return { tt, m };
}

/**
 * Build a cabinet. Origin at floor center, facing +Z.
 * `accent` tints trim/side panels.
 */
export function cabinet(kind: CabKind, accent?: number): Cabinet {
  const g = new THREE.Group();
  const round = kind === "round";
  const { tt, m } = makeScreen(round);
  let screenY = 1.3;

  if (kind === "round") {
    // Front-loading-washing-machine-shaped cabinet
    const a = accent ?? 0xff4fa3;
    g.add(box(0.95, 1.05, 0.85, 0xf2f2f2, 0, 0.525, 0));
    const upper = box(0.95, 0.85, 0.7, 0xf2f2f2, 0, 1.47, -0.07);
    g.add(upper);
    // ring + round screen
    const ring = mesh(new THREE.TorusGeometry(0.38, 0.07, 6, 16), mat(a));
    ring.position.set(0, 1.42, 0.3);
    g.add(ring);
    const scr = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20), m);
    scr.position.set(0, 1.42, 0.31);
    g.add(scr);
    // 8 buttons around the ring
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const b = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 8), glow(0xfff36b));
      b.rotation.x = Math.PI / 2;
      b.position.set(Math.cos(ang) * 0.46, 1.42 + Math.sin(ang) * 0.46, 0.31);
      g.add(b);
    }
    // top display + speakers
    const top = box(0.9, 0.35, 0.5, a, 0, 2.08, -0.1);
    g.add(top);
    g.add(box(0.7, 0.18, 0.02, 0x111111, 0, 2.08, 0.16));
    // card reader
    g.add(box(0.18, 0.08, 0.12, 0x333333, 0.32, 1.02, 0.45));
    screenY = 1.42;
  } else if (kind === "slider") {
    const a = accent ?? 0xffa62b;
    g.add(box(1.4, 0.92, 0.8, 0x2b2d42, 0, 0.46, 0));
    // slanted slider deck
    const deck = new THREE.Group();
    deck.position.set(0, 0.95, 0.25);
    deck.rotation.x = 0.25;
    deck.add(box(1.4, 0.06, 0.45, 0x1a1a1a));
    for (let i = 0; i < 16; i++) deck.add(box(0.075, 0.02, 0.36, glow(i % 2 ? 0x66ccff : 0x3399ff), -0.66 + i * 0.088, 0.04, 0));
    g.add(deck);
    // upright screen
    g.add(box(1.4, 1.1, 0.35, 0x2b2d42, 0, 1.6, -0.25));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), m);
    scr.position.set(0, 1.62, -0.07);
    g.add(scr);
    // air towers
    for (const x of [-0.8, 0.8]) {
      g.add(box(0.12, 2.3, 0.15, a, x, 1.15, 0.2));
      g.add(box(0.04, 1.9, 0.04, glow(0xff3355), x - Math.sign(x) * 0.07, 1.25, 0.2));
    }
    g.add(box(1.5, 0.3, 0.4, a, 0, 2.3, -0.25));
    g.add(box(0.2, 0.08, 0.15, 0x333333, 0.55, 0.95, 0.42));
    screenY = 1.62;
  } else {
    const a = accent ?? 0xb517ff;
    g.add(box(1.1, 0.95, 0.85, 0x1d1d2c, 0, 0.475, 0));
    for (const x of [-0.56, 0.56]) g.add(box(0.04, 2.1, 0.9, a, x, 1.05, 0));
    // control deck
    const deck = new THREE.Group();
    deck.position.set(0, 0.98, 0.25);
    deck.rotation.x = 0.15;
    deck.add(box(1.1, 0.06, 0.45, 0x2a2a3a));
    const cols = [0xff3355, 0x33ff66, 0x3399ff];
    cols.forEach((c, i) => {
      for (const side of [-1, 1]) {
        const b = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 10), glow(c));
        b.position.set(side * (0.22 + i * 0.1), 0.05, 0);
        deck.add(b);
      }
    });
    // lever
    const stick = box(0.03, 0.22, 0.03, 0x888888, 0, 0.13, 0);
    const ball = mesh(new THREE.IcosahedronGeometry(0.06, 0), glow(0xff66cc));
    ball.position.y = 0.25;
    deck.add(stick, ball);
    g.add(deck);
    g.add(box(1.1, 1.0, 0.35, 0x1d1d2c, 0, 1.6, -0.22));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.75), m);
    scr.position.set(0, 1.6, -0.04);
    g.add(scr);
    g.add(box(1.15, 0.25, 0.5, a, 0, 2.2, -0.15));
    g.add(box(0.2, 0.08, 0.15, 0x333333, 0.4, 0.97, 0.45));
    screenY = 1.6;
  }

  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
  });

  const setScreen = (state: ScreenState, custom?: string | string[], style?: TextStyle) => {
    if (state === "custom") tt.draw(custom ?? "", { scanlines: true, ...style, round });
    else {
      const [lines, st] = SCREENS[state];
      tt.draw(custom ?? lines, { ...st, ...style, round });
    }
  };
  setScreen("error");
  return { group: g, kind, screen: tt, screenMat: m, setScreen, screenY };
}

/** A row of cabinets along X, cycling kinds. */
export function cabinetRow(n: number, spacing = 1.7, kinds: CabKind[] = ["round", "round", "slider", "lever"]): Cabinet[] {
  return Array.from({ length: n }, (_, i) => {
    const c = cabinet(kinds[i % kinds.length]);
    c.group.position.x = (i - (n - 1) / 2) * spacing;
    return c;
  });
}

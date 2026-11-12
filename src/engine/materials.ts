import * as THREE from "three";

const lambertCache = new Map<string, THREE.MeshLambertMaterial>();
const basicCache = new Map<string, THREE.MeshBasicMaterial>();

/**
 * Flat-shaded low-poly material, cached by color/options. SHARED: clone() it
 * before animating color/opacity on a single object.
 */
export function mat(color: number, opts: { emissive?: number; transparent?: boolean; opacity?: number; side?: THREE.Side } = {}) {
  const key = `${color}|${opts.emissive ?? 0}|${opts.opacity ?? 1}|${opts.side ?? 0}`;
  let m = lambertCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({
      color,
      flatShading: true,
      emissive: opts.emissive ?? 0x000000,
      transparent: opts.transparent ?? (opts.opacity ?? 1) < 1,
      opacity: opts.opacity ?? 1,
      side: opts.side ?? THREE.FrontSide,
    });
    lambertCache.set(key, m);
  }
  return m;
}

/** Unlit (glowing) material, cached and SHARED: clone() before animating. */
export function glow(color: number, opacity = 1) {
  const key = `${color}|${opacity}`;
  let m = basicCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
    basicCache.set(key, m);
  }
  return m;
}

/** Shorthand: mesh with shadows enabled. */
export function mesh(geo: THREE.BufferGeometry, material: THREE.Material, castShadow = true, receiveShadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = castShadow;
  m.receiveShadow = receiveShadow;
  return m;
}

/** Box mesh positioned by its center. */
export function box(w: number, h: number, d: number, color: number | THREE.Material, x = 0, y = 0, z = 0) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), typeof color === "number" ? mat(color) : color);
  m.position.set(x, y, z);
  return m;
}

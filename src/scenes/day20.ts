// Day 20: Reclamation. Nature has overgrown the abandoned arcade. A deer
// walks in, taps a cabinet button with her nose. NETWORK ERROR. She waits.
import * as THREE from "three";
import { box, mat, mesh } from "../engine/materials";
import { bump, lerp, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { cabinet, type CabKind } from "../kit/cabinets";
import { deer, fallingParticles, rock, tree, vines } from "../kit/props";
import { arcadeInterior, setupWorld, terrain } from "../kit/environments";

function bird() {
  const g = new THREE.Group();
  g.add(box(0.12, 0.1, 0.3, 0x3d405b));
  const wl = new THREE.Group(), wr = new THREE.Group();
  wl.add(box(0.3, 0.02, 0.14, 0x4a4e69, 0.15, 0, 0));
  wr.add(box(0.3, 0.02, 0.14, 0x4a4e69, -0.15, 0, 0));
  g.add(wl, wr);
  return Object.assign(g, { wl, wr });
}

const scene: SceneDef = {
  duration: 36,
  build(ctx) {
    const { scene, sfx } = ctx;
    setupWorld(ctx, { sky: 0x9ad1f5, ground: 0x2d4a2a, hemi: 1.2, sun: 0xfff1c8, sunIntensity: 2.2, sunPos: [5, 14, 4], shadowSize: 12 });
    const r = rng(2020);
    const H = 4.5;
    const room = arcadeInterior(ctx, { w: 14, d: 12, h: H, lit: false, decay: 1, neon: "GAME CENTER" });
    room.lamp.intensity = 0;
    room.neon.visible = false;
    // outside meadow (seen through the open front and roof)
    const meadow = terrain(120, 30, 1.2, 0x5a8f3c, 20, 10);
    meadow.position.y = -0.02;
    scene.add(meadow);
    // dangling / fallen ceiling strips
    room.ceilingLights.forEach((l, i) => {
      l.rotation.z = i % 2 ? 0.35 : -0.2;
      l.position.y -= i % 2 ? 0.7 : 0.25;
    });
    // broken roof: a few slabs + beams, mostly holes
    const roofM = mat(0x55504a);
    scene.add(box(5, 0.25, 4, roofM, -4.5, H + 0.1, -4));
    scene.add(box(3.5, 0.25, 3, roofM, 5.2, H + 0.1, 3.5));
    for (let i = 0; i < 4; i++) {
      const b = box(14, 0.2, 0.25, 0x6b5a48, 0, H + 0.05, -5 + i * 3.2);
      if (i === 2) {
        b.rotation.z = 0.25;
        b.position.y = H - 0.6;
      }
      scene.add(b);
    }
    // moss + grass
    const mossM = [mat(0x4f772d), mat(0x6a994e), mat(0x3a5a40)];
    for (let i = 0; i < 28; i++) {
      const m = mesh(new THREE.CircleGeometry(r.range(0.4, 1.3), 6), mossM[i % 3], false, true);
      m.rotation.x = -Math.PI / 2;
      m.position.set(r.range(-6.5, 6.5), 0.01 + i * 0.0006, r.range(-5.5, 5.5));
      scene.add(m);
    }
    const grassGeo = new THREE.ConeGeometry(0.06, 0.4, 3);
    for (let i = 0; i < 90; i++) {
      const g = mesh(grassGeo, mossM[(i + 1) % 3], false, false);
      g.position.set(r.range(-6.6, 6.6), 0.18, r.range(-5.6, 6));
      g.rotation.z = r.range(-0.3, 0.3);
      scene.add(g);
    }
    // trees growing inside
    const trees: [number, number, number][] = [[-4.6, -2.2, 5.5], [5, -1.4, 4.6], [-2.6, 3.2, 3.2], [4.2, 4, 2.6]];
    trees.forEach(([x, z, h], i) => {
      const tr = tree(h, i % 2 ? 0x40916c : 0x2d6a4f);
      tr.position.set(x, 0, z);
      scene.add(tr);
    });
    for (let i = 0; i < 6; i++) {
      const k = rock(r.range(0.2, 0.5), 200 + i, 0x7a7266);
      k.position.set(r.range(-6, 6), k.position.y, r.range(-4, 5));
      scene.add(k);
    }
    // vines on the walls
    for (let i = 0; i < 8; i++) {
      const v = vines(r.range(2, 4), 300 + i);
      v.scale.set(2, 1, 1);
      v.position.set(-6 + i * 1.7, 0, -5.85);
      scene.add(v);
    }

    // cabinets, overgrown
    const kinds: CabKind[] = ["lever", "slider", "round", "slider", "lever"];
    const cabs = kinds.map((k, i) => {
      const c = cabinet(k);
      c.group.position.set((i - 2) * 1.9, 0, -4.2);
      scene.add(c.group);
      const v = vines(2.2, 400 + i);
      v.position.set(0.45 * (i % 2 ? 1 : -1), 0, 0.35);
      c.group.add(v);
      return c;
    });
    const target = cabs[2];
    const tipped = cabinet("round");
    tipped.group.position.set(-4.4, 0.45, 1.6);
    tipped.group.rotation.set(-1.5, 0.5, 0);
    tipped.setScreen("off");
    scene.add(tipped.group);
    const tippedVines = vines(1.6, 99);
    tippedVines.position.set(-4.3, 0.6, 1.5);
    scene.add(tippedVines);

    // light shafts through the roof
    const shaftM = new THREE.MeshBasicMaterial({ color: 0xfff3c0, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
    for (const [x, z] of [[1.5, -1.5], [-1.2, 1.8], [3.2, 0.6]]) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 6, 6, 1, true), shaftM);
      s.position.set(x - 0.6, 2.6, z - 0.3);
      s.rotation.set(0.15, 0, 0.25);
      scene.add(s);
    }
    const motes = fallingParticles(160, [10, 4.5, 9], 0xfff3b0, 0.12, 0.05);
    scene.add(motes.points);

    // birds
    const birds = Array.from({ length: 5 }, () => {
      const b = bird();
      scene.add(b);
      return b;
    });
    const perched = bird();
    perched.position.set(1.9, 2.5, -4.15);
    scene.add(perched);

    // the deer
    const d = deer();
    scene.add(d);
    const legs = d.children.slice(1, 5);
    const DZ = -3.05;

    sfx.ambient("birds", 0.9);
    sfx.ambient("wind", 0.25);

    const TAP1 = 22.6, TAP2 = 24.4;
    ctx.update((t, dt) => {
      motes.update(dt);
      cabs.forEach((c, i) => {
        c.setScreen(i === 1 ? "off" : "error");
        c.screenMat.color.setScalar(0.45 + (c === target ? bump(t, TAP1, TAP1 + 0.6) * 0.6 + bump(t, TAP2, TAP2 + 0.8) * 0.6 : 0));
      });

      // deer: walk in, approach, tap, tap, look, lie down
      const wk = smooth(seg(t, 10.5, 19.5));
      const dx = lerp(1.2, 0, smooth(seg(t, 14, 19.5)));
      d.position.set(dx, 0, lerp(8, DZ, wk));
      d.rotation.y = Math.PI + (wk < 1 ? Math.sin(t * 0.8) * 0.15 : 0);
      const walking = wk > 0 && wk < 1;
      legs.forEach((l, i) => (l.rotation.x = walking ? Math.sin(t * 7 + (i % 3 ? Math.PI : 0)) * 0.3 : 0));
      d.position.y = walking ? Math.abs(Math.sin(t * 7)) * 0.03 : 0;
      // neck: graze, sniff, taps, look at camera
      let nx = 0, ny = 0;
      if (t < 10.5) nx = 0;
      else if (walking) nx = t > 13 && t < 15.5 ? 0.9 + Math.sin(t * 4) * 0.1 : 0.1;
      else if (t < 21.8) {
        nx = 0.25 + Math.sin(t * 2) * 0.05;
        ny = Math.sin(t * 1.3) * 0.3;
      } else if (t < 27.4) nx = 0.25 + bump(t, TAP1 - 0.2, TAP1 + 0.3) * 0.55 + bump(t, TAP2 - 0.2, TAP2 + 0.3) * 0.65;
      else if (t < 30.4) {
        nx = 0;
        ny = -smooth(seg(t, 27.4, 28)) * 0.9;
      } else nx = 0.1;
      d.neck.rotation.set(nx, ny, t > 27.6 && t < 30.4 ? -0.25 : 0);
      // lie down to wait
      const lie = smooth(seg(t, 30.4, 31.6));
      if (lie > 0) {
        d.position.y = -0.55 * lie;
        legs.forEach((l, i) => {
          l.rotation.x = (i < 2 ? -1.4 : 1.4) * lie;
        });
        d.position.x = lerp(0, 0.4, lie);
        d.position.z = lerp(DZ, DZ + 0.6, lie);
      }

      // birds circling over the roof + one perched bird hopping
      birds.forEach((b, i) => {
        const a = t * (0.4 + i * 0.07) + i * 1.3;
        const rad = 3 + i * 0.8;
        b.position.set(Math.cos(a) * rad, 5.4 + i * 0.5 + Math.sin(t + i) * 0.3, Math.sin(a) * rad - 1);
        b.rotation.y = -a;
        const f = Math.sin(t * 14 + i) * 0.7;
        b.wl.rotation.z = f;
        b.wr.rotation.z = -f;
      });
      perched.position.y = 2.5 + Math.max(0, Math.sin(t * 3)) * 0.05;
      perched.rotation.y = Math.sin(t * 0.7) * 1.2;
      perched.visible = t < TAP1;
      if (t >= TAP1) {
        // startled away from the tap
        const k = t - TAP1;
        perched.visible = k < 4;
        perched.position.set(1.9 + k * 1.5, 2.5 + k * 1.2, -4.15 + k * 0.8);
        perched.wl.rotation.z = Math.sin(t * 20) * 0.8;
        perched.wr.rotation.z = -Math.sin(t * 20) * 0.8;
      }
    });

    // --- Sound ---
    for (let s = 10.6; s < 19.5; s += 0.45) ctx.at(s, () => sfx.noise(0.05, { type: "bandpass", freq: 1400, q: 2, gain: 0.08 })); // hooves
    ctx.at(13.4, () => sfx.noise(0.3, { type: "highpass", freq: 3000, gain: 0.05 })); // nibble
    ctx.at(TAP1, () => sfx.tap());
    ctx.at(TAP1 + 0.2, () => sfx.errorBeep(1));
    ctx.at(TAP1 + 0.3, () => sfx.whoosh(0.6)); // bird flies off
    ctx.at(TAP2, () => sfx.tap());
    ctx.at(TAP2 + 0.2, () => sfx.errorBeep(2));
    ctx.at(28, () => sfx.cricket(0));
    ctx.at(31, () => sfx.ambient("droneSad", 0.3));
    ctx.at(35.9, () => sfx.stopAmbient("droneSad"));

    // --- Narration ---
    ctx.caption(0.8, "Day 20. With the players away on pilgrimage, the arcade has been reclaimed.", 5);
    ctx.caption(6.2, "Moss carpets the floor. A sapling has set a new high score, in height.", 4.8);
    ctx.caption(11.4, "A visitor. Cautious. Curious. Hooved.", 4);
    ctx.caption(16, "She approaches the round cabinet. Instinct, perhaps. Or muscle memory from a past life.", 5.6);
    ctx.caption(22, "A single, perfect tap.", 2.8);
    ctx.caption(25.2, "Network error. Even nature cannot get online.", 4.6);
    ctx.caption(30.4, "She settles in to wait. She learned from the best.", 5);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [0, 1.4, 5], look: [0, 5, -2], fov: 55 },
      { t: 5.6, pos: [0, 2.2, 5.6], look: [0, 1.4, -4], fov: 50 },
      { t: 6.2, pos: [-6, 1.7, 4.8], look: [-3, 0.8, 0] },
      { t: 10.8, pos: [-2.4, 1.6, 3.4], look: [0, 1.2, -4] },
      { t: 11.2, pos: [3, 1.1, -1.8], look: [0.6, 1.1, 6] },
      { t: 15.8, pos: [3.2, 1.3, -1.4], look: [0.6, 1.1, 1] },
      { t: 16.2, pos: [4.2, 1.8, 0.8], look: [0.2, 1.1, -2.8] },
      { t: 21.6, pos: [3.4, 1.7, -0.2], look: [0, 1.2, -3.4] },
      { t: 22, pos: [1.4, 1.5, -2.2], look: [0, 1.35, -3.9], fov: 45 },
      { t: 25, pos: [1.3, 1.55, -2.3], look: [0, 1.4, -3.9], fov: 45 },
      { t: 25.2, pos: [-1.1, 1.55, -2.6], look: [0, 1.42, -3.9], fov: 45 },
      { t: 27.4, pos: [-1.1, 1.5, -2.5], look: [0, 1.4, -3.6], fov: 45 },
      { t: 27.6, pos: [1.9, 1.45, -0.8], look: [0, 1.4, -3], fov: 45 },
      { t: 30.2, pos: [1.9, 1.45, -0.9], look: [0, 1.3, -3], fov: 45 },
      { t: 30.6, pos: [3.5, 2.4, 2.8], look: [0, 0.8, -3], fov: 50 },
      { t: 36, pos: [4.6, 3.2, 4.4], look: [0, 1, -3], fov: 50 },
    ]);
  },
};
export default scene;

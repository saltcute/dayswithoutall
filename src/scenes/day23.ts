// Day 23: The Elder's Farewell. The Elder delivers his last words on a
// stretcher, the tribe holds a glowstick vigil… and he is not quite done.
import * as THREE from "three";
import { box, glow, mesh } from "../engine/materials";
import { lerp, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { Player } from "../kit/characters";
import { setupWorld, terrain } from "../kit/environments";
import { candle, crate, glowstick, rock, stars, tree } from "../kit/props";

const scene: SceneDef = {
  duration: 40,
  build(ctx) {
    const { scene, sfx } = ctx;
    const world = setupWorld(ctx, { sky: 0x1a1440, fog: [14, 45], ground: 0x0e1020, hemi: 0.75, sun: 0x9fb4ff, sunIntensity: 0.9, sunPos: [-6, 10, -4] });
    scene.add(terrain(120, 30, 0.6, 0x2a3350, 2301, 7));
    scene.add(stars(500));
    const r = rng(2302);

    // Moon
    const moon = mesh(new THREE.IcosahedronGeometry(3, 1), glow(0xf2ecd0), false, false);
    moon.position.set(-18, 20, -38);
    scene.add(moon);
    for (let i = 0; i < 9; i++) {
      const tr = tree(r.range(2.5, 4), 0x1d2e3a);
      const a = r.range(0, Math.PI * 2), d = r.range(9, 16);
      tr.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
      scene.add(tr);
    }
    for (let i = 0; i < 6; i++) {
      const rk = rock(r.range(0.3, 0.6), 2310 + i, 0x4a4f63);
      rk.position.set(r.range(-6, 6), rk.position.y, r.range(-7, -3.5));
      scene.add(rk);
    }

    // Stretcher: planks on two crates, with a blanket
    const bed = new THREE.Group();
    const c1 = crate(0.5), c2 = crate(0.5);
    c1.position.set(0, 0, -0.15);
    c2.position.set(0, 0, -1.65);
    bed.add(c1, c2);
    bed.add(box(0.8, 0.07, 2.2, 0x8b5a2b, 0, 0.53, -0.9));
    bed.add(box(0.84, 0.05, 1.3, 0x7b2d26, 0, 0.62, -0.45));
    const pillow = box(0.5, 0.12, 0.3, 0xe9e1d0, 0, 0.62, -1.75);
    bed.add(pillow);
    scene.add(bed);

    const elder = new Player({ skin: 0xc98e66, shirt: 0x7a5c3a, pants: 0x4a3a2a, hairStyle: "bald", accessories: ["beard"] }, 2210);
    elder.root.position.set(0, 0.48, 0.05);
    scene.add(elder.root);

    const cA = candle(), cB = candle();
    cA.position.set(0.7, 0, -2.1);
    cB.position.set(-0.7, 0, -2.1);
    scene.add(cA, cB);
    const cLights = [cA, cB].map((c) => c.children[2] as THREE.PointLight);
    const cFlames = [cA, cB].map((c) => c.children[1] as THREE.Mesh);

    // Mourners around the stretcher
    const N = 8;
    const glowCols = [0x39ff14, 0xff3df2, 0x2ef2ff, 0xfff23a, 0xff7a1a, 0x39ff14, 0x9b5de5, 0xff3df2];
    const mourners = Array.from({ length: N }, (_, i) => {
      const a = -Math.PI * 0.9 + (i / (N - 1)) * Math.PI * 1.8 + Math.PI / 2;
      const x = Math.cos(a) * 1.9, z = -0.9 + Math.sin(a) * 1.9;
      const p = new Player({ hairStyle: (["short", "twin", "cap", "long", "spiky", "bun", "short", "mohawk"] as const)[i], accessories: i % 3 === 0 ? ["gloves"] : i === 4 ? ["headband"] : [] }, 2320 + i);
      p.at(x, z);
      p.face(0, -0.9);
      scene.add(p.root);
      const stick = glowstick(glowCols[i]);
      stick.scale.set(2.5, 1.6, 2.5);
      stick.position.y = -0.12;
      const halo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), glow(glowCols[i], 0.3));
      halo.position.y = -0.14;
      p.handR.add(stick, halo);
      return { p, x, z, stick, halo };
    });

    sfx.ambient("crickets", 0.5);
    sfx.ambient("wind", 0.2);

    // 0-16 last words | 16-20 mourning | 20-22 crack glowsticks | 22-32 vigil | 32-35 he speaks again | 35-40 vigil resumes
    ctx.update((t) => {
      // elder
      elder.pose("lie", t);
      elder.root.rotation.y = 0;
      const raise = smooth(seg(t, 6, 8)) * (1 - smooth(seg(t, 15.2, 15.7)));
      const raise2 = smooth(seg(t, 32, 32.5)) * (1 - smooth(seg(t, 35, 35.4)));
      const rr = Math.max(raise, raise2);
      elder.armR.rotation.set(-1.5 * rr, 0, 1.2 * (1 - rr));
      if (rr > 0) elder.armR.rotation.x += Math.sin(t * 9) * 0.05 * rr; // trembling
      elder.head.rotation.y = rr > 0.2 ? 0.5 : 0;
      elder.head.rotation.x = -0.2 - rr * 0.4;

      const crack = t > 20 && t < 22;
      const vigil = t >= 22;
      mourners.forEach((m, i) => {
        const { p } = m;
        p.root.position.set(m.x, 0, m.z);
        p.face(0, -0.9);
        const lean = smooth(seg(t, 8, 10)) * (1 - smooth(seg(t, 15.5, 16.5)));
        if (t < 16) {
          p.pose("kneel", t);
          p.torso.rotation.x = 0.1 + lean * 0.45;
          if (t > 15.6) p.pose("bow", t, 1);
        } else if (t < 20) p.pose("bow", t, smooth(seg(t, 16, 17)));
        else if (crack) {
          p.pose("hold", t);
          const snap = seg(t, 20.3 + i * 0.15, 20.5 + i * 0.15);
          p.armR.rotation.x = -1.1 - snap * 0.3;
        } else {
          // vigil sway, staggered so it reads as a wave
          p.pose("idle", t);
          const up = smooth(seg(t, 22, 23.2));
          const sway = Math.sin(t * Math.PI * 1.1 + i * 0.5);
          p.armR.rotation.set(lerp(-1.1, -2.85, up), 0, 0.15 + sway * 0.35 * up);
          p.torso.rotation.z = sway * 0.1 * up;
          p.head.rotation.x = -0.25 * up;
          // freeze when he speaks again
          if (t > 32.2 && t < 35.4) {
            p.armR.rotation.set(-2.85, 0, 0.15);
            p.torso.rotation.z = 0;
            p.head.rotation.x = 0.3;
            p.head.rotation.y = 0;
            p.torso.rotation.x = -0.12; // recoil
          }
        }
        m.stick.visible = m.halo.visible = t > 20.3 + i * 0.15;
        const h = (m.halo.material as THREE.MeshBasicMaterial);
        h.opacity = 0.25 + 0.08 * Math.sin(t * 4 + i);
      });

      cLights.forEach((l, i) => (l.intensity = 3 + Math.sin(t * 17 + i * 3) * 0.3));
      cFlames.forEach((f, i) => f.scale.set(1, 1 + Math.sin(t * 15 + i) * 0.2, 1));
      // night deepens for the vigil so the glowsticks pop
      const dark = smooth(seg(t, 19, 23)) * (1 - smooth(seg(t, 39, 40)));
      world.hemi.intensity = lerp(0.75, 0.4, dark);
      world.sun.intensity = lerp(0.9, 0.45, dark);
      if (vigil) moon.rotation.y = t * 0.02;
    });

    // --- Sound ---
    ctx.at(0.4, () => sfx.ambient("droneSad", 0.35));
    ctx.at(6, () => sfx.heartbeat());
    ctx.at(7.2, () => sfx.heartbeat());
    ctx.at(10.5, () => sfx.moan(0.7));
    ctx.at(12.3, () => sfx.moan(0.65));
    ctx.at(14.1, () => sfx.moan(0.6));
    ctx.at(15.6, () => sfx.bell(330, 5));
    ctx.at(16.4, () => sfx.crowdGasp());
    for (let i = 0; i < N; i++) ctx.at(20.3 + i * 0.15, () => sfx.pop());
    ctx.at(21.5, () => sfx.stopAmbient("droneSad"));
    ctx.at(22, () => sfx.ambient("droneHoly", 0.4));
    ctx.at(23, () => sfx.shimmer());
    ctx.at(32, () => sfx.gasp());
    ctx.at(32.6, () => sfx.mumble(2.2, 0.6));
    ctx.at(35.2, () => sfx.bell(330, 4));
    ctx.at(39.6, () => sfx.stopAmbient("droneHoly"));

    // --- Narration ---
    ctx.caption(0.6, "Day 23. The Elder has inserted his last credit.", 4.5);
    ctx.caption(5.6, "He raises a trembling hand. The tribe leans in for his final wisdom.", 4.4);
    ctx.caption(10.3, "“Remember… the… slide…”", 5);
    ctx.caption(16.2, "Nobody knows which slide. There were so many slides.", 4);
    ctx.caption(22.4, "A glowstick vigil, as their ancestors once held for the idols.", 4.6);
    ctx.caption(27.4, "They sway at exactly 140 BPM. It is what he would have wanted.", 4.4);
    ctx.caption(32.3, "“…and the hold notes. Don't let go early.”", 3);
    ctx.caption(35.6, "He has been dying like this for three days. The vigil continues.", 4.3);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [5, 4.6, 5.5], look: [0, 0.4, -0.9] },
      { t: 5.5, pos: [2.4, 3.4, 2.4], look: [0, 0.6, -0.9] },
      { t: 9.5, pos: [0.4, 2.8, -0.6], look: [0, 0.6, -1.3], fov: 50 },
      { t: 15.5, pos: [0.3, 2.5, -0.9], look: [0, 0.6, -1.35], fov: 46 },
      { t: 16.5, pos: [0, 4.5, 3], look: [0, 0.4, -0.9] },
      { t: 21, pos: [-4.5, 2.2, 3.5], look: [0, 1.4, -0.9] },
      { t: 27, pos: [-5.5, 1.1, -2.5], look: [0, 1.8, -0.9] },
      { t: 31.5, pos: [-3.2, 1.0, -5.0], look: [0, 1.6, -0.9] },
      { t: 32.4, pos: [-0.3, 2.7, -0.7], look: [0, 0.6, -1.2], fov: 50 },
      { t: 35.5, pos: [-0.2, 2.6, -0.8], look: [0, 0.6, -1.25], fov: 46 },
      { t: 40, pos: [0, 5, 6.5], look: [0, 1, -0.9] },
    ]);
    ctx.flash(15.6, "#ffffff", 0.3);
    ctx.flash(20.4, "#39ff14", 0.25);
  },
};
export default scene;

// Day 25: Wasteland Games. Competitive air-rhythm in a desert arena, scored
// by judges with cardboard scorecards. First prize: one coin.
import * as THREE from "three";
import { box, mat, mesh } from "../engine/materials";
import { bump, easeOutBack, lerp, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { textPlane } from "../engine/textTexture";
import { Player } from "../kit/characters";
import { desert, setupWorld } from "../kit/environments";
import { cactus, campfire, coin, crate, placard, rock, tumbleweed } from "../kit/props";

const scene: SceneDef = {
  duration: 38,
  build(ctx) {
    const { scene, sfx } = ctx;
    setupWorld(ctx, { sky: 0xeaa060, fog: [22, 75], ground: 0x8a4a2b, sun: 0xffc48a, sunIntensity: 2.0, sunPos: [-10, 9, 6], shadowSize: 16 });
    desert(ctx, { color: 0xd99a5b, seed: 2501 });
    const r = rng(2502);

    // Arena ring of tires
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const tire = mesh(new THREE.TorusGeometry(0.32, 0.13, 5, 8), mat(0x1c1c1c));
      tire.rotation.x = Math.PI / 2;
      tire.position.set(Math.cos(a) * 7, 0.13, Math.sin(a) * 7);
      scene.add(tire);
      if (i % 2 === 0) {
        const t2 = tire.clone();
        t2.position.y = 0.38;
        scene.add(t2);
      }
    }
    // Junk bleachers behind the stage
    const bleach = new THREE.Group();
    const scrap = [0x7a6a5a, 0x8b5a2b, 0x5c6b73, 0x9c6b3a, 0x6e5a46];
    for (let tier = 0; tier < 3; tier++) {
      const y = 0.5 + tier * 0.55;
      bleach.add(box(9, 0.12, 0.8, r.pick(scrap), 0, y, -tier * 0.8));
      for (let x = -4; x <= 4; x += 2) bleach.add(box(0.12, y, 0.12, 0x555555, x + r.range(-0.2, 0.2), y / 2, -tier * 0.8));
    }
    bleach.add(box(9.2, 0.9, 0.1, 0x6c757d, 0, 2.4, -2.1));
    const bannerP = textPlane("WASTELAND GAMES", 6, 0.8, { bg: "#7b2d26", fg: "#ffe8a3", size: 80, border: "#2b1b10", borderWidth: 8 });
    bannerP.position.set(0, 3.3, -2.05);
    bleach.add(bannerP, box(0.12, 3.8, 0.12, 0x444444, -3.1, 1.9, -2.1), box(0.12, 3.8, 0.12, 0x444444, 3.1, 1.9, -2.1));
    bleach.position.set(0, 0, -4.2);
    scene.add(bleach);
    for (let i = 0; i < 6; i++) {
      const c = crate(r.range(0.5, 0.8), r.pick([0xa0703c, 0x8a5a2b]));
      const a = r.range(0.3, 2.8);
      c.position.set(Math.cos(a) * 8.5, 0, -Math.sin(a) * 8.5);
      c.rotation.y = r.range(0, 1);
      scene.add(c);
    }
    for (let i = 0; i < 6; i++) {
      const c = i % 2 ? cactus(r.range(1.2, 2)) : rock(r.range(0.4, 0.8), 2510 + i, 0xa0785a);
      const a = r.range(0, Math.PI * 2), d = r.range(12, 20);
      c.position.set(Math.cos(a) * d, c.position.y, Math.sin(a) * d);
      scene.add(c);
    }
    const weed = tumbleweed();
    scene.add(weed);

    // Burning barrels
    const fires = [-5, 5].map((x) => {
      const f = campfire(0.6);
      f.group.position.set(x, 0.8, 1);
      const barrel = mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 8), mat(0x6b3a1e));
      barrel.position.set(x, 0.4, 1);
      scene.add(barrel, f.group);
      return f;
    });

    // Stage
    scene.add(box(4.4, 0.3, 2.4, 0x5a4a3a, 0, 0.15, 0));
    scene.add(box(4.5, 0.05, 2.5, 0x8d6e4c, 0, 0.31, 0));

    // Contestants
    const A = new Player({ shirt: 0xe63946, hairStyle: "mohawk", hair: 0xff66aa, accessories: ["gloves", "headband"] }, 2520);
    const B = new Player({ shirt: 0x3a86ff, hairStyle: "long", hair: 0xeeeeee, accessories: ["gloves", "goggles", "cape"], robe: 0x222222 }, 2521);
    scene.add(A.root, B.root);
    const prize = coin();
    prize.scale.setScalar(3);
    prize.rotation.x = Math.PI / 2;
    prize.position.y = -0.05;
    B.handR.add(prize);

    // Judges at a table facing the stage
    const judgeTable = box(3.4, 0.08, 0.8, 0x8b5a2b, 0, 0.75, 4.2);
    scene.add(judgeTable, box(3.3, 0.7, 0.05, 0x6b4423, 0, 0.38, 3.85));
    const cards = ["9.5", "VIBES", "SS+"];
    const judges = cards.map((txt, i) => {
      const j = new Player({ shirt: [0x6c757d, 0x264653, 0x5c4033][i], hairStyle: (["bald", "bun", "cap"] as const)[i], accessories: i === 0 ? ["glasses", "beard"] : i === 1 ? ["glasses"] : ["mask"] }, 2530 + i);
      j.at((i - 1) * 1.1, 4.8, Math.PI);
      scene.add(j.root);
      const pc = placard(txt, 0.8, 0.55, { bg: "#ffffff", fg: i === 2 ? "#d4a017" : "#1b1b1b", size: txt.length > 3 ? 64 : 110 });
      pc.rotation.x = Math.PI;
      pc.position.y = -0.05;
      j.handR.add(pc);
      return { j, pc };
    });
    // stools
    judges.forEach(({ j }) => scene.add(box(0.4, 0.45, 0.4, 0x444444, j.root.position.x, 0.22, 4.85)));

    // Crowd on the bleachers
    const crowdP: { p: Player; x: number; y: number; z: number }[] = [];
    for (let tier = 0; tier < 3; tier++)
      for (let k = 0; k < 4; k++) {
        const p = new Player({ accessories: r.next() < 0.3 ? ["gloves"] : r.next() < 0.3 ? ["goggles"] : [] }, 2540 + tier * 10 + k);
        const x = -3.3 + k * 2.2 + (tier % 2) * 0.8 + r.range(-0.2, 0.2);
        crowdP.push({ p, x, y: 0.5 + tier * 0.55 + 0.06 - 0.45, z: -4.2 - tier * 0.8 + 0.05 });
        scene.add(p.root);
      }

    sfx.ambient("desert", 0.4);
    sfx.ambient("crowd", 0.35);

    // 0-5 establishing | 5-6 air horn | 6-12 A taps | 12-18 B slides | 18-24 both | 24-28 scores | 28-38 winner + coin
    ctx.update((t) => {
      fires.forEach((f) => f.update(t));
      weed.position.set(lerp(-14, 14, (t / 38) % 1), 0.4 + Math.abs(Math.sin(t * 3)) * 0.3, 9);
      weed.rotation.z = -t * 3;

      // contestants
      const enterK = smooth(seg(t, 3, 6));
      A.root.position.set(lerp(-6, -1.1, enterK), 0.32, 0.2);
      B.root.position.set(lerp(6, 1.1, enterK), 0.32, 0.2);
      if (enterK < 1) {
        A.pose("run", t);
        B.pose("run", t);
        A.face(-1.1, 0.2 + (enterK < 0.99 ? 0 : 1));
        A.root.rotation.y = Math.PI / 2;
        B.root.rotation.y = -Math.PI / 2;
      } else {
        A.root.rotation.y = 0.15;
        B.root.rotation.y = -0.15;
        const fury = 0.6 + smooth(seg(t, 18, 23)) * 0.8;
        if (t < 12) {
          A.pose("airTap", t * (1 + seg(t, 6, 12) * 0.6), 1.2);
          B.pose("idle", t);
          B.armL.rotation.set(-1.5, 0, -0.9);
          B.armR.rotation.set(-1.5, 0, 0.9); // arms crossed, unimpressed
        } else if (t < 18) {
          B.pose("slide", t * 1.8);
          B.torso.rotation.y *= 1.6;
          A.pose("sad", t);
          A.head.rotation.y = -0.6;
        } else if (t < 24) {
          A.pose(Math.floor(t * 1.5) % 2 ? "airTap" : "slide", t * 1.7, fury);
          B.pose(Math.floor(t * 1.5 + 1) % 2 ? "airTap" : "slide", t * 1.9, fury);
          A.root.position.y += Math.abs(Math.sin(t * 9)) * 0.12;
          B.root.position.y += Math.abs(Math.sin(t * 9 + 1)) * 0.12;
        } else if (t < 28.5) {
          // panting, waiting for the verdict
          A.pose("sad", t);
          B.pose("sad", t);
          A.torso.rotation.x = 0.5 + Math.sin(t * 8) * 0.06;
          B.torso.rotation.x = 0.5 + Math.sin(t * 8 + 1) * 0.06;
          A.head.rotation.x = B.head.rotation.x = -0.2;
        } else {
          // B wins one coin; A faints
          B.pose("cheer", t, 1);
          B.armL.rotation.x = -0.4;
          A.pose("faint", t, smooth(seg(t, 29, 30.2)));
          A.root.rotation.y = 0.15 + Math.PI;
        }
      }
      prize.visible = t > 28.5;
      prize.rotation.z = t * 4;

      // judges
      judges.forEach(({ j, pc }, i) => {
        const up = easeOutBack(seg(t, 24.5 + i * 1.1, 25.1 + i * 1.1)) * (1 - smooth(seg(t, 33, 34)));
        j.pose("sit", t);
        j.root.position.y = 0;
        j.armR.rotation.set(lerp(-0.5, -2.9, up), 0, 0.1);
        pc.visible = up > 0.05;
        if (t < 24.5 && t > 6) j.head.rotation.y = Math.sin(t * 0.7 + i) * 0.4; // stroking chins
        if (i === 0 && t > 6 && t < 24) j.armL.rotation.set(-2.2, 0, -0.4);
      });

      // crowd
      crowdP.forEach(({ p, x, y, z }, i) => {
        p.root.position.set(x, y, z);
        p.face(0, 2);
        const hype = bump(t, 5.5, 7.5) + bump(t, 17, 24.5) + (t > 28 && t < 34 ? 1 : 0);
        if (hype > 0.4 && (i + Math.floor(t * 2)) % 3 !== 0) {
          p.pose("cheer", t + i, 0.5);
          p.root.position.y = y + 0.4;
        } else {
          p.pose("sit", t);
          if (t > 12 && t < 18) p.head.rotation.z = Math.sin(i) * 0.3; // pretending to understand
        }
      });
    });

    // --- Sound ---
    ctx.at(5.3, () => sfx.airHorn());
    ctx.at(5.6, () => sfx.cheer(2.2));
    for (let s = 6.3; s < 12; s += 0.25) ctx.at(s, () => sfx.tap());
    for (let s = 12.5; s < 18; s += 1.0) ctx.at(s, () => sfx.whoosh(0.7));
    for (let s = 18; s < 24; s += 0.17) ctx.at(s, () => sfx.tap());
    ctx.at(19, () => sfx.cheer(4));
    ctx.at(24, () => sfx.dramaticChord());
    [24.6, 25.7, 26.8].forEach((s) => ctx.at(s, () => sfx.ding()));
    ctx.at(28.5, () => sfx.airHorn());
    ctx.at(28.8, () => sfx.cheer(3));
    ctx.at(29.8, () => sfx.thud());
    ctx.at(31, () => sfx.coin());
    ctx.at(34.5, () => sfx.airHorn());

    // --- Narration ---
    ctx.caption(0.6, "Day 25. The Wasteland Games. Admission: one bottle cap.", 4.4);
    ctx.caption(6, "The sport: competitive air-rhythm. The chart: imaginary. The stakes: very real.", 5);
    ctx.caption(12.3, "The challenger answers with an imaginary slide. The crowd pretends to understand.", 5);
    ctx.caption(18.3, "No notes. No score. No sound. Only pure, unverifiable skill.", 5);
    ctx.caption(24.4, "The judges confer. Scoring is rigorous and entirely made up.", 4);
    ctx.caption(28.8, "A winner. First prize: one coin.", 3.4);
    ctx.caption(32.6, "There is nothing left to spend it on. The crowd goes wild anyway.", 5);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [0, 7, 14], look: [0, 1, -1] },
      { t: 5, pos: [0, 3, 8], look: [0, 1.4, 0] },
      { t: 6.5, pos: [-3.5, 1.4, 3.5], look: [-1.1, 1.4, 0] },
      { t: 11.5, pos: [-2.6, 1.2, 2.6], look: [-1.1, 1.5, 0], fov: 45 },
      { t: 12.5, pos: [3.4, 1.5, 3.2], look: [1.1, 1.4, 0] },
      { t: 17.5, pos: [2.6, 1.3, 2.6], look: [1.1, 1.5, 0], fov: 45 },
      { t: 18.5, pos: [6, 2.5, 4], look: [0, 1.3, 0] },
      { t: 23.5, pos: [-6, 2.2, 4.5], look: [0, 1.3, 0] },
      { t: 24.3, pos: [0, 1.7, 1.6], look: [0, 1.6, 4.8], fov: 55 },
      { t: 28, pos: [0, 1.8, 1.8], look: [0, 1.9, 4.8], fov: 55 },
      { t: 29, pos: [2.5, 1.6, 4.5], look: [0.8, 1.4, 0] },
      { t: 33, pos: [3.4, 2.0, 3.8], look: [0.6, 1.6, 0.2], fov: 45 },
      { t: 38, pos: [0, 7, 14], look: [0, 1, -1] },
    ]);
    ctx.shake(5.3, 0.06, 0.5);
    ctx.flash(28.5, "#ffe8a3", 0.4);
  },
};
export default scene;

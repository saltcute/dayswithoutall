// Day 14: SOS. Survivors spell "ALL.NET" with arcade cards on a rooftop.
// A helicopter flies over, they wave, it does not stop. It drops a note.
import * as THREE from "three";
import { box, glow, mat, mesh } from "../engine/materials";
import { hop, lerp, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { textPlane } from "../engine/textTexture";
import { Player } from "../kit/characters";
import { card, CARD_COLORS, helicopter } from "../kit/props";
import { setupWorld, skyline } from "../kit/environments";

// 5-row pixel glyphs
const GLYPHS: Record<string, string[]> = {
  A: [".#.", "#.#", "###", "#.#", "#.#"],
  L: ["#..", "#..", "#..", "#..", "###"],
  ".": [".", ".", ".", ".", "#"],
  N: ["#..#", "##.#", "#.##", "#..#", "#..#"],
  E: ["###", "#..", "##.", "#..", "###"],
  T: ["###", ".#.", ".#.", ".#.", ".#."],
};

const scene: SceneDef = {
  duration: 38,
  build(ctx) {
    const { scene, sfx } = ctx;
    setupWorld(ctx, { sky: 0xa9c8e6, fog: [35, 120], ground: 0x55606a, hemi: 1.0, sun: 0xfff4e0, sunIntensity: 1.7, sunPos: [10, 18, 6], shadowSize: 14 });
    const r = rng(1414);

    // --- Rooftop ---
    const RW = 20, RD = 14;
    scene.add(box(RW, 0.4, RD, 0x7d7f85, 0, -0.2, 0));
    scene.add(box(RW - 0.4, 30, RD - 0.4, 0x5c6170, 0, -15.4, 0));
    for (const s of [-1, 1]) {
      scene.add(box(RW, 0.6, 0.25, 0x6a6c72, 0, 0.3, (s * RD) / 2));
      scene.add(box(0.25, 0.6, RD, 0x6a6c72, (s * RW) / 2, 0.3, 0));
    }
    // roof clutter: stair hut, AC units, water tower, antenna
    scene.add(box(2.4, 2.4, 2, 0x8d8f96, -7.6, 1.2, -5));
    scene.add(box(0.9, 1.8, 0.05, 0x3d405b, -7.6, 0.9, -3.98));
    for (let i = 0; i < 3; i++) {
      scene.add(box(1.2, 0.9, 1, 0xb8bcc4, 6 + i * 1.4, 0.45, -5.6));
      const fan = mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 8), mat(0x444444));
      fan.position.set(6 + i * 1.4, 0.92, -5.6);
      scene.add(fan);
    }
    const tower = new THREE.Group();
    tower.add(mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.8, 10), mat(0x8b5a2b)));
    tower.children[0].position.y = 3.2;
    const roof = mesh(new THREE.ConeGeometry(1.2, 0.7, 10), mat(0x5c3a1e));
    roof.position.y = 4.45;
    tower.add(roof);
    for (const [x, z] of [[0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) tower.add(box(0.1, 2.3, 0.1, 0x444444, x, 1.15, z));
    tower.position.set(7.8, 0, 4.6);
    scene.add(tower);
    scene.add(box(0.06, 5, 0.06, 0x999999, -8.8, 2.5, 5.6));
    const beacon = mesh(new THREE.IcosahedronGeometry(0.12, 0), glow(0xff3344));
    beacon.position.set(-8.8, 5.05, 5.6);
    scene.add(beacon);

    // Neighbouring buildings + far skyline
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + r.range(-0.1, 0.1);
      const d = r.range(18, 30);
      const h = r.range(14, 40);
      const top = r.range(-12, 9);
      const b = box(r.range(5, 9), h, r.range(5, 9), r.pick([0x6d7489, 0x8a8f9e, 0x7a6f80, 0x5b6478]), Math.cos(a) * d, top - h / 2, Math.sin(a) * d);
      b.castShadow = false;
      scene.add(b);
    }
    skyline(ctx, 70, 0x8794ad, 44, 14);

    // --- The message: cards laid in pixel letters ---
    const CELL = 0.56;
    const word = ["A", "L", "L", ".", "N", "E", "T"];
    const cols = word.reduce((n, ch) => n + GLYPHS[ch][0].length, 0) + word.length - 1;
    const cells: { x: number; z: number }[] = [];
    let cx = 0;
    for (const ch of word) {
      const g = GLYPHS[ch];
      for (let col = 0; col < g[0].length; col++)
        for (let row = 0; row < 5; row++) if (g[row][col] === "#") cells.push({ x: (cx + col - (cols - 1) / 2) * CELL, z: (row - 2) * CELL - 0.6 });
      cx += g[0].length + 1;
    }
    // placement order: left to right
    cells.sort((a, b) => a.x - b.x || a.z - b.z);
    // five workers, each takes a contiguous chunk of the message
    const chunk = Math.ceil(cells.length / 5);
    const cards = cells.map((c, i) => {
      const m = card(CARD_COLORS[(i * 7) % CARD_COLORS.length]);
      m.scale.set(1.6, 1, 2.4);
      m.castShadow = false;
      scene.add(m);
      const k = i % chunk;
      return { m, ...c, worker: Math.floor(i / chunk), at: 1 + (k / chunk) * 10.2, spin: r.range(-0.12, 0.12) };
    });

    // --- Survivors ---
    const crew = [
      new Player({ shirt: 0xfb5607, hairStyle: "cap", hair: 0x3a86ff, accessories: ["backpack"] }, 1401),
      new Player({ shirt: 0xffd166, hairStyle: "twin", hair: 0x222222, accessories: ["gloves"] }, 1402),
      new Player({ shirt: 0x06d6a0, hairStyle: "spiky", hair: 0xff66aa }, 1403),
      new Player({ shirt: 0x8e44ad, hairStyle: "long", hair: 0xd4a017, accessories: ["towel"] }, 1404),
      new Player({ shirt: 0xe63946, hairStyle: "short", accessories: ["glasses", "headband"] }, 1405),
    ];
    crew.forEach((p) => scene.add(p.root));
    const waitSpots: [number, number][] = [[-3.4, 2.4], [-1.5, 2.9], [0.4, 2.6], [2.2, 3.0], [4.0, 2.5]];

    // --- Helicopter + dropped note ---
    const heli = helicopter();
    heli.scale.setScalar(1.4);
    heli.rotation.y = Math.PI / 2;
    scene.add(heli);
    const note = textPlane(["HAVE YOU TRIED", "TURNING IT OFF", "AND ON AGAIN?"], 0.8, 0.6, { bg: "#fffbe6", fg: "#1d3557", size: 34, border: "#c1121f", borderWidth: 6 });
    scene.add(note);
    const NOTE_X = 0.9, NOTE_Z = 4.4;

    sfx.ambient("wind", 0.8);

    ctx.update((t) => {
      // cards drop into place
      cards.forEach((c) => {
        const k = seg(t, c.at, c.at + 0.4);
        c.m.visible = t >= c.at;
        c.m.position.set(c.x, 0.02 + (1 - k) * 0.9, c.z + (1 - k) * 0.4);
        c.m.rotation.set((1 - k) * 0.8, c.spin + (1 - k) * 2, 0);
      });

      // heli: flies along +x high overhead
      const hx = lerp(-70, 70, seg(t, 17, 30));
      heli.position.set(hx, 13 + Math.sin(t * 1.3) * 0.3, -5);
      heli.rotation.z = -0.12;
      heli.rotor.rotation.y = t * 31;
      heli.tail.rotation.x = t * 40;
      heli.visible = t > 16.5 && t < 30.5;

      // note: released at x≈4 (t≈24.4) and flutters down
      const nk = seg(t, 24.4, 30);
      note.visible = t > 24.4;
      note.position.set(lerp(4, NOTE_X, nk) + Math.sin(t * 2.6) * 0.8 * (1 - nk), lerp(12, 0.03, smooth(nk) * 0.3 + nk * 0.7), lerp(-5, NOTE_Z, nk));
      note.rotation.set(-Math.PI / 2 + Math.sin(t * 3.1) * 0.9 * (1 - nk), 0, Math.sin(t * 2.6) * 0.6 * (1 - nk));

      crew.forEach((p, i) => {
        const [wx, wz] = waitSpots[i];
        const mine = cards.filter((c) => c.worker === i);
        if (t < 12) {
          // walk to my next card, crouch, place it
          let idx = mine.findIndex((c) => c.at + 0.4 > t);
          if (idx < 0) idx = mine.length - 1;
          const c = mine[idx];
          const prev = mine[Math.max(0, idx - 1)];
          const tx = c.x, tz = c.z + 0.75;
          const mk = smooth(seg(t, (idx > 0 ? prev.at + 0.4 : 0), c.at - 0.3));
          const px = idx > 0 ? prev.x : wx * 0.3, pz = idx > 0 ? prev.z + 0.75 : 4;
          p.root.position.set(lerp(px, tx, mk), 0, lerp(pz, tz, mk));
          if (mk < 1 && mk > 0) {
            p.face(tx, tz);
            p.root.rotation.y = Math.atan2(tx - px, tz - pz);
            p.pose("walk", t);
          } else {
            p.root.rotation.y = Math.PI;
            p.pose("dig", t);
          }
        } else {
          const lastC = mine[mine.length - 1];
          const mk = smooth(seg(t, 12, 14));
          p.root.position.set(lerp(lastC.x, wx, mk), 0, lerp(lastC.z + 0.75, wz, mk));
          const hxNow = heli.position.x;
          if (mk < 1) {
            p.root.rotation.y = Math.atan2(wx - lastC.x, wz - lastC.z - 0.75);
            p.pose("walk", t);
          } else if (t < 17.5) {
            p.face(0, -0.6);
            p.pose(i === 2 ? "point" : "idle", t);
          } else if (t < 20) {
            p.face(hxNow, -5);
            p.pose(i % 2 ? "point" : "reach", t, 1);
            p.armR.rotation.x = -2.4;
            p.head.rotation.x = -0.6;
          } else if (t < 27) {
            p.face(hxNow, -5);
            p.pose("cheer", t + i * 0.3, 1);
          } else if (t < 29.5) {
            p.face(hxNow, -5);
            p.pose("stop", t);
            p.head.rotation.x = -0.4;
          } else if (t < 34) {
            p.face(NOTE_X, NOTE_Z);
            p.pose(i === 2 ? "reach" : "idle", t, 0.6);
            p.head.rotation.x = 0.5;
          } else {
            p.face(NOTE_X, NOTE_Z);
            p.pose(i % 2 ? "sitFloor" : "sad", t);
          }
        }
        // little hop on landing of each card (keeps it lively)
        if (t < 12) p.body.position.y += hop(seg(t % 1.7, 0, 0.3), 0.02);
      });
      beacon.visible = Math.sin(t * 4) > 0;
      tower.visible = t < 12 || t > 17.2;
    });

    // --- Sound ---
    cards.forEach((c, i) => {
      if (i % 2 === 0) ctx.at(c.at + 0.4, () => sfx.noise(0.06, { type: "highpass", freq: 2500, gain: 0.08 }));
    });
    ctx.at(2, () => sfx.mumble(1.4, 1.1, -0.3));
    ctx.at(8, () => sfx.mumble(1.0, 0.9, 0.3));
    ctx.at(12.2, () => sfx.shimmer());
    ctx.at(16.5, () => sfx.ambient("chopper", 0.9));
    ctx.at(19.8, () => sfx.shout(1.1));
    ctx.at(20.2, () => sfx.cheer(4));
    ctx.at(22.5, () => sfx.shout(1.3));
    ctx.at(24.3, () => sfx.cheer(3));
    ctx.at(27.2, () => sfx.shout(0.8));
    ctx.at(29.5, () => sfx.stopAmbient("chopper"));
    ctx.at(30, () => sfx.noise(0.2, { type: "highpass", freq: 2000, gain: 0.08 }));
    ctx.at(31.4, () => sfx.cricket(0.2));
    ctx.at(34, () => sfx.sadTrombone());
    ctx.at(37.9, () => sfx.stopAmbient("chopper"));

    // --- Narration ---
    ctx.caption(0.8, "Day 14. A rooftop. The survivors attempt contact with the outside world.", 4.6);
    ctx.caption(5.8, "The message must be visible from the sky. They use the only resource left in abundance.", 5.2);
    ctx.caption(12.2, "Fifty-four arcade cards. Combined balance: unreachable.", 4.2);
    ctx.caption(17.2, "A sound. A machine. A sign from above.", 3.4);
    ctx.caption(21, "They wave with the energy of a final-stage combo.", 4.2);
    ctx.caption(25.6, "It did not stop. But it did leave a message.", 4.4);
    ctx.caption(30.8, "Tech support has been reached.", 3.4);
    ctx.caption(34.4, "Rescue is not coming. But the advice is solid.", 3.5);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [9, 5.5, 12], look: [0, 0, 0] },
      { t: 5.6, pos: [-6, 2.6, 5.6], look: [-1, 0.3, -0.6] },
      { t: 11, pos: [3, 2.6, 5], look: [1, 0, -0.5] },
      { t: 12.5, pos: [0, 12.5, 2.2], look: [0, 0, -0.5] },
      { t: 16.6, pos: [0, 11.5, 2.6], look: [0, 0, -0.5] },
      { t: 17.4, pos: [3.5, 1.3, 7.5], look: [-6, 7, -5] },
      { t: 22, pos: [2.5, 1.2, 7.5], look: [0, 7, -5] },
      { t: 25.5, pos: [4, 2, 9], look: [4, 5, -3] },
      { t: 29.2, pos: [3, 2.2, 8], look: [1, 1, 3] },
      { t: 30.6, pos: [NOTE_X, 1.25, NOTE_Z + 0.6], look: [NOTE_X, 0, NOTE_Z], fov: 42 },
      { t: 34, pos: [NOTE_X, 1.05, NOTE_Z + 0.5], look: [NOTE_X, 0, NOTE_Z], fov: 42 },
      { t: 34.4, pos: [-6, 6.5, 13], look: [0, 0.4, 0.5], fov: 50 },
      { t: 38, pos: [-5, 7.5, 12], look: [0, 0.4, 0.5] },
    ]);
    ctx.shake(23.5, 0.08, 1.5);
  },
};
export default scene;

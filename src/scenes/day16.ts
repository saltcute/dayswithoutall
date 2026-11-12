// Day 16: The Offering. In a storm, raincoated pilgrims lay coins and cards
// on a stone altar before a sacred cabinet. Lightning strikes. For one frame
// the screen says ONLINE. Then NETWORK ERROR again.
import * as THREE from "three";
import { box, glow } from "../engine/materials";
import { easeIn, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { Player } from "../kit/characters";
import { cabinet } from "../kit/cabinets";
import { card, CARD_COLORS, coin, coinPile, fallingParticles, rock } from "../kit/props";
import { setupWorld, terrain } from "../kit/environments";

const scene: SceneDef = {
  duration: 40,
  build(ctx) {
    const { scene, sfx } = ctx;
    const world = setupWorld(ctx, { sky: 0x1b2440, fog: [12, 55], ground: 0x101418, hemi: 0.95, sun: 0x9fb4ff, sunIntensity: 0.6, sunPos: [-6, 12, 4] });
    const r = rng(1616);
    const g = terrain(120, 40, 1.2, 0x2f3d36, 16, 7);
    scene.add(g);

    // --- Hilltop shrine ---
    const AZ = -1.2;
    scene.add(box(2.2, 0.85, 1.1, 0x6e6a64, 0, 0.425, AZ));
    scene.add(box(2.5, 0.12, 1.3, 0x86817a, 0, 0.91, AZ));
    // standing stones ring
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.05 + (i / 8) * 0.9) + Math.PI;
      const h = r.range(2.2, 3.4);
      const st = box(0.8, h, 0.5, 0x5f5d5a, Math.cos(a) * 6, h / 2 - 0.1, Math.sin(a) * 6 - 1);
      st.rotation.set(r.range(-0.08, 0.08), -a, r.range(-0.08, 0.08));
      scene.add(st);
    }
    for (let i = 0; i < 10; i++) {
      const k = rock(r.range(0.3, 0.7), 160 + i, 0x55524e);
      const a = r.range(0, Math.PI * 2), d = r.range(4, 12);
      k.position.set(Math.cos(a) * d, k.position.y, Math.sin(a) * d);
      scene.add(k);
    }
    // the sacred cabinet, with an improvised lightning rod
    const cab = cabinet("lever", 0xc77dff);
    cab.group.position.set(0, 0, -2.7);
    scene.add(cab.group);
    scene.add(box(0.05, 1.6, 0.05, 0xb0b0b0, 0.35, 3.1, -2.85));
    scene.add(box(0.12, 0.12, 0.12, 0xd0d0d0, 0.35, 3.92, -2.85));
    const screenLight = new THREE.PointLight(0xff3355, 3, 6, 1.6);
    screenLight.position.set(0, 1.6, -2);
    scene.add(screenLight);

    // offerings on the altar
    const pile = coinPile(70, 1616, 0.32);
    pile.position.set(-0.45, 0.97, AZ);
    scene.add(pile);
    const offerCards = Array.from({ length: 6 }, (_, i) => {
      const c = card(CARD_COLORS[i]);
      c.position.set(0.35 + (i % 3) * 0.2, 0.98 + i * 0.012, AZ - 0.15 + Math.floor(i / 3) * 0.3);
      c.rotation.y = -0.4 + i * 0.25;
      scene.add(c);
      return c;
    });
    const loyalty = card(0xffffff);
    loyalty.scale.setScalar(0.8);
    loyalty.position.set(0.7, 1.06, AZ + 0.35);
    loyalty.rotation.y = 0.5;
    scene.add(loyalty);
    // extra coins that rain onto the pile later
    const extra = Array.from({ length: 24 }, () => {
      const c = coin();
      scene.add(c);
      return { c, x: r.range(-0.75, -0.1), z: AZ + r.range(-0.3, 0.3), at: r.range(30, 33.5), spin: r.range(4, 9) };
    });

    // lightning bolt (sky → rod)
    const bolt = new THREE.Group();
    let px = 0.35, py = 26;
    const boltM = glow(0xe8f0ff);
    while (py > 3.95) {
      const ny = Math.max(3.95, py - r.range(1.5, 3));
      const nx = ny <= 3.95 ? 0.35 : r.range(-1.2, 1.6);
      const len = Math.hypot(nx - px, ny - py);
      const s = box(0.09, len, 0.09, boltM, (px + nx) / 2, (py + ny) / 2, -2.85);
      s.rotation.z = Math.atan2(-(nx - px), ny - py);
      s.castShadow = false;
      bolt.add(s);
      px = nx;
      py = ny;
    }
    scene.add(bolt);
    const strikeLight = new THREE.PointLight(0xdde8ff, 0, 30, 1.2);
    strikeLight.position.set(0.35, 6, -2);
    scene.add(strikeLight);

    const rain = fallingParticles(1400, [34, 22, 34], 0x9fb0d0, 14, 0.07);
    scene.add(rain.points);

    // --- Pilgrims in raincoats ---
    const coats = [0xe9c46a, 0x2a9d8f, 0xe76f51, 0xe9c46a, 0x457b9d, 0xf4a261];
    const pilgrims = coats.map((c, i) => {
      const p = new Player({ accessories: ["robe", "hood"], robe: c, skin: r.pick([0xf5d0b0, 0xc98e66, 0xe8b894]) }, 1600 + i);
      scene.add(p.root);
      const a = Math.PI / 2 + (i - 2.5) * 0.36;
      return { p, hx: Math.cos(a) * 2.9, hz: AZ + Math.sin(a) * 2.9, at: 5.5 + i * 1.9 };
    });
    // the one who raises a metal rod at the end
    const rod = box(0.04, 1.6, 0.04, 0xb0b0b0, 0, -0.5, 0.05);
    pilgrims[2].p.handR.add(rod);

    sfx.ambient("rain", 0.9);
    sfx.ambient("wind", 0.4);

    const STRIKE = 21.5;
    ctx.update((t, dt) => {
      rain.update(dt);
      // offerings appear as pilgrims give them
      const given = pilgrims.filter((p) => t > p.at + 0.9).length;
      const nCoins = Math.floor((given / pilgrims.length) * 50) + (given > 0 ? 8 : 0);
      pile.children.forEach((c, i) => (c.visible = i < nCoins || t > 33.5));
      offerCards.forEach((c, i) => (c.visible = t > 11.5 + i * 0.35 && t < 99));
      loyalty.visible = t > pilgrims[4].at + 0.9;
      extra.forEach((e) => {
        const k = easeIn(seg(t, e.at, e.at + 0.6));
        e.c.visible = t > e.at;
        e.c.position.set(e.x, 2.6 - k * 1.6, e.z);
        e.c.rotation.set(t * e.spin * (1 - k), 0, t * e.spin * 0.5 * (1 - k));
      });

      // the strike
      const striking = t > STRIKE && t < STRIKE + 0.3;
      bolt.visible = striking && Math.sin(t * 90) > -0.4;
      strikeLight.intensity = striking ? 60 : 0;
      const online = t > STRIKE + 0.05 && t < STRIKE + 0.2;
      cab.setScreen(online ? "online" : t > STRIKE + 0.2 && t < STRIKE + 0.7 ? "boot" : "error");
      cab.screenMat.color.setScalar(t > STRIKE + 0.2 && t < STRIKE + 0.7 && Math.sin(t * 60) > 0 ? 0.3 : 1);
      screenLight.color.set(online ? 0x33ff88 : 0xff3355);
      screenLight.intensity = 3 + Math.sin(t * 7) * 0.4;
      // distant sheet lightning
      const far = [3, 9.6, 15.2, 19.8, 27.5, 36].some((s) => t > s && t < s + 0.12) || striking;
      world.hemi.intensity = far ? 2.4 : 0.95;
      world.sun.intensity = far ? 2.2 : 0.6;

      pilgrims.forEach(({ p, hx, hz, at }, i) => {
        const ax = hx * 0.45, az = AZ + 0.95;
        const go = smooth(seg(t, at - 0.9, at)), back = smooth(seg(t, at + 1.0, at + 1.8));
        const k = go - back;
        p.root.position.set(hx + (ax - hx) * k, 0, hz + (az - hz) * k);
        p.face(0, AZ);
        if (t < at - 0.9 || (t > at + 1.8 && t < 17)) p.pose(t < at ? "idle" : "kneel", t);
        else if (t < 17 && (go < 1 || back > 0)) p.pose("walk", t);
        else if (t < 17) p.pose("reach", t, seg(t, at, at + 0.4));
        else if (t < STRIKE) p.pose("worship", t * 1.2 + i * 0.4);
        else if (t < STRIKE + 1.2) {
          p.pose("cheer", t, 0.3);
          p.head.rotation.x = -0.4;
        } else if (t < 29.5) p.pose(i % 2 ? "sad" : "stop", t);
        else if (t < 33.5) {
          // more coins
          p.root.position.set(hx * 0.7, 0, hz * 0.7 + AZ * 0.3);
          p.face(0, AZ);
          p.pose("reach", t, 1);
          p.armL.rotation.x = -1.5;
        } else if (i === 2) {
          // Lightning rod volunteer
          p.root.position.set(hx * 0.7, 0, hz * 0.7 + AZ * 0.3);
          p.pose("idle", t);
          p.armR.rotation.set(-2.9, 0, 0.1);
          p.head.rotation.x = -0.4;
        } else {
          p.root.position.set(hx * 0.7, 0, hz * 0.7 + AZ * 0.3);
          p.pose("kneel", t);
          p.head.rotation.x = -0.3;
        }
        rod.visible = t > 33.5;
      });
    });

    // --- Sound ---
    ctx.at(0.3, () => sfx.ambient("droneTense", 0.3));
    [3, 9.6, 15.2, 27.5].forEach((s) => ctx.at(s + 0.8, () => sfx.thud()));
    pilgrims.forEach(({ at }, i) => {
      ctx.at(at + 0.1, () => (i % 2 ? sfx.cardSwipe() : sfx.coinDrop(6)));
      ctx.at(at - 0.6, () => sfx.footstep(0));
      ctx.at(at - 0.3, () => sfx.footstep(0.1));
    });
    ctx.at(17, () => sfx.chant(98, 3));
    ctx.at(19.2, () => sfx.heartbeat());
    ctx.at(20.2, () => sfx.heartbeat());
    ctx.at(STRIKE, () => {
      sfx.thunder();
      sfx.boom();
    });
    ctx.at(STRIKE + 0.06, () => sfx.bootJingle());
    ctx.at(STRIKE + 0.25, () => sfx.glitch(0.5));
    ctx.at(STRIKE + 0.7, () => sfx.errorBeep(2));
    ctx.at(STRIKE + 1.1, () => sfx.crowdGasp());
    ctx.at(26.2, () => sfx.sadTrombone());
    for (let s = 30; s < 33.5; s += 0.25) ctx.at(s, () => sfx.coinDrop(2));
    ctx.at(35.5, () => sfx.dunDunDun());
    ctx.at(39.8, () => sfx.stopAmbient("droneTense"));

    // --- Narration ---
    ctx.caption(0.8, "Day 16. The elders have determined the gods are hungry. For coins, obviously.", 5);
    ctx.caption(6.2, "Each pilgrim gives what they can. Mostly coins. One ramen-shop loyalty card.", 5);
    ctx.caption(11.8, "Arcade cards are offered too. Their stored credits were going nowhere anyway.", 5);
    ctx.caption(17.2, "The sky answers.", 3);
    ctx.caption(22.3, "For one frame, it was ONLINE.", 3.5);
    ctx.caption(26.1, "Then it was not.", 3);
    ctx.caption(29.6, "Someone suggests more coins. The motion carries unanimously.", 4.6);
    ctx.caption(34.6, "Scientists remind the faithful that lightning is not a network protocol.", 5);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [0, 3.2, 12], look: [0, 1.6, -2] },
      { t: 5.6, pos: [3.6, 1.7, 2.8], look: [0, 1, -1.4] },
      { t: 11.3, pos: [-3.2, 1.9, 2.2], look: [0, 1, -1.4] },
      { t: 11.6, pos: [2.0, 1.9, -0.3], look: [0.1, 1.0, AZ], fov: 42 },
      { t: 16.8, pos: [1.8, 1.8, -0.1], look: [0, 1.1, AZ], fov: 42 },
      { t: 17.2, pos: [-5, 2.2, 6.5], look: [0, 2.2, -2] , fov: 50 },
      { t: 21.4, pos: [-2, 1.6, 7], look: [0, 2.6, -2.5] },
      { t: 22.2, pos: [0.25, 1.75, -0.9], look: [0, 1.6, -2.7], fov: 45 },
      { t: 28.8, pos: [0.15, 1.7, -1.2], look: [0, 1.6, -2.7], fov: 40 },
      { t: 29.4, pos: [3.8, 2.4, 3.8], look: [-0.3, 1, -1.2], fov: 50 },
      { t: 33.8, pos: [3, 2.6, 4.4], look: [-0.3, 1, -1.2] },
      { t: 34.4, pos: [-1.5, 0.6, 4.8], look: [0, 2.6, -1.4] },
      { t: 40, pos: [-2.4, 0.8, 6], look: [0, 2.4, -1.4] },
    ]);
    ctx.shake(STRIKE, 0.35, 1);
    ctx.flash(STRIKE, "#ffffff", 0.5);
  },
};
export default scene;

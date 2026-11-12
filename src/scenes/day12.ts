// Day 12: The Shambling. Hollow-eyed players shuffle down a ruined street at
// dusk, air-tapping and moaning "raaatiiing…". A civilian backs away slowly,
// until her phone plays a full-combo jingle.
import * as THREE from "three";
import { box, glow, mesh } from "../engine/materials";
import { rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { Player } from "../kit/characters";
import { cabinet } from "../kit/cabinets";
import { rock, truck } from "../kit/props";
import { setupWorld, street } from "../kit/environments";

const scene: SceneDef = {
  duration: 37,
  build(ctx) {
    const { scene, sfx } = ctx;
    const world = setupWorld(ctx, {
      sky: 0x9a5a6e, fog: [14, 60], ground: 0x2a1a2a, hemi: 0.75,
      sun: 0xff9055, sunIntensity: 1.6, sunPos: [-5, 5, -22], shadowSize: 18,
    });
    street(ctx, { ruined: true, length: 56, seed: 12 });
    const fill = new THREE.DirectionalLight(0xa08cd8, 0.9);
    fill.position.set(3, 5, 20);
    scene.add(fill);
    const r = rng(1212);

    // Setting sun disc at the end of the street
    const sunDisc = mesh(new THREE.CircleGeometry(4, 16), new THREE.MeshBasicMaterial({ color: 0xffb36b, fog: false }), false, false);
    sunDisc.position.set(-2, 5, -80);
    scene.add(sunDisc);

    // Wreckage
    const wreck = truck(0x6b4f3a);
    // wreckage stays by the kerbs, clear of the shambling lanes (|x| < ~2.7)
    wreck.position.set(-3.3, 0.7, -5.5);
    wreck.rotation.set(0, 0.35, Math.PI / 2.1);
    scene.add(wreck);
    const fallen = cabinet("round");
    fallen.group.position.set(3.9, 0.6, 0.0);
    fallen.group.rotation.set(-1.45, 0, 0.3);
    scene.add(fallen.group);
    const standing = cabinet("slider");
    standing.group.position.set(4.6, 0.15, -9);
    standing.group.rotation.y = -1.2;
    scene.add(standing.group);
    for (let i = 0; i < 14; i++) {
      const d = rock(r.range(0.15, 0.4), 120 + i, r.pick([0x5a5a5a, 0x6b5b4b, 0x444444]));
      const rx = r.range(-3, 3);
      d.position.set(Math.sign(rx) * (3.0 + Math.abs(rx) * 0.15), d.position.y, r.range(-22, 14));
      scene.add(d);
    }
    // scattered flyers
    for (let i = 0; i < 10; i++) {
      const f = box(0.3, 0.005, 0.4, 0xeeeedd, r.range(-2.8, 2.8), 0.01, r.range(-15, 12));
      f.rotation.y = r.range(0, 3);
      scene.add(f);
    }
    // flickering street lamp
    const lampPole = new THREE.Group();
    lampPole.add(box(0.12, 4, 0.12, 0x333333, 0, 2, 0), box(1.2, 0.1, 0.12, 0x333333, -0.55, 4, 0));
    const bulb = box(0.4, 0.12, 0.3, glow(0xffe0a0), -1.05, 3.92, 0);
    lampPole.add(bulb);
    const lampLight = new THREE.PointLight(0xffd8a0, 6, 10, 1.6);
    lampLight.position.set(-1.05, 3.7, 0);
    lampPole.add(lampLight);
    lampPole.position.set(3.4, 0.15, -2);
    scene.add(lampPole);

    // The afflicted
    const zombies = Array.from({ length: 8 }, (_, i) =>
      new Player({
        skin: r.pick([0x9fb59a, 0xa8b8a0, 0x8fa88f]),
        shirt: r.pick([0x5a4e6e, 0x6e5a4e, 0x4e6e6a, 0x704050, 0x555555]),
        pants: 0x2a2a35,
        eyeColor: 0x7dff9a,
        hairStyle: r.pick(["spiky", "long", "short", "bald", "twin"] as const),
        accessories: i % 3 === 0 ? ["gloves"] : i % 3 === 1 ? ["headband"] : ["towel"],
      }, 1200 + i),
    );
    const zs = zombies.map((_, i) => ({
      x: (i % 4 - 1.5) * 1.2 + r.range(-0.3, 0.3),
      z0: -15.5 - Math.floor(i / 4) * 2.2 - r.range(0, 1.2),
      speed: r.range(0.42, 0.5),
      tapper: i % 3 === 0,
    }));
    // the back row never shambles faster than the zombie ahead of it in its lane
    for (let i = 4; i < zs.length; i++) zs[i].speed = Math.min(zs[i].speed, zs[i - 4].speed);
    zombies.forEach((z) => scene.add(z.root));

    // The civilian
    const ped = new Player({ shirt: 0x2a9d8f, pants: 0x3d405b, hairStyle: "bun", hair: 0x3b2a1a, skin: 0xf5d0b0 }, 1299);
    const phone = box(0.08, 0.14, 0.02, 0x111111, 0, -0.05, 0.08);
    const phoneScreen = box(0.065, 0.11, 0.005, glow(0x99ccff), 0, -0.05, 0.092);
    ped.handR.add(phone, phoneScreen);
    scene.add(ped.root);

    sfx.ambient("wind", 0.5);
    sfx.ambient("droneEerie", 0.35);

    const TRIGGER = 29;
    ctx.update((t) => {
      zombies.forEach((z, i) => {
        const s = zs[i];
        const panic = smooth(seg(t, TRIGGER, TRIGGER + 1.5));
        const zz = s.z0 + s.speed * t + panic * (t - TRIGGER) * 0.5;
        z.root.position.set(s.x + Math.sin(t * 0.7 + i) * 0.25, 0, zz);
        z.root.rotation.y = Math.sin(t * 0.5 + i * 2) * 0.15;
        if (s.tapper && t < TRIGGER) {
          z.pose("airTap", t, 0.8);
          z.legL.rotation.x = Math.sin(t * 3 + i) * 0.3;
          z.legR.rotation.x = -Math.sin(t * 3 + i) * 0.3;
          z.head.rotation.z = 0.3;
        } else z.pose("shamble", t * (1 + panic * 0.6));
        if (t > TRIGGER) {
          // all heads snap toward the jingle
          const p = ped.root.position;
          z.root.rotation.y = Math.atan2(p.x - z.root.position.x, p.z - z.root.position.z);
          z.head.rotation.z *= 1 - panic;
          z.head.rotation.x = -0.1 * panic;
        }
      });

      // civilian: phone → notices → backs away → runs
      const back = Math.max(0, t - 17) * 0.3;
      if (t < TRIGGER + 0.6) {
        ped.root.position.set(0.3, 0, 3 + back);
        ped.root.rotation.y = Math.PI;
        if (t < 17) {
          ped.pose("idle", t);
          ped.armR.rotation.x = -1.0;
          ped.head.rotation.set(0.45, 0, 0);
        } else {
          ped.pose("walk", t * 0.5);
          ped.armR.rotation.set(-1.5, 0, 0.35);
          ped.armL.rotation.set(-1.5, 0, -0.35);
          ped.torso.rotation.x = -0.12;
        }
        if (t > TRIGGER - 0.5) ped.pose("stop", t); // freeze, horrified
      } else {
        const k = t - TRIGGER - 0.6;
        ped.root.position.set(0.3 + k * 0.2, 0, 3 + back + k * 4);
        ped.root.rotation.y = 0;
        ped.pose("run", t);
      }
      phoneScreen.visible = t < 17 || (t > TRIGGER - 0.4 && t < TRIGGER + 2 && Math.sin(t * 30) > 0);

      // lamp flicker
      const fl = Math.sin(t * 23) + Math.sin(t * 7.1) > 1.4 ? 0.1 : 1;
      lampLight.intensity = 6 * fl;
      bulb.visible = fl > 0.5;
      // dusk deepens
      world.sun.intensity = 1.6 - seg(t, 0, 37) * 0.7;
      fallen.setScreen("error");
    });

    // --- Sound ---
    const moans: [number, number, number][] = [
      [3, 1, -0.3], [6.5, 0.85, 0.4], [9, 1.15, 0], [12.5, 0.95, -0.5], [15, 1.05, 0.3], [19, 0.8, 0.2],
      [22, 1.1, -0.2], [25.5, 0.9, 0.5], [27.5, 1.0, -0.4], [30.2, 0.8, 0], [30.5, 1.2, 0.4], [31, 1, -0.4], [33.5, 0.9, 0], [35.5, 1.1, 0.3],
    ];
    moans.forEach(([at, p, pan]) => ctx.at(at, () => sfx.moan(p, pan)));
    for (let s = 0; s < 37; s += 0.75) ctx.at(s, () => sfx.footstep(Math.sin(s) * 0.4));
    for (let s = 10.5; s < 14; s += 0.18) ctx.at(s, () => sfx.tap());
    ctx.at(28.4, () => {
      sfx.fanfare();
    });
    ctx.at(29.6, () => sfx.crowdGasp());
    ctx.at(30.1, () => sfx.scream());
    for (let s = 29.8; s < 33; s += 0.22) ctx.at(s, () => sfx.footstep(0.3));
    ctx.at(34, () => sfx.dunDunDun());

    // --- Narration ---
    ctx.caption(0.8, "Day 12. Dusk falls on the former entertainment district.", 4.4);
    ctx.caption(5.6, "The afflicted emerge. Studies confirm they do not want brains. Only rating.", 4.6);
    ctx.caption(10.8, "They tap at notes no one else can see. Their timing is, admittedly, still perfect.", 5);
    ctx.caption(17, "A civilian. She has never played a rhythm game. She does not know how lucky she is.", 5);
    ctx.caption(22.6, "Experts advise: move slowly. Avoid eye contact. Never mention your score.", 5);
    ctx.caption(28.6, "Then her phone played a full-combo jingle.", 3.6);
    ctx.caption(32.6, "Survival tip: silence your notifications.", 4);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [0.5, 1.7, 13], look: [0, 1.6, -12] },
      { t: 5, pos: [1.6, 0.5, -4.5], look: [0, 1.4, -13], fov: 45 },
      { t: 10.5, pos: [0.9, 1.6, -6.8], look: [0, 1.5, -10.5], fov: 40 },
      { t: 16, pos: [0.9, 1.7, -5.4], look: [0, 1.5, -8.5], fov: 40 },
      { t: 17.2, pos: [4.2, 1.5, 6.8], look: [0, 1.2, 1], fov: 50 },
      { t: 22.4, pos: [3.6, 1.6, 7.8], look: [0, 1.2, 0] },
      { t: 23, pos: [-5, 6.5, 11], look: [0, 0.5, -1] },
      { t: 28.4, pos: [-4, 6, 10], look: [0, 0.5, 0] },
      { t: 28.8, pos: [1.6, 1.5, 9.6], look: [0.3, 1.3, 6.6], fov: 40 },
      { t: 30, pos: [0, 3.6, -14], look: [0, 1, 6], fov: 50 },
      { t: 32.5, pos: [0, 3.2, -12], look: [0, 1, 8] },
      { t: 33, pos: [3, 1.3, 11], look: [0, 1.4, 0] },
      { t: 37, pos: [2.4, 1.2, 9], look: [0, 1.4, 0] },
    ]);
    ctx.shake(29.3, 0.06, 0.4);
  },
};
export default scene;

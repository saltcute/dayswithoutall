// Day 1: The Arrival. Players show up, every cabinet says NETWORK ERROR,
// they wait through a time-lapse day and night. It never comes back.
import * as THREE from "three";
import { box, mat, mesh } from "../engine/materials";
import { keys, lerp, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { Player } from "../kit/characters";
import { cabinet, type CabKind } from "../kit/cabinets";
import { arcadeInterior, setupWorld } from "../kit/environments";

const scene: SceneDef = {
  duration: 38,
  build(ctx) {
    const { scene, sfx } = ctx;
    const world = setupWorld(ctx, { sky: 0x120a24, ground: 0x221133, hemi: 0.9, sunIntensity: 0.8, sunPos: [3, 10, 6] });
    const room = arcadeInterior(ctx, { w: 14, d: 12, neon: "GAME CENTER" });

    const kinds: CabKind[] = ["round", "round", "slider", "slider", "lever", "lever"];
    const cabs = kinds.map((k, i) => {
      const c = cabinet(k);
      c.group.position.set((i - 2.5) * 1.75, 0, -4.2);
      c.setScreen("logo");
      scene.add(c.group);
      return c;
    });

    // Wall clock for the time-lapse
    const clock = new THREE.Group();
    clock.add(mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 16).rotateX(Math.PI / 2), mat(0xffffff)));
    const hourHand = box(0.05, 0.25, 0.02, 0x111111, 0, 0.12, 0.05);
    const minHand = box(0.03, 0.38, 0.02, 0xc1121f, 0, 0.18, 0.06);
    const hourPivot = new THREE.Group().add(hourHand);
    const minPivot = new THREE.Group().add(minHand);
    clock.add(hourPivot, minPivot);
    clock.position.set(-5.2, 3, -5.85);
    scene.add(clock);

    // "Back soon" paper the staff tapes up during the night
    const note = box(0.5, 0.6, 0.01, 0xfffbe6, 5.5, 1.6, -5.88);
    scene.add(note);

    const players = [
      new Player({ shirt: 0xff4fa3, hairStyle: "twin", hair: 0x3b2a1a, accessories: ["gloves"] }, 11),
      new Player({ shirt: 0x3a86ff, hairStyle: "cap", hair: 0xffbe0b, accessories: ["backpack"] }, 12),
      new Player({ shirt: 0x06d6a0, hairStyle: "spiky", accessories: ["glasses"] }, 13),
      new Player({ shirt: 0xffd166, hairStyle: "short", accessories: ["gloves", "towel"] }, 14),
      new Player({ shirt: 0x8e44ad, hairStyle: "long", hair: 0xff66aa }, 15),
    ];
    const targets = [-4.4, -2.6, -0.9, 0.9, 3.5];
    players.forEach((p, i) => {
      p.at(targets[i] * 0.4, 6 + i * 0.7);
      scene.add(p.root);
    });

    sfx.ambient("arcadeDead", 0.8);

    // --- Timeline ---
    // 0-7 walk in excited | 7 screens die | 8.5 card swipe + buzzer | 10-14 confusion
    // 14-30 sit and wait (time-lapse) | 30-34 morning, still offline | 34-38 hold
    const sky = new THREE.Color();
    const dayCol = new THREE.Color(0xd8d0ff), duskCol = new THREE.Color(0xff9e5e), nightCol = new THREE.Color(0x1d2b6b);

    ctx.update((t) => {
      // walk in
      players.forEach((p, i) => {
        const start = i * 0.5;
        const k = smooth(seg(t, start, start + 6));
        const x0 = targets[i] * 0.4, z0 = 6 + i * 0.7, x1 = targets[i], z1 = -2.6;
        if (t < 14) {
          p.travel(x0, z0, x1, z1, k);
          if (k < 1) p.pose(i === 3 ? "run" : "walk", t);
          else if (t < 8.5) p.pose("idle", t);
          else if (t < 14) p.pose(i === 1 ? "facepalm" : i === 3 ? "reach" : i === 4 ? "sad" : "point", t, 1);
          if (k >= 1) p.face(x1, -4.2);
        } else {
          // waiting: seated on the floor, turned to the screens
          p.root.position.set(targets[i], 0, -2.2 + (i % 2) * 0.5);
          p.face(targets[i], -4.2);
          const sleeping = t > 19 && t < 27 && i !== 2;
          p.pose(sleeping ? "lie" : "sitFloor", t);
          if (sleeping) p.root.rotation.y += 0.6 * (i % 2 ? 1 : -1);
          if (t > 30) p.head.rotation.x = -0.2; // looking up hopefully
        }
      });

      // screens
      cabs.forEach((c, i) => {
        if (t < 7 + i * 0.12) c.setScreen("logo");
        else c.setScreen("error");
        const flick = t > 30 && t < 32.5 && Math.sin(t * 40 + i) > 0.3 ? 0.35 : 1;
        c.screenMat.color.setScalar(flick);
      });

      // time-lapse clock: 10:00 → next morning
      const hours = 10 + keys(t, [[0, 0], [14, 0.6], [30, 22], [38, 23]], (x) => x);
      minPivot.rotation.z = -hours * Math.PI * 2;
      hourPivot.rotation.z = (-hours / 12) * Math.PI * 2;

      // lighting through the day
      const lp = seg(t, 14, 30);
      if (lp < 0.4) sky.lerpColors(dayCol, duskCol, lp / 0.4);
      else if (lp < 0.7) sky.lerpColors(duskCol, nightCol, (lp - 0.4) / 0.3);
      else sky.lerpColors(nightCol, dayCol, (lp - 0.7) / 0.3);
      room.lamp.color.copy(sky);
      room.lamp.intensity = lerp(8, 3, Math.sin(lp * Math.PI));
      world.hemi.intensity = lerp(0.9, 0.35, Math.sin(lp * Math.PI));
      const night = lp > 0.45 && lp < 0.85;
      room.ceilingLights.forEach((l) => ((l.material as THREE.MeshBasicMaterial).color.set(night ? 0x222233 : 0xf0f0ff)));
      note.visible = t > 24;
      room.neon.visible = !night || Math.sin(t * 9) > 0;
    });

    // --- Sound ---
    players.forEach((_, i) => {
      for (let s = 0; s < 10; s++) ctx.at(i * 0.5 + s * 0.6, () => sfx.footstep((i - 2) * 0.3));
    });
    ctx.at(0.5, () => sfx.mumble(1.5, 1.1));
    ctx.at(7, () => {
      sfx.powerDown();
      sfx.errorBeep(3);
    });
    ctx.at(8.5, () => sfx.cardSwipe());
    ctx.at(8.9, () => sfx.buzzer());
    ctx.at(9.6, () => sfx.crowdGasp());
    ctx.at(14, () => sfx.ambient("droneSad", 0.5));
    for (let s = 14; s < 30; s += 0.5) ctx.at(s, () => sfx.tick());
    ctx.at(22, () => sfx.cricket(0.4));
    ctx.at(23, () => sfx.cricket(-0.4));
    ctx.at(30.2, () => sfx.glitch(1.2));
    ctx.at(32.6, () => sfx.errorBeep(2));
    ctx.at(34, () => sfx.dunDunDun());
    ctx.at(37.9, () => sfx.stopAmbient("droneSad"));

    // --- Narration ---
    ctx.caption(0.8, "Day 1. 10:00 AM. The arcade opens. The faithful arrive, gloves on, hearts full.", 5.5);
    ctx.caption(7.2, "Then every screen said the same two words.", 3);
    ctx.caption(10.3, "“It's probably a quick maintenance,” someone said. Everyone agreed to wait.", 3.6);
    ctx.caption(14.5, "Hour 3. Hope remains.", 3);
    ctx.caption(18.5, "Hour 9. Hope remains, mostly.", 3);
    ctx.caption(22.5, "Hour 14. The staff went home. The players did not.", 4);
    ctx.caption(27, "Dawn. Surely now—", 3);
    ctx.caption(32.8, "ALL.Net did not return. Neither did their dignity.", 5);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [0, 2.4, 13], look: [0, 1.4, 0] },
      { t: 6.5, pos: [0, 2, 3.5], look: [0, 1.5, -4] },
      { t: 7.5, pos: [-0.9, 1.6, -1.6], look: [-0.9, 1.55, -4.2] }, // push into an error screen
      { t: 10, pos: [3, 2.2, 2.5], look: [0, 1, -2.6] },
      { t: 14, pos: [5.5, 3.2, 5.5], look: [0, 0.6, -2.5] },
      { t: 30, pos: [-5.5, 3.2, 5], look: [0, 0.6, -2.5] },
      { t: 33, pos: [0.9, 1.0, 0.2], look: [0.9, 1.2, -4.2] },
      { t: 38, pos: [0.5, 1.4, 1.8], look: [0, 0.9, -2.4] },
    ]);
    ctx.shake(7, 0.08, 0.5);
    ctx.flash(7, "#ff3355", 0.35);
  },
};
export default scene;

// Day 2: The Pact. Withdrawal sets in inside the dead arcade. The players
// gather, put their hands in and swear: no credits until it returns.
// Six minutes later the guy who proposed it is already at a coin slot.
import * as THREE from "three";
import { glow, mesh } from "../engine/materials";
import { bump, lerp, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { Player, type PoseName } from "../kit/characters";
import { cabinet, type CabKind } from "../kit/cabinets";
import { arcadeInterior, setupWorld } from "../kit/environments";

const scene: SceneDef = {
  duration: 36,
  build(ctx) {
    const { scene, sfx } = ctx;
    const world = setupWorld(ctx, { sky: 0x070b18, ground: 0x05050a, hemi: 0.55, sun: 0x7088ff, sunIntensity: 0.35, sunPos: [4, 10, 8] });
    const room = arcadeInterior(ctx, { w: 14, d: 12, lit: false, neon: "GAME CENTER" });
    room.lamp.color.set(0x5577cc);
    room.lamp.intensity = 3;
    room.neon.visible = false;

    // Dead cabinets along the back wall and both sides
    const kinds: CabKind[] = ["round", "round", "slider", "lever", "round", "slider"];
    const cabs = kinds.map((k, i) => {
      const c = cabinet(k);
      c.group.position.set((i - 2.5) * 1.75, 0, -4.9);
      c.setScreen(i % 2 ? "off" : "error");
      scene.add(c.group);
      return c;
    });
    for (const side of [-1, 1])
      for (let j = 0; j < 2; j++) {
        const c = cabinet(j ? "lever" : "round");
        c.group.position.set(side * 6.2, 0, -1.6 + j * 2.2);
        c.group.rotation.y = -side * Math.PI / 2;
        c.setScreen("off");
        scene.add(c.group);
        cabs.push(c);
      }

    // A dramatic spotlight that has no business existing in a powerless arcade
    const spot = new THREE.SpotLight(0xfff1c9, 0, 12, 0.42, 0.45, 1.2);
    spot.position.set(0, 3.9, 0.4);
    spot.target.position.set(0, 0, 0.4);
    scene.add(spot, spot.target);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff1c9, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 1.7, 3.9, 14, 1, true), coneMat);
    cone.position.set(0, 1.95, 0.4);
    scene.add(cone);

    // Chalk circle on the floor where the pact happens
    const ring = mesh(new THREE.RingGeometry(1.25, 1.33, 24), glow(0xddddff, 0.5), false, false);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.01, 0.4);
    scene.add(ring);

    // The players: index 0 is the leader (headband) who proposes the pact
    const players = [
      new Player({ shirt: 0xff4fa3, hairStyle: "spiky", hair: 0x222222, accessories: ["headband", "gloves"] }, 201),
      new Player({ shirt: 0x3a86ff, hairStyle: "cap", hair: 0xffbe0b, accessories: ["backpack"] }, 202),
      new Player({ shirt: 0x06d6a0, hairStyle: "twin", hair: 0x3b2a1a, accessories: ["gloves"] }, 203),
      new Player({ shirt: 0xffd166, hairStyle: "short", accessories: ["glasses", "towel"] }, 204),
      new Player({ shirt: 0x8e44ad, hairStyle: "long", hair: 0xff66aa }, 205),
      new Player({ shirt: 0xfb5607, hairStyle: "bun", hair: 0x6b4423, accessories: ["gloves"] }, 206),
    ];
    // where each one is suffering at the start, and their spot in the circle
    const lonely: [number, number, PoseName][] = [
      [0.4, 1.8, "huddle"], [-4.4, -3.6, "shiver"], [-5.2, -0.6, "huddle"], [3.6, -3.7, "shiver"], [5.1, 1.9, "huddle"], [-2, 2.8, "shiver"],
    ];
    const R = 0.95, cz = 0.4;
    // each one's spot in the circle faces their corner, so nobody walks through anybody
    const slot = [0, 3, 4, 2, 1, 5];
    const ang = players.map((_, i) => (slot[i] / players.length) * Math.PI * 2 + 0.35);
    players.forEach((p) => scene.add(p.root));

    sfx.ambient("arcadeDead", 0.6);
    sfx.ambient("wind", 0.25);

    // --- Timeline ---
    // 0-9 withdrawal | 9-12 leader rises | 11-15 gather | 15-20.5 slow-mo hands in
    // 20.5 the oath | 24 BREAK! | 26-28 back to suffering | 28.5-36 relapse
    ctx.update((t) => {
      players.forEach((p, i) => {
        const [lx, lz, lp] = lonely[i];
        const cx = Math.sin(ang[i]) * R, czz = cz + Math.cos(ang[i]) * R;
        const gStart = i === 0 ? 9.5 : 11 + i * 0.3;
        const gk = smooth(seg(t, gStart, gStart + 2.6));
        const back = smooth(seg(t, 26 + i * 0.15, 28 + i * 0.15));
        if (t < gStart) {
          p.root.position.set(lx, 0, lz);
          p.face(lx > 0 ? 6 : -6, lz - 2);
          if (i === 0 && t > 8) {
            p.face(0, 6);
            p.pose("talk", t);
          } else p.pose(lp, t, 1 + bump(t, 5, 8));
        } else if (t < 26) {
          p.travel(lx, lz, cx, czz, gk);
          if (gk < 1) p.pose("walk", t);
          else {
            p.face(0, cz);
            if (t < 24) {
              // slow-motion hands-in, one hand at a time
              const hk = smooth(seg(t, 15 + i * 0.6, 17.2 + i * 0.6));
              p.pose("idle", t * 0.3);
              p.torso.rotation.x = 0.22 * hk;
              p.torso.rotation.y = 0.36 * hk;
              p.armR.rotation.x = lerp(0, -1.42 - i * 0.045, hk);
              p.head.rotation.x = 0.35 * hk;
              if (t > 20.5) p.body.position.y = bump(t, 20.5, 21.1) * 0.04;
            } else p.pose("cheer", t, 1 - seg(t, 25, 26));
          }
        } else {
          // the pact is sealed... back to suffering
          p.travel(cx, czz, lx, lz, back);
          if (back < 1) p.pose("walk", t);
          else {
            p.face(lx > 0 ? 6 : -6, lz - 2);
            p.pose(lp, t, 1.6);
          }
        }
      });

      // The relapse: the leader sneaks to a cabinet's card reader
      const L = players[0];
      if (t > 28.5) {
        const k = smooth(seg(t, 28.5, 31));
        const tx = cabs[2].group.position.x + 0.45, tz = -3.78;
        L.travel(lonely[0][0], lonely[0][1], tx, tz, k);
        if (k < 1) {
          L.pose("walk", t * 0.5);
          L.hips.position.y = 0.66;
          L.torso.rotation.x = 0.45;
        } else if (t < 32.4) {
          L.face(tx, -5);
          L.pose("reach", t, seg(t, 31, 32));
          L.torso.rotation.x = 0.4;
        } else {
          // caught. "I was just checking it."
          L.face(0, 3);
          L.pose(t < 33.4 ? "stop" : "point", t);
          if (t >= 33.4) {
            L.armR.rotation.y = 1.4;
            L.armR.rotation.x = -1.4;
          }
        }
        // everyone else turns to stare at him
        players.forEach((p, i) => {
          if (i === 0 || t < 31.8) return;
          const sk = smooth(seg(t, 31.8 + i * 0.12, 32.4 + i * 0.12));
          const to = Math.atan2(L.root.position.x - p.root.position.x, L.root.position.z - p.root.position.z);
          let d = to - p.root.rotation.y;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          p.root.rotation.y += d * sk;
          p.pose("idle", t * 0.2);
        });
      }

      // spotlight + cone for the oath
      const sp = seg(t, 15, 17) * (1 - seg(t, 25, 26.5));
      const blast = bump(t, 20.4, 22.5);
      spot.intensity = sp * 40 + blast * 60;
      coneMat.opacity = sp * 0.06 + blast * 0.08;
      ring.visible = t > 13 && t < 27;

      // dead screens occasionally twitch, like the players
      cabs.forEach((c, i) => {
        const tw = Math.sin(t * 23 + i * 5) > 0.93 ? 0.15 : 1;
        c.screenMat.color.setScalar(0.5 * tw);
      });
      world.hemi.intensity = 0.55 - sp * 0.3;
    });

    // --- Sound ---
    ctx.at(1.0, () => sfx.moan(0.8, -0.3));
    ctx.at(3.6, () => sfx.moan(1.1, 0.4));
    ctx.at(6.2, () => sfx.heartbeat());
    ctx.at(7.2, () => sfx.heartbeat());
    ctx.at(8.4, () => sfx.mumble(1.4, 0.9));
    for (let s = 0; s < 6; s++) ctx.at(11 + s * 0.6, () => sfx.footstep((s % 3) - 1));
    ctx.at(14.8, () => sfx.ambient("droneHoly", 0.6));
    for (let i = 0; i < 6; i++) ctx.at(16.4 + i * 0.6, () => sfx.thud());
    ctx.at(20.5, () => sfx.dramaticChord());
    ctx.at(24, () => {
      sfx.shout(1);
      sfx.cheer(1.4);
    });
    ctx.at(25.8, () => sfx.stopAmbient("droneHoly"));
    ctx.at(29, () => sfx.footstep(0.2));
    ctx.at(30, () => sfx.footstep(0.3));
    ctx.at(31.9, () => sfx.crowdGasp());
    ctx.at(33.2, () => sfx.dunDunDun());

    // --- Narration ---
    ctx.caption(0.8, "Day 2. Withdrawal. Symptoms include shivering, sweating, and tapping on things that aren't buttons.", 5.2);
    ctx.caption(6.4, "Some have not blinked since the error screen. Some cannot stop.", 3.6);
    ctx.caption(10.3, "Then one of them rises. He has an idea. The idea is a rule.", 4);
    ctx.caption(15.2, "Hands are placed. Slowly. Because this is important.", 4.6);
    ctx.caption(20.5, "“NO CREDITS UNTIL IT RETURNS.”", 3.6);
    ctx.caption(24.4, "The pact is sealed. Historians will call it brave.", 3.6);
    ctx.caption(28.6, "Minute six. The first relapse.", 3.2);
    ctx.caption(32.2, "It was the guy who proposed the pact.", 3.7);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [0, 2.8, 10], look: [0, 1, -1] },
      { t: 5.5, pos: [-1.8, 1.7, 0.6], look: [-4.6, 0.9, -2.6] },
      { t: 9, pos: [2.2, 1.3, 4.6], look: [0.4, 0.8, 1.8] },
      { t: 12.5, pos: [0, 3.1, 5.2], look: [0, 0.9, 0.4] },
      { t: 15, pos: [2.1, 1.7, 3.2], look: [0, 1.2, 0.4] },
      { t: 15.8, pos: [1.1, 3.5, 2.7], look: [0, 1.2, 0.4], fov: 46 },
      { t: 20.3, pos: [0.8, 3.4, 2.1], look: [0, 1.25, 0.4], fov: 42 },
      { t: 20.6, pos: [0, 3.5, 2.4], look: [0, 0.8, 0.4], fov: 55 },
      { t: 24, pos: [0, 2.2, 4.8], look: [0, 1.3, 0.4] },
      { t: 27.5, pos: [1, 2.6, 7.5], look: [0, 1, -1.5] },
      { t: 31, pos: [-1.6, 1.6, -0.6], look: [-0.9, 1.2, -4.2] },
      { t: 33, pos: [-1.2, 1.5, -0.9], look: [-0.9, 1.3, -4] },
      { t: 36, pos: [-0.2, 1.8, 2], look: [-0.9, 1, -3.4] },
    ]);
    ctx.shake(20.5, 0.12, 0.7);
    ctx.flash(20.5, "#fff6d8", 0.5);
    ctx.flash(32, "#ff3355", 0.25);
  },
};
export default scene;

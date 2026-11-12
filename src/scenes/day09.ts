// Day 9: Fortress Arcade. The faithful board up the arcade, plank by plank.
// A spiky scavenger convoy roars in with salvaged cabinet parts. The prize
// cabinet must go inside. They have boarded up the door.
import * as THREE from "three";
import { box, glow, mat, mesh } from "../engine/materials";
import { bump, easeOut, lerp, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { textPlane } from "../engine/textTexture";
import { Player } from "../kit/characters";
import { cabinet } from "../kit/cabinets";
import { arcadeFacade, setupWorld, skyline, terrain } from "../kit/environments";
import { banner, plank, truck } from "../kit/props";

const ROAD_Z = 9;

function hammer() {
  const g = new THREE.Group();
  g.add(box(0.04, 0.04, 0.38, 0x7a4e24, 0, 0, 0.17));
  g.add(box(0.16, 0.07, 0.07, 0x555555, 0, 0, 0.36));
  return g;
}

const scene: SceneDef = {
  duration: 40,
  build(ctx) {
    const { scene, sfx } = ctx;
    const world = setupWorld(ctx, { sky: 0xe6c48e, fog: [20, 85], ground: 0x8a6a40, sun: 0xfff0c8, sunIntensity: 2.4, hemi: 1.0, sunPos: [8, 14, 10], shadowSize: 16 });
    const ground = terrain(180, 44, 0.3, 0xc9a56b, 99, 16);
    scene.add(ground);
    const sky = skyline(ctx, 60, 0xb08a60, 30, 19);
    // leave a gap in the skyline where the convoy's road comes through
    for (const b of sky.children as THREE.Mesh[]) {
      b.geometry.computeBoundingBox();
      const d = b.geometry.boundingBox!.max.z;
      if (b.position.x < 0 && Math.abs(b.position.z - ROAD_Z) < d + 1.6) b.visible = false;
    }
    const r = rng(909);

    // the arcade, now a fortress
    const facade = arcadeFacade("GAME CENTER", 8, 5);
    scene.add(facade);
    scene.add(box(8, 5, 6, 0x3d3f55, 0, 2.5, -3.2), box(8.2, 0.25, 6.2, 0x2b2d42, 0, 5.05, -3.1));
    facade.door.material = mat(0x0b0b14);
    const sandbags: THREE.Mesh[] = [];
    for (const side of [-1, 1])
      for (let row = 0; row < 2; row++)
        for (let k = 0; k < 5; k++) {
          const sb = box(0.62, 0.26, 0.4, 0xa89070, side * (1.7 + k * 0.62 + (row % 2) * 0.3), 0.13 + row * 0.26, 2.6);
          sb.rotation.y = r.range(-0.08, 0.08);
          scene.add(sb);
          sandbags.push(sb);
        }
    // spiky anti-vehicle barrier
    for (let k = 0; k < 9; k++) {
      if (k === 4) continue;
      const sp = mesh(new THREE.ConeGeometry(0.12, 0.7, 4), mat(0x777777));
      sp.position.set(-6 + k * 1.5, 0.3, 4.6);
      sp.rotation.x = -0.6;
      scene.add(sp);
    }
    const warn = textPlane(["NO ENTRY", "(DURING MAINTENANCE)"], 1.8, 0.6, { bg: "#ffd60a", fg: "#111", size: 50 });
    warn.position.set(-4.6, 1.2, 2.82);
    warn.rotation.y = 0.15;
    scene.add(warn, box(0.08, 1.0, 0.08, 0x555555, -4.6, 0.5, 2.8));

    // planks: 4 per window, 4 on the door, applied one by one
    type PlankJob = { mesh: THREE.Mesh; t: number; worker: number; pos: THREE.Vector3; rz: number };
    const jobs: PlankJob[] = [];
    const openings: { x: number; y0: number; len: number; step: number }[] = [
      { x: -2.6, y0: 1.0, len: 2.3, step: 0.42 },
      { x: 0, y0: 0.45, len: 1.95, step: 0.62 },
      { x: 2.6, y0: 1.0, len: 2.3, step: 0.42 },
    ];
    for (let k = 0; k < 4; k++)
      openings.forEach((o, w) => {
        const m = plank(o.len, r.pick([0x8b5a2b, 0x7a4e24, 0x9c6b3a]));
        scene.add(m);
        jobs.push({ mesh: m, t: 1.2 + k * 3.0 + w * 0.9, worker: w, pos: new THREE.Vector3(o.x + r.range(-0.08, 0.08), o.y0 + k * o.step, 0.27 + k * 0.012), rz: r.range(-0.3, 0.3) });
      });

    const workers = [0, 1, 2].map((i) => {
      const p = new Player({ shirt: [0xe63946, 0x3a86ff, 0xffd166][i], hairStyle: (["cap", "spiky", "bun"] as const)[i], accessories: ["gloves", "headband"] }, 901 + i);
      p.handR.add(hammer());
      scene.add(p.root);
      return p;
    });
    const lookout = new Player({ shirt: 0x2a9d8f, hairStyle: "short", accessories: ["goggles", "cape"], robe: 0x9d0208 }, 905);
    lookout.at(2.6, -0.7);
    lookout.root.position.y = 5.17;
    scene.add(lookout.root);
    const flag = banner("HOLD", "#9d0208", 0.8, 0.9);
    flag.position.set(-3.5, 5.17, -0.5);
    scene.add(flag);

    // the convoy: three spiky trucks with salvage
    const trucks = [0x7f5539, 0x5c4d3c, 0x8a5a44].map((c) => {
      const tg = truck(c);
      tg.rotation.y = Math.PI / 2;
      // extra wasteland flair: side spikes, roof bar
      for (const sd of [-1, 1])
        for (let k = 0; k < 4; k++) {
          const s = mesh(new THREE.ConeGeometry(0.07, 0.35, 4), mat(0xaaaaaa));
          s.rotation.z = sd * Math.PI / 2;
          s.position.set(sd * 0.85, 0.75, -1.2 + k * 0.6);
          tg.add(s);
        }
      tg.add(box(1.4, 0.08, 0.1, 0x333333, 0, 2.0, 0.9));
      scene.add(tg);
      return tg;
    });
    const stops = [-5.6, -1.2, 3.2];
    // cargo 1: a whole lever cabinet (the prize)
    const prize = cabinet("lever", 0xfb5607);
    prize.setScreen("custom", ["SALVAGED", "(probably works)"], { bg: "#001a10", fg: "#33ff88", size: 34 });
    prize.group.scale.setScalar(0.85);
    scene.add(prize.group);
    // cargo 2: slider decks, a round ring, a steering wheel
    const cargo2 = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const d = box(1.1, 0.08, 0.4, 0x1a1a1a, 0, 0.05 + k * 0.1, -0.6 + k * 0.05);
      d.rotation.y = r.range(-0.3, 0.3);
      cargo2.add(d);
      for (let s = 0; s < 8; s++) cargo2.add(box(0.1, 0.02, 0.3, glow(s % 2 ? 0x66ccff : 0x3399ff), -0.45 + s * 0.13, 0.1 + k * 0.1, -0.6 + k * 0.05));
    }
    const ring = mesh(new THREE.TorusGeometry(0.42, 0.08, 6, 16), mat(0xff4fa3));
    ring.position.set(0.1, 0.5, 0.6);
    ring.rotation.set(0.3, 0.4, 0);
    const wheel = mesh(new THREE.TorusGeometry(0.22, 0.04, 5, 12), mat(0x222222));
    wheel.position.set(-0.35, 0.3, 0.7);
    wheel.rotation.x = -1.2;
    cargo2.add(ring, wheel);
    trucks[1].add(cargo2);
    cargo2.position.y = 1.22;
    // cargo 3: a heap of glowing buttons and a pole flag
    const cargo3 = new THREE.Group();
    for (let k = 0; k < 18; k++) {
      const b = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8), glow(r.pick([0xff3355, 0x33ff66, 0x3399ff, 0xfff36b])));
      b.position.set(r.range(-0.5, 0.5), 0.05 + r.range(0, 0.3), r.range(-1.2, 0.2));
      b.rotation.set(r.range(0, 3), 0, r.range(0, 3));
      cargo3.add(b);
    }
    const sflag = banner("SCAV", "#222222", 0.7, 0.8);
    sflag.position.set(0.5, 0, -1.2);
    cargo3.add(sflag);
    cargo3.position.y = 1.22;
    trucks[2].add(cargo3);
    // riders on the trucks
    const riders = [1, 2].map((ti) => {
      const p = new Player({ shirt: 0x3d3d3d, hairStyle: "mohawk", hair: 0xff4f00, accessories: ["goggles", "mask", "gloves"] }, 920 + ti);
      p.root.position.set(0, 1.22, -0.9);
      trucks[ti].add(p.root);
      return p;
    });
    // carriers (they hop off truck 1)
    const carriers = [0, 1].map((i) => {
      const p = new Player({ shirt: 0x5c4033, hairStyle: "bald", accessories: ["goggles", "gloves"] }, 930 + i);
      scene.add(p.root);
      return p;
    });
    // dust behind the convoy
    const puffMat = new THREE.MeshLambertMaterial({ color: 0xd9bf8f, transparent: true, opacity: 0.6 });
    const puffs: THREE.Mesh[] = [];
    for (let i = 0; i < 14; i++) {
      const pf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), puffMat);
      scene.add(pf);
      puffs.push(pf);
    }

    sfx.ambient("wind", 0.5);

    // --- Timeline ---
    // 0-13 planks | 14 lookout spots dust | 16-25 convoy arrives | 25-27 unload
    // 27-30.5 carry the prize to the door | 30.5 BONK | 31-40 realization
    // the convoy keeps its spacing (4.4 m) so the trucks never drive through each other
    const truckX = (t: number, i: number) => lerp(-61, stops[2], easeOut(seg(t, 15.5, 25.2))) - (2 - i) * 4.4;
    // the prize's route: off the truck, round the spikes, then straight through the gap to the door
    const LAND_Z = ROAD_Z - 2.4, GAP_Z = 5.3, CARRY_W = 1.14;
    const v = new THREE.Vector3();
    ctx.update((t) => {
      // planks fly into place
      jobs.forEach((j) => {
        const k = smooth(seg(t, j.t - 0.5, j.t));
        j.mesh.visible = t > j.t - 0.5;
        const wk = workers[j.worker];
        v.set(wk.root.position.x, 1.3, wk.root.position.z - 0.3);
        j.mesh.position.lerpVectors(v, j.pos, k);
        j.mesh.rotation.set(0, (1 - k) * 1.2, j.rz * k);
      });
      // workers hammer, then turn to watch the convoy
      workers.forEach((p, i) => {
        const o = openings[i];
        if (t < 22) {
          p.at(o.x + 0.25, 1.0, Math.PI);
          p.pose("knock", t);
          // only hammer around plank times
          let active = false;
          for (const j of jobs) if (j.worker === i && t > j.t - 0.1 && t < j.t + 0.8) active = true;
          if (!active) p.pose("hold", t);
        } else if (t < 31) {
          p.at(o.x + (i === 1 ? 1.7 : 0.25), 1.0);
          p.face(t < 27 ? -1 : prize.group.position.x, t < 27 ? ROAD_Z : prize.group.position.z);
          p.pose(t > 24.6 && t < 27 ? "cheer" : "idle", t);
        } else {
          // the realization: turn to the door, then to each other
          p.at(o.x + (i === 1 ? 1.7 : 0.25), 1.0);
          if (t < 34) p.face(0, -1);
          else p.face(i === 1 ? -2 : 0, i === 1 ? 4 : 0.8);
          p.pose(t > 34 ? (i === 1 ? "facepalm" : "point") : "idle", t);
          if (t > 34 && i !== 1) p.armR.rotation.y = 0;
        }
      });
      // lookout
      lookout.at(2.6, -0.7);
      lookout.root.position.y = 5.17;
      if (t > 13.5 && t < 18) {
        lookout.face(-30, ROAD_Z + 4);
        lookout.pose("point", t);
      } else {
        lookout.root.rotation.y = Math.sin(t * 0.4) * 0.6;
        lookout.pose(t > 24.5 && t < 27 ? "cheer" : "idle", t);
      }
      // trucks roll in, bouncing
      trucks.forEach((tg, i) => {
        const x = truckX(t, i);
        const moving = x < stops[i] - 0.05;
        tg.position.set(x, moving ? Math.abs(Math.sin(t * 9 + i)) * 0.06 : 0, ROAD_Z + (i % 2) * 0.6);
        tg.rotation.z = moving ? Math.sin(t * 7 + i) * 0.02 : 0;
      });
      riders.forEach((p, i) => p.pose(t > 23 && t < 30 ? "cheer" : "hold", t + i));
      puffs.forEach((pf, i) => {
        const tg = trucks[i % 3];
        const age = (t * 1.5 + i / puffs.length) % 1;
        const moving = truckX(t, i % 3) < stops[i % 3] - 0.05;
        pf.visible = moving && t > 15;
        // dust billows out low and to the sides, clear of the riders and the next truck
        pf.position.set(tg.position.x - 1.9 - age * 1.6, 0.25 + age * 0.6, tg.position.z + (i % 2 ? 1 : -1) * (0.75 + age * 1.1));
        pf.scale.setScalar(0.6 + age * 1.4);
      });
      // the prize: on truck 1, then slid off, then carried to the (boarded) door
      const t1 = trucks[0].position;
      const off = smooth(seg(t, 25.5, 27));
      const carry = smooth(seg(t, 27.2, 30.5));
      const bonk = bump(t, 30.5, 31.1);
      const landX = stops[0] - 0.4;
      if (t < 27.2) prize.group.position.set(t1.x - 0.4 * off, lerp(1.22, 0, off), lerp(t1.z - 0.6, LAND_Z, off));
      else {
        const l1 = Math.hypot(landX, LAND_Z - GAP_Z), l2 = GAP_Z - 0.95;
        const d = carry * (l1 + l2);
        const lift = carry > 0 && carry < 1 ? 0.08 : 0;
        if (d < l1) prize.group.position.set(lerp(landX, 0, d / l1), lift, lerp(LAND_Z, GAP_Z, d / l1));
        else prize.group.position.set(0, lift, lerp(GAP_Z, 0.95, (d - l1) / l2) + bonk * 0.25);
      }
      prize.group.rotation.y = (t > 30.5 ? Math.sin(t * 30) * 0.03 * (1 - seg(t, 30.5, 31.5)) : 0);
      prize.group.rotation.z = bonk * 0.05;
      prize.screenMat.color.setScalar(t > 31 && t < 32 && Math.sin(t * 40) > 0 ? 0.3 : 1);
      carriers.forEach((p, i) => {
        const side = i ? 0.7 : -0.7;
        // they wait beside the landing spot, then carry it crab-style from either side
        p.root.visible = t > 24.8;
        if (t < 26.8) {
          p.at(stops[0] - 0.4 + Math.sign(side) * CARRY_W, LAND_Z + 0.05);
          p.pose("idle", t);
          p.face(t1.x, ROAD_Z);
        } else {
          p.at(prize.group.position.x + Math.sign(side) * CARRY_W, prize.group.position.z + 0.05);
          p.face(prize.group.position.x, prize.group.position.z + 0.05);
          p.pose(carry > 0 && carry < 1 ? "walk" : "idle", t * 0.7);
          // hands on the cabinet's sides
          p.armL.rotation.x = p.armR.rotation.x = -1.4;
          p.armL.rotation.z = p.armR.rotation.z = 0;
          if (t > 31) {
            p.pose(t > 33 ? "sad" : "idle", t);
            p.head.rotation.y = side > 0 ? 0.6 : -0.6;
          }
        }
      });
      facade.signPlane.visible = !(t > 30.5 && t < 31.2 && Math.sin(t * 50) > 0);
      world.sun.intensity = 2.4;
    });

    // --- Sound ---
    jobs.forEach((j) => {
      ctx.at(j.t, () => sfx.hammer());
      ctx.at(j.t + 0.3, () => sfx.hammer());
    });
    ctx.at(2, () => sfx.mumble(1.2, 1.1, -0.3));
    ctx.at(14, () => sfx.shout(1.2));
    ctx.at(15.5, () => sfx.ambient("hum", 0.6));
    ctx.at(16, () => sfx.dunDunDun());
    ctx.at(20, () => sfx.airHorn());
    ctx.at(23.2, () => sfx.airHorn());
    ctx.at(24.8, () => {
      sfx.stopAmbient("hum");
      sfx.cheer(2);
    });
    ctx.at(26.8, () => sfx.thud());
    for (let i = 0; i < 6; i++) ctx.at(27.4 + i * 0.5, () => sfx.footstep(i % 2 ? 0.2 : -0.2));
    ctx.at(30.5, () => {
      sfx.thud();
      sfx.thunk();
    });
    ctx.at(32, () => sfx.cricket(0));
    ctx.at(34, () => sfx.sadTrombone());
    ctx.at(37, () => sfx.hammer());

    // --- Narration ---
    ctx.caption(0.8, "Day 9. The arcade must be defended. From what, nobody is sure.", 4);
    ctx.caption(5.2, "Planks are applied. Then more planks. Planks are a love language.", 4);
    ctx.caption(9.6, "Every window. Every crack. Every door.", 3.6);
    ctx.caption(14, "Dust on the horizon.", 2.6);
    ctx.caption(17.4, "The Scavengers. They roam the wastes salvaging anything with a button.", 4.4);
    ctx.caption(22.4, "Today's haul: one cabinet, sixteen slider keys, and a steering wheel. “Close enough.”", 4.6);
    ctx.caption(27.6, "The prize must go inside.", 3);
    ctx.caption(32, "The fortress has proven impenetrable. Including to its owners.", 7.6);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [0, 3.2, 14], look: [0, 2.2, 0], fov: 50 },
      { t: 4.5, pos: [-4.6, 1.8, 4.4], look: [-2.6, 1.6, 0.3], fov: 50 },
      { t: 8.5, pos: [0.4, 1.6, 3.6], look: [0, 1.2, 0.3], fov: 52 },
      { t: 12.5, pos: [4.4, 2.0, 4.6], look: [2, 1.6, 0.3], fov: 50 },
      { t: 13.8, pos: [4.8, 4.2, 4.0], look: [2.6, 5.6, -0.7], fov: 50 },
      { t: 15.4, pos: [3.5, 6.3, 1.0], look: [-30, 2, ROAD_Z + 4], fov: 40 },
      { t: 19, pos: [3.4, 6.2, 1.2], look: [-18, 1.6, ROAD_Z], fov: 46 },
      { t: 21.5, pos: [9.5, 1.6, ROAD_Z + 7], look: [-6, 1.4, ROAD_Z], fov: 52 },
      { t: 25, pos: [6.5, 2.4, ROAD_Z + 7], look: [-1.5, 1.4, ROAD_Z], fov: 54 },
      { t: 27.2, pos: [2.5, 2.6, ROAD_Z + 2.5], look: [-3, 0.8, ROAD_Z - 2], fov: 54 },
      { t: 30.4, pos: [3.6, 2.2, 6.2], look: [0, 1.3, 1.4], fov: 50 },
      { t: 31, pos: [2.0, 1.7, 4.4], look: [0, 1.4, 0.6], fov: 50 },
      { t: 34, pos: [1.6, 1.8, 5.2], look: [0, 1.3, 0.8], fov: 54 },
      { t: 40, pos: [0, 4.5, 15], look: [0, 2.2, 0], fov: 50 },
    ]);
    ctx.shake(20, 0.06, 2.5);
    ctx.shake(30.5, 0.2, 0.4);
  },
};
export default scene;

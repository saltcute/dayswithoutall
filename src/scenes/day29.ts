// Day 29: Nuclear Winter. A frozen, blue-grey world. The cabinets' power
// supplies are the only warmth left, and the players huddle around the vents.
import * as THREE from "three";
import { box, glow, mat, mesh } from "../engine/materials";
import { lerp, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { Player } from "../kit/characters";
import { cabinet, type CabKind } from "../kit/cabinets";
import { setupWorld, terrain } from "../kit/environments";
import { fallingParticles, rock, tree } from "../kit/props";

const scene: SceneDef = {
  duration: 38,
  build(ctx) {
    const { scene, sfx } = ctx;
    const world = setupWorld(ctx, { sky: 0x8a9aab, fog: [8, 38], ground: 0x5a6878, hemi: 1.0, sun: 0xc8d8ff, sunIntensity: 0.7, sunPos: [-6, 9, 4] });
    scene.add(terrain(120, 40, 0.8, 0xdfe8f0, 2901, 7));
    const r = rng(2902);

    // Ruined arcade wall stubs and frozen debris
    const ruin = new THREE.Group();
    ruin.add(box(9, 2.2, 0.4, 0x6c7480, -1, 1.1, -5.5), box(0.4, 1.4, 5, 0x6c7480, -5.6, 0.7, -3));
    ruin.add(box(9.2, 0.15, 0.6, 0xf2f6fa, -1, 2.25, -5.5)); // snow on top
    ruin.add(box(0.6, 0.15, 5.2, 0xf2f6fa, -5.6, 1.45, -3));
    scene.add(ruin);
    for (let i = 0; i < 8; i++) {
      const tr = tree(r.range(2.5, 4), 0x51606e);
      const a = r.range(0, Math.PI * 2), d = r.range(11, 18);
      tr.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
      scene.add(tr);
      const cap = mesh(new THREE.ConeGeometry(0.5, 0.4, 6), mat(0xf2f6fa));
      cap.position.set(tr.position.x, tr.children[1].position.y + 0.6, tr.position.z);
      scene.add(cap);
    }
    // rocks stay clear of the two huddles and the migration route between them
    const offRoute = (x: number, z: number) => {
      const k = Math.max(0, Math.min(1, ((x + 1.8) * 5 + (z + 1.2) * -1) / 26));
      return Math.hypot(x + 1.8 - 5 * k, z + 1.2 + k) > 3.2;
    };
    for (let i = 0; i < 7; i++) {
      const rk = rock(r.range(0.3, 0.7), 2910 + i, 0xc8d4e0);
      for (let tries = 0; tries < 30; tries++) {
        rk.position.set(r.range(-8, 8), rk.position.y, r.range(-4, 6));
        if (offRoute(rk.position.x, rk.position.z)) break;
      }
      if (offRoute(rk.position.x, rk.position.z)) scene.add(rk);
    }
    // icicles on the wall
    for (let i = 0; i < 12; i++) {
      const ic = mesh(new THREE.ConeGeometry(0.06, r.range(0.25, 0.6), 4), mat(0xbfe3ff));
      ic.rotation.x = Math.PI;
      ic.position.set(-5 + i * 0.75, 1.95, -5.28);
      scene.add(ic);
    }

    // Two cabinets with warm vents on their sides
    const mk = (kind: CabKind, x: number, z: number, ry: number) => {
      const c = cabinet(kind);
      c.group.position.set(x, 0, z);
      c.group.rotation.y = ry;
      c.setScreen("custom", ["NO SIGNAL", "", "PSU: OK"], { bg: "#0a0f1a", fg: "#6fa8ff", size: 40 });
      // snow on top
      c.group.add(box(1.3, 0.12, 0.8, 0xf2f6fa, 0, 2.48, -0.15));
      // glowing vents on both sides + the back
      const vents: THREE.Mesh[] = [];
      for (const side of [-1, 1])
        for (let k = 0; k < 4; k++) {
          const v = box(0.03, 0.06, 0.5, glow(0xff7a1a), side * (kind === "slider" ? 0.72 : 0.58), 0.25 + k * 0.14, 0);
          v.castShadow = false;
          vents.push(v);
          c.group.add(v);
        }
      const l = new THREE.PointLight(0xff8a3a, 6, 5, 1.6);
      l.position.set(0, 0.6, 0.2);
      c.group.add(l);
      scene.add(c.group);
      return { c, vents, light: l };
    };
    const cabs = [mk("lever", -1.8, -1.2, 0.25), mk("slider", 3.2, -2.2, -0.2)]; // keep in sync with A/B below
    const deadMat = new THREE.MeshBasicMaterial({ color: 0xff7a1a });
    cabs[0].vents.forEach((v) => (v.material = deadMat));
    const warm = new THREE.Color(0xff7a1a), cold = new THREE.Color(0x333a44);

    // Snow
    const snow = fallingParticles(ctx.mobile ? 600 : 1400, [30, 14, 30], 0xffffff, 1.6, 0.09);
    scene.add(snow.points);

    // Players in puffy coats (robe + hood), huddled at cabinet #1
    const coats = [0x7b2d26, 0x2a4d69, 0x4b5d3a, 0x6b4f7a, 0x8a6a2a, 0x3a3a4a];
    const N = 6;
    // Each huddle is a ring around its cabinet, written in a frame aligned with
    // the A->B route (u along it, v across it). Nobody sits on the route line
    // itself, and for the migration the ring first widens across the route, so
    // the colony shuffles past both cabinets instead of through them.
    const A: [number, number] = [-1.8, -1.2], B: [number, number] = [3.2, -2.2];
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const ux = (B[0] - A[0]) / len, uz = (B[1] - A[1]) / len; // along the route
    const vx = -uz, vz = ux; // across it (towards the camera)
    // (the odd ones crouch in "huddle" with their legs forward, so they sit further out)
    const ring = ([[-1.04, -0.6], [1.04, -0.6], [-1.04, 0.6], [0, 1.2], [1.04, 0.6], [0, -1.2]] as [number, number][]).map(
      ([u, v], i): [number, number] => [u * (i % 2 ? 1.35 : 1.1), v * (i % 2 ? 1.35 : 1.1)],
    );
    const at = (c: [number, number], u: number, v: number, sc = 1): [number, number] => [c[0] + (ux * u + vx * v) * sc, c[1] + (uz * u + vz * v) * sc];
    const wide = (v: number) => v + Math.sign(v) * 0.75;
    const huddleA = ring.map(([u, v]) => at(A, u, v));
    const huddleB = ring.map(([u, v]) => at(B, u, v, 1.1)); // the slider is wider
    const outA = ring.map(([u, v]) => at(A, u, wide(v)));
    const outB = ring.map(([u, v]) => at(B, u * 1.1, wide(v * 1.1)));
    const players = Array.from({ length: N }, (_, i) => {
      const p = new Player({ shirt: coats[i], pants: 0x2b2b33, accessories: i === 2 ? ["robe", "hood", "goggles"] : i % 2 ? ["robe", "hood", "gloves"] : ["robe", "hood"], robe: coats[i], hairStyle: "short" }, 2920 + i);
      // scarf
      p.torso.add(box(0.5, 0.1, 0.34, i % 2 ? 0xe63946 : 0xffd166, 0, 0.58, 0));
      scene.add(p.root);
      return p;
    });
    // A can of beans heating on a vent
    const can = new THREE.Group();
    can.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 8), mat(0xb0b7c3)));
    can.add(box(0.15, 0.08, 0.15, 0xd62828, 0, 0, 0));
    const steam = [0, 1, 2].map((k) => {
      const s = mesh(new THREE.IcosahedronGeometry(0.05, 0), glow(0xffffff, 0.5), false, false);
      can.add(s);
      return s;
    });
    players[3].handR.add(can);
    can.position.set(0, -0.05, 0.06);

    // breath puffs
    const puffs = players.map((p) => {
      const pf = mesh(new THREE.IcosahedronGeometry(0.07, 0), glow(0xffffff, 0.45), false, false);
      p.head.add(pf);
      return pf;
    });

    sfx.ambient("wind", 0.8);

    // 0-6 whiteout | 6-12 the huddle | 12-18 beans | 18-24 stories | 24-27 PSU #1 dies | 27-34 migration | 34-38 new huddle
    ctx.update((t, dt) => {
      snow.update(dt);
      const dead = smooth(seg(t, 24.2, 25.5));
      deadMat.color.copy(warm).lerp(cold, dead);
      cabs[0].light.intensity = lerp(6, 0, dead) * (1 + Math.sin(t * 7) * 0.05);
      cabs[1].light.intensity = 6 * (1 + Math.sin(t * 6 + 1) * 0.05);
      cabs[0].c.screenMat.color.setScalar(1 - dead * 0.85);
      if (dead > 0.5) cabs[0].c.setScreen("off");
      else cabs[0].c.setScreen("custom", ["NO SIGNAL", "", "PSU: OK"], { bg: "#0a0f1a", fg: "#6fa8ff", size: 40 });

      players.forEach((p, i) => {
        const [ax, az] = huddleA[i];
        const [bx, bz] = huddleB[i];
        const lag = (1.5 - ring[i][0]) * 0.15; // the front of the colony sets off first
        const k = smooth(seg(t, 27.5 + lag, 33.5 + lag));
        if (k <= 0) {
          p.root.position.set(ax, 0, az);
          p.face(A[0], A[1]);
          if (t > 25.6) {
            p.pose("shiver", t, 2);
            p.face(B[0], B[1]); // all heads turn to the other cabinet
          } else if (i === 3 && t > 12 && t < 18.5) {
            p.pose("hold", t);
            p.armR.rotation.x = -1.3;
          } else if (i === 1 && t > 18.5 && t < 24) p.pose("talk", t);
          else p.pose(i % 2 ? "huddle" : "shiver", t, 1);
        } else if (k < 1) {
          // the penguin shuffle: tiny steps, all together (widen, cross, close up)
          const [oax, oaz] = outA[i], [obx, obz] = outB[i];
          if (k < 0.2) p.travel(ax, az, oax, oaz, k / 0.2);
          else if (k < 0.8) p.travel(oax, oaz, obx, obz, (k - 0.2) / 0.6);
          else p.travel(obx, obz, bx, bz, (k - 0.8) / 0.2);
          p.pose("walk", t * 2.2);
          p.legL.rotation.x *= 0.35;
          p.legR.rotation.x *= 0.35;
          p.armL.rotation.set(-0.6, 0, -0.9);
          p.armR.rotation.set(-0.6, 0, 0.9);
          p.body.rotation.z = Math.sin(t * 16 + i) * 0.1;
        } else {
          p.root.position.set(bx, 0, bz);
          p.face(B[0], B[1]);
          p.pose(i % 2 ? "huddle" : "shiver", t, 1);
          if (t > 35 && i === 4) p.pose("cheer", t, 0.15); // a small victory
        }
        // breath every couple of seconds
        const bp = ((t + i * 0.7) % 2.4) / 2.4;
        const pf = puffs[i];
        pf.visible = bp < 0.4;
        pf.position.set(0, 0.12 + bp * 0.3, 0.25 + bp * 0.7);
        pf.scale.setScalar(0.6 + bp * 4);
      });
      can.visible = t > 12 && t < 18.5; // only while it is held up to the vent
      steam.forEach((s, k) => {
        const sp = ((t * 0.8 + k / 3) % 1);
        s.position.set(Math.sin(t * 2 + k) * 0.04, 0.1 + sp * 0.4, 0);
        s.scale.setScalar(0.5 + sp * 1.5);
        s.visible = t > 14;
      });

      world.hemi.intensity = 1.0 - dead * 0.15 + smooth(seg(t, 33, 36)) * 0.15;
    });

    // --- Sound ---
    ctx.at(0.2, () => sfx.ambient("droneSad", 0.25));
    ctx.at(6.5, () => sfx.ambient("hum", 0.3));
    ctx.at(9, () => sfx.mumble(0.8, 0.8));
    ctx.at(14.5, () => sfx.splash());
    ctx.at(16, () => sfx.mumble(1, 1.3));
    ctx.at(19, () => sfx.mumble(2, 0.9, -0.3));
    ctx.at(24.2, () => sfx.powerDown());
    ctx.at(24.6, () => sfx.stopAmbient("hum"));
    ctx.at(25.6, () => sfx.crowdGasp());
    ctx.at(26.4, () => sfx.dunDunDun());
    for (let s = 27.6; s < 33.5; s += 0.22) ctx.at(s, () => sfx.footstep(Math.sin(s * 3) * 0.5));
    ctx.at(33.8, () => sfx.ambient("hum", 0.3));
    ctx.at(34.5, () => sfx.shimmer());
    ctx.at(37.8, () => sfx.stopAmbient("droneSad"));

    // --- Narration ---
    ctx.caption(0.6, "Day 29. Winter came early. Possibly forever. Hard to tell without the event calendar.", 5);
    ctx.caption(6.4, "The cabinets can no longer connect. But their power supplies still run warm.", 5);
    ctx.caption(12.2, "Cabinet #1 now provides heat, light, and a modest kitchen.", 4.6);
    ctx.caption(18.4, "They tell stories of “warm-up songs.” It is not the same kind of warm.", 5);
    ctx.caption(24.4, "Then the power supply on Cabinet #1 gave out.", 3.4);
    ctx.caption(28.2, "The colony migrates. Slowly. Together. Nobody lets go of anybody.", 5);
    ctx.caption(34, "Cabinet #2 has 31% fan noise and 100% hope.", 4);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [0, 4.5, 12], look: [0, 1, -1] },
      { t: 6, pos: [0.5, 2.6, 5.5], look: [-1.5, 0.8, -1] },
      { t: 12, pos: [-1.0, 1.5, 2.6], look: [-1.8, 0.8, -1], fov: 45 },
      { t: 13.5, pos: [1.0, 1.6, 1.7], look: [-1.4, 0.95, -0.3], fov: 42 },
      { t: 18, pos: [0.9, 1.6, 1.6], look: [-1.4, 0.95, -0.3], fov: 40 },
      { t: 19, pos: [-4.8, 2.2, 3.5], look: [-1.8, 0.8, -0.8] },
      { t: 24, pos: [-0.5, 1.8, 3.6], look: [-1.8, 0.9, -1.2] },
      { t: 27, pos: [0.5, 1.9, 4.5], look: [0.5, 0.9, -1.3] },
      { t: 33, pos: [6, 2.4, 4.2], look: [1.2, 0.8, -1.3] },
      { t: 38, pos: [0, 4.5, 12], look: [0, 1, -1] },
    ]);
    ctx.flash(24.2, "#1a2a44", 0.5);
  },
};
export default scene;

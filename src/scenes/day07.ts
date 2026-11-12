// Day 7: The Great Schism. At 3 AM one player creeps to a cabinet with a coin.
// The elder shouts STOP. A brawl (with slow-motion), coins everywhere.
// Everyone ends up flat on the floor. The coin rolls away on its own terms.
import * as THREE from "three";
import { box, mat, mesh } from "../engine/materials";
import { bump, easeOut, keys, lerp, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { Player } from "../kit/characters";
import { cabinet, type CabKind } from "../kit/cabinets";
import { arcadeInterior, setupWorld } from "../kit/environments";
import { coin } from "../kit/props";

const SLOW_A = 17, SLOW_B = 21; // slow-motion window (real time)

const scene: SceneDef = {
  duration: 40,
  build(ctx) {
    const { scene, sfx } = ctx;
    const world = setupWorld(ctx, { sky: 0x140d08, ground: 0x0c0806, hemi: 0.55, sun: 0xffb36b, sunIntensity: 0.45, sunPos: [-5, 10, 6] });
    const room = arcadeInterior(ctx, { w: 14, d: 11, decay: 1, neon: "GAME CENTER" });
    room.lamp.color.set(0xffb36b);
    room.lamp.intensity = 4;
    room.ceilingLights.forEach((l, i) => ((l.material as THREE.MeshBasicMaterial).color.set(i === 1 ? 0xffe0b0 : 0x333028)));
    room.neon.visible = false;
    const r = rng(707);

    const kinds: CabKind[] = ["lever", "round", "slider", "round", "lever", "slider"];
    const cabs = kinds.map((k, i) => {
      const c = cabinet(k);
      c.group.position.set((i - 2.5) * 1.8, 0, -4.4);
      c.setScreen(i === 3 ? "insert" : "maintenance");
      scene.add(c.group);
      return c;
    });
    const target = cabs[3]; // the one glowing INSERT CREDIT, like a siren
    const tx = target.group.position.x;
    const brawlC = new THREE.Vector3(tx, 0, -2.2);
    const slot = new THREE.Vector3(tx + 0.32, 1.02, -3.95);
    // a little moonlight from a broken skylight on the target cab
    const moon = new THREE.SpotLight(0xaac4ff, 25, 9, 0.35, 0.6, 1.2);
    moon.position.set(tx, 3.9, -2);
    moon.target.position.set(tx, 0.8, -3.9);
    scene.add(moon, moon.target);

    // sleeping bags and junk
    for (let i = 0; i < 7; i++) {
      const bag = box(0.8, 0.12, 1.9, r.pick([0x386641, 0x6a4c93, 0x1d3557, 0x9d0208]), -4.5 + i * 1.5, 0.06, 0.6 + (i % 2) * 0.9);
      bag.rotation.y = r.range(-0.3, 0.3);
      scene.add(bag);
    }

    // cast: elder, sneaker, and five sleepers
    const elder = new Player({ shirt: 0x6b4f3a, robe: 0x7f5539, hairStyle: "bald", accessories: ["beard", "robe"] }, 701);
    const sneak = new Player({ shirt: 0x06d6a0, hairStyle: "cap", hair: 0x222222, accessories: ["gloves"] }, 702);
    const sleepers = [0, 1, 2, 3, 4].map((i) => new Player({ hairStyle: r.pick(["short", "spiky", "twin", "long", "bun"] as const), shirt: r.pick([0xe63946, 0x3a86ff, 0xffd166, 0x8e44ad, 0xfb5607]), accessories: i % 2 ? ["gloves"] : ["headband"] }, 710 + i));
    const all = [elder, sneak, ...sleepers];
    all.forEach((p) => scene.add(p.root));
    const bedX = [-4.5, -3, 1.5, 3, 4.5, 0, -1.5]; // each on its own sleeping bag
    const bedZ = (i: number) => 0.6 + (i % 2) * 0.9;
    // brawl ring: everyone keeps their own slot (ordered by where they come from), so nobody walks through anybody
    const ringSlot = [5, 6, 2, 1, 0, 3, 4];
    const RING_R = 1.15, RING_A0 = -0.59;
    // where everyone ends up lying after the brawl: a star, feet in, heads out, in ring order,
    // so each fighter falls straight back from his ring spot. The elder (slot 5) and slot 4
    // flank the +x side, which stays clear for the coin's getaway (and the camera).
    const STAR_Z = -1.25, STAR_A0 = 1.99;
    const SLOT_A = (Math.PI * 2) / 7;
    // ring speed chosen so the ring lines up with the star at the collapse (story time 21)
    const RING_W = (STAR_A0 - RING_A0 + Math.PI * 2) / (21 - 14);
    const sprawl = all.map((_, i) => {
      const a = STAR_A0 + ringSlot[i] * SLOT_A + (i === 0 ? 0.1 : 0);
      return [tx + Math.cos(a) * 0.85, STAR_Z + Math.sin(a) * 0.7, Math.atan2(-Math.cos(a), -Math.sin(a))] as const;
    });
    const ringPos = (i: number, s: number, out: THREE.Vector3) => {
      const a = RING_A0 + ringSlot[i] * SLOT_A + (s - 14) * RING_W;
      const rad = RING_R + Math.sin(s * 3 + i) * 0.08;
      return out.set(brawlC.x + Math.cos(a) * rad, 0, brawlC.z + Math.sin(a) * rad);
    };

    // THE coin (in the sneaker's hand), plus the pouch coins that fly in slow-mo
    const coinHolder = new THREE.Group();
    const theCoin = coin();
    theCoin.scale.setScalar(1.8);
    coinHolder.add(theCoin);
    scene.add(coinHolder);
    const rollPos = (t: number, out: THREE.Vector3) => {
      const k1 = seg(t, 25, 31), k2 = seg(t, 32, 38.5);
      // out of the pile through the gap in the star, then around the sleepers' heads to cab 4
      const x = t < 31.5 ? lerp(tx, tx + 2.9, easeOut(k1)) : lerp(tx + 2.9, cabs[4].group.position.x + 0.1, smooth(k2));
      const z = t < 31.5 ? lerp(STAR_Z, STAR_Z, easeOut(k1)) - Math.sin(k1 * Math.PI) * 0.45 : lerp(STAR_Z, -4.3, smooth(k2));
      return out.set(x, 0.11, z);
    };
    const v2 = new THREE.Vector3();
    const flying: THREE.Mesh[] = [];
    const flyVel: [number, number, number][] = [];
    for (let i = 0; i < 16; i++) {
      const c = coin();
      scene.add(c);
      flying.push(c);
      flyVel.push([r.range(-2.5, 2.5), r.range(2.5, 4.5), r.range(-1.5, 2.5)]);
    }
    // the brawl dust cloud
    const cloud: THREE.Mesh[] = [];
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xeadfcb, transparent: true, opacity: 0.9, flatShading: true });
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r.range(0.55, 0.9), 0), cloudMat);
      c.userData.noAudit = true; // the cloud is meant to swallow the fighters
      scene.add(c);
      cloud.push(c);
    }
    // a "POW" star burst
    const starGeo = new THREE.OctahedronGeometry(0.35, 0);
    const pows = [0, 1, 2].map(() => {
      const m = mesh(starGeo, mat(0xfff36b, { emissive: 0x806000 }), false, false);
      m.userData.noAudit = true; // comic-book effect, drawn over the fighters on purpose
      scene.add(m);
      return m;
    });

    sfx.ambient("hum", 0.35);

    // Story time: slow-mo stretches SLOW_A..SLOW_B to a quarter speed
    const story = (t: number) => keys(t, [[0, 0], [SLOW_A, SLOW_A], [SLOW_B, SLOW_A + (SLOW_B - SLOW_A) * 0.25], [40, 40 - (SLOW_B - SLOW_A) * 0.75]], (x) => x);
    const v = new THREE.Vector3();

    // --- Timeline ---
    // 0-9 the creep | 9-10.6 coin at the slot | 10.6 STOP! | 11-14 everyone wakes & charges
    // 14-24 brawl (17-21 slow-mo) | 24 collapse | 25-40 exhausted; the coin escapes
    ctx.update((t) => {
      const s = story(t);
      const brawl = t > 14 && t < 24;
      // sleepers (and the elder) asleep until STOP!
      all.forEach((p, i) => {
        if (i === 1) return;
        const bx = bedX[i % bedX.length], bz = bedZ(i);
        if (t < 10.6 || (i > 0 && t < 11.2)) {
          p.root.position.set(bx, 0, bz);
          p.root.rotation.y = Math.PI;
          p.pose("lie", t);
          p.body.position.y = 0.2;
          p.torso.rotation.z = Math.sin(t * 1.2 + i) * 0.03; // breathing
          if (i === 0 && t > 10) p.head.rotation.x = -0.6 * seg(t, 10, 10.5);
        } else if (t < 14) {
          // up and charging toward the cabinet
          const k = smooth(seg(t, i === 0 ? 12 : 11.6 + i * 0.12, 13.8));
          ringPos(i, 14, v);
          v.set(lerp(bx, v.x, k), 0, lerp(bz, v.z, k));
          p.root.position.copy(v);
          if (i === 0 && t < 12) {
            p.face(tx, -3.5);
            p.pose("stop", t);
            p.root.position.set(bx, 0, bz);
          } else {
            p.face(tx, -3);
            p.pose(k > 0 && k < 1 ? "run" : "fight", t);
          }
        }
      });
      // the sneaker
      if (t < 9) {
        const k = seg(t, 0.5, 9);
        sneak.travel(bedX[1], bedZ(1), slot.x + 0.05, -3.2, smooth(k));
        sneak.pose("walk", t * 0.35);
        sneak.hips.position.y = 0.66;
        sneak.torso.rotation.x = 0.45;
        sneak.armR.rotation.x = -0.9;
        sneak.head.rotation.y = Math.sin(t * 1.3) * 0.6; // nervous glances
      } else if (t < 10.6) {
        sneak.root.position.set(slot.x + 0.05, 0, -3.2);
        sneak.face(slot.x, -4.4);
        sneak.pose("reach", t, seg(t, 9, 10.4));
        sneak.torso.rotation.x = 0.35;
      } else if (t < 14) {
        ringPos(1, 14, v);
        const k = smooth(seg(t, 12.8, 14));
        sneak.root.position.set(lerp(slot.x + 0.05, v.x, k), 0, lerp(-3.2, v.z, k));
        sneak.face(0, 2);
        sneak.pose("stop", t);
        sneak.armR.rotation.x = -2.6; // coin held high: "IT'S MINE"
      }
      // the brawl: everyone orbits a dusty centre, swinging
      if (brawl) {
        all.forEach((p, i) => {
          ringPos(i, s, p.root.position);
          p.root.position.y = Math.abs(Math.sin(s * 5 + i)) * 0.25;
          p.face(brawlC.x, brawlC.z);
          p.pose(i % 2 ? "punch" : "fight", s);
          p.body.rotation.z = Math.sin(s * 4 + i) * 0.15;
        });
      } else if (t >= 24) {
        const s24 = story(24);
        all.forEach((p, i) => {
          const [x, z, ry] = sprawl[i];
          const k = smooth(seg(t, 24, 24.6 + i * 0.08));
          ringPos(i, s24, v);
          p.root.position.set(lerp(v.x, x, k), 0, lerp(v.z, z, k));
          p.root.rotation.y = ry;
          p.pose("faint", t, k);
          p.torso.rotation.x = -Math.abs(Math.sin(t * 3 + i)) * 0.06 * k; // panting
          if (i === 0 && t > 30) p.armR.rotation.set(-0.2 - bump(t, 30, 33.5) * 1.4, 0, -0.7); // feeble "...the coin..."
        });
      }

      // the coin: in hand -> lost in the brawl -> rolls out, wobbles, escapes under a cabinet
      if (t < 14) {
        sneak.root.updateMatrixWorld(true);
        sneak.handR.getWorldPosition(v);
        coinHolder.position.copy(v);
        coinHolder.rotation.set(0, 0, 0);
        theCoin.rotation.set(Math.PI / 2, 0, t > 9.4 && t < 10.6 ? Math.sin(t * 20) * 0.2 : 0); // trembling
      }
      coinHolder.visible = t < 14 || (t > 24.5 && t < 38.5);
      if (t >= 24.5) {
        rollPos(t, coinHolder.position);
        rollPos(t + 0.05, v2);
        const dx = v2.x - coinHolder.position.x, dz = v2.z - coinHolder.position.z;
        if (Math.abs(dx) + Math.abs(dz) > 1e-5) coinHolder.rotation.y = -Math.atan2(dz, dx);
        const wob = bump(t, 30.5, 32);
        theCoin.rotation.set(Math.PI / 2 + Math.sin(t * 16) * 0.5 * wob, -t * 12 * (1 - wob), 0);
      }
      // flying pouch coins in story time
      flying.forEach((c, i) => {
        const st = s - 17.2 - i * 0.04;
        c.visible = st > 0 && t < 24.5;
        if (!c.visible) return;
        const [vx, vy, vz] = flyVel[i];
        const tt = Math.min(st, 1.6);
        c.position.set(brawlC.x + vx * tt, Math.max(0.02, 1.4 + vy * tt - 4.9 * tt * tt), brawlC.z + vz * tt);
        c.rotation.set(st * 9 + i, st * 5, 0);
      });
      // dust cloud covers the brawl except during slow-mo (we get to see the carnage)
      const cloudK = brawl ? smooth(seg(t, 14, 14.6)) * (1 - smooth(seg(t, SLOW_A - 0.3, SLOW_A + 0.3)) + smooth(seg(t, SLOW_B - 0.3, SLOW_B + 0.3))) * (1 - smooth(seg(t, 23.4, 24.2))) : 0;
      cloud.forEach((c, i) => {
        c.visible = cloudK > 0.02;
        const a = i * 2.4 + s * 2;
        c.position.set(brawlC.x + Math.cos(a) * RING_R, 0.9 + Math.sin(i * 1.7 + s * 3) * 0.5, brawlC.z + Math.sin(a) * RING_R);
        c.scale.setScalar(cloudK * (1 + Math.sin(s * 6 + i) * 0.15));
      });
      pows.forEach((p, i) => {
        const ph = (s * 1.3 + i * 0.37) % 1;
        p.visible = cloudK > 0.5 && ph < 0.25;
        p.position.set(brawlC.x + Math.cos(i * 2.1 + Math.floor(s * 1.3)) * 1.1, 1.4 + i * 0.25, brawlC.z + 0.6);
        p.scale.setScalar(0.6 + ph * 3);
      });
      // the INSERT CREDIT screen pulses like temptation itself
      target.screenMat.color.setScalar(0.75 + Math.sin(t * 4) * 0.25);
      moon.intensity = t < 14 ? 25 : 10;
      world.hemi.intensity = t > 25 ? lerp(0.8, 1.3, seg(t, 25, 30)) : 0.8; // dawn
      room.lamp.intensity = t > 25 ? lerp(4, 7, seg(t, 25, 30)) : 4;
    });

    // --- Sound ---
    for (let i = 0; i < 8; i++) ctx.at(1 + i * 1.0, () => sfx.footstep(-0.2 + i * 0.05));
    ctx.at(2.5, () => sfx.ambient("droneTense", 0.6));
    [6, 7, 7.8, 8.5, 9.1, 9.6, 10.05, 10.4].forEach((h) => ctx.at(h, () => sfx.heartbeat()));
    ctx.at(10.6, () => {
      sfx.stopAmbient("droneTense");
      sfx.shout(0.6);
      sfx.dramaticChord();
    });
    ctx.at(11.6, () => sfx.crowdGasp());
    for (let i = 0; i < 6; i++) ctx.at(12 + i * 0.3, () => sfx.footstep(i % 2 ? 0.3 : -0.3));
    ctx.at(14, () => sfx.scream());
    for (let i = 0; i < 9; i++) ctx.at(14.2 + i * 0.32, () => sfx.punch((i % 3) - 1));
    ctx.at(SLOW_A, () => sfx.whoosh(2));
    ctx.at(SLOW_A + 0.3, () => sfx.coinDrop(8));
    ctx.at(SLOW_A + 1.2, () => sfx.thud());
    ctx.at(SLOW_A + 2.6, () => sfx.thud());
    for (let i = 0; i < 9; i++) ctx.at(SLOW_B + 0.1 + i * 0.3, () => sfx.punch(((i + 1) % 3) - 1));
    ctx.at(24, () => {
      sfx.thud();
      sfx.stomp();
    });
    ctx.at(25, () => sfx.moan(0.8, -0.3));
    ctx.at(26.5, () => sfx.moan(1.2, 0.3));
    for (let i = 0; i < 10; i++) ctx.at(25.2 + i * 0.55, () => sfx.tick());
    ctx.at(31, () => sfx.coin());
    for (let i = 0; i < 10; i++) ctx.at(32.2 + i * 0.6, () => sfx.tick());
    ctx.at(38.4, () => sfx.coinDrop(1));
    ctx.at(38.9, () => sfx.sadTrombone());

    // --- Narration ---
    ctx.caption(0.8, "Day 7. 3:12 AM. The tribe sleeps. Except one.", 4);
    ctx.caption(5.2, "He has found a coin. A very big temptation in a very small object.", 4.6);
    ctx.caption(10.6, "“STOP!”", 1.6);
    ctx.caption(12.4, "The elder has spoken. Then everyone else spoke, physically.", 3.6);
    ctx.caption(17.2, "Historians call it the Great Schism. Mistakes were made. Mostly by elbows.", 4.8);
    ctx.caption(24.6, "Dawn. Nobody won.", 3.2);
    ctx.caption(28.8, "The coin, meanwhile, made its own decision.", 3.6);
    ctx.caption(34, "It has not been seen since. The pact holds. Technically.", 5.4);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [-1, 3.0, 6.4], look: [0, 0.2, 0.2], fov: 52 },
      { t: 5, pos: [3.6, 1.0, 0.4], look: [tx - 0.5, 0.8, -2.6], fov: 50 },
      { t: 8.6, pos: [slot.x + 2.5, 1.55, -2.0], look: [slot.x - 0.2, 1.0, -3.6], fov: 54 },
      { t: 10.5, pos: [slot.x + 1.6, 1.25, -2.8], look: [slot.x, 1.02, -3.9], fov: 44 },
      { t: 10.6, pos: [bedX[0] + 1.5, 1.35, bedZ(0) - 0.9], look: [bedX[0], 1.5, bedZ(0)], fov: 46 },
      { t: 11.9, pos: [bedX[0] + 1.7, 1.4, bedZ(0) - 1.1], look: [bedX[0], 1.5, bedZ(0)], fov: 40 },
      { t: 12.2, pos: [bedX[0] + 1.5, 2.2, bedZ(0) + 4.4], look: [tx - 1, 1, -2], fov: 52 },
      { t: 14, pos: [tx - 1.5, 2.6, 3.4], look: [tx, 1, -2.2], fov: 54 },
      { t: SLOW_A, pos: [tx + 3.2, 1.6, 1.0], look: [tx, 1.1, -2.2], fov: 50 },
      { t: SLOW_B, pos: [tx - 3.0, 1.5, 0.8], look: [tx, 1.1, -2.2], fov: 48 },
      { t: 23.8, pos: [tx - 0.5, 3.0, 3.2], look: [tx, 0.8, -2.2], fov: 54 },
      { t: 27.5, pos: [tx + 0.2, 3.6, 1.4], look: [tx, 0.2, -1.8], fov: 56 },
      { t: 30, pos: [tx + 3.9, 0.45, STAR_Z + 1.0], look: [tx + 2.9, 0.1, STAR_Z], fov: 46 },
      { t: 32.5, pos: [tx + 3.6, 0.5, STAR_Z + 1.4], look: [tx + 2.8, 0.15, STAR_Z - 1.0], fov: 50 },
      { t: 38.6, pos: [tx + 3.6, 0.6, -1.9], look: [cabs[4].group.position.x, 0.2, -4.3], fov: 48 },
      { t: 40, pos: [tx + 3.6, 0.62, -2.0], look: [cabs[4].group.position.x, 0.2, -4.3], fov: 46 },
    ]);
    ctx.flash(10.6, "#ff3355", 0.3);
    ctx.shake(10.6, 0.15, 0.5);
    ctx.shake(14, 0.2, 3);
    ctx.shake(SLOW_B, 0.2, 2.8);
    ctx.shake(24, 0.3, 0.4);
    ctx.flash(SLOW_A, "#ffffff", 0.3);
  },
};
export default scene;

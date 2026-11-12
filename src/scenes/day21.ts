// Day 21: The Heretic. A player is caught playing an offline cabinet in
// guest mode. Torch-bearers drag them before the Council of Elders.
// Verdict: guest mode, forever. Everyone is jealous.
import * as THREE from "three";
import { box, mat, mesh } from "../engine/materials";
import { lerp, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { textPlane } from "../engine/textTexture";
import { Player } from "../kit/characters";
import { cabinet } from "../kit/cabinets";
import { campfire, stars, stool, torch } from "../kit/props";
import { setupWorld, terrain } from "../kit/environments";

/** A torch to be held in a player's right hand (no light unless asked). */
function heldTorch(lit: boolean) {
  const tr = torch();
  if (!lit) tr.children.filter((o) => (o as THREE.PointLight).isLight).forEach((o) => tr.remove(o));
  tr.scale.setScalar(0.75);
  tr.rotation.x = 0.6;
  tr.position.set(0, -0.1, 0.05);
  return tr;
}

const scene: SceneDef = {
  duration: 40,
  build(ctx) {
    const { scene, sfx } = ctx;
    setupWorld(ctx, { sky: 0x0d0a1e, fog: [16, 60], ground: 0x1a1008, hemi: 0.5, sun: 0x8090ff, sunIntensity: 0.45, sunPos: [-6, 12, 6] });
    scene.add(stars(400, 100));
    scene.add(terrain(120, 36, 0.6, 0x3a2c22, 21, 12));
    const r = rng(2121);

    // --- The camp ---
    const fire = campfire(1.1);
    fire.group.position.set(-1.6, 0, 1.8);
    scene.add(fire.group);
    // tribunal
    const TZ = -4.5;
    scene.add(box(6.4, 0.6, 2.2, 0x5c4033, 0, 0.3, TZ));
    scene.add(box(6.6, 0.08, 2.4, 0x7a5539, 0, 0.62, TZ));
    for (const x of [-3.3, 3.3]) {
      scene.add(box(0.25, 4.2, 0.25, 0x5c4033, x, 2.1, TZ - 0.9));
    }
    const banner = textPlane(["COUNCIL OF", "ELDERS"], 4.2, 1.0, { bg: "#6a040f", fg: "#ffd166", size: 70, border: "#ffd166", borderWidth: 8 });
    banner.position.set(0, 3.8, TZ - 0.9);
    scene.add(banner);
    const lectern = new THREE.Group();
    lectern.add(box(0.8, 1.0, 0.5, 0x7a5539, 0, 0.5, 0), box(0.95, 0.06, 0.6, 0x5c4033, 0, 1.03, 0));
    lectern.position.set(0, 0.62, TZ + 0.9);
    scene.add(lectern);
    const elderX = [-1.8, 0, 1.8];
    elderX.forEach((x) => {
      const s = stool(0x3d2817);
      s.position.set(x, 0.62, TZ - 0.3);
      scene.add(s);
    });
    // gong
    const gongG = new THREE.Group();
    gongG.add(box(0.1, 2.4, 0.1, 0x3d2817, -0.9, 1.2, 0), box(0.1, 2.4, 0.1, 0x3d2817, 0.9, 1.2, 0), box(1.9, 0.1, 0.1, 0x3d2817, 0, 2.4, 0));
    const gongDisc = mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 16), mat(0xd4a017, { emissive: 0x3a2a00 }));
    gongDisc.rotation.x = Math.PI / 2;
    const gongPivot = new THREE.Group();
    gongPivot.position.y = 2.35;
    gongDisc.position.y = -0.85;
    gongPivot.add(gongDisc);
    gongG.add(gongPivot);
    gongG.position.set(-4.3, 0, TZ + 0.6);
    gongG.rotation.y = 0.5;
    scene.add(gongG);
    const ringer = new Player({ accessories: ["mask", "robe"], robe: 0x3d2817, hairStyle: "mohawk", hair: 0xd62828 }, 2190);
    ringer.at(-3.75, TZ + 1.6);
    ringer.face(-4.3, TZ + 0.6);
    scene.add(ringer.root);
    const mallet = box(0.08, 0.6, 0.08, 0x6b4423, 0, -0.3, 0.1);
    ringer.handR.add(mallet);

    // the offline cabinet in a lean-to shack
    const SX = 6.4, SZ = 1.6;
    const shack = new THREE.Group();
    shack.add(box(0.12, 2.8, 0.12, 0x5c3a1e, -1.2, 1.4, -0.8), box(0.12, 2.8, 0.12, 0x5c3a1e, 1.2, 1.4, -0.8));
    shack.add(box(0.12, 2.2, 0.12, 0x5c3a1e, -1.2, 1.1, 1), box(0.12, 2.2, 0.12, 0x5c3a1e, 1.2, 1.1, 1));
    const roof = box(2.8, 0.08, 2.2, 0x6b705c, 0, 2.55, 0.1);
    roof.rotation.x = -0.25;
    shack.add(roof);
    shack.add(box(2.6, 2.4, 0.08, 0x4a3b2a, 0, 1.2, -0.9));
    shack.position.set(SX, 0, SZ - 0.4);
    scene.add(shack);
    const cab = cabinet("slider", 0x06d6a0);
    cab.group.position.set(SX, 0, SZ - 0.9);
    cab.setScreen("custom", ["GUEST MODE", "♪ PLAYING ♪", "(not saved)"], { bg: "#001a33", fg: "#66ddff", size: 38 });
    scene.add(cab.group);
    const cabGlow = new THREE.PointLight(0x66ddff, 4, 6, 1.6);
    cabGlow.position.set(SX, 1.6, SZ);
    scene.add(cabGlow);

    // --- People ---
    const heretic = new Player({ shirt: 0x3a86ff, hairStyle: "cap", hair: 0xffbe0b, accessories: ["gloves"] }, 2100);
    scene.add(heretic.root);
    const elders = elderX.map((x, i) => {
      const e = new Player({ accessories: i === 1 ? ["robe", "beard", "crown"] : ["robe", "beard", "hood"], robe: i === 1 ? 0x9d0208 : 0x3c096c, hairStyle: "bald", skin: 0xe8b894 }, 2110 + i);
      e.at(x, TZ - 0.3); // far enough back that seated legs clear the lectern
      e.root.position.y = 0.62;
      scene.add(e.root);
      return e;
    });
    const gavel = new THREE.Group();
    gavel.add(box(0.05, 0.35, 0.05, 0x5c3a1e, 0, -0.1, 0), box(0.22, 0.12, 0.12, 0x5c3a1e, 0, -0.3, 0));
    gavel.position.set(0, -0.02, 0.04);
    gavel.rotation.x = -1.2; // sticks out of the fist like a hammer
    elders[1].handR.add(gavel);
    const verdict = textPlane(["GUILTY"], 1.8, 0.9, { bg: "#fff8e8", fg: "#c1121f", size: 80, border: "#2b2b2b", borderWidth: 10 });
    scene.add(verdict);

    // tribe with torches
    const CAUGHT = 8.4, DRAG0 = 10.2, DRAG1 = 15.8, GONG1 = 16.5, VERDICT = 25.2, SENTENCE = 28.6;
    const KX = 0, KZ = -2.2; // where the accused kneels
    const HX0 = SX + 0.2, HZ0 = SZ + 0.75; // where the drag starts (in front of the shack)
    // drag direction: a straight line that slips between the cabinet and the shack posts
    const DL = Math.hypot(KX - HX0, KZ - HZ0);
    const DX = (KX - HX0) / DL, DZ = (KZ - HZ0) / DL;
    // two guards in single file: one pulls ahead, one pushes from behind
    const GA = 6, GB = 3;
    const GA_OFF = 0.8, GB_OFF = -1.45;
    // after the drag the guards flank the kneeling heretic
    const guardEnd = (i: number) => (i === GA ? { x: KX - 1.2, z: KZ - 0.15 } : { x: KX + 1.2, z: KZ - 0.15 });
    // gathering spots on an arc in front of the tribunal, leaving a gap where the procession arrives;
    // slots are assigned so that the walkers' paths don't cross. The three behind the shack go last,
    // crossing the drag line once the procession has passed.
    const slotOf: Record<number, number> = { 2: 0, 1: 1, 0: 2, 4: 3, 5: 4, 7: 5, 8: 6, 9: 7 };
    const ringA = (i: number) => (i < 3 ? -0.45 + i * 0.1 : -0.2 + (i / 9) * 1.2) * Math.PI;
    const tribe = Array.from({ length: 10 }, (_, i) => {
      const p = new Player({
        shirt: r.pick([0x6b4423, 0x7f5539, 0x5e548e, 0x264653, 0x9c6644]),
        accessories: i % 3 === 0 ? ["headband", "cape"] : i % 3 === 1 ? ["goggles"] : ["towel"],
        robe: 0x3d2817,
        hairStyle: r.pick(["mohawk", "spiky", "long", "bun", "twin"] as const),
      }, 2120 + i);
      p.handR.add(heldTorch(i === 2 || i === 7));
      scene.add(p.root);
      // surround the shack (front and sides), then an arc behind the accused
      const a0 = ringA(i);
      const guard = i === GA || i === GB;
      const slot = slotOf[i] ?? 0;
      const a1 = Math.PI * (0.38 + slot * 0.09);
      const late = i < 3;
      return {
        p,
        x0: SX + Math.cos(a0) * 9, z0: SZ + Math.sin(a0) * 9 + (i === 9 ? 4 : 0), // (keep out of the campfire)
        x1: SX + Math.cos(a0) * 3, z1: SZ + Math.sin(a0) * 3,
        x2: Math.cos(a1) * 3.6, z2: -1.8 + Math.sin(a1) * 2.7,
        g0: late ? DRAG0 + 3.6 + i * 0.3 : DRAG0 + 0.5 + (7 - slot) * 0.25,
        g1: late ? DRAG1 + 2.2 : DRAG1 + 0.5,
        guard,
      };
    });

    sfx.ambient("fire", 0.6);
    sfx.ambient("crickets", 0.4);

    ctx.update((t) => {
      fire.update(t);
      cabGlow.intensity = 4 + Math.sin(t * 10) * 0.6;

      // heretic
      const back = smooth(seg(t, 31.5, 34));
      const hp = { x: SX, z: SZ + 0.25 };
      if (t < CAUGHT) {
        heretic.root.position.set(hp.x, 0, hp.z);
        heretic.face(SX, SZ - 1);
        heretic.pose("airTap", t, 1);
      } else if (t < DRAG0) {
        const sk = smooth(seg(t, CAUGHT, CAUGHT + 0.6));
        heretic.root.position.set(lerp(hp.x, HX0, sk), 0, lerp(hp.z, HZ0, sk));
        heretic.face(SX - 2, SZ + 4);
        heretic.pose("stop", t);
      } else if (t < 31.5) {
        const dk = smooth(seg(t, DRAG0, DRAG1));
        const x = lerp(HX0, KX, dk), z = lerp(HZ0, KZ, dk);
        heretic.root.position.set(x, 0, z);
        if (dk < 1) {
          heretic.face(SX, SZ); // looking back at the cabinet
          heretic.pose("reach", t, 1);
          heretic.legL.rotation.x = 0.5;
          heretic.legR.rotation.x = 0.4;
          heretic.body.rotation.x = 0.25;
        } else {
          heretic.root.rotation.y = Math.PI;
          heretic.pose(t < SENTENCE + 0.4 ? "kneel" : "cheer", t, 1);
          if (t < SENTENCE + 0.4) heretic.head.rotation.x = t > VERDICT ? 0.4 : -0.2;
        }
      } else {
        heretic.travel(KX, KZ, hp.x, hp.z, back);
        if (back < 1) heretic.pose("run", t);
        else {
          heretic.face(SX, SZ - 1);
          heretic.pose("airTap", t, 1);
        }
      }

      // tribe: approach the shack, drag, gather
      const dragK = smooth(seg(t, DRAG0, DRAG1));
      const hx = lerp(HX0, KX, dragK), hz = lerp(HZ0, KZ, dragK);
      tribe.forEach((m, i) => {
        const { p } = m;
        const ak = smooth(seg(t, 4.5 + (i % 4) * 0.4, CAUGHT));
        let x = lerp(m.x0, m.x1, ak), z = lerp(m.z0, m.z1, ak);
        let walking = ak > 0 && ak < 1;
        let dragging = false;
        if (m.guard) {
          // single file along the drag line, then step aside to flank the kneeling heretic
          const off = i === GA ? GA_OFF : GB_OFF;
          const end = guardEnd(i);
          const gk = smooth(seg(t, CAUGHT + 0.6, DRAG0));
          const fk = smooth(seg(t, DRAG1 - 0.2, DRAG1 + 0.7));
          if (t > CAUGHT + 0.6) {
            const lx = lerp(hx + DX * off, end.x, fk), lz = lerp(hz + DZ * off, end.z, fk);
            x = lerp(x, lx, gk);
            z = lerp(z, lz, gk);
            walking = t < DRAG1 + 0.7;
            dragging = t > DRAG0 && t < DRAG1;
          }
        } else {
          const gk = smooth(seg(t, m.g0, m.g1));
          x = lerp(x, m.x2, gk);
          z = lerp(z, m.z2, gk);
          if (gk > 0 && gk < 1) walking = true;
        }
        p.root.position.set(x, 0, z);
        if (walking) {
          if (m.guard && t > CAUGHT + 0.6) {
            if (t < DRAG0) p.face(HX0 + DX * (i === GA ? GA_OFF : GB_OFF) * 2, HZ0 + DZ * (i === GA ? GA_OFF : GB_OFF) * 2);
            else p.face(x + DX, z + DZ);
          } else if (t > DRAG0) p.face(m.x2, m.z2);
          else p.root.rotation.y = Math.atan2(m.x1 - m.x0, m.z1 - m.z0);
          p.pose("walk", t);
        } else if (t < DRAG0) {
          p.face(SX, SZ);
          p.pose(t > CAUGHT && i % 2 ? "point" : "idle", t);
        } else {
          p.face(m.guard ? 0 : KX, m.guard ? TZ : KZ - 1);
          if (t > SENTENCE + 0.3 && t < SENTENCE + 2.2) p.pose("stop", t);
          else if (t > SENTENCE + 2.2) {
            p.pose(i % 3 === 0 ? "sad" : i % 3 === 1 ? "reach" : "idle", t, 0.7);
            if (t > 32) p.face(SX, SZ - 4); // turn toward the shack (aimed a bit low so nobody faces into a neighbour)
          } else p.pose("idle", t);
        }
        // torch arm
        p.armR.rotation.set(-0.6, 0, 0.1); // (reachers too: a torch thrust forward would hit the person in front)
        // the front guard hauls the heretic by the collar, the rear one shoves
        if (dragging) p.armL.rotation.set(i === GA ? 0.9 : -0.5, 0, i === GA ? 0 : -0.15);
      });

      // elders
      elders.forEach((e, i) => {
        e.face(0, 2);
        if (i === 1 && t > 19 && t < VERDICT) {
          e.root.position.y = 0.62;
          e.pose("point", t);
          e.armL.rotation.x = -0.8 + Math.sin(t * 4) * 0.3;
        } else if (i === 1 && t >= VERDICT && t < SENTENCE + 2) {
          e.pose("knock", t * 0.6);
          if (t > VERDICT + 1.4) e.pose("cheer", t, 0);
        } else {
          e.root.position.y = 0.62;
          e.pose(t > SENTENCE + 0.3 && t < SENTENCE + 2 ? "facepalm" : "sit", t);
        }
        if (i === 1) e.root.position.y = 0.62;
      });
      gavel.visible = t > 19;

      // verdict placard above the head elder
      verdict.visible = t > VERDICT + 1.4;
      verdict.position.set(0, 3.15 + Math.sin(t * 2) * 0.03, TZ + 0.1);
      verdict.tt.draw(
        t < SENTENCE ? ["GUILTY"] : ["SENTENCE:", "GUEST MODE", "FOREVER"],
        { bg: "#fff8e8", fg: "#c1121f", size: t < SENTENCE ? 80 : 48, border: "#2b2b2b", borderWidth: 10 },
      );

      // gong ringer
      const strikes = [GONG1, VERDICT + 1.2];
      const sw = strikes.reduce((a, s) => Math.max(a, 1 - Math.abs(t - s) * 3), 0);
      ringer.pose("idle", t);
      ringer.armR.rotation.x = -0.6 - sw * 1.4;
      gongPivot.rotation.x = strikes.reduce((a, s) => a + (t > s ? Math.sin((t - s) * 9) * Math.exp(-(t - s) * 1.5) * 0.2 : 0), 0);
    });

    // --- Sound ---
    for (let s = 0.2; s < CAUGHT; s += 0.23) ctx.at(s, () => sfx.tap());
    [0.5, 2.5, 4.5, 6.5].forEach((s) => ctx.at(s, () => [523, 659, 784, 659].forEach((f, i) => sfx.tone(f, 0.1, { type: "square", gain: 0.03, filter: 2000, delay: i * 0.25 }))));
    for (let s = 4.6; s < CAUGHT; s += 0.5) ctx.at(s, () => sfx.footstep(Math.sin(s * 3) * 0.6));
    ctx.at(CAUGHT, () => sfx.crowdGasp());
    ctx.at(CAUGHT + 0.3, () => sfx.dunDunDun());
    ctx.at(DRAG0, () => sfx.shout(0.8));
    for (let s = DRAG0; s < DRAG1; s += 0.6) ctx.at(s, () => sfx.noise(0.4, { type: "lowpass", freq: 500, gain: 0.1 })); // dragging
    ctx.at(12, () => sfx.scream());
    ctx.at(GONG1, () => sfx.gong());
    ctx.at(19.3, () => sfx.mumble(2.2, 0.7));
    ctx.at(22, () => sfx.mumble(1.8, 0.65));
    ctx.at(VERDICT, () => sfx.hammer());
    ctx.at(VERDICT + 0.5, () => sfx.hammer());
    ctx.at(VERDICT + 1.0, () => sfx.hammer());
    ctx.at(VERDICT + 1.2, () => sfx.gong());
    ctx.at(VERDICT + 1.5, () => sfx.dramaticChord());
    ctx.at(SENTENCE, () => sfx.dramaticChord());
    ctx.at(SENTENCE + 0.4, () => sfx.crowdGasp());
    ctx.at(SENTENCE + 0.9, () => sfx.cheer(1.2));
    for (let s = 34; s < 40; s += 0.23) ctx.at(s, () => sfx.tap());
    ctx.at(36, () => sfx.sadTrombone());

    // --- Narration ---
    ctx.caption(0.8, "Day 21. In a forgotten corner of the camp, a lone figure plays an offline cabinet.", 5);
    ctx.caption(6, "Guest mode. No login. No rating. No records. The tribes have a word for this.", 4.6);
    ctx.caption(10.8, "Heresy.", 2.4);
    ctx.caption(13.4, "The accused is brought before the Council of Elders, who between them hold eleven expired cards.", 5.6);
    ctx.caption(19.4, "The charge: enjoying the game without it counting.", 5);
    ctx.caption(25, "The verdict.", 3);
    ctx.caption(28.6, "Guilty. Sentenced to guest mode. Forever.", 3.8);
    ctx.caption(33, "The crowd gasps. Somehow, everyone is jealous.", 5);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [8.7, 1.8, 4.0], look: [SX, 1.4, SZ - 0.6] },
      { t: 4.4, pos: [8.5, 1.9, 4.6], look: [SX, 1.4, SZ - 0.4] },
      { t: 4.8, pos: [3, 3, 9], look: [SX, 1, SZ] },
      { t: 9.8, pos: [2.4, 2.6, 7.2], look: [SX - 0.5, 1, SZ] },
      { t: 10.2, pos: [5, 3.6, 7.5], look: [SX - 1, 1, SZ] },
      { t: 15.6, pos: [-1, 3.8, 6.5], look: [0, 1, -2.2] },
      { t: 16, pos: [0.5, 0.75, -0.6], look: [0, 2, TZ] , fov: 55 },
      { t: 19, pos: [0.3, 0.8, -0.8], look: [0, 2, TZ], fov: 55 },
      { t: 19.4, pos: [0.6, 2.1, -1.6], look: [0, 1.8, TZ], fov: 45 },
      { t: 24.6, pos: [0.3, 2.0, -1.8], look: [0, 1.8, TZ], fov: 45 },
      { t: 25, pos: [0, 3.4, 5.5], look: [0, 1.6, -3], fov: 50 },
      { t: 28.2, pos: [0, 3.2, 4.6], look: [0, 1.8, -3] },
      { t: 28.6, pos: [0, 2.8, -1.0], look: [0, 3.1, TZ], fov: 45 },
      { t: 31.8, pos: [0, 2.8, -1.2], look: [0, 3.1, TZ], fov: 45 },
      { t: 32.2, pos: [-0.5, 4.6, 8], look: [2.5, 1.2, 0], fov: 50 },
      { t: 40, pos: [-1.5, 5.2, 10], look: [3, 1.2, 0], fov: 50 },
    ]);
    ctx.shake(GONG1, 0.08, 0.6);
    ctx.shake(VERDICT + 1.2, 0.12, 0.8);
    ctx.flash(SENTENCE, "#ffd166", 0.4);
  },
};
export default scene;

// Day 11: Campfire Legends. In the wasteland at night an elder tells the
// children of the All Perfect and of Ratings from the Before Times. Visions
// rise from the fire. Then a child asks about Grandpa's rating.
import * as THREE from "three";
import { box, glow, mat, mesh } from "../engine/materials";
import { bump, easeOutBack, lerp, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { textPlane } from "../engine/textTexture";
import { Player } from "../kit/characters";
import { cabinet } from "../kit/cabinets";
import { setupWorld, terrain } from "../kit/environments";
import { campfire, rock, stars } from "../kit/props";

function starShape(outer: number, inner: number) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i / 10) * Math.PI * 2;
    const rr = i % 2 ? inner : outer;
    if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  return new THREE.ShapeGeometry(s);
}

/** Fading glow material (own instance so opacity is independent). */
const fadeMat = (color: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });

const scene: SceneDef = {
  duration: 40,
  build(ctx) {
    const { scene, sfx } = ctx;
    const world = setupWorld(ctx, { sky: 0x1b1036, fog: [16, 70], ground: 0x1a1020, sun: 0x8ab4ff, sunIntensity: 0.9, hemi: 0.8, sunPos: [6, 10, 8] });
    scene.add(terrain(140, 36, 0.6, 0x4a3846, 12, 7));
    scene.add(stars(600, 110));
    const r = rng(1111);
    // rock spires on the horizon
    for (let i = 0; i < 9; i++) {
      const a = r.range(-Math.PI, 0), d = r.range(14, 26);
      const sp = mesh(new THREE.ConeGeometry(r.range(0.8, 1.6), r.range(4, 9), 5), mat(0x3a2a3e));
      sp.position.set(Math.cos(a) * d, 2, Math.sin(a) * d);
      scene.add(sp);
    }
    for (let i = 0; i < 6; i++) {
      const rk = rock(r.range(0.3, 0.7), i + 20, 0x5a4652);
      rk.position.x = r.range(-6, 6);
      rk.position.z = r.range(-6, -3);
      scene.add(rk);
    }
    // a half-buried cabinet: a relic of the Before Times
    const relic = cabinet("round", 0x6c757d);
    relic.setScreen("off");
    relic.group.position.set(-5.5, -0.7, -6);
    relic.group.rotation.set(0.2, 0.5, 0.25);
    scene.add(relic.group);

    // the fire
    const fire = campfire(1.2);
    scene.add(fire.group);
    // the elder on a log, the children on the ground
    const log = mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.6, 7), mat(0x5c3a1e));
    log.rotation.z = Math.PI / 2;
    log.position.set(0, 0.22, -1.75);
    scene.add(log);
    const elder = new Player({ shirt: 0x6b4f3a, robe: 0x8a5a44, hairStyle: "bald", accessories: ["beard", "robe", "glasses"] }, 1101);
    elder.at(0, -1.75);
    scene.add(elder.root);
    const kidSeats: [number, number][] = [[-1.45, 0.9], [-0.55, 1.5], [0.5, 1.55], [1.4, 0.95]];
    const kids = kidSeats.map(([x, z], i) => {
      const k = new Player({ hairStyle: (["twin", "spiky", "bun", "cap"] as const)[i], shirt: [0xff70a6, 0x06d6a0, 0xffd166, 0x3a86ff][i], scale: 0.62 }, 1110 + i);
      k.at(x, z);
      k.face(0, -1.2);
      scene.add(k.root);
      return k;
    });
    const blanket = box(1.5, 0.08, 0.9, 0x7a4e7a, 0, 0.04, 1.3);
    scene.add(blanket);

    // ---- visions above the fire ----
    const V = new THREE.Group();
    V.position.set(0, 2.5, 0);
    scene.add(V);
    // A: ALL PERFECT
    const apText = textPlane("ALL PERFECT", 3.2, 0.7, { bg: "", fg: "#ffd60a", size: 110, font: "'Trebuchet MS', sans-serif" });
    const apScore = textPlane("1,010,000", 1.8, 0.4, { bg: "", fg: "#fff3b0", size: 110, font: "'Trebuchet MS', sans-serif" });
    apScore.position.y = -0.6;
    const apGroup = new THREE.Group().add(apText, apScore);
    V.add(apGroup);
    const apMats = [apText.material as THREE.MeshBasicMaterial, apScore.material as THREE.MeshBasicMaterial];
    const sparkles: THREE.Mesh[] = [];
    const sparkMat = fadeMat(0xfff3b0);
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), sparkMat);
      V.add(s);
      sparkles.push(s);
    }
    // B: the Rating star
    const starMat = fadeMat(0xffd60a);
    const bigStar = new THREE.Mesh(starShape(0.95, 0.42), starMat);
    const starRim = new THREE.Mesh(starShape(1.1, 0.5), fadeMat(0xff4fd8));
    starRim.position.z = -0.02;
    starRim.renderOrder = 1;
    bigStar.renderOrder = 2;
    const rateTT = textPlane("RATING 15.00", 2.4, 0.45, { bg: "", fg: "#ffffff", size: 110, font: "'Trebuchet MS', sans-serif" });
    rateTT.position.y = -1.35;
    const starGroup = new THREE.Group().add(starRim, bigStar, rateTT);
    starGroup.position.y = 0.35;
    V.add(starGroup);
    const rateMat = rateTT.material as THREE.MeshBasicMaterial;
    // C: Grandpa's rating
    const gText = textPlane(["GRANDPA'S RATING", "17.99"], 2.4, 0.9, { bg: "", fg: "#80ffdb", size: 80, font: "'Trebuchet MS', sans-serif" });
    V.add(gText);
    const gMat = gText.material as THREE.MeshBasicMaterial;
    for (const m of [...apMats, rateMat, gMat]) m.depthWrite = false;
    // smoke the visions dissolve into
    const smoke: THREE.Mesh[] = [];
    const smokeMat = new THREE.MeshLambertMaterial({ color: 0x9a8aa8, transparent: true, opacity: 0.25, depthWrite: false });
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 0), smokeMat);
      scene.add(s);
      smoke.push(s);
    }
    // a shooting star at the end
    const shoot = box(0.9, 0.04, 0.04, glow(0xffffff), 0, 0, 0);
    scene.add(shoot);

    sfx.ambient("fire", 0.6);
    sfx.ambient("crickets", 0.4);

    // --- Timeline ---
    // 0-6 establishing | 6-15.5 ALL PERFECT | 16-24.5 the Rating | 25 the question
    // 26-30 Grandpa's rating (unverified) | 30.5-33 "enough stories" | 33-40 sleep, shooting star
    let lastG = "";
    ctx.update((t) => {
      fire.update(t);
      fire.light.intensity *= 1 + bump(t, 7, 15) * 0.3 + bump(t, 16, 24.5) * 0.3;
      // elder
      const telling = t > 5 && t < 30.5;
      if (t > 30.5 && t < 33.5) elder.pose("stop", t);
      else elder.pose(telling ? (t > 16 && t < 24.5 ? "chant" : "talk") : "idle", t);
      // always seated on the log (chant is a kneeling pose; we re-seat it)
      elder.legL.rotation.x = elder.legR.rotation.x = -1.5;
      elder.hips.position.set(0, 0.48, 0);
      if (t > 26 && t < 30.5) {
        // awkward: he cannot quite meet their eyes
        elder.pose("sit", t);
        elder.hips.position.y = 0.48;
        elder.head.rotation.y = Math.sin(t * 1.3) * 0.5;
        elder.armR.rotation.set(-1.9, 0, 0.6); // scratches beard
      }
      // kids
      const awe = Math.max(bump(t, 7, 15.5), bump(t, 16, 24.5));
      kids.forEach((k, i) => {
        const [x, z] = kidSeats[i];
        k.at(x, z);
        k.face(0, -1.2);
        if (t > 33 && i !== 2) {
          // asleep, one by one
          const sk = smooth(seg(t, 33 + i * 0.5, 34.5 + i * 0.5));
          k.pose("faint", t, sk);
          k.root.rotation.y += sk * 0.4 * (i % 2 ? 1 : -1);
        } else {
          k.pose("sitFloor", t);
          k.head.rotation.x = -0.45 * awe + 0.05;
          if (awe > 0.4) {
            k.armL.rotation.x = k.armR.rotation.x = -1.3 - Math.sin(t * 3 + i) * 0.1;
          }
          if (i === 1 && t > 24.8 && t < 28) {
            k.armR.rotation.set(-2.9, 0, 0.1); // a hand goes up
          }
          if (i === 2 && t > 33) {
            k.head.rotation.x = -0.6; // still watching the sky
          }
        }
      });

      // visions
      const apK = smooth(seg(t, 7, 8.5)) * (1 - smooth(seg(t, 14.5, 15.5)));
      apMats.forEach((m) => (m.opacity = apK));
      apGroup.visible = apK > 0.01;
      apGroup.scale.setScalar(lerp(0.6, 1, easeOutBack(seg(t, 7, 8.2))) * (1 + Math.sin(t * 2) * 0.02));
      apGroup.position.y = 0.3 + seg(t, 7, 15.5) * 0.4;
      sparkMat.opacity = apK;
      sparkles.forEach((s, i) => {
        const a = t * 1.2 + (i / sparkles.length) * Math.PI * 2;
        s.position.set(Math.cos(a) * 1.9, apGroup.position.y + Math.sin(a * 2) * 0.4, Math.sin(a) * 0.3);
        s.rotation.y = t * 3;
      });
      const stK = smooth(seg(t, 16, 17.5)) * (1 - smooth(seg(t, 23.5, 24.5)));
      starMat.opacity = stK;
      (starRim.material as THREE.MeshBasicMaterial).opacity = stK * 0.8;
      rateMat.opacity = stK;
      starGroup.visible = stK > 0.01;
      (starRim.material as THREE.MeshBasicMaterial).color.setHSL((t * 0.15) % 1, 0.9, 0.6);
      starGroup.rotation.y = Math.sin(t * 0.8) * 0.35;
      starGroup.scale.setScalar(lerp(0.3, 1, easeOutBack(seg(t, 16, 17.3))));
      // grandpa's rating: appears, deflates, gets an asterisk
      const gK = smooth(seg(t, 25.8, 26.6)) * (1 - smooth(seg(t, 30.2, 31)));
      gMat.opacity = gK;
      gText.visible = gK > 0.01;
      const label = t < 27.6 ? "17.99" : t < 29 ? (Math.sin(t * 30) > 0 ? "12.31" : "9.87") : "(UNVERIFIED)";
      if (label !== lastG) {
        gText.tt.draw(["GRANDPA'S RATING", label], { bg: "", fg: t < 29 ? "#80ffdb" : "#ff4d6d", size: 80, font: "'Trebuchet MS', sans-serif" });
        lastG = label;
      }
      gText.scale.setScalar(t < 27.6 ? 1 : lerp(1, 0.75, seg(t, 27.6, 29)));
      gText.position.y = 0.2 - seg(t, 27.6, 30) * 0.5;
      // smoke curls up through the visions
      smoke.forEach((s, i) => {
        const k = (t * 0.25 + i / smoke.length) % 1;
        s.position.set(Math.sin(t * 0.7 + i * 2) * 0.3 * k, 1.0 + k * 1.2, Math.cos(i * 1.3) * 0.2);
        s.scale.setScalar(0.5 + k * 1.2);
        smokeMat.opacity = 0.12;
      });
      // shooting star
      const sk = seg(t, 35.5, 36.6);
      shoot.visible = sk > 0 && sk < 1;
      shoot.position.set(lerp(-14, 6, sk), lerp(20, 13, sk), -30);
      shoot.rotation.z = -0.33;
      shoot.scale.x = 3;
      // the fire burns lower as the night goes on
      fire.group.scale.setScalar(lerp(1.2, 0.85, seg(t, 31, 38)));
      world.hemi.intensity = 0.8;
    });

    // --- Sound ---
    ctx.at(1.5, () => sfx.cricket(-0.4));
    ctx.at(5.2, () => sfx.mumble(1.4, 0.7));
    ctx.at(7, () => {
      sfx.shimmer();
      sfx.ambient("droneHoly", 0.5);
    });
    ctx.at(8.2, () => sfx.fanfare());
    ctx.at(10.5, () => sfx.mumble(1.8, 0.7));
    ctx.at(13, () => sfx.crowdGasp());
    ctx.at(16, () => sfx.bell(880, 3));
    ctx.at(16.4, () => sfx.shimmer());
    ctx.at(19.5, () => sfx.chant(98, 3));
    ctx.at(24.6, () => sfx.stopAmbient("droneHoly"));
    ctx.at(25.2, () => sfx.mumble(0.6, 1.8, 0.2));
    ctx.at(27.6, () => sfx.glitch(1.2));
    ctx.at(29, () => sfx.buzzer());
    ctx.at(29.6, () => sfx.cricket(0.2));
    ctx.at(30.8, () => sfx.mumble(1.2, 0.65));
    ctx.at(32, () => sfx.moan(1.3, 0));
    ctx.at(35.5, () => sfx.shimmer());
    ctx.at(37, () => sfx.cricket(-0.3));

    // --- Narration ---
    ctx.caption(0.8, "Day 11. The wasteland, after dark. The young gather to hear the old stories.", 4.4);
    ctx.caption(5.6, "“Long ago, in the Before Times, there was a thing called… the All Perfect.”", 4.6);
    ctx.caption(10.6, "“Every note. Every slide. Perfect. Grown adults wept in public. It was beautiful.”", 4.8);
    ctx.caption(16, "“And above all things… there was the Rating.”", 3.6);
    ctx.caption(20, "“A number. It told you exactly how much you mattered.”", 4.4);
    ctx.caption(25, "“Grandpa, what was YOUR rating?”", 3);
    ctx.caption(28.4, "“…That's enough stories for tonight.”", 3.6);
    ctx.caption(33.4, "The legend endures. The receipts, conveniently, were lost with the server.", 6.2);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [6, 4, 10], look: [0, 0.8, 0], fov: 50 },
      { t: 5.4, pos: [1.2, 1.2, 3.6], look: [0, 1.2, -1.5], fov: 48 },
      { t: 7, pos: [0.6, 1.5, 5.6], look: [0, 1.7, -0.4], fov: 56 },
      { t: 15.5, pos: [-0.6, 1.4, 5.0], look: [0, 1.9, -0.4], fov: 56 },
      { t: 16, pos: [3.4, 1.3, 2.2], look: [0, 1.9, -0.4], fov: 56 },
      { t: 20, pos: [3.0, 1.2, 2.6], look: [0, 1.9, -0.3], fov: 54 },
      { t: 20.4, pos: [0.2, 1.4, 5.2], look: [0, 2.0, -0.3], fov: 56 },
      { t: 24.8, pos: [0.4, 1.5, 4.8], look: [0, 1.8, -0.3], fov: 56 },
      { t: 25, pos: [0.1, 1.0, 0.15], look: [-0.55, 0.7, 1.5], fov: 55 },
      { t: 26, pos: [0.15, 1.0, 0.2], look: [-0.55, 0.72, 1.5], fov: 52 },
      { t: 26.1, pos: [0, 1.5, 5.0], look: [0, 1.9, -0.3], fov: 54 },
      { t: 28.3, pos: [0, 1.5, 4.6], look: [0, 1.9, -0.3], fov: 52 },
      { t: 28.4, pos: [0.9, 1.35, -0.4], look: [0, 1.25, -1.75], fov: 46 },
      { t: 32.8, pos: [0.85, 1.35, -0.45], look: [0, 1.25, -1.75], fov: 42 },
      { t: 33, pos: [3, 2.6, 6], look: [0, 0.6, 0], fov: 50 },
      { t: 40, pos: [4, 5, 11], look: [-2, 6, -20], fov: 55 },
    ]);
  },
};
export default scene;

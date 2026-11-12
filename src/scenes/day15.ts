// Day 15: The Worship. Robed players kneel in a cave before three idols:
// a white bear, a penguin and a star idol girl. A divine light appears.
// The divine light is Kevin with a flashlight.
import * as THREE from "three";
import { box, glow, mat, mesh } from "../engine/materials";
import { bump, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { Player } from "../kit/characters";
import { altar, bearIdol, candle, penguinIdol, starIdol, torch } from "../kit/props";
import { cave, setupWorld } from "../kit/environments";

/** A candle without its own light (keeps the light count low). */
function stubCandle(h = 0.14) {
  const c = candle();
  c.children.filter((o) => (o as THREE.PointLight).isLight).forEach((o) => c.remove(o));
  c.scale.y = h / 0.14;
  return c;
}

const scene: SceneDef = {
  duration: 39,
  build(ctx) {
    const { scene, sfx } = ctx;
    const world = setupWorld(ctx, { sky: 0x0c0610, ground: 0x1a0d08, hemi: 0.55, sun: 0xffb070, sunIntensity: 0.25, sunPos: [2, 10, 6] });
    world.sun.castShadow = false; // dim fill only; skips a shadow pass in the cave
    cave(ctx, 11);
    const r = rng(1515);

    // --- Shrine ---
    const AZ = -5;
    scene.add(box(6, 0.25, 2.6, 0x4a4038, 0, 0.125, AZ));
    scene.add(box(5, 0.25, 2.2, 0x5a5048, 0, 0.375, AZ - 0.1));
    const alt = altar(4.2);
    alt.position.set(0, 0.5, AZ - 0.3);
    scene.add(alt);
    const top = 1.53;
    const bear = bearIdol(0.75);
    bear.position.set(-1.35, top, AZ - 0.3);
    const peng = penguinIdol(0.72);
    peng.position.set(1.35, top, AZ - 0.3);
    const ped = box(0.7, 0.35, 0.6, 0xc9a227, 0, top + 0.175, AZ - 0.35);
    const star = starIdol(0.78);
    star.position.set(0, top + 0.35, AZ - 0.35);
    scene.add(bear, peng, ped, star);
    // halo ring behind the idols
    const halo = mesh(new THREE.TorusGeometry(2.2, 0.08, 6, 32), glow(0xff8ad8), false, false);
    halo.position.set(0, 3.1, AZ - 1.2);
    scene.add(halo);
    const halo2 = mesh(new THREE.TorusGeometry(1.7, 0.04, 6, 32), glow(0xffd166), false, false);
    halo2.position.set(0, 3.1, AZ - 1.15);
    scene.add(halo2);
    // candles along the steps
    for (let i = 0; i < 18; i++) {
      const c = stubCandle(r.range(0.1, 0.3));
      const row = i % 2;
      c.position.set(-2.7 + (i >> 1) * 0.68 + r.range(-0.1, 0.1), 0.25 + row * 0.25, AZ + 1.15 - row * 0.3);
      scene.add(c);
    }
    for (let i = 0; i < 6; i++) {
      const c = stubCandle(0.2);
      c.position.set(-1.9 + i * 0.76, top, AZ + 0.05);
      scene.add(c);
    }
    const torches = [-3.4, 3.4].map((x) => {
      const tr = torch();
      tr.position.set(x, 0, AZ + 0.6);
      tr.scale.setScalar(1.3);
      tr.children.filter((o) => (o as THREE.PointLight).isLight).forEach((o) => tr.remove(o)); // keep the light count low
      scene.add(tr);
      return tr;
    });
    const altarGlow = new THREE.PointLight(0xffe2c4, 9, 11, 1.4);
    altarGlow.position.set(0, 2.2, AZ + 1.8);
    scene.add(altarGlow);

    // --- Congregation ---
    const robes = [0x5a189a, 0x3c096c, 0x7b2cbf, 0x9d0208];
    const flock: { p: Player; row: number }[] = [];
    for (let row = 0; row < 3; row++)
      for (let c = 0; c < 4; c++) {
        const p = new Player({ accessories: ["robe", "hood"], robe: robes[(row + c) % robes.length], skin: r.pick([0xf5d0b0, 0xc98e66, 0xe8b894, 0x9a6a48]) }, 1500 + row * 10 + c);
        p.at((c - 1.5) * 1.35 + (row % 2) * 0.35, -1.6 + row * 1.9, Math.PI); // rows far enough apart that a full bow clears the robe in front
        p.root.rotation.y = Math.PI;
        scene.add(p.root);
        flock.push({ p, row });
      }
    // High Chorister
    const priest = new Player({ accessories: ["robe", "cape", "crown", "beard"], robe: 0xf1faee, hairStyle: "bald", skin: 0xe8b894 }, 1599);
    priest.at(0, -3.25);
    priest.root.rotation.y = Math.PI;
    scene.add(priest.root);

    // --- Kevin, on a ledge, with a flashlight ---
    const ledge = mesh(new THREE.DodecahedronGeometry(1.2, 0), mat(0x5a4a3a));
    ledge.scale.set(1.3, 0.5, 1);
    ledge.position.set(-4.6, 3.2, -2.6);
    scene.add(ledge);
    const kevin = new Player({ shirt: 0xffd166, pants: 0x3d405b, hairStyle: "cap", hair: 0x3a86ff, accessories: ["backpack"] }, 1598);
    kevin.at(-4.6, -2.6);
    kevin.root.position.y = 3.76; // stand on the ledge's top edge, not in it
    scene.add(kevin.root);
    const flashlight = box(0.08, 0.25, 0.08, 0x333333, 0, -0.08, 0.05);
    const lens = box(0.1, 0.03, 0.1, glow(0xfff6c8), 0, -0.21, 0.05);
    kevin.handR.add(flashlight, lens);
    // light beam: cone from the flashlight to the idols
    const target = new THREE.Vector3(0, 2.2, AZ - 0.3);
    const beamGeo = new THREE.CylinderGeometry(0.06, 1.3, 1, 12, 1, true).translate(0, -0.5, 0);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    scene.add(beam);
    const spot = new THREE.SpotLight(0xfff0c0, 0, 14, 0.35, 0.5, 1.2);
    scene.add(spot, spot.target);
    spot.target.position.copy(target);
    const lensPos = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const down = new THREE.Vector3(0, -1, 0);

    sfx.ambient("fire", 0.35);
    sfx.ambient("droneHoly", 0.45);

    const LIGHT_ON = 24.2, LIGHT_OFF = 33.4;
    ctx.update((t) => {
      // congregation
      const hush = t > LIGHT_ON && t < LIGHT_OFF + 1.5;
      flock.forEach(({ p, row }, i) => {
        if (t < 17) p.pose(i % 3 === 0 ? "bow" : "chant", t, 0.7);
        else if (t < LIGHT_ON) p.pose("worship", t * 1.3 + row * 0.6);
        else if (hush) {
          p.pose("kneel", t);
          p.head.rotation.x = -0.55;
          p.armL.rotation.x = p.armR.rotation.x = -2.6 * smooth(seg(t, LIGHT_ON, LIGHT_ON + 1)) - 0.3;
          p.torso.rotation.x = -0.15;
        } else p.pose("bow", t, 1);
        // raised arms splay outward so they clear the hood
        if (p.armL.rotation.x < -2) p.armL.rotation.z = Math.max(0.3, Math.abs(p.armL.rotation.z));
        if (p.armR.rotation.x < -2) p.armR.rotation.z = -Math.max(0.3, Math.abs(p.armR.rotation.z));
      });
      // priest
      if (t < 17) priest.pose("idle", t);
      else if (t < LIGHT_ON) {
        priest.pose("talk", t * 1.6);
        priest.armL.rotation.set(-2.7 + Math.sin(t * 3) * 0.2, 0, 0.4);
        priest.armR.rotation.set(-2.7 - Math.sin(t * 3) * 0.2, 0, -0.4);
        priest.head.rotation.x = -0.35;
      } else if (t < LIGHT_OFF + 1) {
        priest.pose("cheer", t, 0.2);
        priest.head.rotation.x = -0.6;
      } else priest.pose("facepalm", t);

      // Kevin
      const tired = smooth(seg(t, LIGHT_OFF - 0.6, LIGHT_OFF));
      kevin.face(0, AZ);
      kevin.pose("idle", t);
      kevin.armR.rotation.set(-1.7 + tired * 1.5 + Math.sin(t * 1.7) * 0.03, 0, 0.35);
      kevin.armL.rotation.set(-0.3 - tired * 0.0, 0, -0.1);
      kevin.root.visible = t > 20;
      const on = t > LIGHT_ON && t < LIGHT_OFF;
      lens.visible = on;
      beam.visible = on;
      spot.intensity = on ? 45 * (0.85 + Math.sin(t * 13) * 0.05) : 0;
      if (on) {
        lens.getWorldPosition(lensPos);
        spot.position.copy(lensPos);
        dir.subVectors(target, lensPos);
        const len = dir.length();
        beam.position.copy(lensPos);
        beam.scale.set(1, len, 1);
        beam.quaternion.setFromUnitVectors(down, dir.normalize());
      }

      // idols shimmer in holy light
      const holy = on ? 1 : 0;
      star.star.rotation.y = t * 2;
      star.star.scale.setScalar(1 + holy * 0.5 + Math.sin(t * 5) * 0.1);
      halo.rotation.z = t * 0.2;
      halo2.rotation.z = -t * 0.3;
      halo.scale.setScalar(1 + bump(t, LIGHT_ON, LIGHT_OFF) * 0.08);
      altarGlow.intensity = 7 + Math.sin(t * 9) * 0.6 + Math.sin(t * 3.3) * 0.5;
      torches.forEach((tr, i) => tr.children[1].scale.set(1, 1 + Math.sin(t * 17 + i) * 0.15, 1));
      world.hemi.intensity = 0.55 + holy * 0.15;
    });

    // --- Sound ---
    const chants: [number, number][] = [[1, 110], [3.5, 98], [6, 110], [8.5, 123], [11, 110], [13.5, 98], [16, 110]];
    chants.forEach(([at, f]) => ctx.at(at, () => sfx.chant(f, 2.6)));
    for (let s = 17; s < LIGHT_ON; s += 1.45) ctx.at(s, () => sfx.chant(s % 2 < 1 ? 131 : 147, 1.6));
    ctx.at(18, () => sfx.mumble(2, 0.7));
    ctx.at(21, () => sfx.shout(0.7));
    ctx.at(LIGHT_ON - 0.1, () => sfx.noise(0.05, { type: "highpass", freq: 3000, gain: 0.2 })); // click
    ctx.at(LIGHT_ON, () => {
      sfx.shimmer();
      sfx.bell(880, 4);
    });
    ctx.at(LIGHT_ON + 0.4, () => sfx.crowdGasp());
    ctx.at(LIGHT_ON + 1.5, () => sfx.chant(220, 4));
    ctx.at(29, () => sfx.noise(0.3, { type: "bandpass", freq: 800, gain: 0.08 }));
    ctx.at(LIGHT_OFF, () => sfx.noise(0.05, { type: "highpass", freq: 3000, gain: 0.2 }));
    ctx.at(LIGHT_OFF + 0.3, () => sfx.crowdGasp());
    ctx.at(LIGHT_OFF + 1.2, () => sfx.mumble(0.8, 1.3, -0.6));
    ctx.at(35.5, () => sfx.chant(98, 3));

    // --- Narration ---
    ctx.caption(0.8, "Day 15. Beneath the old shopping mall, a new faith has taken root.", 4.6);
    ctx.caption(5.8, "The congregation kneels before the Three: the Bear, the Penguin, and the Star.", 5);
    ctx.caption(11.4, "The liturgy is simple. It is mostly the word “please”.", 4.6);
    ctx.caption(17.2, "The High Chorister begs for a sign. Any sign. A loading bar would do.", 5.2);
    ctx.caption(24.4, "And lo, a light from above.", 3.6);
    ctx.caption(28.6, "The light is Kevin. Kevin brought a flashlight.", 4.4);
    ctx.caption(33.6, "Kevin's arm is tired. The gods remain silent.", 4.6);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [0, 3.2, 7.5], look: [0, 1.4, -3] },
      { t: 5.6, pos: [0, 2.2, 3.4], look: [0, 1.4, -4] },
      { t: 6, pos: [-4.4, 1.6, 3.2], look: [0, 0.6, -0.6] },
      { t: 11.2, pos: [4.0, 1.7, 3.0], look: [0, 0.6, -0.8] },
      { t: 11.6, pos: [-2.6, 2.4, -2.6], look: [-1.35, 2.2, AZ - 0.3], fov: 42 },
      { t: 14, pos: [0, 2.6, -2.4], look: [0, 2.6, AZ - 0.3], fov: 42 },
      { t: 16.8, pos: [2.6, 2.4, -2.6], look: [1.35, 2.1, AZ - 0.3], fov: 42 },
      { t: 17.4, pos: [1.6, 1.1, -1.9], look: [0, 1.9, -3.6], fov: 48 },
      { t: 22.5, pos: [-1.2, 1.2, -1.6], look: [0, 1.9, -3.5], fov: 48 },
      { t: 24.2, pos: [0, 2.6, 4.5], look: [0, 1.9, -4] },
      { t: 28.2, pos: [1, 2.6, 4], look: [-1, 2.2, -4] },
      { t: 29.5, pos: [-1.6, 3.4, 1.2], look: [-4.6, 4.6, -2.6], fov: 45 },
      { t: 33, pos: [-1.8, 3.6, 0.8], look: [-4.6, 4.5, -2.6], fov: 42 },
      { t: 34.6, pos: [0, 3.6, 7], look: [0, 1.4, -3], fov: 50 },
      { t: 39, pos: [0, 3.3, 7.8], look: [0, 1.4, -3] },
    ]);
    ctx.flash(LIGHT_ON, "#fff6d0", 0.6);
  },
};
export default scene;

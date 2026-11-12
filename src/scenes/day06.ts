// Day 6: The Prophet. A street preacher on a crate in the ruined downtown,
// rain, thunder, lightning. Passers-by shuffle past. Then lightning revises
// his REPENT sign into something more on-brand.
import * as THREE from "three";
import { box, glow, mat, mesh } from "../engine/materials";
import { bump, lerp, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { Player } from "../kit/characters";
import { setupWorld, street } from "../kit/environments";
import { crate, fallingParticles, placard, sign } from "../kit/props";

const PX = -4.0; // the prophet's spot on the left sidewalk

/** Zig-zag lightning bolt from (0, h) down to (0, 0). */
function bolt(h: number, seed: number, m: THREE.Material) {
  const g = new THREE.Group();
  const r = rng(seed);
  let x = 0, y = h;
  while (y > 0) {
    const nx = x + r.range(-1.6, 1.6), ny = Math.max(0, y - r.range(1.5, 3));
    const len = Math.hypot(nx - x, ny - y);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.4, len, 0.4), m);
    s.position.set((x + nx) / 2, (y + ny) / 2, 0);
    s.rotation.z = Math.atan2(nx - x, y - ny);
    g.add(s);
    x = nx;
    y = ny;
  }
  return g;
}

const scene: SceneDef = {
  duration: 36,
  build(ctx) {
    const { scene, sfx } = ctx;
    const world = setupWorld(ctx, { sky: 0x3b4450, fog: [8, 42], ground: 0x1d2228, sun: 0x9fb0c0, sunIntensity: 0.7, hemi: 0.8, sunPos: [6, 12, 4] });
    street(ctx, { ruined: true, length: 44, seed: 66 });
    const r = rng(606);

    // rubble, a burned-out car, puddles
    for (let i = 0; i < 10; i++) {
      const rb = mesh(new THREE.DodecahedronGeometry(r.range(0.15, 0.45), 0), mat(r.pick([0x6c757d, 0x5a5a5a, 0x7f5539])));
      rb.position.set(r.pick([-1, 1]) * r.range(2.5, 5.5), 0.15, r.range(-14, 12));
      scene.add(rb);
    }
    const car = new THREE.Group();
    car.add(box(1.7, 0.6, 3.6, 0x4a3b33, 0, 0.5, 0), box(1.5, 0.5, 1.8, 0x3a2e28, 0, 1.05, -0.2));
    car.position.set(1.9, 0, -7);
    car.rotation.set(0, 0.25, 0.08);
    scene.add(car);
    for (let i = 0; i < 5; i++) {
      const pd = mesh(new THREE.CircleGeometry(r.range(0.5, 1.1), 10), new THREE.MeshLambertMaterial({ color: 0x5c6b7a, transparent: true, opacity: 0.55 }), false, true);
      pd.rotation.x = -Math.PI / 2;
      pd.position.set(r.range(-2.5, 2.5), 0.015, r.range(-10, 8));
      scene.add(pd);
    }
    const rain = fallingParticles(ctx.mobile ? 350 : 700, [18, 14, 30], 0xaabbd0, 14, 0.05);
    rain.points.position.set(-1, 0, 0);
    scene.add(rain.points);

    // the pulpit
    const pulpit = crate(0.6, 0x8b5a2b);
    pulpit.position.set(PX, 0.15, 0);
    scene.add(pulpit);
    const prophet = new Player({ shirt: 0x3d2b1f, robe: 0x6b4f3a, hairStyle: "long", hair: 0x777777, accessories: ["robe", "beard"] }, 601);
    prophet.at(PX, 0, Math.PI / 2);
    prophet.root.position.y = 0.75;
    scene.add(prophet.root);
    const plac = placard(["THE MAINTENANCE", "IS ETERNAL"], 1.5, 0.75, { bg: "#f4ecd8", fg: "#9d0208", size: 48 });
    plac.position.set(-0.4, 1.5, 0.12);
    plac.rotation.y = 0.1;
    prophet.root.add(plac);
    const sticky = sign(["(EST. END: ???)"], 0.9, 0.2, { bg: "#ffd166", fg: "#111", size: 70 }, false);
    sticky.position.set(0, 0.33, 0.01);
    sticky.rotation.z = -0.06;
    plac.add(sticky);

    // a flickering street lamp, the prophet's only spotlight
    const post = box(0.1, 4, 0.1, 0x333333, PX - 0.3, 2, 1.5);
    const arm = box(0.9, 0.08, 0.08, 0x333333, PX + 0.1, 3.95, 1.5);
    const bulb = box(0.3, 0.1, 0.2, glow(0xffe8a3), PX + 0.45, 3.88, 1.5);
    scene.add(post, arm, bulb);
    const lamp = new THREE.PointLight(0xffd59a, 7, 9, 1.3);
    lamp.position.set(PX + 0.6, 3.5, 1.3);
    scene.add(lamp);

    // the REPENT sign, about to be revised
    const repent = sign("REPENT", 1.3, 0.6, { bg: "#f4ecd8", fg: "#111", size: 90 });
    repent.position.set(PX + 0.2, 0.15, -1.6);
    repent.rotation.y = Math.PI / 2 - 0.3;
    scene.add(repent);
    const scorch = mesh(new THREE.CircleGeometry(0.13, 7), mat(0x1a1a1a), false, false);
    scorch.position.set(0.55, 1.62, 0.005);
    repent.add(scorch);
    const smoke: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), new THREE.MeshLambertMaterial({ color: 0x777777, transparent: true, opacity: 0.6 }));
      repent.add(s);
      smoke.push(s);
    }

    // lightning (two bolts) + flash light
    const boltMat = glow(0xeef4ff);
    const bolt1 = bolt(22, 3, boltMat);
    bolt1.position.set(-7, 0, -17);
    const bolt2 = bolt(16, 9, boltMat);
    bolt2.position.set(PX + 0.2, 1.8, -1.6);
    bolt2.scale.set(0.12, 1, 0.12);
    scene.add(bolt1, bolt2);
    const strike = new THREE.PointLight(0xdde8ff, 0, 30, 1.2);
    strike.position.set(PX + 2, 6, -1);
    scene.add(strike);

    // passers-by: shuffling up and down the road, some with umbrellas
    const umbrellas: (THREE.Group | null)[] = [];
    const passers = [0, 1, 2, 3, 4, 5].map((i) => {
      const p = new Player({ hairStyle: r.pick(["short", "cap", "bun", "bald"] as const), shirt: r.pick([0x6c757d, 0x1d3557, 0x4a4e69, 0x264653, 0x5c4033]), accessories: i % 3 === 0 ? ["hood"] : ["backpack"], robe: 0x2b2d42 }, 610 + i);
      if (i % 2 === 0) {
        // held in the right fist; the update keeps it upright whatever the arm does
        const umb = new THREE.Group();
        umb.add(mesh(new THREE.ConeGeometry(0.75, 0.35, 8), mat(r.pick([0x111111, 0x9d0208, 0x1d3557]))).translateY(0.62));
        umb.add(box(0.03, 0.62, 0.03, 0x222222, 0, 0.31, 0));
        p.handR.add(umb);
        umbrellas.push(umb);
      } else umbrellas.push(null);
      scene.add(p.root);
      return p;
    });
    // one listener who actually stops (briefly)
    const listener = passers[3];

    sfx.ambient("rain", 0.8);
    sfx.ambient("wind", 0.35);

    // --- Timeline ---
    // 0-11 sermon in the rain | 11.6 THUNDER + bolt | 13-20 passers ignore
    // 20-24 a listener stops, then leaves | 25 lightning hits REPENT | 26-36 RETRY? adopted
    const strikes = [11.6, 25];
    const uq = new THREE.Quaternion();
    let wasRevised = false;
    ctx.update((t, dt) => {
      rain.update(dt);
      // the prophet: preaching, thrusting the placard, arms up at thunder
      const thunderK = Math.max(bump(t, 11.6, 14), bump(t, 25.2, 27.6));
      prophet.pose(thunderK > 0.2 ? "chant" : "talk", t);
      prophet.legL.rotation.x = prophet.legR.rotation.x = 0;
      prophet.hips.position.y = 0.8;
      prophet.hips.position.z = 0;
      prophet.armR.rotation.x = -2.6 + Math.sin(t * 3) * 0.12; // holding the placard aloft
      if (thunderK > 0.2) prophet.armL.rotation.x = -2.9;
      plac.position.y = 1.5 + Math.sin(t * 3) * 0.06;
      plac.rotation.z = Math.sin(t * 1.7) * 0.05;
      sticky.visible = t > 30;
      if (t > 28.5 && t < 30) {
        // turns to look at the revised sign
        prophet.head.rotation.y = 1.0 * bump(t, 28.5, 30.5);
      }
      if (t > 30.5) {
        // gestures at the new sign: "As it is written."
        prophet.pose("point", t);
        prophet.armR.rotation.x = -2.6;
        prophet.armL.rotation.set(-1.7, 0, -0.6);
        prophet.head.rotation.y = 0.5;
      }

      // passers-by
      passers.forEach((p, i) => {
        const dir = i % 2 ? 1 : -1;
        const speed = 0.9 + (i % 3) * 0.15;
        const lane = dir > 0 ? lerp(-0.9, -1.2, (i % 3) / 2) : lerp(-0.3, 0.1, (i % 3) / 2);
        let z = ((t * speed + i * 7.3) % 40) - 20;
        if (dir < 0) z = -z;
        let stopped = false;
        if (p === listener) {
          // walks in, stops near the prophet, listens, nods, leaves
          const k1 = smooth(seg(t, 17, 20)), k2 = smooth(seg(t, 24, 28));
          z = t < 24 ? lerp(-9, -0.6, k1) : lerp(-0.6, 9, k2);
          stopped = t > 20 && t < 24;
          if (t > 28 || t < 17) z = 30;
        }
        p.root.position.set(lane, 0, z);
        p.root.rotation.y = dir > 0 || p === listener ? 0 : Math.PI;
        if (stopped) {
          p.face(PX, 0);
          p.pose("idle", t);
          p.head.rotation.x = Math.sin(t * 4) * 0.15 * bump(t, 22, 23.8);
        } else {
          p.pose("walk", t * 0.75);
          p.torso.rotation.x = 0.2;
          p.head.rotation.x = 0.35;
          // a glance at the lightning, then back to minding their business
          p.head.rotation.y = (bump(t, 11.8, 13) + bump(t, 25.2, 26.4)) * 0.8 * (dir > 0 ? -1 : 1);
        }
        const umb = umbrellas[i];
        if (umb) {
          // umbrella arm: raised forward and in, so the canopy sits over the head
          p.armR.rotation.set(-2.3, 0, 0.3);
          uq.copy(p.body.quaternion).multiply(p.hips.quaternion).multiply(p.torso.quaternion).multiply(p.armR.quaternion).invert();
          umb.quaternion.copy(uq);
        }
      });

      // lightning & sky flashes
      let fl = 0;
      for (const s of strikes) fl = Math.max(fl, t > s && t < s + 0.5 ? (Math.sin((t - s) * 40) > -0.2 ? 1 - (t - s) * 2 : 0) : 0);
      bolt1.visible = t > strikes[0] && t < strikes[0] + 0.35;
      bolt2.visible = t > strikes[1] && t < strikes[1] + 0.35;
      strike.intensity = fl * 60;
      lamp.intensity = Math.sin(t * 31) > 0.85 || (t > 5 && t < 5.4) ? 0.6 : 7;
      bulb.visible = lamp.intensity > 1;
      world.hemi.intensity = 0.8 + fl * 1.1;
      (scene.background as THREE.Color).setHex(fl > 0.3 ? 0x8c9aae : 0x3b4450);

      // REPENT gets revised
      const revised = t > strikes[1];
      if (revised !== wasRevised) {
        repent.plane.tt.draw(revised ? "RETRY?" : "REPENT", { bg: "#f4ecd8", fg: "#111", size: 90 });
        wasRevised = revised;
      }
      scorch.visible = revised;
      repent.rotation.z = revised ? 0.12 : 0;
      smoke.forEach((s, i) => {
        const k = ((t - strikes[1]) * 0.6 + i / smoke.length) % 1;
        s.visible = revised;
        s.position.set(0.55 + Math.sin(i * 2 + t) * 0.12, 1.7 + k * 1.6, 0.05);
        s.scale.setScalar(0.6 + k * 1.8);
        (s.material as THREE.MeshLambertMaterial).opacity = 0.55 * (1 - k);
      });
    });

    // --- Sound ---
    ctx.at(1.2, () => sfx.shout(0.75));
    ctx.at(4, () => sfx.mumble(2.4, 0.7, -0.3));
    ctx.at(7.6, () => sfx.shout(0.8));
    ctx.at(11.6, () => sfx.thunder());
    ctx.at(12.2, () => sfx.dramaticChord());
    for (let i = 0; i < 10; i++) ctx.at(14 + i * 0.6, () => sfx.footstep(i % 2 ? 0.4 : -0.4));
    ctx.at(21, () => sfx.mumble(1.6, 0.75, -0.3));
    ctx.at(23, () => sfx.mumble(0.6, 1.1, 0.2));
    ctx.at(25, () => {
      sfx.thunder();
      sfx.boom();
    });
    ctx.at(26, () => sfx.crumple());
    ctx.at(28.8, () => sfx.dunDunDun());
    ctx.at(31, () => sfx.chant(98, 3));

    // --- Narration ---
    ctx.caption(0.8, "Day 6. Downtown. What remains of it.", 3);
    ctx.caption(4.2, "Every apocalypse produces a prophet. This one brought a crate.", 4);
    ctx.caption(8.6, "He preaches the Maintenance. It began. It shall not end.", 3.6);
    ctx.caption(12.6, "The sky agrees with him. The sky has always had a flair for drama.", 4.2);
    ctx.caption(17.4, "The people pass by. They have heard it before. They have seen the status page.", 4.6);
    ctx.caption(22.6, "One stops to listen. A brief, regrettable lapse.", 2.6);
    ctx.caption(26.2, "Then, a second sign. It has been revised.", 3.6);
    ctx.caption(30.4, "The prophet accepts the revision. Doctrine is flexible in the wasteland.", 5.4);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [1.5, 7, 16], look: [-2, 1.5, 0], fov: 50 },
      { t: 4, pos: [1.7, 2.1, 5.5], look: [PX, 1.9, 0], fov: 50 },
      { t: 9, pos: [-2.1, 1.9, 1.8], look: [PX, 2.2, 0], fov: 46 },
      { t: 11.5, pos: [-2.0, 1.8, 1.4], look: [PX, 2.3, 0], fov: 44 },
      { t: 11.7, pos: [1.6, 2.0, 7.5], look: [-5, 4.5, -14], fov: 55 },
      { t: 14.5, pos: [1.4, 2.0, 7.0], look: [-3, 2, -4], fov: 55 },
      { t: 17, pos: [1.6, 1.7, 4.4], look: [PX, 1.4, -0.5], fov: 54 },
      { t: 21, pos: [1.5, 1.6, 2.4], look: [-1.6, 1.4, -0.5], fov: 50 },
      { t: 24.6, pos: [1.4, 1.8, 2.6], look: [PX, 1.6, -1], fov: 52 },
      { t: 25.2, pos: [-2.0, 1.6, 0.0], look: [PX + 0.2, 1.55, -1.6], fov: 46 },
      { t: 28.4, pos: [-2.2, 1.5, -0.1], look: [PX + 0.2, 1.55, -1.6], fov: 40 },
      { t: 30.3, pos: [1.3, 1.9, 3.4], look: [PX, 1.9, -0.6], fov: 50 },
      { t: 36, pos: [0.4, 3.2, 8], look: [PX, 1.6, -0.6], fov: 50 },
    ]);
    ctx.flash(11.6, "#e6eeff", 0.5);
    ctx.flash(25, "#ffffff", 0.6);
    ctx.shake(11.6, 0.15, 0.7);
    ctx.shake(25, 0.25, 0.8);
  },
};
export default scene;

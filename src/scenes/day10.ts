// Day 10: The Radio. Survivors huddle around a crackling radio at night.
// A rumor: "status page… soon™". They cheer. The human antenna cheers too.
// Static. Then silence.
import * as THREE from "three";
import { box, mat, mesh } from "../engine/materials";
import { bump, lerp, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { Player } from "../kit/characters";
import { setupWorld, skyline, terrain } from "../kit/environments";
import { campfire, crate, radio, stars } from "../kit/props";

const scene: SceneDef = {
  duration: 36,
  build(ctx) {
    const { scene, sfx } = ctx;
    const world = setupWorld(ctx, { sky: 0x070b1c, fog: [14, 60], ground: 0x0a0a14, sun: 0x9fb4ff, sunIntensity: 1.3, hemi: 0.85, sunPos: [5, 10, 9] });
    scene.add(terrain(120, 30, 0.25, 0x2e2c38, 10, 8));
    scene.add(stars(500, 110));
    skyline(ctx, 45, 0x141526, 30, 4);
    const r = rng(1010);
    // moon
    const moon = new THREE.Mesh(new THREE.CircleGeometry(4, 20), new THREE.MeshBasicMaterial({ color: 0xe8ecff, fog: false }));
    moon.position.set(-30, 32, -70);
    moon.lookAt(0, 0, 0);
    scene.add(moon);

    // ruined walls around the camp
    const wall = mat(0x4a4a56);
    scene.add(box(6, 2.2, 0.4, wall, -0.5, 1.1, -3.2), box(0.4, 1.4, 3.5, wall, -3.6, 0.7, -1.6), box(2.4, 0.9, 0.4, wall, 3.2, 0.45, -3.0));
    for (let i = 0; i < 9; i++) {
      const rb = mesh(new THREE.DodecahedronGeometry(r.range(0.15, 0.4), 0), mat(0x55556a));
      rb.position.set(r.range(-5, 5), 0.12, r.range(-3.8, 4));
      if (Math.hypot(rb.position.x, rb.position.z) < 2.4) rb.position.x += 3;
      scene.add(rb);
    }
    // graffiti tally of days on the wall
    for (let k = 0; k < 10; k++) {
      const tl = box(0.04, 0.4, 0.01, 0xddddcc, -2.6 + k * 0.14 + (k === 4 || k === 9 ? -0.3 : 0), 1.4, -2.99);
      if (k === 4 || k === 9) {
        tl.rotation.z = 1.2;
        tl.scale.y = 1.8;
      }
      scene.add(tl);
    }

    // oil-barrel fire
    const barrel = mesh(new THREE.CylinderGeometry(0.32, 0.3, 0.85, 10), mat(0x7a3b1e));
    barrel.position.set(1.9, 0.425, -1.4);
    scene.add(barrel);
    const fire = campfire(0.6);
    fire.group.position.set(1.9, 0.82, -1.4);
    scene.add(fire.group);

    // the radio on its crate, with a lovely amber dial
    const stand = crate(0.5, 0x6b4423);
    scene.add(stand);
    const set = radio();
    set.position.set(0, 0.5, 0);
    set.scale.setScalar(1.3);
    scene.add(set);
    const dialMat = new THREE.MeshBasicMaterial({ color: 0xffb703 });
    const dial = box(0.2, 0.08, 0.01, dialMat, 0.155, 0.76, 0.12);
    scene.add(dial);
    const dialLight = new THREE.PointLight(0xffb347, 2, 4, 1.6);
    dialLight.position.set(0, 1.0, 0.5);
    scene.add(dialLight);
    // sound waves
    const waves = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 4, 24), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0 }));
      m.position.set(-0.15, 0.7, 0.14);
      scene.add(m);
      return m;
    });

    // the survivors, huddled in blankets
    const seats: [number, number][] = [[-1.3, 0.5], [-0.75, 1.25], [0.15, 1.45], [1.0, 1.15], [1.45, 0.35]];
    const folk = seats.map(([x, z], i) => {
      const p = new Player({ shirt: r.pick([0x6c757d, 0x264653, 0x5c4033, 0x9d0208, 0x3a5a40]), hairStyle: r.pick(["short", "long", "bun", "cap", "spiky"] as const), accessories: i % 2 ? ["hood"] : ["towel"], robe: r.pick([0x5e548e, 0x7f5539, 0x386641]) }, 1001 + i);
      p.at(x, z);
      p.face(0, 0);
      scene.add(p.root);
      return p;
    });
    // the antenna: a volunteer on a crate holding a coat hanger to the sky
    const perch = crate(0.45, 0x8a5a2b);
    perch.position.set(0.15, 0, -1.25);
    scene.add(perch);
    const ant = new Player({ shirt: 0xffd166, hairStyle: "spiky", hair: 0x3b2a1a, accessories: ["gloves"] }, 1009);
    scene.add(ant.root);
    const hanger = new THREE.Group();
    hanger.add(box(0.025, 0.9, 0.025, 0xc0c0c0, 0, -0.45, 0));
    const tri = mesh(new THREE.TorusGeometry(0.18, 0.012, 3, 3), mat(0xc0c0c0));
    tri.position.y = -0.95;
    hanger.add(tri);
    ant.handR.add(hanger);
    // a wire from the hanger down to the radio (simple stretched box, updated per frame)
    const wire = box(0.012, 1, 0.012, 0x222222);
    scene.add(wire);
    const a = new THREE.Vector3(), b = new THREE.Vector3(0.28, 0.95, 0), up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();

    sfx.ambient("static", 0.5);
    sfx.ambient("fire", 0.4);

    // --- Timeline ---
    // 0-8.5 static, waiting | 9.5-13 the voice | 14.2 CHEER (antenna jumps) | 15 static
    // 16.5-19 frozen, stare at the antenna | 19-22.5 he tries again | 22.6 cut to silence
    const silence = (t: number) => t > 22.6;
    ctx.update((t) => {
      fire.update(t);
      const voice = t > 9.5 && t < 13;
      const lean = smooth(seg(t, 9, 10)) * (1 - smooth(seg(t, 13.5, 14.2)));
      const cheer = t > 14.2 && t < 22.6;
      const freeze = t > 16.5;
      folk.forEach((p, i) => {
        const [x, z] = seats[i];
        p.at(x, z);
        p.face(0, 0);
        if (!cheer && !silence(t)) {
          p.pose("huddle", t, 1 - lean);
          p.torso.rotation.x = 0.4 + lean * 0.35;
          p.head.rotation.x = 0.2 - lean * 0.25;
        } else if (cheer) {
          p.pose("cheer", freeze ? 16.5 + i * 0.1 : t + i * 0.2, freeze ? 0 : 1);
          // hooded survivors raise their arms straight up, clear of the hood
          if (i % 2) {
            p.armL.rotation.z = 0.05;
            p.armR.rotation.z = -0.05;
          }
          if (freeze) {
            // slowly turn heads to the antenna
            const k = smooth(seg(t, 17.2 + i * 0.15, 18.6 + i * 0.15));
            const to = Math.atan2(ant.root.position.x - x, ant.root.position.z - z) - p.root.rotation.y;
            p.head.rotation.y = Math.atan2(Math.sin(to), Math.cos(to)) * k;
          }
        } else {
          p.pose("huddle", t, 0.2);
          p.torso.rotation.x = 0.55;
          p.head.rotation.x = 0.5;
        }
      });
      // the antenna
      const jump = seg(t, 14.4, 15.2);
      const climbBack = smooth(seg(t, 19, 20));
      let ax = 0.15, az = -1.25, ay = 0.45;
      if (t > 14.4 && t < 20) {
        // hops down off the crate in excitement, lands forward
        const k = t < 19 ? jump : 1 - climbBack;
        ax = lerp(0.15, 0.55, k);
        az = lerp(-1.25, -0.75, k);
        ay = 0.45 * (1 - k) + Math.sin(k * Math.PI) * 0.4;
      }
      ant.root.position.set(ax, ay, az);
      ant.root.rotation.y = 0.2;
      if (t < 14.2) {
        ant.pose("idle", t);
        ant.armR.rotation.set(-2.95 + Math.sin(t * 2.3) * 0.08, 0, 0.1 + Math.sin(t * 1.7) * 0.08);
        ant.torso.rotation.z = Math.sin(t * 1.1) * 0.05;
      } else if (t < 19) {
        ant.pose("cheer", freeze ? 16.5 : t, freeze ? 0 : 1);
        if (t > 17.8) ant.head.rotation.x = 0.3 * seg(t, 17.8, 18.4); // he notices the stares
      } else if (t < 22.6) {
        // desperate contortions for signal
        ant.pose("idle", t);
        ant.armR.rotation.set(-3.0 + Math.sin(t * 5) * 0.25, 0, Math.sin(t * 3.7) * 0.4);
        ant.torso.rotation.z = Math.sin(t * 2.5) * 0.25;
        ant.legL.rotation.z = Math.max(0, Math.sin(t * 2.5)) * 0.6;
        ant.armL.rotation.z = 1.2; // flung out to the side for balance
      } else {
        ant.pose("sad", t);
        ant.armR.rotation.x = -2.6;
      }
      // wire from hanger to radio
      ant.root.updateMatrixWorld(true);
      ant.handR.getWorldPosition(a);
      d.subVectors(a, b);
      wire.position.addVectors(a, b).multiplyScalar(0.5);
      wire.scale.y = d.length();
      wire.quaternion.setFromUnitVectors(up, d.normalize());

      // the radio dial & waves
      const sig = voice ? 1 : 0.2 + Math.abs(Math.sin(t * 13)) * 0.15;
      dialMat.color.setRGB(1 * sig + 0.2, 0.72 * sig + 0.1, 0.01);
      dialLight.intensity = silence(t) ? 0.4 : 1.2 + sig * 3;
      waves.forEach((w, i) => {
        const k = (t * 0.9 + i / 3) % 1;
        w.scale.setScalar(1 + k * 5);
        w.visible = voice;
        (w.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - k);
      });
      // after the cut, the fire burns low and the night gets colder
      fire.group.scale.setScalar(silence(t) ? lerp(0.6, 0.35, seg(t, 22.6, 24)) : 0.6 + bump(t, 14.2, 16) * 0.25);
      fire.light.intensity *= silence(t) ? 0.5 : 1;
      world.hemi.intensity = silence(t) ? 0.6 : 0.85;
    });

    // --- Sound ---
    ctx.at(3, () => sfx.glitch(0.4));
    ctx.at(6.5, () => sfx.glitch(0.3));
    ctx.at(8.6, () => sfx.glitch(0.8));
    ctx.at(9.5, () => sfx.radioVoice(1.6));
    ctx.at(11.3, () => sfx.radioVoice(1.5));
    ctx.at(13.2, () => sfx.heartbeat());
    ctx.at(14.2, () => {
      sfx.cheer(2.4);
      sfx.fanfare();
    });
    ctx.at(15.1, () => {
      sfx.glitch(1.2);
      sfx.ambient("static", 0.9);
    });
    ctx.at(16.5, () => sfx.stopAmbient("fire"));
    ctx.at(18.2, () => sfx.dunDunDun());
    ctx.at(19.5, () => sfx.glitch(0.5));
    ctx.at(20.6, () => sfx.glitch(0.5));
    ctx.at(21.6, () => sfx.glitch(0.7));
    ctx.at(22.6, () => {
      sfx.stopAmbient("static");
      sfx.stopAmbient("fire");
    });
    ctx.at(26, () => sfx.cricket(-0.3));
    ctx.at(31, () => sfx.cricket(0.4));
    ctx.at(35.9, () => {
      sfx.ambient("static", 0.5);
      sfx.ambient("fire", 0.4);
    });

    // --- Narration ---
    ctx.caption(0.8, "Day 10. Night. The survivors gather around the last working radio in the district.", 4.4);
    ctx.caption(5.6, "One of them volunteered to be the antenna. Eleven hours ago.", 3.6);
    ctx.caption(9.6, "“…kzzt… status page… kzzt… soon™…”", 3.8);
    ctx.caption(14.3, "SOON™. The most beautiful word in the language.", 3);
    ctx.caption(17.6, "The antenna celebrated too.", 3.4);
    ctx.caption(23.6, "Soon™ is not a date. Soon™ is a feeling.", 4.2);
    ctx.caption(28.8, "They will listen again tomorrow. The antenna has been asked to stop having feelings.", 6.2);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [0.5, 2.6, 6.2], look: [0, 0.7, 0], fov: 50 },
      { t: 5.2, pos: [1.6, 2.4, 2.4], look: [0.15, 1.6, -1.1], fov: 50 },
      { t: 8.8, pos: [0.7, 2.9, 1.9], look: [0, 0.6, 0.2], fov: 50 },
      { t: 13, pos: [0.4, 2.4, 1.3], look: [0, 0.7, 0.1], fov: 46 },
      { t: 14.1, pos: [0.35, 2.35, 1.25], look: [0, 0.7, 0.1], fov: 46 },
      { t: 14.2, pos: [1.3, 2.1, -2.5], look: [0, 1.1, 0.8], fov: 58 },
      { t: 17, pos: [1.6, 2.0, -2.4], look: [-0.2, 1.2, 0.8], fov: 54 },
      { t: 19, pos: [2.3, 1.9, 0.2], look: [0.3, 1.4, -1.1], fov: 58 },
      { t: 22.5, pos: [2.2, 1.8, 0.4], look: [0.2, 1.6, -1.2], fov: 54 },
      // cut to silence: extreme wide, very still
      { t: 22.6, pos: [3, 7, 16], look: [0, 0.5, 0], fov: 46 },
      { t: 36, pos: [2.5, 6.4, 14], look: [0, 0.5, 0], fov: 44 },
    ]);
    ctx.flash(14.2, "#ffd166", 0.35);
    ctx.flash(22.6, "#000000", 0.6);
    ctx.shake(15.1, 0.08, 0.5);
  },
};
export default scene;

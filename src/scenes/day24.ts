// Day 24: First Contact. A UFO descends over the dead arcade, beams up a
// cabinet, and its tiny green crew worships it. It says ONLINE. For them.
import * as THREE from "three";
import { box, glow, mat, mesh } from "../engine/materials";
import { bump, easeIn, lerp, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { Player } from "../kit/characters";
import { cabinet } from "../kit/cabinets";
import { arcadeFacade, floor, setupWorld, skyline } from "../kit/environments";
import { cardboardBox, stars, ufo } from "../kit/props";

const scene: SceneDef = {
  duration: 40,
  build(ctx) {
    const { scene, sfx } = ctx;
    const world = setupWorld(ctx, { sky: 0x070b1e, fog: [25, 80], ground: 0x0a0a14, hemi: 0.9, sun: 0x8090ff, sunIntensity: 0.8, sunPos: [6, 12, 8] });
    scene.add(stars(600));
    const lot = floor(60, 60, 0x24242c);
    scene.add(lot);
    for (let i = 0; i < 6; i++) {
      const s = floor(0.12, 2.4, 0xbbbbaa);
      s.position.set(-7.5 + i * 3, 0.01, 4);
      scene.add(s);
    }
    skyline(ctx, 45, 0x141a2e, 36, 2401);
    const facade = arcadeFacade("GAME CENTER", 10, 5);
    facade.position.set(0, 0, -6);
    scene.add(facade);
    (facade.signPlane.material as THREE.MeshBasicMaterial).color.setScalar(0.35); // the sign is dead
    const r = rng(2402);
    for (let i = 0; i < 4; i++) {
      const b = cardboardBox(r.range(0.4, 0.7), r.range(0.3, 0.5), 0.5);
      b.position.set(r.range(3.5, 5), 0, r.range(-5.3, -4.5));
      b.rotation.y = r.range(-0.5, 0.5);
      scene.add(b);
    }
    // The car the humans hide behind
    const car = new THREE.Group();
    car.add(box(1.8, 0.7, 3.6, 0x6b2737, 0, 0.55, 0), box(1.6, 0.6, 1.8, 0x6b2737, 0, 1.2, -0.2), box(1.5, 0.45, 0.02, mat(0x223344), 0, 1.25, 0.71));
    for (const [x, z] of [[0.9, 1.1], [-0.9, 1.1], [0.9, -1.1], [-0.9, -1.1]]) {
      const w = mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.2, 8), mat(0x111111));
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.33, z);
      car.add(w);
    }
    car.position.set(-5.2, 0, 2.5);
    car.rotation.y = 0.3;
    scene.add(car);

    // The cabinet, dragged out under the stars
    const cab = cabinet("slider");
    cab.group.position.set(1.5, 0, -1.5);
    cab.setScreen("error");
    scene.add(cab.group);
    const cabGlow = new THREE.PointLight(0x33ff88, 0, 6, 1.5);
    cabGlow.position.set(1.5, 1.6, -0.6);
    scene.add(cabGlow);

    // UFO
    const ship = ufo();
    scene.add(ship);
    ship.beam.scale.set(1, 1.2, 1);
    const beamMat = ship.beam.material as THREE.MeshBasicMaterial;
    const shipLight = new THREE.SpotLight(0xaaffcc, 0, 20, 0.5, 0.5, 1);
    shipLight.position.set(1.5, 8, -1.5);
    shipLight.target.position.set(1.5, 0, -1.5);
    scene.add(shipLight, shipLight.target);

    // Humans, hiding behind the car
    const humans = [0, 1, 2, 3].map((i) => {
      const p = new Player({ hairStyle: (["cap", "twin", "spiky", "short"] as const)[i], accessories: i === 0 ? ["gloves"] : i === 2 ? ["glasses", "backpack"] : [] }, 2410 + i);
      scene.add(p.root);
      return p;
    });
    // all on the open side of the car, clear of its body
    const hPos: [number, number][] = [[-3.9, 0.8], [-3.7, 1.7], [-3.2, 3.5], [-3.6, 2.6]];

    // Aliens: tiny green players with huge eyes and antennae
    const NA = 5;
    const aliens = Array.from({ length: NA }, (_, i) => {
      const a = new Player({ skin: 0x7ddc5a, shirt: 0xb8c4cc, pants: 0x8a96a0, shoes: 0x556070, hairStyle: "bald", eyeColor: 0x050505, scale: 0.6 }, 2420 + i);
      a.eyes.forEach((e) => {
        e.scale.set(2.2, 1.8, 1);
        e.position.x *= 1.25;
      });
      const ant = box(0.02, 0.22, 0.02, 0x5cb83a, 0, 0.47, 0);
      const bulb = mesh(new THREE.IcosahedronGeometry(0.05, 0), glow(0xb7ff5c));
      bulb.position.y = 0.6;
      a.head.add(ant, bulb);
      scene.add(a.root);
      return a;
    });

    sfx.ambient("crickets", 0.5);
    sfx.ambient("droneEerie", 0.3);

    // 0-6 quiet | 6-11 descent | 11-17 beam + lift | 17-23 aliens descend & kneel | 23-29 ONLINE
    // 29-34 human runs over: ERROR | 34-40 departure
    const CX = 1.5, CZ = -1.5;
    ctx.update((t) => {
      // ship
      const down = smooth(seg(t, 4, 10));
      const leave = easeIn(seg(t, 35, 39.5));
      ship.position.set(lerp(-25, CX, smooth(seg(t, 3, 9))) + leave * 6, lerp(26, 7, down) + leave * 30 + Math.sin(t * 1.3) * 0.12, lerp(-30, CZ, smooth(seg(t, 3, 9))));
      ship.rotation.y = t * 1.6;
      ship.rotation.z = Math.sin(t * 0.9) * 0.04 * (1 - down) + 0.04 * Math.sin(t * 2);
      ship.lights.forEach((l, i) => ((l.material as THREE.MeshBasicMaterial).color.setHex((Math.floor(t * 6) + i) % 3 ? 0xffee66 : 0xff5577)));
      const beamOn = t > 10.5 && t < 35.5;
      ship.beam.visible = beamOn;
      ship.beam.position.y = -3.9;
      beamMat.opacity = beamOn ? 0.22 + Math.sin(t * 12) * 0.05 : 0;
      shipLight.intensity = beamOn ? 60 : 0;

      // cabinet: lifted, then hovers in the beam
      const lift = smooth(seg(t, 11.5, 16.5));
      const up2 = easeIn(seg(t, 34.5, 36));
      cab.group.position.set(CX, lift * 2.0 + Math.sin(t * 1.8) * 0.08 * lift + up2 * 4.5, CZ);
      cab.group.rotation.y = Math.sin((t - 11.5) * 0.7) * 0.5 * lift;
      cab.group.rotation.z = Math.sin(t * 1.1) * 0.06 * lift;
      cab.group.visible = up2 < 1;
      const online = t > 23 && !(t > 30 && t < 33.5);
      if (online) cab.setScreen("online");
      else cab.setScreen(t > 30 ? "custom" : "error", t > 30 ? ["NETWORK ERROR", "", "region: EARTH", "not supported"] : undefined, t > 30 ? { bg: "#1a0005", fg: "#ff3355", size: 30 } : undefined);
      cabGlow.intensity = online && t < 35 ? 4 : 0;

      // aliens float down the beam, then kneel in a circle
      aliens.forEach((a, i) => {
        const ang = (i / NA) * Math.PI * 2 + 0.3;
        const d = smooth(seg(t, 17 + i * 0.4, 19.5 + i * 0.4));
        const ascend = easeIn(seg(t, 34 + i * 0.15, 36.5 + i * 0.15));
        const k = Math.min(d, 1 - ascend);
        // ride the beam down around (not through) the hovering cabinet, then step out to the circle
        const rad = lerp(1.25, 1.9, smooth(seg(t, 19 + i * 0.4, 21 + i * 0.4)) * (1 - ascend));
        a.root.position.set(CX + Math.cos(ang) * rad, lerp(5.5, 0, d) + ascend * 6, CZ + Math.sin(ang) * rad);
        a.root.visible = t > 17 + i * 0.4 && ascend < 1;
        a.face(CX, CZ);
        if (k < 1 || t < 21.5) {
          a.pose("idle", t);
          a.armL.rotation.z = 0.6;
          a.armR.rotation.z = -0.6;
        } else if (t > 23.2 && t < 29.5) a.pose("cheer", t + i * 0.3, 0.6);
        else a.pose("worship", t + i * 0.25);
        if (t > 30 && t < 34) {
          // they glare at the intruder
          a.pose("kneel", t);
          a.face(humans[0].root.position.x, humans[0].root.position.z);
        }
      });

      // humans
      humans.forEach((p, i) => {
        const [x, z] = hPos[i];
        p.root.position.set(x, 0, z);
        p.face(CX, CZ);
        if (t < 8) {
          p.pose(i === 2 ? "sitFloor" : "sad", t);
          if (t > 6) p.head.rotation.x = -0.5; // looking up
          if (i !== 2) p.face(x + 1, z - 1);
        } else if (t < 23) {
          p.pose(i === 1 ? "point" : i === 3 ? "stop" : "idle", t);
          p.head.rotation.x = lerp(-0.6, -0.15, seg(t, 14, 20));
        } else if (i === 0 && t >= 29 && t < 36) {
          // the brave one runs to the cabinet
          const k = smooth(seg(t, 29, 30.5));
          const back = smooth(seg(t, 33.5, 35));
          p.root.position.set(lerp(x, CX - 1.2, k * (1 - back)), 0, lerp(z, CZ + 1.8, k * (1 - back)));
          if (k < 1 && back === 0) p.pose("run", t);
          else if (back > 0 && back < 1) p.pose("walk", t);
          else p.pose("reach", t, 1);
          p.face(CX, CZ);
          if (back > 0 && back < 1) p.face(x, z + 3);
        } else if (t >= 23) {
          p.pose(i === 0 ? "facepalm" : i === 1 ? "sad" : i === 2 ? "reach" : "point", t);
          if (t > 36) p.pose("sad", t);
        }
      });

      world.hemi.intensity = 0.9 + bump(t, 10.5, 35.5) * 0.15;
    });

    // --- Sound ---
    ctx.at(4, () => sfx.ambient("hum", 0.35));
    ctx.at(6.5, () => sfx.gasp());
    ctx.at(10.5, () => sfx.ufoBeam(6));
    ctx.at(12, () => sfx.dramaticChord());
    ctx.at(17, () => sfx.ufoBeam(4));
    ctx.at(21.5, () => sfx.chant(220, 2.5));
    ctx.at(23, () => sfx.bootJingle());
    ctx.at(23.6, () => sfx.cheer(1.2));
    ctx.at(25.5, () => sfx.mumble(1.5, 0.8, -0.5));
    for (let s = 0; s < 4; s++) ctx.at(29 + s * 0.35, () => sfx.footstep(-0.3));
    ctx.at(30.1, () => sfx.buzzer());
    ctx.at(30.4, () => sfx.errorBeep(2));
    ctx.at(33.6, () => sfx.ding());
    ctx.at(34.5, () => sfx.ufoBeam(3));
    ctx.at(36.5, () => sfx.whoosh(1.2));
    ctx.at(37.2, () => sfx.stopAmbient("hum"));
    ctx.at(37.5, () => sfx.sadTrombone());

    // --- Narration ---
    ctx.caption(0.6, "Day 24. The arcade is dark. The sky, however, is not.", 4.4);
    ctx.caption(6, "They crossed a thousand light-years. They passed every planet. They came for one thing.", 5);
    ctx.caption(12, "Not our water. Not our leaders. The slider cabinet.", 4.5);
    ctx.caption(18.2, "The visitors kneel before it. Their civilization, too, has rhythm games.", 4.6);
    ctx.caption(23.5, "And then, for the first time in 24 days, a screen said ONLINE. For them.", 5);
    ctx.caption(29.3, "For humans: NETWORK ERROR. Region-locked by the cosmos itself.", 4.6);
    ctx.caption(35.4, "They left no message. Not even a credit.", 4.2);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [0, 2.2, 11], look: [0, 2, -4] },
      { t: 5, pos: [-2.5, 1.8, 7.5], look: [-6, 7, -15] },
      { t: 9.5, pos: [-6.5, 1.5, 5.5], look: [1, 4.5, -1.5], fov: 55 },
      { t: 14, pos: [-1.5, 1.2, 5], look: [1.5, 3.2, -1.5], fov: 55 },
      { t: 18, pos: [5.5, 3, 4.5], look: [1.5, 2.5, -1.5] },
      { t: 22.5, pos: [3.6, 1.7, 4.8], look: [1.5, 1.3, -1.5] },
      { t: 26.5, pos: [2.3, 1.2, 3.0], look: [1.5, 2.0, -1.5], fov: 55 },
      { t: 29, pos: [-7.2, 1.7, 5.2], look: [0, 1.4, -1] },
      { t: 33.5, pos: [-6.8, 1.6, 4.6], look: [0, 1.6, -1] },
      { t: 36, pos: [-2, 1.4, 6.5], look: [1.5, 6, -1.5] },
      { t: 40, pos: [0, 2.2, 11], look: [0, 2, -4] },
    ]);
    ctx.flash(10.5, "#aaffcc", 0.4);
    ctx.flash(23, "#33ff88", 0.3);
    ctx.flash(30.1, "#ff3355", 0.3);
    ctx.shake(10.5, 0.08, 0.6);
  },
};
export default scene;

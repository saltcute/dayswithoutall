// Day 19: The Gate. The pilgrims reach a huge grey datacenter with one tiny
// door and a MAINTENANCE sign. They knock. Crickets. A note slips out.
import * as THREE from "three";
import { box, glow, mat, mesh } from "../engine/materials";
import { lerp, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { textPlane } from "../engine/textTexture";
import { Player } from "../kit/characters";
import { rock } from "../kit/props";
import { setupWorld, terrain } from "../kit/environments";

const scene: SceneDef = {
  duration: 40,
  build(ctx) {
    const { scene, sfx } = ctx;
    setupWorld(ctx, { sky: 0x9aa6b8, fog: [30, 110], ground: 0x4a505a, hemi: 1.0, sun: 0xe8eef8, sunIntensity: 1.3, sunPos: [10, 16, 14], shadowSize: 18 });
    const r = rng(1919);
    scene.add(terrain(200, 40, 0.8, 0x7b8070, 19, 22));
    // concrete apron
    const apron = box(40, 0.1, 14, 0x9a9da3, 0, 0.0, 2);
    apron.castShadow = false;
    scene.add(apron);

    // --- The Server ---
    const FZ = -4; // front face z
    const bw = 34, bh = 14, bd = 18;
    scene.add(box(bw, bh, bd, 0x8a8f98, 0, bh / 2, FZ - bd / 2));
    for (let i = 0; i < 17; i++) if (i !== 8) scene.add(box(0.35, bh, 0.3, 0x7a7f88, -bw / 2 + 1 + i * 2, bh / 2, FZ + 0.1)); // (no pilaster across the door)
    scene.add(box(bw + 0.4, 0.6, bd + 0.4, 0x6e737c, 0, bh + 0.3, FZ - bd / 2));
    // vents
    for (let i = 0; i < 8; i++) {
      const x = -14 + i * 4;
      if (Math.abs(x) < 2) continue;
      scene.add(box(2.4, 1.6, 0.1, 0x3d4048, x, 9 + (i % 2) * 2, FZ + 0.06));
      for (let j = 0; j < 5; j++) scene.add(box(2.3, 0.08, 0.15, 0x6e737c, x, 8.4 + (i % 2) * 2 + j * 0.3, FZ + 0.12));
    }
    // rooftop chillers with spinning fans
    const fans: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      scene.add(box(3, 1.4, 3, 0xa0a4ab, -12 + i * 6, bh + 1.3, FZ - 5));
      const f = mesh(new THREE.BoxGeometry(2.4, 0.05, 0.3), mat(0x333333));
      f.position.set(-12 + i * 6, bh + 2.05, FZ - 5);
      fans.push(f);
      scene.add(f);
    }
    // blinking LEDs
    const leds: THREE.Mesh[] = [];
    for (let i = 0; i < 24; i++) {
      const l = box(0.12, 0.12, 0.05, glow(i % 5 === 0 ? 0xff3344 : 0x33ff66), r.range(-15, 15), r.range(2.5, 6.5), FZ + 0.08);
      l.castShadow = false;
      leds.push(l);
      scene.add(l);
    }
    // the tiny door
    scene.add(box(1.0, 1.75, 0.08, 0x5a5f68, 0, 0.875, FZ + 0.05));
    scene.add(box(0.85, 1.6, 0.06, 0x3a3e46, 0, 0.82, FZ + 0.08));
    scene.add(box(0.06, 0.06, 0.06, 0xd4b106, 0.32, 0.8, FZ + 0.13));
    const doorLed = box(0.06, 0.06, 0.03, glow(0xffaa00), 0, 1.7, FZ + 0.12);
    scene.add(doorLed);
    const maint = textPlane(["MAINTENANCE"], 1.4, 0.32, { bg: "#ffcc00", fg: "#111", size: 120, border: "#111", borderWidth: 14 });
    maint.position.set(0, 2.05, FZ + 0.12);
    scene.add(maint);
    const hours = textPlane(["OPEN:", "SOON™"], 0.5, 0.4, { bg: "#ffffff", fg: "#333", size: 70 });
    hours.position.set(0.9, 1.2, FZ + 0.1);
    scene.add(hours);
    // security camera
    const camArm = new THREE.Group();
    camArm.position.set(1.6, 3.2, FZ + 0.1);
    camArm.add(box(0.06, 0.06, 0.4, 0x333333, 0, 0, 0.2));
    const camHead = new THREE.Group();
    camHead.position.z = 0.4;
    camHead.add(box(0.18, 0.18, 0.4, 0xdddddd, 0, 0, 0.1));
    const camLed = box(0.04, 0.04, 0.02, glow(0xff2222), 0.05, 0.05, 0.31);
    camHead.add(camLed);
    camArm.add(camHead);
    scene.add(camArm);
    // fence with an open gate
    for (const side of [-1, 1])
      for (let i = 0; i < 6; i++) {
        const x = side * (3 + i * 2.2);
        scene.add(box(0.08, 2.2, 0.08, 0x777777, x, 1.1, 6));
        scene.add(box(2.2, 0.05, 0.05, 0x777777, x + side * 1.1, 2.1, 6));
        const mesh2 = box(2.2, 2.0, 0.02, new THREE.MeshLambertMaterial({ color: 0x999999, wireframe: true }), x + side * 1.1, 1.05, 6);
        mesh2.castShadow = false;
        scene.add(mesh2);
      }
    for (let i = 0; i < 8; i++) {
      const k = rock(r.range(0.2, 0.5), 190 + i, 0x8a8a80);
      k.position.set(r.range(-18, 18), k.position.y, r.range(8, 20));
      scene.add(k);
    }

    // --- Pilgrims ---
    const elder = new Player({ accessories: ["robe", "beard", "backpack"], robe: 0x8d6e4c, hairStyle: "bald", skin: 0xe8b894 }, 1900);
    // the staff runs through the left fist and is kept upright in update()
    const staff = box(0.06, 1.8, 0.06, 0x6b4423);
    staff.rotation.order = "ZYX"; // inverse of the arm's XYZ rotation
    elder.handL.add(staff);
    const STAFF_ARM = new THREE.Euler(-0.5, 0, 0.25); // hand forward and out, clear of the robe
    const staffUp = new THREE.Vector3();
    const hL = new THREE.Vector3(), hR = new THREE.Vector3(), fwd = new THREE.Vector3();
    scene.add(elder.root);
    const flock = Array.from({ length: 8 }, (_, i) => {
      const p = new Player({ shirt: r.pick([0xa5734f, 0x6b705c, 0xb08968, 0x7f5539, 0x9c6644, 0x5e548e]), accessories: ["backpack", i % 2 ? "towel" : "gloves"] }, 1910 + i);
      scene.add(p.root);
      const row = Math.floor(i / 4), col = i % 4;
      return { p, x: (col - 1.5) * 1.15 + row * 0.5, z: -0.6 + row * 1.2 };
    });
    // the note
    const note = textPlane(["please wait"], 0.42, 0.3, { bg: "#ffffff", fg: "#222", size: 52, font: "Georgia, serif", weight: "400" });
    scene.add(note);

    sfx.ambient("hum", 0.8);
    sfx.ambient("wind", 0.3);

    const KNOCK1 = 13.6, KNOCK2 = 22.8, SLIP = 26.4, PICK = 28.6;
    ctx.update((t) => {
      // walk in
      const wk = smooth(seg(t, 0, 7.5));
      flock.forEach(({ p, x, z }, i) => {
        const z0 = z + 16, x0 = x * 1.4;
        p.travel(x0, z0, x, z + 0.4, wk);
        if (wk < 1) p.pose("walk", t);
        else {
          p.face(0, FZ);
          if (t < 14.6) p.pose("idle", t);
          else if (t < SLIP) {
            p.pose(i % 3 === 0 ? "sad" : "idle", t);
            p.head.rotation.x = -0.25;
          } else if (t < 35) {
            p.pose(i % 2 ? "reach" : "point", t, 0.6);
            p.head.rotation.x = 0.1;
          } else {
            p.pose("sitFloor", t);
          }
        }
      });
      // the elder
      const ek = smooth(seg(t, 0, 7.5));
      const step = smooth(seg(t, 11.8, 13.2));
      // the elder leads, ahead of the flock, then steps up to the door (right fist lands on it)
      const ex = 0.15 * step, ez = lerp(lerp(14.6, -1.6, ek), FZ + 0.75, step);
      elder.root.position.set(ex, 0, ez);
      elder.root.rotation.y = Math.PI;
      if (ek < 1 || (step > 0 && step < 1)) elder.pose("walk", t);
      else if (t < 11.8) elder.pose("idle", t);
      else if (t < KNOCK1 + 1) elder.pose("knock", t);
      else if (t < KNOCK2 - 0.2) {
        elder.pose("idle", t);
        elder.head.rotation.x = -0.4;
      } else if (t < KNOCK2 + 0.8) {
        elder.pose("knock", t * 0.6);
        elder.armR.rotation.x = -1.4 + Math.max(0, Math.sin(t * 7)) * 0.25;
      } else if (t < SLIP + 0.2) elder.pose("idle", t);
      else if (t < PICK + 0.6) elder.pose("reach", t, 1);
      else {
        // turn around and show the note
        const tk = smooth(seg(t, PICK + 0.6, PICK + 1.4));
        elder.root.rotation.y = Math.PI * (1 - tk);
        elder.pose(t < 35 ? "hold" : "sad", t);
        if (t < 35) {
          elder.armR.rotation.x = elder.armL.rotation.x = -1.4;
          elder.head.rotation.x = 0.35;
        } else {
          // dejected: the note held low in both hands
          elder.armR.rotation.x = elder.armL.rotation.x = -0.75;
          elder.armL.rotation.z = -0.12;
          elder.armR.rotation.z = 0.12;
        }
      }
      // staff: upright through the left fist while it is carried
      if (t < PICK - 0.3) {
        elder.armL.rotation.copy(STAFF_ARM);
        staff.rotation.set(-STAFF_ARM.x, 0, -STAFF_ARM.z);
        // centre 0.1 above the fist (fist ~0.8 up), so the foot is just above the ground
        staff.position.copy(staffUp.set(0, 0.1, 0).applyEuler(staff.rotation));
      }
      elder.root.updateMatrixWorld(true);
      elder.handL.getWorldPosition(hL);
      elder.handR.getWorldPosition(hR);
      fwd.set(Math.sin(elder.root.rotation.y), 0, Math.cos(elder.root.rotation.y));

      // the note: slides out under the door, gets picked up, shown to all
      note.visible = t > SLIP;
      if (t < PICK) {
        const nk = smooth(seg(t, SLIP, SLIP + 1));
        note.position.set(-0.25, 0.015, FZ + 0.1 + nk * 0.55);
        note.rotation.set(-Math.PI / 2, 0, 0.15 * nk);
      } else if (t < PICK + 0.6) {
        // up off the floor into the right hand
        const nk = smooth(seg(t, PICK, PICK + 0.6));
        note.position.set(lerp(-0.25, hR.x, nk), lerp(0.015, hR.y, nk), lerp(FZ + 0.65, hR.z, nk));
        note.rotation.set(-Math.PI / 2 * (1 - nk), Math.PI * nk, 0);
      } else {
        // held up between both fists, facing out from the elder as he turns
        note.position.addVectors(hL, hR).multiplyScalar(0.5).addScaledVector(fwd, t < 35 ? 0 : 0.04);
        if (t < 35) note.position.y += 0.03;
        else note.position.y -= 0.1;
        note.rotation.set(t < 35 ? 0 : -0.5, elder.root.rotation.y, 0);
      }

      // security camera pans, notices them, looks away
      camArm.rotation.y = t < 17 ? Math.sin(t * 0.6) * 0.8 : t < 21 ? lerp(0.3, -0.6, smooth(seg(t, 17, 18))) : lerp(-0.6, 1.4, smooth(seg(t, 20.2, 21)));
      camHead.rotation.x = t > 17 && t < 20.5 ? 0.5 : 0.2;
      camLed.visible = Math.sin(t * 5) > 0;
      fans.forEach((f, i) => (f.rotation.y = t * (4 + i)));
      leds.forEach((l, i) => (l.visible = Math.sin(t * (2 + (i % 7)) + i) > -0.2));
      doorLed.visible = Math.sin(t * 3) > 0;
      staff.visible = t < PICK - 0.3;
    });

    // --- Sound ---
    for (let s = 0.2; s < 7.5; s += 0.5) ctx.at(s, () => sfx.footstep(Math.sin(s * 5) * 0.5));
    ctx.at(4, () => sfx.mumble(1.4, 0.9));
    ctx.at(8, () => sfx.dramaticChord());
    ctx.at(KNOCK1, () => sfx.knock(3));
    [17.2, 18.4, 19.6, 20.9].forEach((s, i) => ctx.at(s, () => sfx.cricket(i % 2 ? 0.5 : -0.5)));
    ctx.at(17.6, () => sfx.beep(1200, 0.06)); // camera notices
    ctx.at(20.3, () => sfx.beep(900, 0.06)); // camera looks away
    ctx.at(KNOCK2, () => sfx.knock(2));
    ctx.at(24.5, () => sfx.cricket(0));
    ctx.at(SLIP, () => sfx.noise(0.8, { type: "bandpass", freq: 2500, q: 2, gain: 0.15 }));
    ctx.at(SLIP + 0.6, () => sfx.crowdGasp());
    ctx.at(30.4, () => sfx.bell(660, 2));
    ctx.at(33, () => sfx.cricket(0.3));
    ctx.at(35.2, () => sfx.sadTrombone());

    // --- Narration ---
    ctx.caption(0.8, "Day 19. After weeks of walking, the pilgrims arrive at The Server.", 5);
    ctx.caption(6.2, "It is very large. It is very grey. It has one door, built for one very small administrator.", 5.4);
    ctx.caption(12, "The Elder steps forward. Protocol demands three knocks.", 4.6);
    ctx.caption(17, "No answer. The building hums. It is clearly busy doing something.", 5);
    ctx.caption(22.4, "A second knock. More polite. Extremely polite.", 3.8);
    ctx.caption(26.4, "And then… a reply.", 3.6);
    ctx.caption(30.4, "It reads, in full:", 3.6);
    ctx.caption(35, "They have waited nineteen days. They can wait a little longer.", 4.8);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [0, 2, 30], look: [0, 6, -4] },
      { t: 6, pos: [0, 1.8, 20], look: [0, 6.5, -4] },
      { t: 6.3, pos: [3, 0.4, 3.5], look: [-0.6, 7, -4], fov: 60 },
      { t: 11.6, pos: [2, 0.5, 3], look: [0, 4, -4], fov: 60 },
      { t: 12, pos: [2.4, 1.6, -2.7], look: [0, 1.3, FZ + 0.3], fov: 45 },
      { t: 16.6, pos: [2.1, 1.5, -2.9], look: [0, 1.3, FZ + 0.3], fov: 45 },
      { t: 17, pos: [0, 4.2, 9], look: [0, 1.6, FZ], fov: 50 },
      { t: 22.2, pos: [0, 3.8, 8], look: [0, 1.6, FZ] },
      { t: 22.6, pos: [-2.2, 0.8, -2.9], look: [-0.2, 0.4, FZ + 0.2], fov: 45 },
      { t: 28.4, pos: [-2.0, 0.55, -3.0], look: [-0.25, 0.1, FZ + 0.4], fov: 45 },
      { t: 29.4, pos: [-1.2, 2.2, 4], look: [0, 1.2, -2.5], fov: 50 },
      { t: 30.4, pos: [0.15, 1.3, -1.6], look: [0.15, 1.28, -2.9], fov: 40 },
      { t: 34.4, pos: [0.15, 1.3, -1.8], look: [0.15, 1.28, -2.9], fov: 40 },
      { t: 35, pos: [0, 2.2, 8], look: [0, 3, -4], fov: 55 },
      { t: 40, pos: [0, 2.5, 26], look: [0, 6, -4], fov: 55 },
    ]);
  },
};
export default scene;

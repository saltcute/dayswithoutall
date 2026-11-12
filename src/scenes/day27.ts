// Day 27: False Dawn. Someone runs in shouting "IT'S BACK!!". Everyone
// stampedes inside. It is a green LED on a router. Everyone faints.
import * as THREE from "three";
import { box, glow, mesh } from "../engine/materials";
import { rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { textPlane } from "../engine/textTexture";
import { Player } from "../kit/characters";
import { cabinet, type CabKind } from "../kit/cabinets";
import { arcadeFacade, arcadeInterior, floor, setupWorld, skyline } from "../kit/environments";
import { cardboardBox, router, table, vendingMachine } from "../kit/props";

const IZ = 60; // the interior lives behind the camera, out of sight

const scene: SceneDef = {
  duration: 36,
  build(ctx) {
    const { scene, sfx } = ctx;
    const world = setupWorld(ctx, { sky: 0xf6b0a0, fog: [18, 55], ground: 0x553344, hemi: 1.0, sun: 0xffc9a0, sunIntensity: 1.6, sunPos: [8, 5, 10] });
    scene.add(floor(60, 80, 0x4a4450).translateY(10));
    scene.add(floor(60, 3, 0x8d8790).translateZ(0.01).translateY(4.5));
    skyline(ctx, 40, 0xc98b9a, 36, 2701);
    const facade = arcadeFacade("GAME CENTER", 10, 5);
    facade.position.set(0, 0, -6);
    scene.add(facade);
    const vend = vendingMachine("DRINKS");
    vend.position.set(4, 0, -5.3);
    scene.add(vend);
    const r = rng(2702);
    for (let i = 0; i < 4; i++) {
      const b = cardboardBox(r.range(0.4, 0.7), r.range(0.3, 0.5), 0.5);
      b.position.set(r.range(-4.5, -2.5), 0, r.range(-5.3, -4.3));
      b.rotation.y = r.range(-0.5, 0.5);
      scene.add(b);
    }
    // a hand-written sign by the door
    const note = textPlane(["SERVER WATCH", "day 27", "nothing yet"], 0.8, 0.6, { bg: "#fffbe6", fg: "#333", size: 34, font: "'Comic Sans MS', cursive" });
    note.position.set(1.4, 1.6, -5.78);
    scene.add(note);

    // --- Interior ---
    const room = arcadeInterior(ctx, { w: 10, d: 8, lit: false, neon: "GAME CENTER" });
    room.group.position.z = IZ;
    room.lamp.position.set(0, 3.2, IZ - 1.6);
    room.lamp.color.set(0x8fa0ff);
    room.lamp.intensity = 5;
    room.neon.visible = false;
    // close the room off so the reverse shots don't look out at the dawn sky
    scene.add(box(10.4, 4.2, 0.2, 0x2a1d50, 0, 2.1, IZ + 4.6), box(10.4, 0.1, 9.4, 0x1a1236, 0, 4.05, IZ + 0.5));
    const kinds: CabKind[] = ["round", "slider", "lever", "round", "slider"];
    kinds.forEach((k, i) => {
      const c = cabinet(k);
      c.setScreen("off");
      // (two of these used to share x≈4; spread along the back wall, clear of the table)
      c.group.position.set([-4, -2.5, 3.9, 2.4, -1.0][i], 0, IZ - 3.3);
      scene.add(c.group);
    });
    const tbl = table(1.2, 0.7, 0x5c4033);
    tbl.position.set(0, 0, IZ - 2.4);
    scene.add(tbl);
    const rt = router();
    rt.scale.setScalar(1.6);
    rt.position.set(0, 0.78, IZ - 2.4);
    scene.add(rt);
    rt.leds.forEach((l, i) => {
      if (i > 0) l.material = glow(0x112211);
    });
    const ledMat = glow(0x33ff66);
    rt.leds[0].material = ledMat;
    const halo = mesh(new THREE.IcosahedronGeometry(0.05, 0), glow(0x33ff66, 0.35), false, false);
    halo.position.copy(rt.leds[0].position);
    rt.add(halo);
    const ledLight = new THREE.PointLight(0x33ff66, 0, 4, 1.5);
    ledLight.position.set(-0.2, 1.0, IZ - 2.1);
    scene.add(ledLight);
    // a cable going nowhere
    const cable = box(0.03, 0.03, 1.2, 0x111111, 0.25, 0.79, IZ - 3.2);
    scene.add(cable, box(0.03, 0.8, 0.03, 0x111111, 0.25, 0.4, IZ - 3.8));

    // --- People ---
    const N = 6;
    const outside: [number, number][] = [[-3.4, -2.9], [-1.8, -2.4], [0.6, -3.8], [2.2, -2.6], [-0.6, -1.2], [3.7, -4.2]];
    // A fan around the router: everyone faints backwards, radially outwards,
    // so the bodies end up like petals instead of in a pile.
    const inside: [number, number][] = [-76, -47, -19, 19, 47, 76].map((deg) => {
      const a = (deg * Math.PI) / 180;
      return [Math.sin(a) * 1.6, -2.4 + Math.cos(a) * 1.6];
    });
    const people = Array.from({ length: N }, (_, i) => {
      const p = new Player({ hairStyle: (["twin", "cap", "short", "spiky", "long", "bun"] as const)[i], accessories: i % 2 ? ["gloves"] : i === 2 ? ["glasses", "towel"] : [] }, 2710 + i);
      scene.add(p.root);
      return p;
    });
    const runner = new Player({ shirt: 0xffd166, hairStyle: "mohawk", hair: 0x33ccff, accessories: ["headband", "backpack"] }, 2720);
    scene.add(runner.root);

    sfx.ambient("birds", 0.35);

    // 0-5 dawn | 5-7 runner | 7-12 stampede | 12 cut inside | 12-15 crowd in | 15-23 the LED | 23 faint | 28 runner faints
    const enterAt = (i: number) => 8.6 + i * 0.35;
    ctx.update((t) => {
      // the LED blinks once a second
      const on = (t % 1) < 0.5;
      ledMat.color.setHex(on ? 0x33ff66 : 0x0a220f);
      halo.visible = on;
      ledLight.intensity = t > 12 && on ? 2.5 : 0;

      people.forEach((p, i) => {
        const [ox, oz] = outside[i];
        const [ix, iz] = inside[i];
        if (t < 12) {
          const go = seg(t, 7 + i * 0.15, enterAt(i));
          p.root.visible = go < 0.97;
          if (t < 6.4) {
            p.root.position.set(ox, 0, oz);
            p.root.rotation.y = (i * 1.3) % 3 - 1;
            p.pose(i % 3 === 0 ? "lie" : "sitFloor", t);
            if (i % 3 !== 0) p.head.rotation.x = 0.5;
          } else if (go <= 0) {
            p.root.position.set(ox, 0, oz);
            p.face(4, 3);
            p.pose("stop", t); // startled
            p.body.position.y = Math.abs(Math.sin((t - 6.4) * 9)) * 0.3;
          } else {
            p.travel(ox, oz, (i - 2.5) * 0.15, -5.4, go); // the door is painted on the wall: vanish at it
            p.pose("run", t);
          }
        } else {
          p.root.visible = true;
          const k = smooth(seg(t, 12 + i * 0.15, 14.5 + i * 0.15));
          p.travel(ix * 1.8, IZ + 3.6, ix, IZ + iz, k); // separate lanes
          if (k < 1) p.pose("run", t);
          else {
            p.face(0, IZ - 2.4);
            const faint = smooth(seg(t, 23, 23.6 + i * 0.07));
            if (t < 23) {
              p.pose(i === 2 ? "reach" : i === 4 ? "point" : "idle", t, 0.6);
              p.head.rotation.x = 0.35;
              p.head.rotation.y = 0;
              if (t > 20.5) p.pose("sad", t); // deflation
            } else p.pose("faint", t, faint);
          }
        }
      });

      // runner
      if (t < 5) {
        runner.root.visible = false;
      } else if (t < 12) {
        runner.root.visible = true;
        const k = smooth(seg(t, 5, 6.3));
        const go = seg(t, 9.3, 11);
        if (go <= 0) {
          runner.travel(14, 3, 3.5, 1.5, k);
          if (k < 1) runner.pose("run", t);
          else {
            runner.face(0, -3);
            runner.pose("cheer", t, 1);
          }
        } else {
          runner.travel(3.5, 1.5, 0.3, -5.4, go);
          runner.pose("run", t);
          runner.root.visible = go < 0.97;
        }
      } else {
        runner.root.visible = t > 13.2; // waits out of shot instead of in the crowd's lane
        const k = smooth(seg(t, 13.2, 15.3));
        runner.travel(-2.2, IZ + 3.6, -2.6, IZ + 0.9, k); // stands off to the side, clear of the fan and the camera
        if (k < 1) runner.pose("run", t);
        else {
          runner.face(0, IZ - 2.4);
          if (t < 23) runner.pose("cheer", t, 0.3);
          else if (t < 27.5) {
            runner.pose("point", t);
            runner.armR.rotation.x = -1.5 + Math.sin(t * 3) * 0.1;
            runner.head.rotation.y = Math.sin(t * 2.2) * 0.7; // looks at everyone on the floor
            runner.armL.rotation.set(-0.6, 0, -0.6);
          } else runner.pose("faint", t, smooth(seg(t, 27.5, 28.3)));
        }
      }
      world.hemi.intensity = t < 12 ? 1.0 : 0.55;
      world.sun.intensity = t < 12 ? 1.6 : 0.6;
    });

    // --- Sound ---
    ctx.at(1, () => sfx.cricket(0.3));
    for (let s = 0; s < 5; s++) ctx.at(5 + s * 0.25, () => sfx.footstep(0.6 - s * 0.1));
    ctx.at(5.8, () => sfx.shout(1));
    ctx.at(6.6, () => sfx.shout(1.15));
    ctx.at(7, () => sfx.crowdGasp());
    ctx.at(7.6, () => sfx.cheer(4));
    for (let s = 0; s < 14; s++) ctx.at(7.4 + s * 0.3, () => sfx.footstep(((s % 3) - 1) * 0.5));
    ctx.at(12, () => sfx.ambient("hum", 0.3));
    for (let s = 0; s < 8; s++) ctx.at(12.2 + s * 0.3, () => sfx.footstep(0));
    for (let s = 15; s < 23; s += 1) ctx.at(s + 0.01, () => sfx.beep(1760, 0.06));
    ctx.at(16, () => sfx.dramaticChord());
    ctx.at(22.6, () => sfx.sadTrombone());
    ctx.at(23.6, () => sfx.thud());
    ctx.at(23.75, () => sfx.thud());
    for (let s = 24; s < 36; s += 1) ctx.at(s + 0.01, () => sfx.beep(1760, 0.06));
    ctx.at(28.3, () => sfx.thud());
    ctx.at(35.5, () => sfx.stopAmbient("hum"));

    // --- Narration ---
    ctx.caption(0.6, "Day 27. Dawn. The survivors sleep outside the arcade, as is now tradition.", 4.6);
    ctx.caption(5.6, "“IT'S BACK!! IT'S BAAACK!!”", 2.6);
    ctx.caption(8.4, "Nobody asks what is back. Nobody needs to.", 3.6);
    ctx.caption(15.2, "It was the router. One green light. Blinking.", 4.6);
    ctx.caption(20.2, "The light means “connected.” To what, no one can say.", 3);
    ctx.caption(24, "The messenger looks around for support.", 3.5);
    ctx.caption(29.2, "The light is still blinking. It will always be blinking. It means nothing.", 5.5);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [-6, 2.2, 6], look: [0, 0.8, -3.5] },
      { t: 5, pos: [-4, 1.8, 4], look: [0, 0.8, -3] },
      { t: 6.2, pos: [1, 1.7, 5.5], look: [3.5, 1.5, 1.5], fov: 45 },
      { t: 7.5, pos: [6, 2.5, 6], look: [0, 1, -3] },
      { t: 12, pos: [0, 2.5, 4], look: [0, 1.5, -6] },
      { t: 12.01, pos: [0, 2.2, IZ + 3.9], look: [0, 1, IZ - 2] },
      { t: 15, pos: [0, 2.0, IZ + 2.5], look: [0, 0.9, IZ - 2.4] },
      { t: 15.9, pos: [0, 2.5, IZ - 0.5], look: [0, 0.9, IZ - 2.4] }, // over their heads, through the gap
      { t: 16.5, pos: [-0.1, 1.05, IZ - 1.3], look: [0, 0.82, IZ - 2.4], fov: 40 },
      { t: 20, pos: [-0.05, 0.98, IZ - 1.55], look: [0, 0.82, IZ - 2.4], fov: 38 },
      { t: 21, pos: [0.6, 1.1, IZ - 3.0], look: [0, 1.2, IZ - 0.5], fov: 55 },
      { t: 23.5, pos: [0.7, 1.5, IZ - 3.1], look: [0, 0.5, IZ - 0.5], fov: 55 },
      { t: 24.5, pos: [3.4, 1.8, IZ + 2.5], look: [-0.8, 1.0, IZ - 0.2] },
      { t: 28.5, pos: [2.8, 1.7, IZ + 2.0], look: [-0.8, 0.8, IZ - 0.2] },
      { t: 30, pos: [0, 3.7, IZ + 1.2], look: [0, 0.3, IZ - 1.2] },
      { t: 36, pos: [0.3, 3.75, IZ + 0.4], look: [0, 0.3, IZ - 1.6] },
    ]);
    ctx.shake(5.8, 0.06, 0.5);
    ctx.shake(23.6, 0.08, 0.4);
  },
};
export default scene;

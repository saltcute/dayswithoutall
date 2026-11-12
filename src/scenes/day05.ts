// Day 5: The Mirage. A player crawls across the desert toward a cabinet
// glowing ONLINE. It shimmers. It is a vending machine. It is also out of order.
import * as THREE from "three";
import { box, mat, mesh } from "../engine/materials";
import { bump, keys, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { textPlane } from "../engine/textTexture";
import { Player } from "../kit/characters";
import { cabinet } from "../kit/cabinets";
import { setupWorld, terrain } from "../kit/environments";
import { cactus, rock, vendingMachine } from "../kit/props";

const GOAL_Z = -9;

const scene: SceneDef = {
  duration: 36,
  build(ctx) {
    const { scene, sfx } = ctx;
    const world = setupWorld(ctx, { sky: 0xffb870, fog: [22, 120], ground: 0xc77d3a, sun: 0xfff1c4, sunIntensity: 2.6, hemi: 1.1, sunPos: [-4, 14, -10], shadowSize: 18 });
    const sand = terrain(220, 56, 1.8, 0xe9b872, 55, 16);
    scene.add(sand);
    const r = rng(505);

    // a merciless sun
    const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(9, 20), new THREE.MeshBasicMaterial({ color: 0xfff6d5, fog: false }));
    sunDisc.position.set(-18, 34, -110);
    sunDisc.lookAt(0, 0, 0);
    scene.add(sunDisc);
    const halo = new THREE.Mesh(new THREE.CircleGeometry(16, 20), new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.35, fog: false, depthWrite: false }));
    halo.position.set(-18, 34, -111);
    halo.lookAt(0, 0, 0);
    scene.add(halo);

    // scenery
    for (let i = 0; i < 14; i++) {
      const a = r.range(0, Math.PI * 2), d = r.range(8, 30);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(x) < 3 && z < 10 && z > -14) continue;
      const o = r.next() < 0.5 ? cactus(r.range(1.2, 2.4)) : rock(r.range(0.4, 1.2), i, 0xb07a4a);
      o.position.x = x;
      o.position.z = z;
      o.rotation.y = r.range(0, 6);
      scene.add(o);
    }
    // a sun-bleached sign
    const milestone = textPlane(["ARCADE", "4,000 km →"], 1.0, 0.55, { bg: "#d8c3a5", fg: "#5c3a1e", size: 50 });
    milestone.position.set(2.4, 1.3, 4);
    milestone.rotation.y = -0.4;
    scene.add(milestone, box(0.07, 1.1, 0.07, 0x7a5a3a, 2.4, 0.55, 4));

    // THE CABINET (the mirage), with a holy glow
    const cab = cabinet("round", 0xff4fa3);
    cab.setScreen("online");
    cab.group.position.set(0, 0, GOAL_Z);
    scene.add(cab.group);
    const auraMat = new THREE.MeshBasicMaterial({ color: 0x9dffc4, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
    const aura = new THREE.Mesh(new THREE.CircleGeometry(1.6, 20), auraMat);
    aura.position.set(0, 1.3, GOAL_Z - 0.6);
    scene.add(aura);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xc8ffe0, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 30, 10, 1, true), beamMat);
    beam.position.set(0, 15, GOAL_Z);
    scene.add(beam);
    const onlineSign = textPlane("ONLINE", 2.0, 0.55, { bg: "", fg: "#33ff88", size: 120, font: "'Trebuchet MS', sans-serif" });
    onlineSign.position.set(0, 2.85, GOAL_Z + 0.2);
    scene.add(onlineSign);
    const cabLight = new THREE.PointLight(0x66ffaa, 6, 8, 1.4);
    cabLight.position.set(0, 1.6, GOAL_Z + 1);
    scene.add(cabLight);

    // THE TRUTH (a vending machine, also out of order)
    const vend = vendingMachine("COLD DRINKS");
    vend.position.set(0, 0, GOAL_Z);
    vend.visible = false;
    scene.add(vend);
    const sold = textPlane(["SOLD OUT"], 0.66, 0.2, { bg: "#c1121f", fg: "#fff", size: 80 });
    sold.rotation.z = 0.12;
    vend.add(sold);
    sold.position.set(0, 1.05, 0.41);
    const ooo = textPlane(["OUT OF ORDER"], 0.7, 0.16, { bg: "#ffffff", fg: "#111", size: 70 });
    ooo.position.set(0, 0.55, 0.40);
    ooo.rotation.z = -0.08;
    vend.add(ooo);

    // heat shimmer: a wobbling translucent curtain between him and the dream
    const hazeGeo = new THREE.PlaneGeometry(14, 2.4, 24, 4);
    const hazeBase = Float32Array.from(hazeGeo.attributes.position.array as Float32Array);
    const haze = new THREE.Mesh(hazeGeo, new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
    haze.position.set(0, 1.0, GOAL_Z + 2.5);
    scene.add(haze);

    // the player, and the trail he drags behind him
    const p = new Player({ shirt: 0xffd166, pants: 0x6b705c, hairStyle: "cap", hair: 0xe63946, accessories: ["gloves", "towel", "backpack"] }, 501);
    scene.add(p.root);
    const trail: THREE.Mesh[] = [];
    for (let i = 0; i < 26; i++) {
      const m = mesh(new THREE.BoxGeometry(0.5, 0.02, 0.35), mat(0xc9955a), false, true);
      m.position.set(Math.sin(i * 0.7) * 0.15, 0.01, 8 - i * 0.62);
      scene.add(m);
      trail.push(m);
    }
    // vultures, circling with professional patience
    const birds: THREE.Group[] = [];
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Group();
      b.add(box(0.2, 0.12, 0.5, 0x2b2b2b));
      const wl = box(0.9, 0.03, 0.25, 0x2b2b2b, -0.5, 0, 0), wr = box(0.9, 0.03, 0.25, 0x2b2b2b, 0.5, 0, 0);
      b.add(wl, wr);
      scene.add(b);
      birds.push(b);
    }

    sfx.ambient("desert", 0.8);

    // --- Timeline ---
    // 0-20 crawl (with a collapse at 9-11) | 20-22 reaches, stands up | 22.2 the truth
    // 23-26 button: buzzer | 27-29 sinks down | 29-36 leans on it, at peace
    const zAt = (t: number) => keys(t, [[0, 8], [9, 1.5], [11, 1.5], [20, GOAL_Z + 1.6]], (x) => x);
    ctx.update((t) => {
      const z = zAt(t);
      p.root.position.set(Math.sin(t * 0.5) * 0.15, 0, z);
      p.root.rotation.y = Math.PI;
      const crawl = (tt: number) => {
        p.pose("crawl", tt);
        // kit crawl lifts the legs into the air; drag them behind instead
        p.legL.rotation.x = 0.15 + Math.sin(tt * 4) * 0.2;
        p.legR.rotation.x = 0.15 - Math.sin(tt * 4) * 0.2;
      };
      if (t < 9) crawl(t * 0.6);
      else if (t < 11) {
        // collapses flat, one hand still reaching
        p.pose("lie", t);
        p.body.rotation.x = Math.PI / 2;
        p.body.position.y = 0.15;
        p.armR.rotation.x = -2.9 - bump(t, 9.8, 10.8) * 0.3;
        p.armR.rotation.z = 0;
      } else if (t < 20) crawl(t * 0.75);
      else if (t < 22.2) {
        p.pose("reach", t, seg(t, 20, 21.5));
        p.armL.rotation.x = -0.4;
        p.hips.position.y = 0.8 - (1 - seg(t, 20, 21)) * 0.4;
      } else if (t < 23.3) p.pose("idle", t * 0.1);
      else if (t < 26) {
        p.pose("knock", t);
        p.root.position.z = GOAL_Z + 1.25;
      } else if (t < 28.5) {
        p.pose("faint", t, smooth(seg(t, 26.8, 28.5)) * 0.6);
        p.root.position.z = GOAL_Z + 1.25;
        p.head.rotation.x = 0.5;
      } else {
        // sitting, back against the machine, at peace
        p.root.position.z = GOAL_Z + 0.7;
        p.root.rotation.y = 0;
        p.pose("sitFloor", t);
        p.torso.rotation.x = -0.15;
        p.armL.rotation.x = p.armR.rotation.x = -0.2;
        p.head.rotation.x = 0.1 + Math.sin(t * 0.8) * 0.05;
        p.head.rotation.z = 0.25;
      }
      trail.forEach((m) => (m.visible = m.position.z > z + 0.5 && t < 34));

      // the mirage shimmers: wobble, flicker, glow
      const truth = t > 22.2;
      cab.group.visible = !truth;
      aura.visible = beam.visible = onlineSign.visible = !truth;
      vend.visible = truth;
      const wob = Math.sin(t * 6.3) * 0.06 + Math.sin(t * 9.1) * 0.03;
      cab.group.position.x = wob;
      cab.group.scale.set(1 + Math.sin(t * 4.1) * 0.03, 1 + Math.sin(t * 5.3) * 0.05, 1);
      cab.screenMat.color.setScalar(0.8 + Math.sin(t * 13) * 0.2);
      onlineSign.position.x = wob * 1.4;
      onlineSign.position.y = 2.85 + Math.sin(t * 2) * 0.06;
      auraMat.opacity = 0.25 + Math.sin(t * 3) * 0.1 + bump(t, 19, 22.2) * 0.3;
      aura.scale.setScalar(1 + bump(t, 19, 22.2) * 0.8);
      beamMat.opacity = 0.12 + Math.sin(t * 1.7) * 0.05;
      cabLight.color.set(truth ? 0xbde0fe : 0x66ffaa);
      cabLight.intensity = truth ? 2 + (Math.sin(t * 30) > 0.6 ? 1.5 : 0) : 6 + Math.sin(t * 5) * 1.5;
      // shimmer curtain: ripple vertices
      const pos = hazeGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const bx = hazeBase[i * 3], by = hazeBase[i * 3 + 1];
        pos.setZ(i, Math.sin(bx * 1.3 + t * 5 + by * 2) * 0.25);
        pos.setY(i, by + Math.sin(bx * 2.1 + t * 7) * 0.06);
      }
      pos.needsUpdate = true;
      haze.visible = !truth;
      // the heat makes the sky pulse; the truth makes it bleach out
      world.sun.intensity = 2.6 + Math.sin(t * 0.7) * 0.2;
      (scene.background as THREE.Color).setHex(truth ? 0xf7c99a : 0xffb870);
      birds.forEach((b, i) => {
        const a = t * 0.35 + (i / 3) * Math.PI * 2;
        const R = 4 + i * 0.6;
        b.position.set(Math.cos(a) * R + p.root.position.x, 9 + i * 0.7 + Math.sin(t + i) * 0.3, Math.sin(a) * R + p.root.position.z);
        b.rotation.y = -a;
        b.rotation.z = 0.35;
        (b.children[1] as THREE.Mesh).rotation.z = Math.sin(t * 2 + i) * 0.15;
        (b.children[2] as THREE.Mesh).rotation.z = -Math.sin(t * 2 + i) * 0.15;
      });
    });

    // --- Sound ---
    for (let i = 0; i < 9; i++) ctx.at(0.6 + i * 0.95, () => sfx.thud());
    ctx.at(9.2, () => sfx.moan(0.7));
    ctx.at(11.5, () => sfx.heartbeat());
    ctx.at(12.5, () => sfx.heartbeat());
    for (let i = 0; i < 8; i++) ctx.at(12 + i * 1.0, () => sfx.thud());
    ctx.at(14.2, () => sfx.shimmer());
    ctx.at(18.6, () => sfx.shimmer());
    ctx.at(19.5, () => sfx.ambient("droneHoly", 0.7));
    ctx.at(22.2, () => {
      sfx.stopAmbient("droneHoly");
      sfx.glitch(0.5);
      sfx.whoosh(0.6);
    });
    ctx.at(23.6, () => sfx.beep(520, 0.1));
    ctx.at(24.1, () => sfx.buzzer());
    ctx.at(24.9, () => sfx.beep(520, 0.1));
    ctx.at(25.3, () => sfx.buzzer());
    ctx.at(26.6, () => sfx.sadTrombone());
    ctx.at(28.6, () => sfx.thud());
    ctx.at(31, () => sfx.ambient("hum", 0.4));
    ctx.at(35.9, () => sfx.stopAmbient("hum"));

    // --- Narration ---
    ctx.caption(0.8, "Day 5. The wastes. Water is scarce. Credits are forbidden. Hope is…", 4.4);
    ctx.caption(5.6, "…over there.", 2.6);
    ctx.caption(9.3, "He has crawled four kilometres toward a single word.", 4);
    ctx.caption(14, "ONLINE. He has not seen that word in five days.", 4);
    ctx.caption(18.6, "Almost there. Almost there. Almost—", 3.4);
    ctx.caption(22.6, "It was a vending machine.", 3);
    ctx.caption(26, "It was also out of order.", 2.8);
    ctx.caption(29.4, "He stays anyway. It hums. It is warm. It is the closest thing to an arcade for miles.", 5.8);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [1.6, 1.3, 11.2], look: [0, 0.9, GOAL_Z], fov: 50 },
      { t: 5.5, pos: [0.9, 0.9, 9.0], look: [0, 1.3, GOAL_Z], fov: 30 },
      { t: 8.8, pos: [3.5, 2.2, 6], look: [0, 0.3, 2], fov: 50 },
      { t: 13.5, pos: [-2.6, 1.0, 1.5], look: [0, 0.4, -2], fov: 52 },
      // POV of the dream through the shimmer
      { t: 14, pos: [0.25, 0.55, -3.1], look: [0, 1.6, GOAL_Z], fov: 46 },
      { t: 18.4, pos: [0.2, 0.55, -7.4], look: [0, 1.6, GOAL_Z], fov: 46, ease: (x) => x },
      { t: 18.6, pos: [-2.5, 1.2, GOAL_Z + 4.5], look: [0, 1.0, GOAL_Z + 0.5], fov: 50 },
      { t: 22, pos: [-1.6, 1.4, GOAL_Z + 3.4], look: [0, 1.2, GOAL_Z], fov: 46 },
      { t: 22.3, pos: [0.9, 1.5, GOAL_Z + 3.2], look: [0, 1.15, GOAL_Z], fov: 46 },
      { t: 26, pos: [1.7, 1.3, GOAL_Z + 2.4], look: [0, 1.05, GOAL_Z + 0.3], fov: 44 },
      { t: 29, pos: [0.4, 1.0, GOAL_Z + 3.5], look: [0, 0.8, GOAL_Z], fov: 46 },
      { t: 36, pos: [2, 6.5, GOAL_Z + 14], look: [0, 0.5, GOAL_Z], fov: 50 },
    ]);
    ctx.flash(22.2, "#ffffff", 0.7);
    ctx.shake(22.2, 0.1, 0.4);
  },
};
export default scene;

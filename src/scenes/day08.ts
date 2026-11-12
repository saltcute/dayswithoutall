// Day 8: Tribes. The community splits by cabinet type: Washers (round cabs),
// Sliders and Levers. Banners, hazard-tape borders, war paint. A standoff at
// sundown. A tumbleweed rolls in, stops dead centre, and founds a fourth tribe.
import * as THREE from "three";
import { box, glow, mat, mesh } from "../engine/materials";
import { easeOut, lerp, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { Player } from "../kit/characters";
import { cabinet, type CabKind } from "../kit/cabinets";
import { setupWorld, skyline, terrain } from "../kit/environments";
import { banner, rock, tumbleweed } from "../kit/props";

interface Tribe {
  name: string;
  kind: CabKind;
  color: number;
  css: string;
  ang: number;
}
const TRIBES: Tribe[] = [
  { name: "WASHERS", kind: "round", color: 0xff4fa3, css: "#ff4fa3", ang: -Math.PI / 2 },
  { name: "SLIDERS", kind: "slider", color: 0x00b4d8, css: "#0096c7", ang: (5 * Math.PI) / 6 },
  { name: "LEVERS", kind: "lever", color: 0x9b5de5, css: "#7b2cbf", ang: Math.PI / 6 },
];
const at = (ang: number, r: number): [number, number] => [Math.cos(ang) * r, Math.sin(ang) * r];

const scene: SceneDef = {
  duration: 40,
  build(ctx) {
    const { scene, sfx } = ctx;
    const world = setupWorld(ctx, { sky: 0xe8784a, fog: [18, 75], ground: 0x7a4a50, sun: 0xffb37a, sunIntensity: 2.2, hemi: 0.9, sunPos: [-14, 6, -10], shadowSize: 16 });
    const lot = terrain(160, 40, 0.12, 0x6e5a62, 88, 22);
    scene.add(lot);
    skyline(ctx, 55, 0x4a2a4a, 34, 8);
    const r = rng(808);
    // parking-lot lines, cracked
    for (let i = -6; i <= 6; i++) {
      const l = box(0.12, 0.01, 3, 0xd8d0c0, i * 2.6, 0.01, 11);
      scene.add(l);
    }
    for (let i = 0; i < 8; i++) {
      const rk = rock(r.range(0.2, 0.5), i + 3, 0x6c5a5a);
      const [x, z] = at(r.range(0, Math.PI * 2), r.range(12, 18));
      rk.position.x = x;
      rk.position.z = z;
      scene.add(rk);
    }
    // a big low sun
    const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(7, 24), new THREE.MeshBasicMaterial({ color: 0xffd08a, fog: false }));
    sunDisc.position.set(-60, 10, -50);
    sunDisc.lookAt(0, 2, 0);
    scene.add(sunDisc);

    // hazard tape: three lines from the centre, between the tribes
    const tapeYellow = mat(0xffd60a), tapeBlack = mat(0x111111);
    for (const ta of [Math.PI / 2, -Math.PI / 6, (7 * Math.PI) / 6]) {
      const g = new THREE.Group();
      for (let s = 0; s < 22; s++) g.add(box(0.5, 0.012, 0.16, s % 2 ? tapeBlack : tapeYellow, 0.6 + s * 0.5, 0.02, 0));
      g.rotation.y = -ta;
      scene.add(g);
    }

    // tribes: cabinets, banners, warriors with war paint
    const leaders: Player[] = [];
    const members: { p: Player; tribe: number; home: [number, number]; leader: boolean }[] = [];
    const banners: THREE.Mesh[] = [];
    TRIBES.forEach((tr, ti) => {
      for (const off of [-0.4, 0.4]) {
        const c = cabinet(tr.kind);
        const [x, z] = at(tr.ang + off * 0.55, 9.5);
        c.group.position.set(x, 0, z);
        c.group.lookAt(0, 0, 0);
        c.setScreen("custom", [tr.name, "TERRITORY"], { bg: "#14001f", fg: tr.css, size: 40 });
        scene.add(c.group);
      }
      for (const off of [-0.5, 0.5]) {
        const b = banner(tr.name, tr.css, 1.0, 1.7);
        const [x, z] = at(tr.ang + off * 0.5, 7.2);
        b.position.set(x, 0, z);
        b.lookAt(0, 0, 0);
        b.rotateY(Math.PI / 2 * (off > 0 ? 1 : -1) * 0.3);
        scene.add(b);
        banners.push(b.flag);
      }
      for (let k = 0; k < 4; k++) {
        const leader = k === 0;
        const p = new Player({ shirt: tr.color, hairStyle: r.pick(["spiky", "mohawk", "twin", "short", "bun"] as const), accessories: leader ? ["headband", "cape", "gloves"] : r.next() < 0.5 ? ["gloves"] : ["headband"], robe: tr.color, scale: leader ? 1.08 : 1 }, 800 + ti * 10 + k);
        // war paint: cheek stripes + forehead mark in tribe colour
        for (const x of [-0.12, 0.12]) p.head.add(box(0.07, 0.03, 0.01, glow(tr.color), x, 0.13, 0.176), box(0.07, 0.03, 0.01, glow(tr.color), x, 0.08, 0.176));
        p.head.add(box(0.04, 0.08, 0.01, glow(0xffffff), 0, 0.3, 0.176));
        const spread = leader ? 0 : (k - 2) * 0.24;
        const home = at(tr.ang + spread, leader ? 5.0 : 5.9);
        p.at(home[0], home[1]);
        p.face(0, 0);
        scene.add(p.root);
        members.push({ p, tribe: ti, home, leader });
        if (leader) leaders.push(p);
      }
    });

    // the neutral party
    const weed = tumbleweed();
    scene.add(weed);
    const crown = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 5, 1, true), mat(0xffd700, { emissive: 0x664400, side: THREE.DoubleSide }));
    scene.add(crown);
    const dust: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), new THREE.MeshLambertMaterial({ color: 0xd8b48c, transparent: true, opacity: 0.5 }));
      scene.add(d);
      dust.push(d);
    }

    sfx.ambient("wind", 0.6);

    // --- Timeline ---
    // 0-5 aerial | 5-9 Washers | 9-13 Sliders | 13-17 Levers | 17-21 tape
    // 21-25 leaders step up, stare | 25-31 tumbleweed | 31-34 it stops, crowned | 34-40 defectors
    const weedZ = (t: number) => (t < 31 ? lerp(15, 0.6, easeOut(seg(t, 25, 31))) : 0.6);
    ctx.update((t) => {
      const wk = seg(t, 25, 31);
      members.forEach(({ p, tribe, home, leader }, i) => {
        const tr = TRIBES[tribe];
        const step = leader ? smooth(seg(t, 21, 23)) : 0;
        const lr = lerp(5.0, 2.7, step);
        if (leader) p.root.position.set(Math.cos(tr.ang) * lr, 0, Math.sin(tr.ang) * lr);
        else p.root.position.set(home[0], 0, home[1]);
        p.face(0, 0);
        const showcase = t > 5 + tribe * 4 && t < 9 + tribe * 4;
        if (leader && step > 0 && step < 1) p.pose("walk", t);
        else if (showcase) p.pose(leader ? "point" : "chant", t);
        else if (t > 25 && t < 31.5) {
          // all heads track the tumbleweed
          p.pose(leader ? "fight" : "idle", t * 0.3);
          p.head.rotation.y = Math.atan2(-p.root.position.x, weedZ(t) - p.root.position.z) - p.root.rotation.y;
          p.head.rotation.y = Math.atan2(Math.sin(p.head.rotation.y), Math.cos(p.head.rotation.y)) * 0.6;
        } else p.pose(leader ? "fight" : i % 2 ? "stop" : "idle", t * (leader ? 0.25 : 1));
        if (leader) p.body.position.y = 0;
        // the defectors: one from each tribe walks over to stand behind the tumbleweed
        if (!leader && i % 4 === 1 && t > 34 + tribe * 0.4) {
          // route around the tribe's leader via a waypoint, and keep the front
          // (Sliders) defector to the side so it doesn't wade through the tumbleweed
          const t0 = 34 + tribe * 0.4;
          const k1 = seg(t, t0, t0 + 1.1), k2 = seg(t, t0 + 1.1, t0 + 3);
          const [wx, wz] = at(tr.ang - 0.45, 3.4);
          const tx = [0, -0.9, 0.9][tribe], tz = -0.5;
          if (k2 <= 0) p.travel(home[0], home[1], wx, wz, k1);
          else p.travel(wx, wz, tx, tz, k2);
          const dk = k2;
          if (dk < 1) p.pose("walk", t);
          else {
            p.root.rotation.y = 0;
            p.pose("chant", t);
            p.legL.rotation.x = p.legR.rotation.x = 0;
            p.hips.position.y = 0.8;
            p.hips.position.z = 0;
          }
        }
      });
      // banners flap in the wind
      banners.forEach((b, i) => {
        b.rotation.y = Math.sin(t * 3 + i) * 0.25;
        b.rotation.x = Math.sin(t * 2.3 + i * 2) * 0.05;
      });
      // tumbleweed bounces across and stops dead centre; the crown arrives
      const wz = weedZ(t);
      const bounce = t < 31 ? Math.abs(Math.sin(t * 4.5)) * 0.35 * (1 - wk * 0.7) : 0;
      weed.visible = t > 25;
      weed.position.set(Math.sin(t * 1.3) * 0.25 * (1 - wk), 0.42 + bounce, wz);
      weed.rotation.x = -wz * 1.2;
      const ck = easeOut(seg(t, 33, 33.8));
      crown.visible = t > 33;
      crown.position.set(weed.position.x, lerp(3.5, 0.92, ck), wz);
      crown.rotation.y = t * 0.5;
      dust.forEach((d, i) => {
        const age = ((t * 2 + i / dust.length) % 1);
        d.visible = t > 25 && t < 31;
        d.position.set(weed.position.x + Math.sin(i * 3) * 0.3, 0.1 + age * 0.4, weedZ(t - age * 0.6) + 0.2);
        d.scale.setScalar(0.5 + age * 1.6);
        (d.material as THREE.MeshLambertMaterial).opacity = 0.5 * (1 - age);
      });
      // the sun sinks
      world.sun.intensity = lerp(2.2, 1.2, seg(t, 0, 40));
      world.hemi.intensity = lerp(0.95, 0.7, seg(t, 0, 40));
    });

    // --- Sound ---
    ctx.at(5, () => sfx.chant(130, 2.6));
    ctx.at(6.5, () => sfx.stomp());
    ctx.at(9, () => sfx.chant(110, 2.6));
    ctx.at(10, () => sfx.whoosh(0.5));
    ctx.at(10.6, () => sfx.whoosh(0.5));
    ctx.at(13, () => sfx.chant(98, 2.6));
    ctx.at(14.5, () => sfx.stomp());
    ctx.at(15, () => sfx.stomp());
    ctx.at(18, () => sfx.ambient("droneTense", 0.5));
    for (let i = 0; i < 4; i++) ctx.at(21 + i * 0.5, () => sfx.footstep((i % 2) - 0.5));
    ctx.at(23.4, () => sfx.dunDunDun());
    ctx.at(25, () => {
      sfx.stopAmbient("droneTense");
      sfx.whoosh(1.4);
    });
    for (let i = 0; i < 8; i++) ctx.at(25.5 + i * 0.7, () => sfx.tap());
    ctx.at(31, () => sfx.cricket(0));
    ctx.at(33.1, () => sfx.shimmer());
    ctx.at(33.8, () => sfx.fanfare());
    ctx.at(35.5, () => sfx.crowdGasp());
    ctx.at(37.2, () => sfx.chant(146, 2.4));

    // --- Narration ---
    ctx.caption(0.8, "Day 8. Without a common server, the community has reorganised along ancient lines.", 4.2);
    ctx.caption(5.2, "The Washers. They believe in the Ring. They will not shut up about the Ring.", 3.8);
    ctx.caption(9.2, "The Sliders. Their hands have not left a flat surface since Tuesday.", 3.8);
    ctx.caption(13.2, "The Levers. Fewest in number. Most in confidence.", 3.8);
    ctx.caption(17.2, "Borders are drawn in hazard tape, the strongest material known to arcade staff.", 4.2);
    ctx.caption(21.6, "Sundown. The standoff. Nobody blinks. Nobody has credits to blink with.", 3.4);
    ctx.caption(26.2, "A neutral party enters.", 3.6);
    ctx.caption(33.4, "By nightfall, the tumbleweed had founded a fourth tribe. It is growing.", 6.2);

    // --- Camera ---
    const cam = (ti: number, r1: number, h: number, side: number): [number, number, number] => {
      const [x, z] = at(TRIBES[ti].ang + side, r1);
      return [x, h, z];
    };
    const look = (ti: number, r1: number, h: number): [number, number, number] => {
      const [x, z] = at(TRIBES[ti].ang, r1);
      return [x, h, z];
    };
    ctx.cameraPath([
      { t: 0, pos: [0, 15, 14], look: [0, 0, 0], fov: 50 },
      { t: 4.9, pos: [6, 11, 9], look: [0, 0, -1], fov: 50 },
      { t: 5, pos: cam(0, 2.2, 1.6, 0.2), look: look(0, 6.5, 1.3), fov: 52 },
      { t: 8.9, pos: cam(0, 2.6, 1.8, -0.25), look: look(0, 6.5, 1.3), fov: 50 },
      { t: 9, pos: cam(1, 2.2, 1.6, 0.2), look: look(1, 6.5, 1.3), fov: 52 },
      { t: 12.9, pos: cam(1, 2.6, 1.8, -0.25), look: look(1, 6.5, 1.3), fov: 50 },
      { t: 13, pos: cam(2, 2.2, 1.6, 0.2), look: look(2, 6.5, 1.3), fov: 52 },
      { t: 16.9, pos: cam(2, 2.6, 1.8, -0.25), look: look(2, 6.5, 1.3), fov: 50 },
      { t: 17, pos: [0.6, 0.35, 4.5], look: [0, 0, 0], fov: 55 },
      { t: 21, pos: [0, 5, 9], look: [0, 0.5, 0], fov: 52 },
      // western close-ups on each leader's eyes
      { t: 23.3, pos: [0, 4, 7], look: [0, 0.8, -1], fov: 52 },
      { t: 23.4, pos: cam(0, 1.6, 1.82, 0), look: look(0, 2.7, 1.82), fov: 38 },
      { t: 23.95, pos: cam(0, 1.6, 1.82, 0), look: look(0, 2.7, 1.82), fov: 30 },
      { t: 24, pos: cam(1, 1.6, 1.82, 0), look: look(1, 2.7, 1.82), fov: 38 },
      { t: 24.45, pos: cam(1, 1.6, 1.82, 0), look: look(1, 2.7, 1.82), fov: 30 },
      { t: 24.5, pos: cam(2, 1.6, 1.82, 0), look: look(2, 2.7, 1.82), fov: 38 },
      { t: 24.95, pos: cam(2, 1.6, 1.82, 0), look: look(2, 2.7, 1.82), fov: 30 },
      // ground-level tumbleweed shot, leaders in the background
      { t: 25, pos: [1.0, 0.55, 18.5], look: [0, 0.8, 10], fov: 50 },
      { t: 31, pos: [1.0, 0.6, 4.6], look: [0, 0.7, 0], fov: 48, ease: (x) => 1 - (1 - x) * (1 - x) },
      { t: 33, pos: [0.6, 1.3, 3.4], look: [0, 0.8, 0.5], fov: 44 },
      { t: 35, pos: [0, 3.2, 6.4], look: [0, 0.8, 0], fov: 50 },
      { t: 40, pos: [0, 5.2, 9], look: [0, 0.6, -0.6], fov: 50 },
    ]);
  },
};
export default scene;

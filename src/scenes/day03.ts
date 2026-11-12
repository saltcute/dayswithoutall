// Day 3: Phantom Limbs. Players air-tap on café tables and slide on bus-stop
// benches. Then the laundromat: one of them is doing slides on a dryer door.
// The machine rates the performance. The other customers stare.
import * as THREE from "three";
import { box, glow, mat, mesh } from "../engine/materials";
import { bump, easeOutBack, lerp, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { textPlane } from "../engine/textTexture";
import { Player } from "../kit/characters";
import { floor, setupWorld, skyline } from "../kit/environments";
import { bench, sign, stool, table, tree, washingMachine } from "../kit/props";

const LX = 60; // laundromat set offset

const scene: SceneDef = {
  duration: 38,
  build(ctx) {
    const { scene, sfx } = ctx;
    setupWorld(ctx, { sky: 0xa8d8ff, fog: [25, 70], ground: 0x8a8f7a, sun: 0xfff4dd, sunIntensity: 2, hemi: 1.1, sunPos: [8, 14, 6] });

    // ---------- Plaza (sunny, normal people, normal day) ----------
    const plaza = floor(40, 40, 0xc9c3b6);
    scene.add(plaza);
    for (let i = -4; i <= 4; i++) {
      const line = floor(0.06, 40, 0xb3ad9f);
      line.position.set(i * 2, 0.005, 0);
      scene.add(line);
    }
    skyline(ctx, 30, 0x9fb4c8, 28, 3);
    for (const [x, z] of [[-6, -4], [6, -5], [-7, 3], [7.5, 2]]) {
      const tr = tree(3, 0x52b788);
      tr.position.set(x, 0, z);
      scene.add(tr);
    }

    // Café table: tapper #1
    const cafe = new THREE.Group();
    cafe.position.set(-2.5, 0, 0);
    scene.add(cafe);
    cafe.add(table(1.0, 0.7, 0xf1f1f1));
    const umb = mesh(new THREE.ConeGeometry(1.3, 0.5, 8), mat(0xe63946));
    umb.position.y = 2.45;
    cafe.add(umb, box(0.05, 2.3, 0.05, 0xdddddd, 0, 1.15, 0));
    const st = stool(0x2a9d8f);
    st.position.set(0, 0, -0.65);
    cafe.add(st);
    const cup = new THREE.Group();
    cup.add(mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.1, 8), mat(0xffffff)));
    cup.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 8), mat(0x4a2c1a)).translateY(0.05));
    cup.position.set(0.32, 0.83, 0.12);
    cafe.add(cup);
    const tapper = new Player({ shirt: 0xff70a6, hairStyle: "twin", hair: 0x3b2a1a, accessories: ["gloves"] }, 301);
    tapper.at(-2.5, -0.65);
    scene.add(tapper.root);
    const waiter = new Player({ shirt: 0xffffff, pants: 0x111111, hairStyle: "short", hair: 0x1a1a1a }, 302);
    scene.add(waiter.root);

    // Bus stop: slider #2 and a neighbour who slowly scoots away
    const stop = new THREE.Group();
    stop.position.set(3, 0, -1.2);
    scene.add(stop);
    stop.add(bench(2.2, 0x3d5a80));
    stop.add(box(2.6, 0.06, 1.1, 0x98c1d9, 0, 2.3, -0.1), box(0.06, 2.3, 0.06, 0x555555, -1.25, 1.15, -0.5), box(0.06, 2.3, 0.06, 0x555555, 1.25, 1.15, -0.5));
    stop.add(box(2.6, 1.6, 0.04, 0x98c1d9, 0, 1.3, -0.55));
    const busSign = sign(["BUS", "every 12 min"], 0.7, 0.45, { bg: "#ffd166", size: 50 });
    busSign.position.set(1.6, 0.6, 0.2);
    stop.add(busSign);
    const slider = new Player({ shirt: 0x3a86ff, hairStyle: "cap", hair: 0x222222, accessories: ["backpack"] }, 303);
    const granny = new Player({ shirt: 0xb5838d, pants: 0x6d597a, hairStyle: "bun", hair: 0xdddddd, accessories: ["glasses"] }, 304);
    scene.add(slider.root, granny.root);

    // ---------- Laundromat (fluorescent, mint green, deeply judgemental) ----------
    const lw = 8, ld = 6, lh = 3;
    const lroom = new THREE.Group();
    lroom.position.x = LX;
    scene.add(lroom);
    const shell = mesh(new THREE.BoxGeometry(lw, lh, ld), mat(0xb7e4c7, { side: THREE.BackSide }), false, true);
    shell.position.set(0, lh / 2, 0);
    lroom.add(shell);
    for (let x = 0; x < lw; x++)
      for (let z = 0; z < ld; z++) {
        const tl = floor(1, 1, (x + z) % 2 ? 0xf1faee : 0xd8e2dc);
        tl.position.set(x - lw / 2 + 0.5, 0.01, z - ld / 2 + 0.5);
        lroom.add(tl);
      }
    for (let i = 0; i < 3; i++) lroom.add(box(lw * 0.8, 0.05, 0.2, glow(0xf8fff8), 0, lh - 0.04, -2 + i * 2));
    const lamp = new THREE.PointLight(0xf0fff4, 9, 14, 1.2);
    lamp.position.set(0, lh - 0.4, 0.5);
    lroom.add(lamp);
    const wallSign = textPlane(["SUDZ COIN LAUNDRY", "no loitering • no dancing"], 3.2, 0.6, { bg: "#1d3557", fg: "#f1faee", size: 60 });
    wallSign.position.set(2, 2.45, -ld / 2 + 0.02);
    lroom.add(wallSign);

    // a row of washers with dryers stacked on top
    const machines: THREE.Group[] = [];
    const drumDoors: THREE.Object3D[] = [];
    for (let i = 0; i < 6; i++) {
      const x = -3.25 + i * 1.3;
      for (const y of [0, 0.92]) {
        const m = washingMachine();
        m.position.set(x, y, -ld / 2 + 0.45);
        lroom.add(m);
        machines.push(m);
        drumDoors.push(m.children[2]);
      }
    }
    const HERO = 5; // dryer above washer #3 (index 2*2+1)
    const heroMachine = machines[HERO];
    const heroX = heroMachine.position.x;
    const heroDoorMat = new THREE.MeshBasicMaterial({ color: 0x90e0ef, transparent: true, opacity: 0.85 });
    (drumDoors[HERO] as THREE.Mesh).material = heroDoorMat;
    // spinning laundry inside the hero drum
    const sock = box(0.18, 0.06, 0.02, 0xff006e, 0, 0, 0.385);
    const socks = new THREE.Group().add(sock, box(0.14, 0.06, 0.02, 0xffbe0b, 0.06, 0.08, 0.385));
    socks.position.set(heroX, 0.92 + 0.45, -ld / 2 + 0.45);
    lroom.add(socks);

    const folding = table(1.6, 0.7, 0xdee2e6);
    folding.position.set(-2.4, 0, 1.4);
    lroom.add(folding);
    const towelPile = box(0.5, 0.18, 0.4, 0xffafcc, -2.6, 0.87, 1.4);
    lroom.add(towelPile);
    const lbench = bench(1.8, 0xadb5bd);
    lbench.position.set(2.3, 0, 1.8);
    lroom.add(lbench);
    const basket = box(0.5, 0.3, 0.35, 0x4cc9f0, 1.2, 0.15, 1.9);
    lroom.add(basket);

    // The hero and the audience
    const hero = new Player({ shirt: 0x06d6a0, hairStyle: "spiky", hair: 0x9b5de5, accessories: ["gloves", "headband"] }, 305);
    hero.at(LX + heroX, -ld / 2 + 1.42, Math.PI);
    scene.add(hero.root);
    const folder = new Player({ shirt: 0xf4a261, hairStyle: "long", hair: 0x6b4423 }, 306);
    folder.at(LX - 2.4, 0.85);
    const reader = new Player({ shirt: 0x6c757d, hairStyle: "bald", accessories: ["glasses"] }, 307);
    reader.at(LX + 2.6, 1.8, Math.PI);
    const kid = new Player({ shirt: 0xffd166, hairStyle: "short", hair: 0xd4a017, scale: 0.65 }, 308);
    kid.at(LX + 1.2, 1.4);
    scene.add(folder.root, reader.root, kid.root);
    const magazine = box(0.3, 0.4, 0.03, 0xe76f51, 0, -0.05, 0.1);
    reader.handL.add(magazine);

    // FULL COMBO-ish verdict from the dryer
    const verdict = textPlane(["CYCLE COMPLETE", "rating: DELICATES"], 1.6, 0.55, { bg: "#00170a", fg: "#33ff88", size: 50, border: "#33ff88", borderWidth: 6, scanlines: true });
    verdict.position.set(heroX, 2.45, -ld / 2 + 0.9);
    lroom.add(verdict);

    sfx.ambient("birds", 0.5);

    // tap rhythm (it's a real chart, in their hearts)
    const beats: number[] = [];
    for (let b = 0.6; b < 5.6; b += 0.25) if (Math.floor(b * 4) % 7 !== 3) beats.push(b);
    beats.forEach((b) => ctx.at(b, () => sfx.tap()));
    for (let b = 6.4; b < 11.6; b += 0.5) ctx.at(b, () => sfx.whoosh(0.35));
    for (let b = 14.5; b < 30; b += 0.25) if (Math.floor(b * 4) % 5 !== 2) ctx.at(b, () => sfx.tap());

    // --- Timeline ---
    // 0-6 café tapper | 6-12 bus-stop slider | 12-14 both, plaza wide
    // 14 cut: laundromat | 14-21 reveal | 21-27 the stares | 27-30 spin cycle frenzy
    // 30 DING | 30-38 verdict & stares
    const hdY = 0.92 + 0.45; // hero door height
    ctx.update((t) => {
      // café
      tapper.pose("sit", t);
      tapper.root.position.y = 0;
      const tap = Math.sin((t + tapper.phase) * 16);
      tapper.armL.rotation.x = -1.1 + Math.max(0, tap) * 0.25;
      tapper.armR.rotation.x = -1.1 + Math.max(0, -tap) * 0.25;
      tapper.armL.rotation.z = -0.15;
      tapper.armR.rotation.z = 0.15;
      tapper.head.rotation.x = 0.45;
      cup.position.y = 0.83 + Math.abs(tap) * 0.015;
      cup.rotation.z = tap * 0.06;
      // the waiter arrives, waits, gives up
      const wk = smooth(seg(t, 2, 4.2));
      const wb = smooth(seg(t, 5, 7));
      if (t < 5) {
        waiter.travel(-6, 2.5, -2.1, 0.75, wk);
        waiter.pose(wk < 1 ? "walk" : "talk", t);
        if (wk >= 1) waiter.face(-2.5, -0.65);
      } else {
        waiter.travel(-2.1, 0.75, -7, 3, wb);
        waiter.pose("walk", t);
      }

      // bus stop
      slider.at(3 - 0.3, -1.2 + 0.1);
      slider.pose("slide", t * 1.2);
      slider.legL.rotation.x = slider.legR.rotation.x = -1.5;
      slider.hips.position.y = 0.48;
      slider.torso.rotation.x = 0.3;
      slider.head.rotation.x = 0.35;
      const gs = smooth(seg(t, 8, 11.5));
      granny.at(3 + lerp(0.45, 1.0, gs), -1.2 + 0.1);
      granny.pose("sit", t);
      granny.head.rotation.y = -0.6 + bump(t, 7, 9) * 0.3;
      granny.torso.rotation.z = -gs * 0.15;

      // laundromat
      const frenzy = seg(t, 26, 29.8) * (1 - seg(t, 30, 30.3));
      const done = t > 30;
      if (!done) {
        hero.pose("slide", t * (1 + frenzy * 1.4));
        hero.armL.rotation.x -= 0.15;
        hero.armR.rotation.x -= 0.15;
        hero.hips.position.y = 0.8 + Math.abs(Math.sin(t * 8)) * 0.03 * (1 + frenzy * 3);
      } else if (t < 34.5) hero.pose("cheer", t, 1 - seg(t, 32.5, 34.5));
      else {
        hero.pose("bow", t, 1);
        hero.legL.rotation.x = hero.legR.rotation.x = 0;
        hero.hips.position.y = 0.8;
        hero.hips.position.z = 0;
        hero.torso.rotation.x = 0.6;
        hero.armL.rotation.x = hero.armR.rotation.x = 0;
      }
      // dryer reacts: the drum spins and wobbles with the "chart"
      drumDoors[HERO].rotation.z = t * 6;
      socks.rotation.z = -t * (6 + frenzy * 14);
      heroMachine.position.x = heroX + Math.sin(t * 40) * 0.012 * (0.3 + frenzy * 3) * (done ? 0 : 1);
      heroDoorMat.color.setHSL((t * 0.3) % 1, 0.7, 0.65 + Math.sin(t * 16) * 0.1);
      if (done) heroDoorMat.color.set(0x33ff88);
      const vk = easeOutBack(seg(t, 30.1, 30.6));
      verdict.scale.setScalar(Math.max(0.001, vk));
      verdict.visible = t > 30.1;
      verdict.position.y = 2.45 + Math.sin(t * 3) * 0.03;

      // the audience: everyone slowly turns to look
      const turn = (p: Player, base: number, at: number, dur: number) => {
        const k = smooth(seg(t, at, at + dur));
        const to = Math.atan2(hero.root.position.x - p.root.position.x, hero.root.position.z - p.root.position.z);
        let d = to - base;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        return base + d * k;
      };
      folder.root.rotation.y = 0;
      folder.pose("hold", t);
      folder.root.rotation.y = turn(folder, 0, 21, 2.5);
      if (t > 21) folder.armL.rotation.x = folder.armR.rotation.x = -1.1 + seg(t, 22, 23.5) * 1.0; // drops the towel
      reader.pose("sit", t);
      reader.root.position.y = 0;
      reader.root.rotation.y = Math.PI;
      reader.armL.rotation.x = -1.2;
      reader.head.rotation.x = 0.35 - seg(t, 23, 24) * 0.35;
      reader.head.rotation.y = smooth(seg(t, 23, 25)) * 0.9;
      kid.root.rotation.y = turn(kid, Math.PI * 0.3, 24.5, 1.5);
      kid.pose(t > 31 ? "cheer" : t > 26 ? "point" : "idle", t, 0.6);
    });

    // --- Sound ---
    ctx.at(4.6, () => sfx.mumble(1.2, 1.1, -0.4));
    ctx.at(9.4, () => sfx.mumble(1, 1.4, 0.4));
    ctx.at(14, () => {
      sfx.stopAmbient("birds");
      sfx.ambient("hum", 0.7);
    });
    ctx.at(21.2, () => sfx.thud());
    ctx.at(23.8, () => sfx.gasp());
    ctx.at(30, () => {
      sfx.ding();
      sfx.fanfare();
    });
    ctx.at(31.4, () => sfx.cheer(1.2));
    ctx.at(34.8, () => sfx.mumble(1.4, 0.8));
    ctx.at(37.9, () => {
      sfx.stopAmbient("hum");
      sfx.ambient("birds", 0.5);
    });

    // --- Narration ---
    ctx.caption(0.8, "Day 3. The hands have not been told the server is down.", 4.2);
    ctx.caption(5.4, "Café tables. Coffee unordered. A chart cleared from memory, no misses.", 4.2);
    ctx.caption(9.8, "The bus stop. Fourteen slides per second. Three buses missed.", 4);
    ctx.caption(14.4, "And then there is the laundromat.", 3.4);
    ctx.caption(20.8, "He found a round machine with a glowing ring. Close enough.", 4.2);
    ctx.caption(25.4, "Customers report he has been here since opening. On the dryer. Not using it.", 4.4);
    ctx.caption(30.4, "The machine has rated his performance.", 3.2);
    ctx.caption(34, "He will be back tomorrow. His socks are still in there.", 3.9);

    // --- Camera ---
    const lz = -ld / 2;
    ctx.cameraPath([
      { t: 0, pos: [-0.6, 1.9, 4.4], look: [-2.5, 0.8, -0.4] },
      { t: 5.6, pos: [-1.6, 1.3, 1.3], look: [-2.5, 0.9, -0.5], fov: 42 },
      { t: 6, pos: [5.2, 1.5, 3.2], look: [3.3, 0.9, -1.1], fov: 46 },
      { t: 11.6, pos: [4.2, 1.2, 1.4], look: [3.2, 0.9, -1.1], fov: 46 },
      { t: 12, pos: [0.3, 2.6, 7.5], look: [0.3, 0.8, -1] },
      { t: 13.95, pos: [0.3, 3.4, 9], look: [0.3, 0.8, -1] },
      // cut to the laundromat: wide, then sideways onto his hands
      { t: 14, pos: [LX + 0.9, 1.9, 2.8], look: [LX + heroX, 1.3, lz + 0.8], fov: 52 },
      { t: 19.5, pos: [LX + 1.1, 1.65, lz + 2.6], look: [LX + heroX, 1.3, lz + 0.8], fov: 48 },
      // the audience, from the end of the machine row
      { t: 21, pos: [LX + 3.4, 1.8, lz + 0.9], look: [LX - 0.4, 1.0, 1.0], fov: 55 },
      { t: 23.8, pos: [LX + 3.2, 1.7, lz + 1.2], look: [LX - 0.2, 1.0, 1.1], fov: 52 },
      { t: 24.2, pos: [LX + 1.6, 1.4, 0.6], look: [LX + 2.6, 1.25, 1.8], fov: 50 },
      { t: 26, pos: [LX + 1.75, 1.35, 0.8], look: [LX + 2.6, 1.25, 1.8], fov: 44 },
      { t: 26.3, pos: [LX + 1.9, 1.6, 2.6], look: [LX + heroX, 1.3, lz + 0.6], fov: 50 },
      { t: 29.8, pos: [LX + heroX + 1.1, 1.35, lz + 1.6], look: [LX + heroX, hdY, lz + 0.5], fov: 50 },
      { t: 30.3, pos: [LX + heroX + 0.4, 1.9, lz + 3.6], look: [LX + heroX, 1.8, lz + 0.6], fov: 50 },
      { t: 33.5, pos: [LX - 0.4, 2.0, 2.7], look: [LX - 0.5, 1.2, lz + 1.2], fov: 56 },
      { t: 38, pos: [LX - 0.4, 2.2, 2.85], look: [LX - 0.5, 1.2, lz + 1.2], fov: 62 },
    ]);
    ctx.shake(29.2, 0.06, 0.9);
    ctx.flash(30, "#33ff88", 0.35);
  },
};
export default scene;

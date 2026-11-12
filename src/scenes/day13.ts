// Day 13: Cardboard Cabinet. Garage engineers build their own cabinet out of
// boxes, draw an ONLINE screen on it with a marker, and it collapses.
import * as THREE from "three";
import { box, glow, mat, mesh } from "../engine/materials";
import { easeIn, hop, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { TextTexture } from "../engine/textTexture";
import { Player } from "../kit/characters";
import { cardboardBox, crate, table } from "../kit/props";
import { floor, setupWorld } from "../kit/environments";

const scene: SceneDef = {
  duration: 37,
  build(ctx) {
    const { scene, sfx } = ctx;
    setupWorld(ctx, { sky: 0x2b2420, ground: 0x6b5a40, hemi: 1.1, sun: 0xfff2d8, sunIntensity: 1.1, sunPos: [4, 9, 8] });
    const r = rng(1313);

    // --- Garage workshop ---
    const W = 12, D = 10, H = 4;
    scene.add(floor(W, D, 0x8a8780));
    const wallM = mat(0x6f9a86);
    scene.add(box(W, H, 0.2, wallM, 0, H / 2, -D / 2), box(0.2, H, D, wallM, -W / 2, H / 2, 0), box(0.2, H, D, wallM, W / 2, H / 2, 0));
    // roller door strips on the back wall
    for (let i = 0; i < 9; i++) scene.add(box(4.6, 0.04, 0.05, 0x5b7f6e, 2.6, 0.3 + i * 0.36, -D / 2 + 0.12));
    // pegboard with tools
    scene.add(box(2.6, 1.4, 0.05, 0xc8a878, -3.6, 2.2, -D / 2 + 0.13));
    for (let i = 0; i < 6; i++) {
      const tool = box(0.08, r.range(0.3, 0.6), 0.04, r.pick([0xd62828, 0x444444, 0xffb703, 0x3a86ff]), -4.6 + i * 0.4, 2.2, -D / 2 + 0.18);
      tool.rotation.z = r.range(-0.2, 0.2);
      scene.add(tool);
    }
    const bench = table(2.4, 0.8, 0x8b5a2b);
    bench.position.set(-3.6, 0, -4.3);
    scene.add(bench);
    const tapeRoll = mesh(new THREE.TorusGeometry(0.09, 0.04, 6, 10), mat(0xd9c4a0));
    tapeRoll.position.set(-3.2, 0.82, -4.2);
    tapeRoll.rotation.x = Math.PI / 2;
    scene.add(tapeRoll);
    const ws = crate(0.7);
    ws.position.set(4.5, 0, -3.8);
    scene.add(ws);
    // blueprint on the wall
    const bp = new TextTexture(256, 192);
    bp.draw(["CABINET v1", "□ box", "□ box", "○ screen?"], { bg: "#1d4e89", fg: "#e0f0ff", size: 30, font: "'Comic Sans MS', cursive" });
    const bpPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.05), new THREE.MeshBasicMaterial({ map: bp.texture }));
    bpPlane.position.set(-0.4, 2.5, -D / 2 + 0.12);
    scene.add(bpPlane);
    // fluorescent strips
    for (const x of [-2.5, 2.5]) scene.add(box(2.2, 0.05, 0.22, glow(0xfff8e8), x, H - 0.05, -1));
    const lamp = new THREE.PointLight(0xfff0d8, 9, 16, 1.4);
    lamp.position.set(0, H - 0.5, 0);
    scene.add(lamp);

    // --- The cabinet (boxes) ---
    const CX = 0, CZ = -1.9;
    type Piece = { g: THREE.Group; x: number; y: number; z: number; w: number; h: number; d: number; land: number; from: THREE.Vector3; fall: THREE.Vector3; fallRot: THREE.Euler; fallAt: number };
    const spec: [number, number, number, number, number, number][] = [
      // x, y(bottom), w, h, d, zOffset
      [-0.32, 0, 0.62, 0.5, 0.8, 0], [0.32, 0, 0.62, 0.5, 0.8, 0],
      [-0.32, 0.5, 0.62, 0.5, 0.8, 0], [0.32, 0.5, 0.62, 0.5, 0.8, 0],
      [-0.32, 1.0, 0.62, 0.55, 0.65, -0.07], [0.32, 1.0, 0.62, 0.55, 0.65, -0.07],
      [-0.32, 1.55, 0.62, 0.5, 0.65, -0.07], [0.32, 1.55, 0.62, 0.5, 0.65, -0.07],
      [0, 2.05, 1.3, 0.38, 0.55, -0.12],
    ];
    const pile = new THREE.Vector3(3.6, 0, 0.6);
    const pieces: Piece[] = spec.map(([x, y, w, h, d, zo], i) => {
      const g = cardboardBox(w, h, d);
      scene.add(g);
      const side = r.sign();
      return {
        g, x: CX + x, y, z: CZ + zo, w, h, d,
        land: 3 + i * 1.25,
        from: new THREE.Vector3(pile.x + r.range(-0.3, 0.3), 0.9, pile.z + r.range(-0.3, 0.3)),
        fall: new THREE.Vector3(CX + x * 2.5 + r.range(-0.8, 0.8), 0, CZ + 0.3 + r.range(0, 1.0) - (y > 1 ? 0 : 0.5)),
        fallRot: new THREE.Euler(r.range(-0.6, 0.6), r.range(-1.2, 1.2), side * Math.PI / 2 * (y > 0.4 ? 1 : 0.15)),
        fallAt: 25.6 + (2.4 - y) * 0.12 + r.range(0, 0.15),
      };
    });
    // stockpile of spare boxes near the pile
    for (let i = 0; i < 4; i++) {
      const s = cardboardBox(0.62, 0.5, 0.7);
      s.position.set(4.3 + (i % 2) * 0.7, Math.floor(i / 2) * 0.5, 1.4 - (i % 2) * 0.2);
      s.rotation.y = r.range(-0.3, 0.3);
      scene.add(s);
    }

    // Hand-drawn screen panel + bottle-cap buttons (one group)
    const panel = new THREE.Group();
    const scr = new TextTexture(256, 256);
    const scrMat = new THREE.MeshBasicMaterial({ map: scr.texture });
    const sheet = mesh(new THREE.PlaneGeometry(1.0, 1.0), mat(0xc19a6b), false, false);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92), scrMat);
    face.position.z = 0.005;
    panel.add(sheet, face);
    const capCols = [0xd62828, 0x3a86ff, 0xffbe0b, 0x06d6a0];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const cap = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 8), mat(capCols[i % 4]));
      cap.rotation.x = Math.PI / 2;
      cap.position.set(Math.cos(a) * 0.47, Math.sin(a) * 0.47, 0.02);
      panel.add(cap);
    }
    scene.add(panel);
    const panelHome = new THREE.Vector3(CX, 1.55, CZ + 0.26 + 0.02);
    const drawScreen = (n: number) => {
      const full = "ONLINE";
      const shown = full.slice(0, Math.min(6, n));
      const sub = n > 6 ? "(trust me)".slice(0, n - 6) : "";
      scr.paint((c, w, h) => {
        c.fillStyle = "#c9a476";
        c.fillRect(0, 0, w, h);
        c.strokeStyle = "#222";
        c.lineWidth = 7;
        c.beginPath();
        for (let i = 0; i <= 40; i++) {
          const a = (i / 40) * Math.PI * 2;
          const rr = 104 + Math.sin(a * 5) * 3;
          c.lineTo(w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr);
        }
        c.stroke();
        c.fillStyle = "#118833";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.font = "bold 50px 'Comic Sans MS', 'Marker Felt', cursive";
        c.fillText(shown, w / 2, h / 2 - 22);
        c.fillStyle = "#222";
        c.font = "bold 26px 'Comic Sans MS', 'Marker Felt', cursive";
        c.fillText(sub, w / 2, h / 2 + 30);
        if (n > 16) {
          c.font = "bold 22px 'Comic Sans MS', cursive";
          c.fillText("♪ ♪", w / 2, h / 2 + 70);
        }
      });
    };
    let drawn = -1;

    // --- Engineers ---
    const eng = [
      new Player({ shirt: 0xf4a261, hairStyle: "short", accessories: ["goggles", "gloves"] }, 1301),
      new Player({ shirt: 0x457b9d, hairStyle: "bun", hair: 0x6b4423, accessories: ["headband", "glasses"] }, 1302),
      new Player({ shirt: 0xe63946, hairStyle: "cap", hair: 0x222222, accessories: ["beard"] }, 1303),
    ];
    const tester = new Player({ shirt: 0x8e44ad, hairStyle: "twin", hair: 0xff66aa, accessories: ["gloves", "towel"] }, 1304);
    const marker = box(0.04, 0.16, 0.04, 0x111111, 0, -0.05, 0.06);
    eng[1].handR.add(marker);
    [...eng, tester].forEach((p) => scene.add(p.root));
    const carried = box(0.62, 0.5, 0.7, 0xc19a6b);
    eng[0].handR.add(carried);
    carried.position.set(0.31, -0.05, 0.3);

    sfx.ambient("hum", 0.5);

    ctx.update((t) => {
      // boxes: tossed from the pile into place, then collapse
      pieces.forEach((p) => {
        const k = seg(t, p.land - 0.9, p.land);
        if (t < p.land - 0.9) {
          p.g.visible = false;
          return;
        }
        p.g.visible = true;
        const fk = easeIn(seg(t, p.fallAt, p.fallAt + 0.7));
        if (fk <= 0) {
          p.g.position.set(
            p.from.x + (p.x - p.from.x) * k,
            p.from.y + (p.y - p.from.y) * k + hop(k, 1.1),
            p.from.z + (p.z - p.from.z) * k,
          );
          p.g.rotation.set(0, (1 - k) * 2.5, (1 - k) * 0.8);
        } else {
          const restY = p.fallRot.z !== 0 && Math.abs(p.fallRot.z) > 1 ? p.w / 2 - p.h / 2 : 0;
          p.g.position.set(p.x + (p.fall.x - p.x) * fk, p.y + (restY - p.y) * fk + hop(fk, 0.25), p.z + (p.fall.z - p.z) * fk);
          p.g.rotation.set(p.fallRot.x * fk, p.fallRot.y * fk, p.fallRot.z * fk);
        }
      });

      // screen panel: attached at 16, drawn 16.5-19, falls flat on its back at 26
      panel.visible = t > 15.6;
      const pf = easeIn(seg(t, 25.9, 26.6));
      panel.position.set(panelHome.x + 1.1 * pf, panelHome.y + (0.03 - panelHome.y) * pf + hop(pf, 0.3), panelHome.z + 2.1 * pf);
      panel.rotation.set(-Math.PI / 2 * pf, 0, 0.3 * pf);
      const n = t < 16.3 ? 0 : Math.floor(seg(t, 16.3, 19.3) * 17);
      if (n !== drawn) {
        drawn = n;
        drawScreen(n);
      }

      // engineers
      const e0 = eng[0], e1 = eng[1], e2 = eng[2];
      const toss = pieces.find((p) => t >= p.land - 2 && t < p.land);
      // e0 fetches from the pile and tosses
      if (t < 15) {
        e0.root.position.set(2.6, 0, 0.3);
        e0.face(CX, CZ);
        const ph = toss ? seg(t, toss.land - 1.2, toss.land - 0.9) : 1;
        e0.pose("hold", t);
        e0.armR.rotation.x = -1.1 - ph * 1.5;
        e0.armL.rotation.x = -1.1 - ph * 1.5;
        carried.visible = !!toss && ph < 1;
      } else if (t < 25.5) {
        carried.visible = false;
        e0.root.position.set(2.2 + seg(t, 19, 20) * 0.6, 0, 0.6 + seg(t, 19, 20) * 0.8);
        e0.face(CX, CZ);
        e0.pose(t > 19.5 && t < 23 ? "cheer" : "idle", t);
      } else {
        e0.root.position.set(2.8, 0, 1.4);
        e0.face(CX, CZ);
        e0.pose(t < 27 ? "stop" : "facepalm", t);
      }
      // e1 tapes, then draws the screen
      e1.root.position.set(t < 15 ? -1.2 : -0.6, 0, t < 15 ? -1.0 : -0.75);
      e1.face(CX, CZ);
      if (t < 15) {
        e1.pose("dig", t);
        marker.visible = false;
      } else if (t < 19.5) {
        e1.root.position.set(-0.72, 0, -1.0);
        e1.face(-0.2, CZ);
        e1.pose("idle", t);
        e1.armR.rotation.set(-1.7 + Math.sin(t * 9) * 0.15, 0, 0.6 + Math.cos(t * 7) * 0.15);
        marker.visible = true;
      } else {
        e1.root.position.set(-1.9, 0, 0.2);
        e1.face(CX, CZ);
        e1.pose(t < 23 ? "cheer" : t < 25.8 ? "idle" : t < 27 ? "stop" : "sad", t);
      }
      // e2 supervises with a clipboard voice
      e2.root.position.set(-2.7, 0, -0.3);
      e2.face(CX, CZ);
      e2.pose(t < 15 ? "point" : t < 19.5 ? "talk" : t < 23 ? "cheer" : t < 25.8 ? "idle" : t < 27.5 ? "facepalm" : "sad", t);
      // tester walks up for the first credit
      const tk = smooth(seg(t, 21.5, 23.3));
      tester.root.visible = t > 21.3;
      tester.travel(4.5, 3.2, CX + 0.25, CZ + 1.15, tk);
      if (tk < 1) tester.pose(tk > 0 ? "walk" : "idle", t);
      else {
        tester.face(CX, CZ);
        if (t < 25.6) {
          tester.pose("reach", t, seg(t, 23.3, 24.6));
          tester.armR.rotation.x = -1.4 - bumpTap(t) * 0.25;
        } else if (t < 27) {
          tester.pose("stop", t);
          tester.root.position.z += seg(t, 25.6, 26) * 0.4;
        } else {
          tester.root.position.z += 0.4;
          tester.pose("sitFloor", t);
          tester.head.rotation.x = 0.5;
        }
      }
    });
    function bumpTap(t: number) {
      return t > 24.7 && t < 25 ? 1 : 0;
    }

    // --- Sound ---
    pieces.forEach((p, i) => {
      ctx.at(p.land - 0.9, () => sfx.whoosh(0.4));
      ctx.at(p.land, () => sfx.thunk());
      ctx.at(p.land + 0.3, () => sfx.noise(0.35, { type: "bandpass", freq: 2200, q: 1.5, gain: 0.12 })); // tape
      if (i % 3 === 0) ctx.at(p.land + 0.5, () => sfx.mumble(0.8, 1.1));
    });
    for (let s = 16.3; s < 19.3; s += 0.35) ctx.at(s, () => sfx.noise(0.18, { type: "highpass", freq: 3500, gain: 0.06, slideFreqTo: 5000 }));
    ctx.at(19.6, () => sfx.fanfare());
    ctx.at(19.8, () => sfx.cheer(2.4));
    ctx.at(24.7, () => sfx.tap());
    ctx.at(25.1, () => sfx.noise(1.0, { type: "bandpass", freq: 300, q: 4, gain: 0.25, slideFreqTo: 150 })); // creak
    ctx.at(25.7, () => sfx.crumple());
    ctx.at(26.2, () => sfx.crumple());
    ctx.at(26.6, () => sfx.thud());
    ctx.at(27.6, () => sfx.sadTrombone());

    // --- Narration ---
    ctx.caption(0.8, "Day 13. The engineers convene. If the server will not come to us, we will build our own.", 5);
    ctx.caption(6.2, "Materials: nine boxes, one marker, zero networking experience.", 4.4);
    ctx.caption(11.2, "Load-bearing tape. Structural optimism.", 3.6);
    ctx.caption(16, "The screen is drawn by hand. It says exactly what everyone needs to hear.", 4.4);
    ctx.caption(21, "The first credit. A historic moment for independent infrastructure.", 4);
    ctx.caption(26.4, "Post-launch review: the server is experiencing unexpected gravity.", 4.4);
    ctx.caption(31.6, "The screen, to its credit, still says ONLINE.", 4.8);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [0, 2.6, 8.5], look: [0, 1.2, -2] },
      { t: 5.5, pos: [3.4, 2.2, 4.6], look: [0.5, 1, -1.5] },
      { t: 10.5, pos: [-1.1, 1.0, 2.8], look: [0, 1.4, -2] },
      { t: 15.2, pos: [-1.5, 1.8, 2.4], look: [0, 1.6, -2] },
      { t: 16, pos: [0.45, 1.6, 0.6], look: [0.05, 1.55, -1.6], fov: 42 },
      { t: 19.3, pos: [0.3, 1.55, 0.3], look: [0, 1.55, -1.6], fov: 42 },
      { t: 20.3, pos: [0, 2.1, 6], look: [0, 1.3, -1.5], fov: 50 },
      { t: 23.3, pos: [2.6, 1.7, 1.6], look: [0, 1.3, -1.6] },
      { t: 25.3, pos: [0.5, 2.2, 6.4], look: [0, 1.1, -1.4] },
      { t: 30.5, pos: [0.5, 2.4, 5.8], look: [0, 0.6, -1] },
      { t: 31.5, pos: [1.1, 2.7, 1.1], look: [1.1, 0, 0.5], fov: 45 },
      { t: 37, pos: [1.1, 2.3, 1.0], look: [1.1, 0, 0.5], fov: 45 },
    ]);
    ctx.shake(25.8, 0.1, 0.8);
  },
};
export default scene;

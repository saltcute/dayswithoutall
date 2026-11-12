// Day 22: Cave Paintings. Deep in a torch-lit cave, an elder teaches the
// children what "notes" were, using crude wall paintings. It does not go well.
import * as THREE from "three";
import { box, glow, mat, mesh } from "../engine/materials";
import { bump, lerp, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { TextTexture, textPlane } from "../engine/textTexture";
import { Player } from "../kit/characters";
import { cave, setupWorld } from "../kit/environments";
import { rock, torch } from "../kit/props";
import { cjkFonts, trAuto } from "../i18n";

const OCHRE = "#c8642a", CHAR = "#2a1a10", BONE = "#efe0bd";

function stick(c: CanvasRenderingContext2D, x: number, y: number, s: number, arms: "up" | "fwd" | "bow" | "side" = "side") {
  c.lineWidth = s * 0.09;
  c.lineCap = "round";
  c.beginPath();
  c.arc(x, y - s * 0.85, s * 0.13, 0, Math.PI * 2);
  c.stroke();
  const hipY = y - s * 0.3, shY = y - s * 0.65;
  const bowX = arms === "bow" ? s * 0.25 : 0;
  c.beginPath();
  c.moveTo(x + bowX, shY + (arms === "bow" ? s * 0.15 : 0));
  c.lineTo(x, hipY);
  c.lineTo(x - s * 0.18, y);
  c.moveTo(x, hipY);
  c.lineTo(x + s * 0.18, y);
  c.moveTo(x + bowX, shY + (arms === "bow" ? s * 0.15 : 0));
  if (arms === "up") {
    c.lineTo(x - s * 0.25, shY - s * 0.3);
    c.moveTo(x + bowX, shY);
    c.lineTo(x + s * 0.25, shY - s * 0.3);
  } else if (arms === "fwd") {
    c.lineTo(x + s * 0.4, shY - s * 0.05);
    c.moveTo(x, shY);
    c.lineTo(x + s * 0.38, shY + s * 0.1);
  } else if (arms === "bow") {
    c.lineTo(x + s * 0.5, shY + s * 0.35);
  } else {
    c.lineTo(x - s * 0.25, shY + s * 0.25);
    c.moveTo(x, shY);
    c.lineTo(x + s * 0.25, shY + s * 0.25);
  }
  c.stroke();
}

function painting(w: number, h: number, draw: (c: CanvasRenderingContext2D, W: number, H: number) => void) {
  const tt = new TextTexture(Math.round(256 * (w / h)), 256);
  tt.paint((c, W, H) => {
    c.clearRect(0, 0, W, H);
    // faint smudged rock-wash
    c.fillStyle = "rgba(220,170,110,0.18)";
    c.beginPath();
    c.ellipse(W / 2, H / 2, W * 0.48, H * 0.46, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = OCHRE;
    c.fillStyle = OCHRE;
    draw(c, W, H);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tt.texture, transparent: true, color: 0x9a8a78 }));
  return m;
}

const scene: SceneDef = {
  duration: 38,
  build(ctx) {
    const { scene, sfx } = ctx;
    const world = setupWorld(ctx, { sky: 0x0b0704, ground: 0x1a0d05, hemi: 0.5, sun: 0xff9a50, sunIntensity: 0.25, sunPos: [2, 8, 6] });
    cave(ctx, 9);
    const r = rng(2201);

    // Flat painting wall at the back
    const slab = box(10, 4.4, 0.7, 0x6e5a46, 0, 2, -6.4);
    scene.add(slab);
    for (let i = 0; i < 9; i++) {
      const rk = rock(r.range(0.3, 0.7), 2200 + i, r.pick([0x5a4a3a, 0x6b5a48, 0x4a3f35]));
      const a = r.range(0, Math.PI * 2), d = r.range(4.5, 6.5);
      rk.position.set(Math.cos(a) * d, rk.position.y, Math.sin(a) * d * 0.7 + 1);
      scene.add(rk);
    }
    // stalactites
    for (let i = 0; i < 14; i++) {
      const s = mesh(new THREE.ConeGeometry(r.range(0.12, 0.3), r.range(0.5, 1.4), 5), mat(0x54463a));
      s.rotation.x = Math.PI;
      s.position.set(r.range(-5, 5), r.range(4.1, 4.6), r.range(-4.5, 3));
      scene.add(s);
    }

    // --- The paintings ---
    const pNotes = painting(2.4, 1.5, (c, W, H) => {
      stick(c, W * 0.2, H * 0.85, H * 0.6, "fwd");
      c.lineWidth = 9;
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.arc(W * (0.45 + i * 0.13), H * (0.25 + (i % 2) * 0.3), 22, 0, Math.PI * 2);
        c.stroke();
      }
      c.fillStyle = CHAR;
      c.font = "bold 40px serif";
      c.fillText("✶", W * 0.33, H * 0.5);
      c.strokeStyle = CHAR;
      c.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(W * 0.31, H * (0.3 + i * 0.1));
        c.lineTo(W * 0.37, H * (0.28 + i * 0.1));
        c.stroke();
      }
    });
    pNotes.position.set(-2.8, 2.05, -5.98);
    const pSlide = painting(2.4, 1.5, (c, W, H) => {
      stick(c, W * 0.25, H * 0.88, H * 0.55, "up");
      c.lineWidth = 12;
      c.beginPath();
      c.arc(W * 0.6, H * 0.5, H * 0.32, Math.PI * 1.1, Math.PI * 0.2);
      c.stroke();
      c.beginPath();
      c.moveTo(W * 0.6 + H * 0.32 * Math.cos(0.2 * Math.PI) - 24, H * 0.5 + H * 0.32 * Math.sin(0.2 * Math.PI) - 4);
      c.lineTo(W * 0.6 + H * 0.32 * Math.cos(0.2 * Math.PI) + 6, H * 0.5 + H * 0.32 * Math.sin(0.2 * Math.PI) + 4);
      c.lineTo(W * 0.6 + H * 0.32 * Math.cos(0.2 * Math.PI) + 2, H * 0.5 + H * 0.32 * Math.sin(0.2 * Math.PI) - 28);
      c.stroke();
      c.fillStyle = BONE;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(W * (0.76 + i * 0.06), H * 0.2);
        c.lineTo(W * (0.8 + i * 0.06), H * 0.12);
        c.lineTo(W * (0.84 + i * 0.06), H * 0.2);
        c.fill();
      }
    });
    pSlide.position.set(0, 2.05, -5.98);
    const pRating = painting(2.4, 1.5, (c, W, H) => {
      c.fillStyle = BONE;
      c.font = "900 64px 'Arial Black', " + cjkFonts() + ", sans-serif";
      c.textAlign = "center";
      c.fillText("15.00", W * 0.5, H * 0.38);
      c.font = "700 26px " + cjkFonts() + ", serif";
      c.fillStyle = OCHRE;
      c.fillText(trAuto("R A T I N G"), W * 0.5, H * 0.1);
      c.strokeStyle = CHAR;
      for (let i = 0; i < 4; i++) stick(c, W * (0.18 + i * 0.21), H * 0.95, H * 0.45, i % 2 ? "bow" : "up");
      c.strokeStyle = BONE;
      c.lineWidth = 4;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        c.beginPath();
        c.moveTo(W * 0.5 + Math.cos(a) * 110, H * 0.33 + Math.sin(a) * 50);
        c.lineTo(W * 0.5 + Math.cos(a) * 140, H * 0.33 + Math.sin(a) * 64);
        c.stroke();
      }
    });
    pRating.position.set(2.8, 2.05, -5.98);
    scene.add(pNotes, pSlide, pRating);
    const paints = [pNotes, pSlide, pRating];

    // Wall torches
    const torches = [torch(), torch()];
    torches[0].position.set(-5, 0, -4.4);
    torches[1].position.set(5, 0, -4.4);
    torches.forEach((tc) => scene.add(tc));
    const tFlames = torches.map((tc) => tc.children[1] as THREE.Mesh);
    const tLights = torches.map((tc) => tc.children[2] as THREE.PointLight);
    tLights.forEach((l) => {
      l.intensity = 4;
      l.distance = 9;
    });

    // Elder with a hand torch
    const elder = new Player({ skin: 0xc98e66, shirt: 0x7a5c3a, pants: 0x4a3a2a, hairStyle: "bald", accessories: ["beard", "robe"], robe: 0x5c4326 }, 2210);
    scene.add(elder.root);
    const hTorch = new THREE.Group();
    hTorch.add(box(0.05, 0.6, 0.05, 0x5c3a1e, 0, -0.05, 0));
    const hFlame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 5), glow(0xffa030));
    hFlame.position.y = 0.35;
    hTorch.add(hFlame);
    hTorch.rotation.x = -Math.PI / 2; // points along the forearm
    elder.handR.add(hTorch);
    const elderLight = new THREE.PointLight(0xffa050, 5, 7, 1.6);
    scene.add(elderLight);

    // Children (small players), seated facing the wall
    const kidCols = [0xc1440e, 0x6b8f71, 0xd4a017, 0x8e5572, 0x4d7ea8, 0xb5651d];
    const kidPos: [number, number][] = [[-2.1, -1.6], [-0.7, -1.9], [0.7, -1.7], [2.1, -1.5], [-1.4, -0.5], [1.3, -0.4]];
    const kids = kidPos.map((p, i) => {
      const k = new Player({ shirt: kidCols[i], scale: 0.6, hairStyle: (["spiky", "twin", "short", "bun", "cap", "long"] as const)[i], accessories: i === 2 ? ["headband"] : [] }, 2220 + i);
      k.at(p[0], p[1]);
      scene.add(k.root);
      return k;
    });
    // floating question marks
    const qs = kids.map(() => {
      const q = textPlane("?", 0.35, 0.45, { bg: "", fg: "#ffe08a", size: 220 }, 128);
      scene.add(q);
      return q;
    });

    sfx.ambient("fire", 0.5);
    sfx.ambient("droneEerie", 0.25);

    // Elder schedule: x position along the wall, and whether he faces the wall.
    // 0-4 walk in | 4-11 notes panel | 11-16 to kids | 16-22 slide panel | 22-28 rating | 28-38 kids rush the wall
    // He stands just right of each panel so he never blocks it.
    const elderX = (t: number) =>
      t < 4 ? lerp(-5.5, -1.55, smooth(seg(t, 0, 4))) : t < 15 ? -1.55 : t < 17 ? lerp(-1.55, 1.25, smooth(seg(t, 15, 17))) : t < 21.5 ? 1.25 : t < 23 ? lerp(1.25, 4.1, smooth(seg(t, 21.5, 23))) : t < 29 ? 4.1 : lerp(4.1, 4.6, smooth(seg(t, 29, 30.5)));
    const panelX = (t: number) => (t < 16 ? -2.8 : t < 22.5 ? 0 : 2.8);
    const tmpV = new THREE.Vector3();

    ctx.update((t) => {
      const ex = elderX(t);
      elder.root.position.set(ex, 0, -4.7);
      const walking = (t < 4) || (t > 15 && t < 17) || (t > 21.5 && t < 23) || (t > 29 && t < 30.5);
      // face wall (rotation PI) while pointing, face kids (0) while talking
      const toWall = (t > 4.5 && t < 8) || (t > 17 && t < 19.5) || (t > 23 && t < 26);
      if (walking) elder.root.rotation.y = Math.PI / 2;
      else if (toWall) elder.face(panelX(t), -6);
      else elder.face(0, -1);
      if (walking) elder.pose("walk", t);
      else if (t > 30.5) elder.pose(t < 34 ? "facepalm" : "cheer", t, 0.4);
      else if (toWall) {
        elder.pose("point", t);
        elder.armR.rotation.x = -2.0;
      } else if (t > 19.5 && t < 21.5) elder.pose("slide", t);
      else elder.pose("talk", t);
      if (t > 30.5 && t >= 34) elder.armR.rotation.x = -2.6;
      elder.handR.getWorldPosition(tmpV);
      elderLight.position.set(tmpV.x, tmpV.y + 0.3, tmpV.z + 0.3);
      elderLight.intensity = 5 + Math.sin(t * 19) * 0.6 + Math.sin(t * 7) * 0.4;
      hFlame.scale.set(1, 1 + Math.sin(t * 17) * 0.2, 1);

      // torches flicker
      tFlames.forEach((f, i) => f.scale.set(1 + Math.sin(t * 13 + i) * 0.12, 1 + Math.sin(t * 19 + i * 3) * 0.25, 1));
      tLights.forEach((l, i) => (l.intensity = 4 + Math.sin(t * 21 + i * 2) * 0.6 + Math.sin(t * 5.3 + i) * 0.4));

      // paintings: the one being explained brightens
      const lit = [bump(t, 3.5, 16) > 0 ? 1 : 0, t > 16 && t < 23 ? 1 : 0, t > 22 && t < 30 ? 1 : 0];
      paints.forEach((p, i) => {
        const m = p.material as THREE.MeshBasicMaterial;
        const pulse = i === 2 && t > 23.5 && t < 28 ? 0.15 * Math.sin(t * 6) : 0;
        m.color.setScalar(lerp(0.55, 1, lit[i]) + pulse);
      });

      // kids
      kids.forEach((k, i) => {
        const [x, z] = kidPos[i];
        const rushK = smooth(seg(t, 30 + i * 0.25, 31.5 + i * 0.25));
        const targetX = [-3.3, -2.4, -0.4, 0.5, 2.4, 3.2][i];
        if (t < 30) {
          k.root.position.set(x, 0, z);
          k.face(lerp(x, -2.8 + (t > 16 ? 2.8 : 0) + (t > 22.5 ? 2.8 : 0), 0.5), -6);
          k.pose("sitFloor", t);
          // confusion: tilted heads, a raised hand
          const confused = (t > 9 && t < 16) || (t > 19 && t < 22.5) || (t > 25.5 && t < 30);
          if (confused) k.head.rotation.z = Math.sin(i * 2.1) > 0 ? 0.35 : -0.35;
          if (i === 4 && t > 11 && t < 15) k.armR.rotation.x = -2.9 + Math.sin(t * 9) * 0.2;
          if (i === 1 && t > 20 && t < 22.5) k.pose("slide", t); // tries a slide sitting down
          if (t > 22.5 && t < 25.5) k.head.rotation.x = -0.25; // awe at the rating
        } else if (rushK < 1) {
          k.travel(x, z, targetX, -5.6, rushK);
          k.pose("run", t);
        } else {
          k.root.position.set(targetX, 0, -5.6);
          k.root.rotation.y = Math.PI;
          k.pose("knock", t + i * 0.3);
          k.armL.rotation.x = -1.9 + Math.max(0, Math.sin((t + i) * 11 + 1.5)) * 0.5;
        }
        const q = qs[i];
        const showQ = (t > 10 && t < 15.5 && i % 2 === 0) || (t > 19.5 && t < 22 && i % 2 === 1) || (t > 26 && t < 29.5);
        q.visible = showQ;
        q.position.set(k.root.position.x, 1.25 + Math.sin(t * 3 + i) * 0.05, k.root.position.z);
        q.lookAt(ctx.camera.position);
      });

      world.hemi.intensity = 0.5;
    });

    // --- Sound ---
    for (let s = 0; s < 7; s++) ctx.at(0.3 + s * 0.6, () => sfx.footstep(-0.4));
    ctx.at(4.6, () => sfx.mumble(1.6, 0.7));
    [6, 6.3, 6.6, 7.2].forEach((s) => ctx.at(s, () => sfx.tap()));
    ctx.at(10.5, () => sfx.mumble(1.4, 1.6, -0.3));
    ctx.at(11.5, () => sfx.mumble(1, 1.8, 0.3));
    ctx.at(18, () => sfx.whoosh(0.8));
    ctx.at(20, () => sfx.whoosh(0.6));
    ctx.at(23.8, () => sfx.dramaticChord());
    ctx.at(25, () => sfx.crowdGasp());
    ctx.at(30, () => sfx.mumble(1.2, 1.9));
    for (let s = 31.5; s < 35; s += 0.18) ctx.at(s, () => sfx.tap());
    ctx.at(32, () => sfx.cheer(1.5));
    ctx.at(35.5, () => sfx.shimmer());

    // --- Narration ---
    ctx.caption(0.6, "Day 22. Deep underground, the elders preserve the old knowledge.", 4.4);
    ctx.caption(5.2, "“These,” says the elder, “were notes. They fell from the sky. We hit them.”", 5);
    ctx.caption(10.6, "The children ask why. The elder says “for the combo.” Nobody knows what a combo is.", 5);
    ctx.caption(17.2, "Some notes had to be slid. This was considered normal.", 4.3);
    ctx.caption(23.4, "And this was the Rating. Grown adults wept before it.", 4.4);
    ctx.caption(28.2, "Little Mika asks if the circles were food. The lesson is over.", 3.8);
    ctx.caption(32.4, "The children have learned the most important thing: hitting the wall, very fast.", 5.2);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [0, 2.1, 5.2], look: [0, 1.6, -5] },
      { t: 4.5, pos: [-1.2, 1.9, 0.6], look: [-2.8, 1.9, -6] },
      { t: 8.5, pos: [-2.4, 2.0, -2.6], look: [-2.8, 2.0, -6] },
      { t: 10.5, pos: [1.4, 1.5, -4.4], look: [-0.5, 0.6, -1.2], fov: 55 },
      { t: 15.5, pos: [1.8, 1.4, -4.2], look: [0, 0.5, -1.2], fov: 55 },
      { t: 17.5, pos: [0, 1.8, -1.6], look: [0, 1.9, -6] },
      { t: 22, pos: [0.8, 1.8, -2.2], look: [0.5, 1.7, -6] },
      { t: 24, pos: [2.8, 2.0, -3.0], look: [2.8, 2.1, -6], fov: 45 },
      { t: 28, pos: [3.3, 1.7, -2.6], look: [1, 0.8, -3], fov: 50 },
      { t: 31, pos: [0, 2.3, 1.2], look: [0, 1.2, -5.5] },
      { t: 38, pos: [0.4, 2.6, 3.8], look: [0, 1.4, -5.5] },
    ]);
    ctx.shake(23.8, 0.05, 0.6);
  },
};
export default scene;

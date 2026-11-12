// Day 17: Market Crash. The Arcade Card Exchange. The board plunges, traders
// yell and faint, cards rain from the ceiling. One trader buys the dip.
import * as THREE from "three";
import { box, glow, mat } from "../engine/materials";
import { clamp, lerp, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { TextTexture } from "../engine/textTexture";
import { Player } from "../kit/characters";
import { card, CARD_COLORS, table } from "../kit/props";
import { floor, setupWorld } from "../kit/environments";

const CRASH0 = 12, CRASH1 = 21;
/** Price multiplier for the RARE CARD over time (deterministic wiggle). */
function price(t: number) {
  const wig = 1 + Math.sin(t * 2.3) * 0.02 + Math.sin(t * 5.1) * 0.012;
  const up = 1 + seg(t, 0, CRASH0) * 0.06;
  const crash = lerp(1, 0.03, Math.pow(seg(t, CRASH0, CRASH1), 1.6));
  const after = t > CRASH1 ? 1 + Math.sin(t * 9) * 0.25 : 1;
  return up * crash * wig * after;
}

const scene: SceneDef = {
  duration: 37,
  build(ctx) {
    const { scene, sfx } = ctx;
    setupWorld(ctx, { sky: 0x0b1020, ground: 0x111122, hemi: 0.9, sun: 0xdfe8ff, sunIntensity: 0.9, sunPos: [3, 10, 8] });
    const r = rng(1717);

    // --- Trading floor ---
    const W = 16, D = 12, H = 5;
    scene.add(floor(W, D, 0x1f2a44));
    const wallM = mat(0x2b3555);
    scene.add(box(W, H, 0.2, wallM, 0, H / 2, -D / 2), box(0.2, H, D, wallM, -W / 2, H / 2, 0), box(0.2, H, D, wallM, W / 2, H / 2, 0));
    for (let i = 0; i < 3; i++) scene.add(box(W * 0.8, 0.05, 0.3, glow(0xe8f0ff), 0, H - 0.05, -4 + i * 3.5));
    const roomLight = new THREE.PointLight(0xd8e4ff, 10, 22, 1.3);
    roomLight.position.set(0, H - 0.6, 0);
    scene.add(roomLight);

    // The big board
    const board = new TextTexture(1024, 480);
    const boardMat = new THREE.MeshBasicMaterial({ map: board.texture });
    const BW = 10.4, BH = 4.6;
    scene.add(box(BW + 0.3, BH + 0.3, 0.15, 0x111111, 0, 2.75, -D / 2 + 0.15));
    const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), boardMat);
    boardMesh.position.set(0, 2.75, -D / 2 + 0.24);
    scene.add(boardMesh);
    // ticker tape below
    const tape = new TextTexture(1024, 64);
    tape.draw("RARE ▼97%   GOLD ▼91%   EVENT ▼88%   COMMON ▼99%   PLUSH BEAR ▲412%   SERVER: DOWN   ", { bg: "#000", fg: "#ffcc00", size: 150, align: "left" });
    tape.texture.wrapS = THREE.RepeatWrapping;
    tape.texture.repeat.x = 1.5;
    const tapeMesh = new THREE.Mesh(new THREE.PlaneGeometry(BW, 0.35), new THREE.MeshBasicMaterial({ map: tape.texture }));
    tapeMesh.position.set(0, 0.25, -D / 2 + 0.24);
    scene.add(tapeMesh);

    const rows: [string, number, number][] = [
      ["RARE CARD", 12000, 0.97], ["GOLD CARD", 8800, 0.9], ["EVENT CARD", 5400, 0.88], ["COMMON CARD", 300, 0.99], ["PLUSH BEAR", 2000, -4.1],
    ];
    const hist: number[] = [];
    const drawBoard = (t: number) => {
      board.paint((c, w, h) => {
        c.fillStyle = "#05070f";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#14203f";
        c.fillRect(0, 0, w, 56);
        c.fillStyle = "#9fd0ff";
        c.font = "800 36px 'Arial Black', Impact, sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("★ ARCADE CARD EXCHANGE ★", w / 2, 30);
        // rows
        c.textAlign = "left";
        c.font = "700 30px monospace";
        const crashK = Math.pow(seg(t, CRASH0, CRASH1), 1.6);
        rows.forEach(([name, base, drop], i) => {
          const y = 96 + i * 52;
          const m = drop > 0 ? 1 - crashK * drop : 1 + crashK * -drop;
          const pct = (m * (1 + seg(t, 0, CRASH0) * 0.06) - 1) * 100;
          c.fillStyle = "#dfe6ff";
          c.fillText(name, 20, y);
          c.fillText("¥" + Math.max(1, Math.round(base * m)).toLocaleString("en-US"), 250, y);
          c.fillStyle = pct >= 0 ? "#33ff88" : "#ff3355";
          c.fillText((pct >= 0 ? "▲+" : "▼") + Math.abs(pct).toFixed(0) + "%", 400, y);
        });
        // chart
        const cx0 = 540, cy0 = 70, cw = 460, ch = 300;
        c.strokeStyle = "#22305a";
        c.lineWidth = 2;
        for (let i = 0; i <= 4; i++) {
          c.beginPath();
          c.moveTo(cx0, cy0 + (i * ch) / 4);
          c.lineTo(cx0 + cw, cy0 + (i * ch) / 4);
          c.stroke();
        }
        hist.length = 0;
        const N = 90;
        for (let i = 0; i <= N; i++) hist.push(price((i / N) * t));
        c.strokeStyle = t > CRASH0 ? "#ff3355" : "#33ff88";
        c.lineWidth = 6;
        c.beginPath();
        hist.forEach((v, i) => {
          const x = cx0 + (i / N) * cw;
          const y = cy0 + ch - clamp(v / 1.15) * ch;
          if (i === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        });
        c.stroke();
        c.fillStyle = "#9fd0ff";
        c.font = "700 22px monospace";
        c.fillText("RARE CARD / ¥", cx0, cy0 + ch + 22);
        // banners
        c.textAlign = "center";
        if (t > 11 && t < CRASH1 && Math.sin(t * 8) > -0.3) {
          c.fillStyle = "#c1121f";
          c.fillRect(0, h - 88, w, 72);
          c.fillStyle = "#fff";
          c.font = "800 40px 'Arial Black', Impact, sans-serif";
          c.fillText("BULLETIN: SERVER STILL DOWN", w / 2, h - 52);
        }
        if (t > CRASH1 && t < 31.5) {
          c.fillStyle = "rgba(120,0,10,0.85)";
          c.fillRect(40, 130, w - 80, 220);
          c.fillStyle = Math.sin(t * 10) > 0 ? "#ffffff" : "#ffdd55";
          c.font = "900 104px 'Arial Black', Impact, sans-serif";
          c.fillText("RARE CARD -97%", w / 2, 240);
        }
        if (t > 31.8) {
          c.fillStyle = "rgba(0,80,30,0.9)";
          c.fillRect(40, 130, w - 80, 220);
          c.fillStyle = "#ffffff";
          c.font = "900 64px 'Arial Black', Impact, sans-serif";
          c.fillText("SOLD: 1,200 CARDS", w / 2, 205);
          c.fillText("TOTAL ¥1", w / 2, 285);
        }
      });
    };
    let lastDraw = -1;

    // Desks with monitors
    const deskMon: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const x = (i % 3 - 1) * 4.2, z = Math.floor(i / 3) * 3.4 - 2.6;
      const dsk = table(2.2, 0.9, 0x3a3a4a);
      dsk.position.set(x, 0, z);
      scene.add(dsk);
      for (const mx of [-0.5, 0.5]) {
        scene.add(box(0.7, 0.45, 0.06, 0x111111, x + mx, 1.05, z - 0.25));
        const m = box(0.62, 0.38, 0.01, glow(0x33ff88), x + mx, 1.05, z - 0.215);
        m.material = (m.material as THREE.Material).clone();
        deskMon.push(m);
        scene.add(m);
      }
    }

    // --- Traders ---
    const traders = Array.from({ length: 9 }, (_, i) => {
      const p = new Player({
        shirt: i % 4 === 0 ? 0xd8e2f0 : 0xffffff,
        pants: r.pick([0x22223b, 0x1b1b1b, 0x3d405b]),
        hairStyle: r.pick(["short", "short", "bald", "long", "bun", "spiky"] as const),
        accessories: i % 3 === 0 ? ["glasses"] : [],
      }, 1700 + i);
      const tie = box(0.08, 0.38, 0.02, i % 2 ? 0xc1121f : 0x1d3557, 0, 0.36, 0.15);
      p.torso.add(tie);
      scene.add(p.root);
      const desk = i % 6;
      const x = (desk % 3 - 1) * 4.2 + (i >= 6 ? 0.8 : -0.4), z = Math.floor(desk / 3) * 3.4 - 2.6 + 1.0;
      return { p, x, z, faintAt: 21.6 + r.range(0, 4.5), fallSide: r.sign() };
    });
    const buyer = traders[4];
    const phone = box(0.08, 0.16, 0.03, 0x111111, 0, -0.05, 0.08);
    traders[1].p.handR.add(phone);

    // Cards raining down (pure function of t, piling on the floor)
    const rain = Array.from({ length: 70 }, (_, i) => {
      const m = card(CARD_COLORS[i % CARD_COLORS.length]);
      scene.add(m);
      return { m, x: r.range(-7, 7), z: r.range(-5, 5), at: CRASH1 + 0.3 + r.range(0, 12), sp: r.range(1.2, 2.2), rx: r.range(-1, 1), ry: r.range(0, 6), sway: r.range(0.3, 0.8) };
    });

    sfx.ambient("crowd", 0.6);

    ctx.update((t) => {
      const frame = Math.floor(t * 12);
      if (frame !== lastDraw) {
        lastDraw = frame;
        drawBoard(t);
      }
      tape.texture.offset.x = t * 0.06;
      const red = t > CRASH0;
      deskMon.forEach((m, i) => {
        const mm = m.material as THREE.MeshBasicMaterial;
        mm.color.set(t > 31.8 && i === 7 ? 0x33ff88 : red ? (Math.sin(t * 6 + i) > 0 ? 0xff3355 : 0x661018) : 0x33ff88);
      });
      roomLight.color.set(t > CRASH1 && t < 31.5 && Math.sin(t * 5) > 0 ? 0xff6677 : 0xd8e4ff);

      rain.forEach((c) => {
        const k = t - c.at;
        c.m.visible = k > 0;
        const y = Math.max(0.02 + ((c.x * 7 + c.z * 3) % 1 + 1) % 1 * 0.03, 5 - k * c.sp);
        const falling = y > 0.06;
        c.m.position.set(c.x + (falling ? Math.sin(k * 3) * c.sway : Math.sin((5 / c.sp) * 3) * c.sway), y, c.z);
        c.m.rotation.set(falling ? Math.sin(k * 4) * c.rx : 0, c.ry + (falling ? k : 5 / c.sp), falling ? Math.cos(k * 3) * 0.5 : 0);
      });

      traders.forEach((tr, i) => {
        const { p, x, z } = tr;
        p.root.position.set(x, 0, z);
        p.face(0, -6);
        if (t < 11) {
          p.pose(i % 3 === 0 ? "point" : i % 3 === 1 ? "talk" : "cheer", t, 0.4);
          if (i === 1) p.armR.rotation.set(-2.4, 0, 0.5); // phone to ear
        } else if (t < CRASH0 + 3) {
          p.pose(i % 2 ? "talk" : "reach", t * 1.4, 1);
          p.head.rotation.x = -0.15;
        } else if (t < tr.faintAt || tr === buyer) {
          p.pose(i % 3 === 0 ? "facepalm" : i % 3 === 1 ? "stop" : "point", t * 1.6, 1);
          p.root.position.x += Math.sin(t * 9 + i) * 0.04;
        } else {
          p.pose("faint", t, smooth(seg(t, tr.faintAt, tr.faintAt + 0.7)));
          p.root.rotation.y += tr.fallSide * 0.4;
        }
        if (tr === buyer && t > 30) {
          p.root.position.set(lerp(x, 0.2, smooth(seg(t, 30, 31.5))), 0, lerp(z, -3.6, smooth(seg(t, 30, 31.5))));
          if (t < 31.5) {
            p.root.rotation.y = Math.atan2(0.2 - x, -3.6 - z);
            p.pose("walk", t);
          } else if (t < 33) {
            p.face(0, -6);
            p.pose("point", t);
          } else {
            p.face(0, 6);
            p.pose("cheer", t, 1);
          }
        }
      });
    });

    // --- Sound ---
    for (let s = 1; s < 11; s += 1.3) ctx.at(s, () => sfx.mumble(1.0, 0.8 + (s % 3) * 0.15, Math.sin(s)));
    ctx.at(2.5, () => sfx.ding());
    ctx.at(7, () => sfx.ding());
    ctx.at(11, () => sfx.radioVoice(2));
    ctx.at(12.5, () => sfx.crowdGasp());
    for (let s = 13; s < CRASH1; s += 0.7) ctx.at(s, () => sfx.shout(0.8 + ((s * 7) % 5) * 0.1));
    for (let s = 13; s < CRASH1; s += 1.6) ctx.at(s, () => sfx.errorBeep(1));
    ctx.at(CRASH1, () => {
      sfx.buzzer();
      sfx.dramaticChord();
    });
    ctx.at(CRASH1 + 0.6, () => sfx.scream());
    traders.forEach((tr) => {
      if (tr !== buyer) ctx.at(tr.faintAt + 0.6, () => sfx.thud());
    });
    for (let s = CRASH1 + 1; s < 31; s += 0.4) ctx.at(s, () => sfx.noise(0.05, { type: "highpass", freq: 3000, gain: 0.05 }));
    ctx.at(31.8, () => sfx.coin());
    ctx.at(32.2, () => sfx.fanfare());
    ctx.at(33.2, () => sfx.cheer(1.5));

    // --- Narration ---
    ctx.caption(0.8, "Day 17. The Arcade Card Exchange. Where value is set by vibes and rumor.", 4.8);
    ctx.caption(6, "Limited-edition cards trade at a premium. Their titles are, after all, priceless.", 4.8);
    ctx.caption(11.2, "Then the morning bulletin: the server is still down. Titles cannot be displayed. Anywhere.", 5.2);
    ctx.caption(16.6, "Analysts call it a correction. Traders call it other things.", 4.2);
    ctx.caption(21.2, "RARE CARD: down ninety-seven percent. Commons are now officially coasters.", 5.2);
    ctx.caption(26.8, "The market has found the floor. The floor has a basement.", 4.4);
    ctx.caption(31.8, "One trader buys the dip. All of it. For one yen.", 4.8);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [0, 3.6, 7.5], look: [0, 2.2, -5] },
      { t: 5.6, pos: [-5.5, 1.7, 2.6], look: [0, 1.4, -1] },
      { t: 10.8, pos: [5.5, 1.8, 3], look: [0, 1.2, -1.5] },
      { t: 11.2, pos: [0, 2.8, 2.4], look: [0, 2.6, -6], fov: 55 },
      { t: 16.4, pos: [0, 2.6, 0.2], look: [0, 2.7, -6], fov: 55 },
      { t: 16.8, pos: [-4.5, 1.6, 4.5], look: [-1, 1.2, -1] },
      { t: 21, pos: [3.5, 1.7, 4.2], look: [0, 1.4, -1.5] },
      { t: 21.3, pos: [0, 2.7, 1.8], look: [0, 2.7, -6], fov: 55 },
      { t: 24.5, pos: [0, 2.9, 2.6], look: [0, 2.5, -6], fov: 55 },
      { t: 26.6, pos: [5.5, 4.6, 5.2], look: [0, 0.3, -1], fov: 50 },
      { t: 31.4, pos: [-5.5, 4.4, 5], look: [0, 0.3, -1] },
      { t: 32, pos: [1.6, 1.8, 2.4], look: [0, 2.2, -5], fov: 55 },
      { t: 37, pos: [1.2, 1.5, 0.5], look: [0.2, 1.6, -3.6], fov: 55 },
    ]);
    ctx.shake(CRASH1, 0.15, 0.8);
    ctx.flash(CRASH1, "#ff2244", 0.5);
  },
};
export default scene;

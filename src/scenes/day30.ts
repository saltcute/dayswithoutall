// Day 30: The Flicker. Season finale. Every screen boots, the logo appears,
// everyone lines up… MAINTENANCE EXTENDED. They fall like dominoes.
import * as THREE from "three";
import { easeOut, lerp, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { TextTexture } from "../engine/textTexture";
import { Player } from "../kit/characters";
import { cabinet, type CabKind } from "../kit/cabinets";
import { arcadeInterior, setupWorld } from "../kit/environments";
import { card, cardboardBox } from "../kit/props";
import { cjkFonts, trAuto } from "../i18n";

function tbcCard() {
  const tt = new TextTexture(768, 160);
  tt.paint((c, W, H) => {
    c.clearRect(0, 0, W, H);
    c.fillStyle = "#3b2a1a";
    c.beginPath();
    c.moveTo(10, 30);
    c.lineTo(W - 120, 30);
    c.lineTo(W - 120, 8);
    c.lineTo(W - 8, H / 2);
    c.lineTo(W - 120, H - 8);
    c.lineTo(W - 120, H - 30);
    c.lineTo(10, H - 30);
    c.closePath();
    c.fill();
    c.strokeStyle = "#f2d38a";
    c.lineWidth = 6;
    c.stroke();
    c.fillStyle = "#f2d38a";
    c.font = "italic 900 62px 'Arial Black', Impact, " + cjkFonts() + ", sans-serif";
    c.textAlign = "left";
    c.textBaseline = "middle";
    c.fillText(trAuto("TO BE CONTINUED"), 36, H / 2 + 2);
  });
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.96, 0.2),
    new THREE.MeshBasicMaterial({ map: tt.texture, transparent: true, depthTest: false, depthWrite: false }),
  );
  m.renderOrder = 999;
  return m;
}

const scene: SceneDef = {
  duration: 42,
  build(ctx) {
    const { scene, sfx, camera } = ctx;
    const world = setupWorld(ctx, { sky: 0x05030c, ground: 0x110a1a, hemi: 0.5, sun: 0x6070c0, sunIntensity: 0.3, sunPos: [3, 10, 6] });
    const room = arcadeInterior(ctx, { w: 14, d: 10, neon: "GAME CENTER", decay: 0.3 });
    const r = rng(3001);

    const kinds: CabKind[] = ["round", "slider", "round", "lever", "slider", "lever"];
    const cabs = kinds.map((k, i) => {
      const c = cabinet(k);
      c.group.position.set((i - 2.5) * 1.75, 0, -4.1);
      c.setScreen("off");
      scene.add(c.group);
      return c;
    });
    const QX = cabs[2].group.position.x; // the chosen cabinet
    for (let i = 0; i < 12; i++) {
      const c = card();
      c.position.set(r.range(-5, 5), 0.01, r.range(-3, 4));
      c.rotation.y = r.range(0, 3);
      scene.add(c);
    }
    // a calendar with 30 days crossed out
    const cal = new TextTexture(256, 256);
    cal.paint((c, W, H) => {
      c.fillStyle = "#fffbe6";
      c.fillRect(0, 0, W, H);
      c.fillStyle = "#c1121f";
      c.fillRect(0, 0, W, 50);
      c.fillStyle = "#fff";
      c.font = "900 32px " + cjkFonts() + ", sans-serif";
      c.textAlign = "center";
      c.fillText(trAuto("DAYS"), W / 2, 36);
      c.strokeStyle = "#c1121f";
      c.lineWidth = 4;
      for (let i = 0; i < 30; i++) {
        const x = 18 + (i % 6) * 38, y = 70 + Math.floor(i / 6) * 36;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + 26, y + 26);
        c.moveTo(x + 26, y);
        c.lineTo(x, y + 26);
        c.stroke();
      }
    });
    const calM = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: cal.texture }));
    calM.position.set(-6.88, 2.2, -1);
    calM.rotation.y = Math.PI / 2;
    scene.add(calM);

    // Players: asleep around the room, later a queue in front of cabinet #3
    const N = 8;
    const qz = (i: number) => -2.85 + i * 0.95;
    const qx = (i: number) => QX + (i % 2 ? 0.22 : -0.22);
    // sleepers keep their distance from each other: odd ones lie down (body ~1.8 m
    // behind the feet, arms flopped out), even ones sit with their legs forward
    const sleepBody = (i: number, [x, z, ry]: [number, number, number]): [number, number, number] =>
      i % 2 ? [x - Math.sin(ry) * 0.85, z - Math.cos(ry) * 0.85, 1.0] : [x + Math.sin(ry) * 0.25, z + Math.cos(ry) * 0.25, 0.6];
    const sleepSpots: [number, number, number][] = [];
    for (let i = 0; i < N; i++) {
      let spot: [number, number, number] = [0, 0, 0];
      for (let tries = 0; tries < 60; tries++) {
        spot = [r.range(-5.5, 5.5), r.range(-2.4, 3.8), r.range(0, Math.PI * 2)];
        const [cx, cz, cr] = sleepBody(i, spot);
        // nobody sleeps where the queue will form
        if (Math.abs(spot[0] - QX) < 1.5 || Math.abs(cx - QX) < cr + 0.5) continue;
        if (sleepSpots.every((o, j) => {
          const [ox, oz, or] = sleepBody(j, o);
          return Math.hypot(cx - ox, cz - oz) > cr + or + 0.1;
        })) break;
      }
      sleepSpots.push(spot);
    }
    // boxes stay off the queue (and where it falls over), the sleepers and their run to it
    const segDist = (x: number, z: number, x0: number, z0: number, x1: number, z1: number) => {
      const dx = x1 - x0, dz = z1 - z0;
      const k = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / (dx * dx + dz * dz || 1)));
      return Math.hypot(x - x0 - dx * k, z - z0 - dz * k);
    };
    // runners come up beside the queue on their own side and step into place,
    // instead of cutting straight through people already standing in it
    const side = (i: number) => (sleepSpots[i][0] >= QX ? 1 : -1);
    const wpx = (i: number) => QX + side(i) * 1.0;
    const boxOk = (x: number, z: number) =>
      Math.abs(x - QX) > 2.6 &&
      sleepSpots.every(([sx, sz], i) => Math.hypot(x - sx, z - sz) > 2.1 && segDist(x, z, sx, sz, wpx(i), qz(i)) > 0.9);
    for (let i = 0; i < 5; i++) {
      const b = cardboardBox(r.range(0.4, 0.7), r.range(0.3, 0.5), 0.5);
      for (let tries = 0; tries < 60; tries++) {
        b.position.set(r.range(-6, 6), 0, r.range(1.5, 4.5));
        if (boxOk(b.position.x, b.position.z)) break;
      }
      b.rotation.y = r.range(0, 2);
      if (boxOk(b.position.x, b.position.z)) scene.add(b);
    }
    const players = Array.from({ length: N }, (_, i) => {
      const p = new Player({ hairStyle: (["twin", "cap", "spiky", "long", "short", "bun", "mohawk", "short"] as const)[i], accessories: i % 3 === 0 ? ["gloves"] : i % 3 === 1 ? ["backpack"] : ["towel", "glasses"] }, 3010 + i);
      scene.add(p.root);
      return p;
    });
    const tbc = tbcCard();
    scene.add(tbc);

    sfx.ambient("arcadeDead", 0.6);

    const sepia = new THREE.Color(0xd9a066), cool = new THREE.Color(0x5a64a8), party = new THREE.Color(0xffc0f0);
    // 0-5 dark | 5-9 flicker + boot | 9.5 logo | 10-13 wake | 13-19.5 queue | 20.5 swipe
    // 21.5 MAINTENANCE EXTENDED | 23.5 dominoes | 28-35 aftermath | 35-42 to be continued
    ctx.update((t) => {
      // lights
      const flick = t > 5 && t < 9 ? (Math.sin(t * 37) + Math.sin(t * 23) > 0.6 ? 1 : 0) : 0;
      const on = (t >= 9 && t < 22) || flick === 1;
      const lc = t >= 9 && t < 22 ? 0xf0f0ff : flick ? 0xc0c0d0 : 0x1a1a24;
      room.ceilingLights.forEach((l) => (l.material as THREE.MeshBasicMaterial).color.setHex(lc));
      room.neon.visible = (t > 9.5 && t < 22) || (t > 5 && flick === 1);
      const sep = smooth(seg(t, 34.5, 35.5));
      room.lamp.intensity = on ? 9 : t > 22 ? lerp(6.5, 7, sep) : 3.5;
      room.lamp.color.copy(on && t >= 9 ? party : cool).lerp(sepia, sep);
      world.hemi.intensity = on ? 0.9 : lerp(0.65, 0.85, sep);
      world.hemi.color.copy(cool).lerp(sepia, sep);

      // screens
      cabs.forEach((c, i) => {
        if (t < 5.5 + i * 0.25) c.setScreen("off");
        else if (t < 9.5) c.setScreen("boot", ["BOOTING…", "▮".repeat(Math.min(8, Math.floor((t - 5.5 - i * 0.25) * 2.4))).padEnd(8, "▯")]);
        else if (t < 21.5) c.setScreen("logo");
        else if (t < 21.9) c.setScreen("custom", "▓▒░▒▓▒░", { bg: "#000", fg: "#fff", size: 60 });
        else c.setScreen("custom", ["MAINTENANCE", "EXTENDED", "", "see you… later"], { bg: "#1a1400", fg: "#ffcc00", size: 34 });
        const dim = t > 22.3 ? 0.55 : 1;
        c.screenMat.color.setRGB(dim * lerp(1, 1, sep), dim * lerp(1, 0.75, sep), dim * lerp(1, 0.45, sep));
      });

      // players
      players.forEach((p, i) => {
        const [sx, sz, sr] = sleepSpots[i];
        const wake = t > 10.2 + i * 0.15;
        const k = smooth(seg(t, 12.6 + i * 0.25, 15.4 + i * 0.3));
        const fall = easeOut(seg(t, 23.5 + i * 0.38, 24.1 + i * 0.38));
        if (!wake) {
          p.root.position.set(sx, 0, sz);
          p.root.rotation.y = sr;
          p.pose(i % 2 ? "lie" : "sitFloor", t);
          if (i % 2 === 0) p.head.rotation.x = 0.6;
          if (t > 6 && t < 10.2) p.head.rotation.x = i % 2 ? -0.2 : 0.1; // stirring
        } else if (t < 12.6 + i * 0.25) {
          p.root.position.set(sx, 0, sz);
          p.face(QX, -4.1);
          p.pose("cheer", t, 1);
        } else if (k < 1) {
          const l1 = Math.hypot(wpx(i) - sx, qz(i) - sz), l2 = Math.abs(wpx(i) - qx(i));
          const k1 = l1 / (l1 + l2);
          if (k < k1) p.travel(sx, sz, wpx(i), qz(i), k / k1);
          else p.travel(wpx(i), qz(i), qx(i), qz(i), (k - k1) / (1 - k1));
          p.pose("run", t);
        } else {
          p.root.position.set(qx(i), 0, qz(i));
          // on the shock, everyone half-turns away from the line, so the
          // dominoes land in a herringbone instead of on top of each other
          p.root.rotation.y = Math.PI + (i % 2 ? 1 : -1) * 0.75 * smooth(seg(t, 21.7, 22.6));
          if (t < 21.5) {
            p.pose(i === 0 && t > 20 ? "reach" : "idle", t, 1);
            if (i > 0) p.body.position.y = Math.abs(Math.sin(t * 5 + i)) * 0.06; // bouncing with excitement
          } else if (fall <= 0) {
            p.pose("stop", t);
            p.head.rotation.x = -0.1;
          } else p.pose("faint", t, fall);
        }
      });

      // TO BE CONTINUED card, pinned to the camera
      tbc.visible = t > 35;
      if (tbc.visible) {
        const slide = easeOut(seg(t, 35, 35.8));
        tbc.position.copy(camera.position);
        tbc.quaternion.copy(camera.quaternion);
        tbc.translateZ(-1.2);
        tbc.translateX(lerp(-1.6, -0.12, slide));
        tbc.translateY(-0.12);
      }
    });

    // --- Sound ---
    ctx.at(4.8, () => sfx.glitch(0.4));
    ctx.at(6, () => sfx.bootJingle());
    ctx.at(7.5, () => sfx.glitch(0.3));
    ctx.at(9.5, () => sfx.stopAmbient("arcadeDead"));
    ctx.at(9.6, () => sfx.fanfare());
    ctx.at(10.4, () => sfx.crowdGasp());
    ctx.at(11, () => sfx.cheer(3.5));
    ctx.at(11.5, () => sfx.ambient("crowd", 0.4));
    for (let s = 0; s < 14; s++) ctx.at(12.7 + s * 0.22, () => sfx.footstep(((s % 3) - 1) * 0.4));
    ctx.at(20.5, () => sfx.cardSwipe());
    ctx.at(21.2, () => sfx.stopAmbient("crowd"));
    ctx.at(21.5, () => sfx.glitch(0.8));
    ctx.at(22.2, () => sfx.powerDown());
    ctx.at(22.6, () => sfx.errorBeep(2));
    for (let i = 0; i < N; i++) ctx.at(23.9 + i * 0.38, () => sfx.thud());
    ctx.at(27.3, () => sfx.sadTrombone());
    ctx.at(29, () => sfx.ambient("droneSad", 0.3));
    ctx.at(35, () => sfx.dunDunDun());
    ctx.at(41.8, () => sfx.stopAmbient("droneSad"));

    // --- Narration ---
    ctx.caption(0.6, "Day 30. One month. The arcade sleeps. So do its last residents.", 4.4);
    ctx.caption(5.4, "Then, at 4:12 AM, a flicker.", 3.6);
    ctx.caption(9.8, "The logo. THE LOGO. Or at least a generic, legally distinct one.", 3.8);
    ctx.caption(14, "Thirty days of chaos, and the queue forms in seconds. Nobody cuts. Civilization is back.", 5.6);
    ctx.caption(22.4, "MAINTENANCE EXTENDED.", 2.4);
    ctx.caption(25, "They fell exactly as they had queued: in order, and with respect.", 4.5);
    ctx.caption(30, "Will ALL.Net return? Will the players ever stand again? Will the logo come back?", 5);
    ctx.caption(36, "To be continued…", 5.5);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [4.5, 2.6, 5.5], look: [0, 0.6, 0] },
      { t: 5, pos: [3, 2.2, 3.5], look: [-0.5, 1.2, -3] },
      { t: 8.8, pos: [QX + 0.2, 1.6, -1.8], look: [QX, 1.45, -4.1], fov: 45 },
      { t: 10.2, pos: [QX + 0.1, 1.5, -2.1], look: [QX, 1.45, -4.1], fov: 45 },
      { t: 11, pos: [0, 3.2, 4.8], look: [0, 0.8, -1] },
      { t: 13, pos: [-4, 2.6, 4.5], look: [QX, 1, -1] },
      { t: 19.5, pos: [4.6, 1.8, 2.8], look: [QX, 1.1, -1] },
      { t: 21.3, pos: [QX + 0.7, 1.8, -1.0], look: [QX, 1.4, -4.1], fov: 50 },
      { t: 22.8, pos: [QX + 0.8, 1.9, -0.7], look: [QX, 1.4, -4.1], fov: 50 },
      { t: 23.3, pos: [4.8, 1.6, 0.2], look: [QX, 0.7, 0.4], fov: 58 },
      { t: 28, pos: [4.8, 1.8, 0.6], look: [QX, 0.5, 0.6], fov: 58 },
      { t: 34.5, pos: [3.8, 3.2, 4.2], look: [QX, 0.3, 0.6], fov: 55 },
      { t: 42, pos: [3.6, 3.3, 4.0], look: [QX, 0.3, 0.6], fov: 55 },
    ]);
    ctx.flash(9.5, "#ffffff", 0.5);
    ctx.flash(21.5, "#ffcc00", 0.4);
    ctx.shake(21.5, 0.08, 0.5);
    ctx.flash(35, "#d9a066", 0.6);
  },
};
export default scene;

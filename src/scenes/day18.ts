// Day 18: Exodus. A caravan of players (one cabinet carried on shoulders)
// crosses the dunes at sunset toward a sign: "THE SERVER →". Then the wind
// spins the arrow.
import * as THREE from "three";
import { box, mat, mesh } from "../engine/materials";
import { lerp, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { textPlane } from "../engine/textTexture";
import { Player, type PlayerOpts } from "../kit/characters";
import { cabinet } from "../kit/cabinets";
import { banner, cactus, rock, tumbleweed } from "../kit/props";
import { setupWorld } from "../kit/environments";

/** Dune height (analytic so walkers can stand on it). */
const dune = (x: number, z: number) =>
  0.8 * Math.sin(x * 0.16 + z * 0.06) + 0.55 * Math.sin(z * 0.19 - x * 0.1) + 0.25 * Math.sin(x * 0.45 + z * 0.33) + 0.8;
/** Caravan path (x as a function of z). */
const pathX = (z: number) => 1.6 * Math.sin(z * 0.12);

const SPEED = 0.7, Z0 = 10.25, SIGN_Z = -10, GAP = 1.3, ARRIVE = 27.5;

const scene: SceneDef = {
  duration: 38,
  build(ctx) {
    const { scene, sfx } = ctx;
    setupWorld(ctx, {
      sky: 0xf29e6d, fog: [30, 120], ground: 0x8a4a3a, hemi: 0.8,
      sun: 0xffa060, sunIntensity: 2.4, sunPos: [-6, 3.2, -30], shadowSize: 22,
    });
    const r = rng(1818);

    // Sky dressing: low sun + sky band
    const sun = mesh(new THREE.CircleGeometry(7, 20), new THREE.MeshBasicMaterial({ color: 0xfff0b0, fog: false }), false, false);
    sun.position.set(-18, 9, -140);
    scene.add(sun);

    // Dunes
    const geo = new THREE.PlaneGeometry(240, 240, 96, 96);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, dune(pos.getX(i), pos.getZ(i)));
    geo.computeVertexNormals();
    scene.add(mesh(geo, mat(0xe0a868), false, true));
    const ground = (o: THREE.Object3D, x: number, z: number, dy = 0) => o.position.set(x, dune(x, z) + dy, z);

    for (let i = 0; i < 9; i++) {
      const c = cactus(r.range(1.2, 2.2));
      const z = r.range(-30, 20), x = pathX(z) + r.sign() * r.range(4, 14);
      ground(c, x, z);
      c.rotation.y = r.range(0, 6);
      scene.add(c);
    }
    for (let i = 0; i < 12; i++) {
      const k = rock(r.range(0.3, 0.9), 180 + i, 0xb07a52);
      const z = r.range(-40, 25), x = pathX(z) + r.sign() * r.range(3, 16);
      ground(k, x, z, k.position.y);
      scene.add(k);
    }
    // a skull-ish bleached cabinet half-buried (previous pilgrims)
    const old = cabinet("slider");
    old.setScreen("off");
    ground(old.group, -6.5, -6, -0.6); // across the path, clear of the closing camera move
    old.group.rotation.set(0.4, -0.6, 0.25);
    scene.add(old.group);
    // distant mirage of a grey block on the horizon
    const far = box(30, 9, 12, 0x9b7b8c, -26, 4, -95);
    far.castShadow = false;
    scene.add(far);
    const tw = tumbleweed();
    scene.add(tw);

    // The sign
    const signG = new THREE.Group();
    signG.add(box(0.18, 4.2, 0.18, 0x6b4423, 0, 2.1, 0));
    const title = textPlane("THE SERVER", 2.6, 0.7, { bg: "#f4ecd8", fg: "#2b2b2b", size: 70, border: "#6b4423", borderWidth: 10 });
    title.position.set(0, 3.7, 0.1);
    signG.add(title);
    const arrow = new THREE.Group();
    arrow.position.set(0, 2.7, 0.12);
    const arrowM = mat(0xc1121f);
    arrow.add(box(1.6, 0.36, 0.08, arrowM, 0.8, 0, 0));
    const head = mesh(new THREE.ConeGeometry(0.42, 0.6, 3), arrowM);
    head.rotation.z = -Math.PI / 2;
    head.position.x = 1.85;
    arrow.add(head);
    signG.add(arrow);
    ground(signG, pathX(SIGN_Z) + 1.6, SIGN_Z);
    scene.add(signG);

    // --- Caravan ---
    type Walker = { p: Player; idx: number; lat: number };
    const walkers: Walker[] = [];
    const shirts = [0xe63946, 0x3a86ff, 0x06d6a0, 0xffd166, 0x8e44ad, 0xfb5607, 0xff70a6, 0x2a9d8f];
    let idx = 0;
    const mk = (lat: number, extra: PlayerOpts = {}) => {
      const n = Math.round(idx); // idx may be fractional (the bearers)
      const p = new Player({ shirt: shirts[n % shirts.length], accessories: ["backpack", n % 3 === 0 ? "towel" : "gloves"], ...extra }, 1800 + walkers.length);
      scene.add(p.root);
      walkers.push({ p, idx, lat });
      return p;
    };
    // leader with a banner
    const leader = mk(0, { accessories: ["backpack", "headband"], hairStyle: "spiky" });
    const flag = banner("ALL.NET OR BUST", "#1d3557", 0.9, 0.9);
    flag.scale.setScalar(0.9);
    leader.handL.add(flag); // the pole runs through the left fist (kept upright in update)
    idx++;
    mk(0.3); idx++;
    mk(-0.3); idx++;
    // the cabinet bearers: four in single file, right underneath it
    const bearerIdx = idx + 0.5;
    const bearers: Player[] = [];
    const BEARER_OFF = [-0.84, -0.28, 0.28, 0.84]; // in caravan slots (×GAP): ~0.73 m apart, all under the cabinet
    for (const off of BEARER_OFF) {
      idx = bearerIdx + off;
      bearers.push(mk(0));
    }
    idx = Math.round(bearerIdx + 1.5);
    for (let i = 0; i < 6; i++) {
      mk(i % 2 ? 0.35 : -0.35);
      idx++;
    }
    const litter = new THREE.Group();
    litter.rotation.order = "YXZ"; // yaw along the path, then pitch with the dunes
    const cab = cabinet("round");
    cab.setScreen("error");
    cab.group.rotation.x = -Math.PI / 2;
    cab.group.position.set(0, 0, 1.15);
    const roll = new THREE.Group(); // screen faces sideways, toward the camera
    roll.rotation.z = -Math.PI / 2;
    roll.add(cab.group);
    litter.add(roll);
    scene.add(litter);

    const along = (s: number) => {
      const z = Z0 - s;
      return { x: pathX(z), z };
    };
    const heading = (z: number) => Math.atan2(pathX(z - 0.1) - pathX(z), -0.1);

    sfx.ambient("desert", 0.9);

    ctx.update((t) => {
      const lead = SPEED * Math.min(t, ARRIVE);
      const moving = t < ARRIVE;
      // arrow: wind spins it at 30.6 and again at 33.6
      const flip = smooth(seg(t, 30.4, 31.2)) - smooth(seg(t, 33.4, 34.2)) + smooth(seg(t, 35.6, 36.2));
      arrow.rotation.y = flip * Math.PI + Math.sin(t * 7) * 0.04 * (flip % 1 ? 1 : 0.3);
      const dirX = Math.cos(arrow.rotation.y) > 0 ? 1 : -1;

      walkers.forEach(({ p, idx: wi, lat }) => {
        const s = lead - wi * GAP;
        const { x, z } = along(s);
        const hd = heading(z);
        const px = x + Math.cos(hd) * lat, pz = z - Math.sin(hd) * lat;
        p.root.position.set(px, dune(px, pz), pz);
        p.root.rotation.y = hd;
        if (moving) p.pose("walk", t * 0.9);
        else if (t < 30.4) {
          p.pose(wi === 0 ? "point" : "idle", t);
          p.head.rotation.x = -0.25;
        } else if (t < 35.6) {
          // follow the arrow, confused (the bearers can only turn their heads)
          if (!bearers.includes(p)) p.root.rotation.y = dirX > 0 ? Math.PI / 2 : -Math.PI / 2;
          const n = Math.round(wi);
          p.pose(n % 3 === 0 ? "facepalm" : n % 3 === 1 ? "point" : "idle", t);
        } else {
          // sit facing sideways (toward the camera) so nobody's legs go into the person ahead
          p.root.rotation.y = Math.PI / 2;
          p.pose("sitFloor", t);
          p.armL.rotation.z = -0.12; // hug the knees (keeps elbows off the neighbours)
          p.armR.rotation.z = 0.12;
        }
      });
      // bearers hold the cabinet overhead, both fists under it
      bearers.forEach((p) => {
        if (t < 35.6) {
          p.armL.rotation.set(-3.0, 0, -0.08);
          p.armR.rotation.set(-3.0, 0, 0.08);
          if (t > 30.4) p.head.rotation.y = -dirX * 1.1; // the caravan heads along -Z, so +x is to their right
        }
      });
      // leader: pole held upright in the left fist, hand a little forward
      if (t < 35.6) leader.armL.rotation.set(-0.45, 0, 0);
      const la = leader.armL.rotation.x;
      flag.rotation.set(-la, Math.sin(t * 2) * 0.2, 0);
      flag.position.set(0, -0.62 * Math.cos(la), 0.62 * Math.sin(la));
      const cs = lead - bearerIdx * GAP;
      const c = along(cs);
      const sitting = t > 35.6;
      // pitch the cabinet to follow the ground under the front and rear bearers
      const f = along(cs + BEARER_OFF[3] * GAP), b = along(cs + BEARER_OFF[0] * GAP);
      const hF = dune(f.x, f.z), hB = dune(b.x, b.z);
      // carried: underside (0.475 below the litter origin) resting on the raised fists (gloves top out at ~2.06);
      // set down: on the sand just behind the seated bearers
      const lx = sitting ? c.x - 1.0 : c.x;
      litter.position.set(lx, sitting ? dune(lx, c.z) + 0.5 : (hF + hB) / 2 + 2.54 + (moving ? Math.abs(Math.sin(t * 0.9 * 7.5)) * 0.05 : 0), c.z);
      litter.rotation.y = heading(c.z) + Math.PI;
      litter.rotation.x = sitting ? 0 : Math.atan2(hF - hB, Math.hypot(f.x - b.x, f.z - b.z));
      litter.rotation.z = moving ? Math.sin(t * 3.1) * 0.03 : 0;
      cab.setScreen("error");

      // tumbleweed rolls across
      const tk = seg(t, 18, 27);
      const twx = lerp(-14, 14, tk), twz = -7.5 - tk * 3; // crosses the path ahead of the leader
      tw.position.set(twx, dune(twx, twz) + 0.4 + Math.abs(Math.sin(t * 4)) * 0.3, twz);
      tw.rotation.z = -t * 3;
    });

    // --- Sound ---
    for (let s = 0.3; s < ARRIVE; s += 0.55) ctx.at(s, () => sfx.footstep(Math.sin(s * 3) * 0.5));
    ctx.at(2, () => sfx.mumble(1.4, 1));
    ctx.at(9, () => sfx.mumble(1.2, 0.8));
    ctx.at(12.5, () => sfx.noise(1.5, { type: "lowpass", freq: 300, gain: 0.15 })); // grunt of effort
    ctx.at(13.2, () => sfx.moan(1.3));
    ctx.at(22, () => sfx.ambient("droneHoly", 0.3));
    ctx.at(ARRIVE, () => sfx.fanfare());
    ctx.at(ARRIVE + 0.4, () => sfx.cheer(1.6));
    ctx.at(30.2, () => sfx.whoosh(1.2));
    ctx.at(30.6, () => sfx.noise(0.6, { type: "bandpass", freq: 500, q: 6, gain: 0.25, slideFreqTo: 900 })); // creak
    ctx.at(31.4, () => sfx.crowdGasp());
    ctx.at(33.2, () => sfx.whoosh(1.2));
    ctx.at(33.6, () => sfx.noise(0.6, { type: "bandpass", freq: 900, q: 6, gain: 0.25, slideFreqTo: 500 }));
    ctx.at(35.4, () => sfx.whoosh(0.8));
    ctx.at(35.8, () => sfx.sadTrombone());
    ctx.at(37.9, () => sfx.stopAmbient("droneHoly"));

    // --- Narration ---
    ctx.caption(0.8, "Day 18. If the server will not come back to them, they will go to it.", 5);
    ctx.caption(6.2, "They pack light: water, snacks, gloves, and one cabinet, for emotional support.", 5);
    ctx.caption(11.8, "The cabinet weighs two hundred kilos. Nobody suggested leaving it.", 4.6);
    ctx.caption(17, "Hour six. Morale is high. Water is not.", 4);
    ctx.caption(21.8, "Legends speak of a sign at the edge of the dunes.", 4.4);
    ctx.caption(27.6, "They found it.", 2.6);
    ctx.caption(30.6, "Then the wind changed. So, apparently, did the server's location.", 4.8);
    ctx.caption(35.6, "They will wait for the wind to make up its mind.", 2.4);

    // --- Camera ---
    const sx = pathX(SIGN_Z), sy = dune(sx, SIGN_Z);
    ctx.cameraPath([
      { t: 0, pos: [16, 7, 22], look: [0, 1.5, 8] },
      { t: 5.8, pos: [9, 3, 12], look: [0, 1.8, 6] },
      { t: 6.2, pos: [3, 2.3, 20], look: [0, 2, -8] },
      { t: 11.6, pos: [2, 2.8, 14], look: [0, 2, -8] },
      { t: 12, pos: [8.5, dune(8.5, 4.8) + 2.2, 4.8], look: [0, dune(0, 6.4) + 1.9, 6.4], fov: 40 },
      { t: 16.8, pos: [8.5, dune(8.5, 2) + 2.2, 2.0], look: [0, dune(0, 3) + 1.9, 3.0], fov: 40 },
      { t: 17.2, pos: [13, 9, 4], look: [0, 0.5, 4], fov: 50 },
      { t: 21.6, pos: [12, 8, -2], look: [0, 0.5, 0] },
      { t: 22, pos: [3.5, 5, 7], look: [0, 1.5, -12] },
      { t: 27.4, pos: [3, 5, 3], look: [0, 2, -12] },
      { t: 28.2, pos: [5.5, sy + 2.4, SIGN_Z + 6], look: [sx, sy + 2.2, SIGN_Z], fov: 50 },
      { t: 35.5, pos: [6, sy + 2.6, SIGN_Z + 7], look: [sx, sy + 2, SIGN_Z + 1] },
      { t: 38, pos: [8, sy + 4, SIGN_Z + 10], look: [sx, sy + 1.5, SIGN_Z + 2] },
    ]);
  },
};
export default scene;

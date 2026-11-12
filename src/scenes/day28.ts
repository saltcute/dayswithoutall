// Day 28: Kaiju. A giant made of discarded arcade cards rises from the
// landfill and stomps on a tiny city… looking for a working cabinet.
import * as THREE from "three";
import { box, glow, mat, mesh } from "../engine/materials";
import { easeOut, lerp, rng, seg, smooth, type Rng } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { textPlane } from "../engine/textTexture";
import { Player } from "../kit/characters";
import { cabinet } from "../kit/cabinets";
import { setupWorld, terrain } from "../kit/environments";
import { CARD_COLORS, card, cardboardBox } from "../kit/props";

const cardGeo = new THREE.BoxGeometry(1, 1, 1);
const stripeGeo = new THREE.BoxGeometry(1.01, 0.3, 0.2).translate(0, 0.38, -0.25);
const cardMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
const stripeMat = new THREE.MeshLambertMaterial({ color: 0xf4f4f4, flatShading: true });

/** A chunk of the monster: n giant card slabs stacked along -Y (or +Y). */
function cardStack(r: Rng, n: number, w: number, d: number, step: number, dir: 1 | -1, start = 0, slabH = 0.42) {
  const g = new THREE.Group();
  const im = new THREE.InstancedMesh(cardGeo, cardMat, n);
  const st = new THREE.InstancedMesh(stripeGeo, stripeMat, n);
  im.castShadow = st.castShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
  const col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    e.set(r.range(-0.08, 0.08), r.range(-0.35, 0.35), r.range(-0.08, 0.08));
    q.setFromEuler(e);
    pos.set(r.range(-0.12, 0.12) * w, start + dir * (i + 0.5) * step, r.range(-0.1, 0.1) * d);
    sc.set(w * r.range(0.9, 1.1), slabH, d * r.range(0.9, 1.1));
    m4.compose(pos, q, sc);
    im.setMatrixAt(i, m4);
    st.setMatrixAt(i, m4);
    im.setColorAt(i, col.setHex(r.pick(CARD_COLORS)));
  }
  g.add(im, st);
  return g;
}

const scene: SceneDef = {
  duration: 40,
  build(ctx) {
    const { scene, sfx } = ctx;
    const world = setupWorld(ctx, { sky: 0xa7a86a, fog: [25, 90], ground: 0x4a3f2a, hemi: 1.0, sun: 0xffd08a, sunIntensity: 1.7, sunPos: [-12, 10, 10], shadowSize: 24 });
    const ground = terrain(160, 44, 1.2, 0x6e6148, 2801, 14);
    scene.add(ground);
    const r = rng(2802);

    // Landfill: mounds of junk and expired cards
    for (let i = 0; i < 14; i++) {
      const m = mesh(new THREE.ConeGeometry(r.range(1.5, 3), r.range(1, 2.4), 6), mat(r.pick([0x5c5040, 0x6b5e4a, 0x7a6a50])));
      const a = r.range(0, Math.PI * 2), d = r.range(6, 15);
      m.position.set(Math.cos(a) * d, 0.3, Math.sin(a) * d * 0.6 + 4);
      scene.add(m);
    }
    for (let i = 0; i < 40; i++) {
      const c = card(r.pick(CARD_COLORS));
      c.position.set(r.range(-9, 9), 0.25, r.range(-4, 12));
      c.rotation.set(r.range(-0.4, 0.4), r.range(0, 3), r.range(-0.4, 0.4));
      c.scale.setScalar(2);
      scene.add(c);
    }
    for (let i = 0; i < 6; i++) {
      const b = cardboardBox(r.range(0.5, 0.9), r.range(0.4, 0.7), 0.6);
      b.position.set(r.range(-7, 7), 0, r.range(2, 11));
      b.rotation.y = r.range(0, 2);
      scene.add(b);
    }
    // The mound it rises from
    const crater = mesh(new THREE.ConeGeometry(4, 1.4, 8), mat(0x4a3f30));
    crater.position.set(0, 0, 0);
    scene.add(crater);

    // Tiny city
    const city = new THREE.Group();
    for (let i = 0; i < 34; i++) {
      const x = r.range(-14, 14), z = r.range(-30, -17);
      if (Math.abs(x - 1.5) < 2 && z > -19) continue;
      const h = r.range(1.5, 5);
      const w = r.range(1, 2.2);
      city.add(box(w, h, w, r.pick([0x8d99ae, 0x6c757d, 0xa5a58d, 0x9a8c98, 0x5e548e]), x, h / 2, z));
      if (r.next() < 0.6) city.add(box(w * 0.5, 0.25, 0.02, glow(0xffe8a3), x, h * 0.7, z + w / 2 + 0.01));
    }
    // the little arcade
    city.add(box(2.6, 2.2, 2, 0x4a4e69, 1.5, 1.1, -17.5));
    const sign = textPlane("GAME CENTER", 2.2, 0.45, { bg: "#14002b", fg: "#ff4fd8", size: 90, border: "#00f5d4", borderWidth: 6 });
    sign.position.set(1.5, 1.85, -16.48);
    city.add(sign);
    scene.add(city);

    // --- The Kaiju ---
    const kaiju = new THREE.Group();
    const hips = new THREE.Group();
    hips.position.y = 4.6;
    kaiju.add(hips);
    const legs = [-1, 1].map((s) => {
      const leg = new THREE.Group();
      leg.position.x = s * 1.0;
      leg.add(cardStack(r, 9, 1.5, 1.2, 0.44, -1));
      const foot = cardStack(r, 2, 1.9, 2.2, 0.44, -1, -3.9);
      foot.position.z = 0.4;
      leg.add(foot);
      hips.add(leg);
      return leg;
    });
    const torso = new THREE.Group();
    hips.add(torso);
    torso.add(cardStack(r, 10, 3.2, 2.0, 0.44, 1));
    const arms = [-1, 1].map((s) => {
      const arm = new THREE.Group();
      arm.position.set(s * 2.1, 4.0, 0);
      arm.add(cardStack(r, 8, 1.0, 1.0, 0.44, -1));
      arm.add(cardStack(r, 2, 1.4, 1.4, 0.44, -1, -3.5));
      const hand = new THREE.Group();
      hand.position.y = -4.2;
      arm.add(hand);
      torso.add(arm);
      return { arm, hand };
    });
    const head = new THREE.Group();
    head.position.y = 4.5;
    head.add(cardStack(r, 4, 2.1, 1.8, 0.44, 1));
    const eyeMat = glow(0xff3322);
    const eyes = [-0.5, 0.5].map((x) => {
      const e = box(0.55, 0.28, 0.1, eyeMat, x, 1.0, 0.95);
      e.castShadow = false;
      head.add(e);
      return e;
    });
    torso.add(head);
    scene.add(kaiju);
    const eyeLight = new THREE.PointLight(0xff3322, 0, 14, 1.4);
    scene.add(eyeLight);

    // The cabinet it finds
    const cab = cabinet("round");
    cab.setScreen("error");
    cab.group.scale.setScalar(1.3);
    scene.add(cab.group);

    // Scavengers
    const N = 5;
    const start: [number, number][] = [[-3.5, 6], [-1.2, 7.5], [1.5, 6.5], [3.6, 7.2], [0.2, 9]];
    const end: [number, number][] = [[-3.6, -5.2], [-2.2, -4.4], [2.2, -4.4], [3.6, -5.2], [0, -3.8]];
    const players = Array.from({ length: N }, (_, i) => {
      const p = new Player({ hairStyle: (["cap", "twin", "spiky", "long", "short"] as const)[i], accessories: i % 2 ? ["backpack", "goggles"] : ["gloves"] }, 2810 + i);
      scene.add(p.root);
      return p;
    });

    sfx.ambient("wind", 0.35);

    const KZ = -11; // where it stops
    const tmp = new THREE.Vector3();
    const sad = new THREE.Color(0x4aa8ff), angry = new THREE.Color(0xff3322);
    // 0-6 scavenging | 6-11 rise | 11 roar | 14-15 turn | 15-22 stomp to city | 22-24 crouch & grab
    // 24-26 turn, inspect | 26 ERROR | 27-31 sits | 31-40 players join it
    ctx.update((t) => {
      // position
      const rise = easeOut(seg(t, 6, 11));
      const walkK = seg(t, 15, 22);
      kaiju.position.set(0, lerp(-12, 0, rise), lerp(0, KZ, walkK));
      const turn1 = smooth(seg(t, 13.5, 15));
      const turn2 = smooth(seg(t, 24, 25.8));
      kaiju.rotation.y = lerp(0, Math.PI, turn1) - Math.PI * turn2 * 1;
      const crouch = smooth(seg(t, 22, 23)) * (1 - smooth(seg(t, 24, 25)));
      const sit = smooth(seg(t, 27.5, 30));
      // walking cycle
      const walking = walkK > 0 && walkK < 1;
      const ph = (t - 15) * Math.PI; // one step per second
      legs[0].rotation.x = walking ? Math.sin(ph) * 0.45 : 0;
      legs[1].rotation.x = walking ? -Math.sin(ph) * 0.45 : 0;
      hips.position.y = 4.6 + (walking ? Math.abs(Math.cos(ph)) * 0.3 : 0) - crouch * 1.6 - sit * 4.0;
      legs.forEach((l) => (l.rotation.x += -crouch * 0.9 - sit * 1.45));
      torso.rotation.x = crouch * 0.7 + (walking ? 0.12 : 0) + sit * 0.15 - (t > 10 && t < 12.5 ? 0.25 : 0);
      torso.rotation.z = walking ? Math.sin(ph) * 0.06 : Math.sin(t * 0.8) * 0.03;
      // arms
      const reach = smooth(seg(t, 22, 23.2));
      const lift = smooth(seg(t, 24, 25.5));
      const lower = smooth(seg(t, 28, 30));
      const roarArms = t > 10.5 && t < 13 ? smooth(seg(t, 10.5, 11.2)) * (1 - smooth(seg(t, 12.4, 13))) : 0;
      arms[0].arm.rotation.set(walking ? -Math.sin(ph) * 0.4 : -roarArms * 2.4, 0, -0.1 - roarArms * 0.4);
      arms[1].arm.rotation.set(walking ? Math.sin(ph) * 0.4 : lerp(lerp(-roarArms * 2.4, -1.3 * reach, reach), -1.75, lift) + lower * 0.85, 0, 0.1 + roarArms * 0.4 - lift * 0.35 + lower * 0.2);
      head.rotation.x = t > 25 ? 0.15 + sit * 0.35 : t > 10.5 && t < 12.5 ? -0.4 : 0;
      head.rotation.y = t > 30 ? Math.sin(t * 0.5) * 0.15 : 0;
      // eyes
      const gloom = smooth(seg(t, 26.5, 28));
      eyeMat.color.copy(angry).lerp(sad, gloom);
      eyeLight.color.copy(eyeMat.color);
      eyes.forEach((e) => (e.scale.y = gloom > 0.5 ? 0.55 : 1));
      head.getWorldPosition(tmp);
      eyeLight.position.set(tmp.x, tmp.y + 1, tmp.z + 2.5 * Math.cos(kaiju.rotation.y));
      eyeLight.intensity = rise > 0.3 ? 30 : 0;

      // cabinet: in the arcade, then in its hand
      if (t < 23.2) {
        cab.group.position.set(1.5, 0, -17.4);
        cab.group.visible = false;
        cab.group.rotation.set(0, 0, 0);
      } else {
        cab.group.visible = true;
        arms[1].hand.getWorldPosition(tmp);
        cab.group.position.set(tmp.x, tmp.y - 0.4, tmp.z + (t > 24.5 ? 0.6 : 0));
        cab.group.rotation.set(0, kaiju.rotation.y, 0);
        if (sit > 0.6) cab.group.position.y = Math.max(cab.group.position.y, 0);
      }
      cab.setScreen(t > 25.8 ? "error" : "off");

      // players
      players.forEach((p, i) => {
        const [sx, sz] = start[i];
        const [ex, ez] = end[i];
        if (t < 6) {
          p.root.position.set(sx, 0, sz);
          p.face(sx * 0.3, 0);
          p.pose("dig", t + i);
        } else if (t < 11.2) {
          p.root.position.set(sx, 0, sz);
          p.face(0, 0);
          p.pose(i % 2 ? "stop" : "point", t);
          p.head.rotation.x = -0.4 * rise;
        } else if (t < 31) {
          const k = smooth(seg(t, 11.2 + i * 0.1, 15 + i * 0.1));
          const hx = sx * 1.6, hz = sz + 7;
          p.travel(sx, sz, hx, hz, k);
          if (k < 1) p.pose("run", t);
          else {
            p.face(0, KZ);
            p.pose(t > 26 ? "sad" : "huddle", t);
            if (t > 26) p.head.rotation.x = -0.3;
          }
        } else {
          const k = smooth(seg(t, 31 + i * 0.3, 36 + i * 0.3));
          p.travel(sx * 1.6, sz + 7, ex, ez, k);
          if (k < 1) p.pose("walk", t);
          else {
            p.face(0, KZ + 1);
            p.root.rotation.y += Math.PI;
            p.pose("sitFloor", t);
            p.head.rotation.x = -0.15;
            if (i === 4) p.face(0, KZ + 3);
          }
        }
      });

      world.sun.intensity = 1.7 - smooth(seg(t, 26, 32)) * 0.5;
    });

    // --- Sound ---
    ctx.at(0.5, () => sfx.crumple());
    ctx.at(3, () => sfx.crumple());
    ctx.at(6, () => sfx.ambient("droneTense", 0.4));
    ctx.at(6.2, () => sfx.thunder());
    ctx.at(8.5, () => sfx.boom());
    ctx.at(10.8, () => sfx.roar());
    ctx.at(11.4, () => sfx.scream());
    for (let s = 15.5; s < 22; s += 1) ctx.at(s, () => sfx.stomp());
    ctx.at(22.3, () => sfx.crumple());
    ctx.at(22.9, () => sfx.stopAmbient("droneTense"));
    ctx.at(25.9, () => sfx.buzzer());
    ctx.at(26.3, () => sfx.errorBeep(3));
    ctx.at(27.5, () => sfx.sadTrombone());
    ctx.at(29.8, () => sfx.boom());
    ctx.at(31, () => sfx.ambient("droneSad", 0.3));
    ctx.at(36, () => sfx.moan(0.4));
    ctx.at(39.8, () => sfx.stopAmbient("droneSad"));

    // --- Narration ---
    ctx.caption(0.6, "Day 28. The landfill. Final resting place of a million expired arcade cards.", 5);
    ctx.caption(6.3, "Something stirs beneath them.", 3.5);
    ctx.caption(11.4, "It is made of every card ever thrown away. Each one still had credits on it.", 4.6);
    ctx.caption(16.2, "It heads for the city. The city is very small. Budget cuts.", 5);
    ctx.caption(22.3, "But it is not here to destroy. It is searching, like us, for a working cabinet.", 5);
    ctx.caption(28.2, "NETWORK ERROR. It has never felt more like one of us.", 4.4);
    ctx.caption(33.2, "The players sit with it. It can't play either. It fits right in.", 5.5);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [-6, 2.2, 15], look: [0, 1, 6] },
      { t: 5.5, pos: [-3, 1.6, 13], look: [0, 1.5, 3] },
      { t: 6.5, pos: [0, 1.5, 15], look: [0, 4, 0], fov: 60 },
      { t: 11, pos: [0, 1.0, 16], look: [0, 8, 0], fov: 60 },
      { t: 13.5, pos: [8, 3, 18], look: [0, 6, 0], fov: 60 },
      { t: 15.5, pos: [12, 4, 14], look: [0, 5, -4], fov: 60 },
      { t: 21.5, pos: [14, 6, 2], look: [0, 4, -14], fov: 60 },
      { t: 23.5, pos: [9, 4, -4], look: [1, 3, -15], fov: 55 },
      { t: 25.5, pos: [2, 6.5, 2], look: [0, 7, KZ], fov: 50 },
      { t: 27.5, pos: [1.5, 6, 3], look: [0, 6, KZ], fov: 50 },
      { t: 31, pos: [6, 2.5, 8], look: [0, 3, KZ + 2], fov: 60 },
      { t: 36, pos: [0, 1.2, 2.5], look: [0, 3.5, KZ], fov: 62 },
      { t: 40, pos: [-1, 1.4, 4], look: [0, 4, KZ], fov: 62 },
    ]);
    for (let s = 6; s < 11; s += 1) ctx.shake(s, 0.12, 0.8);
    ctx.shake(10.8, 0.35, 1.4);
    ctx.flash(10.8, "#ff3322", 0.3);
    for (let s = 15.5; s < 22; s += 1) ctx.shake(s, 0.25, 0.35);
    ctx.flash(25.9, "#ff3355", 0.25);
    ctx.shake(29.8, 0.2, 0.5);
  },
};
export default scene;

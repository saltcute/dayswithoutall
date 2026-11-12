// Day 26: The Archive. The Historical Society buries a time capsule holding
// a scorecard printout, proof that ratings once existed. Very, very solemnly.
import * as THREE from "three";
import { box, mat, mesh } from "../engine/materials";
import { easeIn, lerp, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { textPlane } from "../engine/textTexture";
import { Player } from "../kit/characters";
import { setupWorld, terrain } from "../kit/environments";
import { rock, tree } from "../kit/props";

function hat(kind: number) {
  const g = new THREE.Group();
  if (kind === 0) {
    g.add(mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.32, 8), mat(0x1b1b1b)));
    g.children[0].position.y = 0.16;
    g.add(mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.03, 10), mat(0x1b1b1b)));
    g.add(box(0.37, 0.05, 0.37, 0x7b2d26, 0, 0.04, 0));
  } else if (kind === 1) {
    const dome = mesh(new THREE.SphereGeometry(0.22, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd8c49a));
    g.add(dome);
    g.add(mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.03, 10), mat(0xc9b285)));
  } else {
    const crown = mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.2, 8), mat(0x5c4033));
    crown.position.y = 0.1;
    g.add(crown, mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 10), mat(0x5c4033)));
    g.add(box(0.39, 0.04, 0.39, 0x222222, 0, 0.03, 0));
  }
  return g;
}

function gravestone(lines: string[], w = 0.8, h = 1.0, color = 0x8d8d8d) {
  const g = new THREE.Group();
  g.add(box(w, h, 0.18, color, 0, h / 2, 0));
  const top = mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.18, 10, 1, false, -Math.PI / 2, Math.PI), mat(color));
  top.rotation.x = -Math.PI / 2;
  top.position.y = h;
  g.add(top);
  const p = textPlane(lines, w * 0.8, h * 0.75, { bg: "", fg: "#2b2b2b", size: 30, font: "Georgia, serif", weight: "700" });
  p.position.set(0, h * 0.55, 0.095);
  g.add(p);
  return g;
}

const scene: SceneDef = {
  duration: 36,
  build(ctx) {
    const { scene, sfx } = ctx;
    setupWorld(ctx, { sky: 0xa9b4b8, fog: [12, 50], ground: 0x4a5040, hemi: 1.1, sun: 0xe8eef0, sunIntensity: 1.1, sunPos: [-5, 10, 7] });
    scene.add(terrain(120, 40, 0.7, 0x667a52, 2601, 6));
    const r = rng(2602);

    // Older graves of things already lost
    const old = [
      ["HERE LIES", "MY STREAK", "2019–2026"],
      ["R.I.P.", "FRIEND", "CODES"],
      ["IN MEMORY", "OF EVENT", "POINTS"],
      ["GUEST", "MODE", "(still alive?)"],
      ["DAILY", "LOGIN", "BONUS"],
    ];
    old.forEach((l, i) => {
      const s = gravestone(l, 0.7, 0.8, r.pick([0x7d7d7d, 0x8a8478, 0x6e6e6e]));
      s.position.set(-4.5 + i * 2.2 + r.range(-0.3, 0.3), 0, -4.2 - (i % 2) * 1.4);
      s.rotation.set(r.range(-0.08, 0.08), r.range(-0.2, 0.2), r.range(-0.1, 0.1));
      scene.add(s);
    });
    for (let i = 0; i < 7; i++) {
      const tr = tree(r.range(3, 4.5), 0x3e5c3a);
      const a = r.range(Math.PI * 1.05, Math.PI * 1.95), d = r.range(9, 14);
      tr.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
      scene.add(tr);
    }
    for (let i = 0; i < 5; i++) {
      const rk = rock(r.range(0.2, 0.4), 2610 + i, 0x7a7a70);
      rk.position.set(r.range(-6, 6), rk.position.y, r.range(1.5, 5));
      scene.add(rk);
    }
    // iron fence
    for (let i = 0; i < 16; i++) scene.add(box(0.05, 1.1, 0.05, 0x222222, -7.5 + i, 0.55, -7));
    scene.add(box(15, 0.05, 0.05, 0x222222, 0, 1.0, -7), box(15, 0.05, 0.05, 0x222222, 0, 0.4, -7));

    // The hole + dirt pile
    const hole = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 10), mat(0x1a120c), false, true);
    hole.position.set(0, 0.03, 0);
    scene.add(hole);
    const pile = mesh(new THREE.ConeGeometry(0.7, 0.6, 7), mat(0x5c4033));
    pile.position.set(1.3, 0.3, -0.3);
    scene.add(pile);
    const fill = mesh(new THREE.ConeGeometry(0.6, 0.35, 7), mat(0x5c4033));
    scene.add(fill);

    // The capsule on a little stand
    const capsule = new THREE.Group();
    capsule.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 10), mat(0xb0b7c3)));
    capsule.children[0].position.y = 0.3;
    capsule.add(box(0.46, 0.04, 0.04, 0x7a8290, 0, 0.15, 0), box(0.46, 0.04, 0.04, 0x7a8290, 0, 0.45, 0));
    const lid = new THREE.Group();
    lid.position.set(0, 0.6, -0.22);
    const lidM = mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.06, 10), mat(0x8a929e));
    lidM.position.set(0, 0.03, 0.22);
    lid.add(lidM);
    capsule.add(lid);
    const capLabel = textPlane(["TIME CAPSULE", "do not open"], 0.36, 0.16, { bg: "#f4ecd8", fg: "#2b2b2b", size: 60 });
    capLabel.position.set(0, 0.3, 0.225);
    capsule.add(capLabel);
    scene.add(capsule);
    const stand = box(0.6, 0.6, 0.6, 0x6b4423, -1.2, 0.3, 0.6);
    scene.add(stand);

    // Headstone for the capsule
    const stone = gravestone(["HERE LIES", "OUR RATING", "15.00", "", "DO NOT OPEN", "UNTIL THE", "SERVER RETURNS"], 1.1, 1.4, 0xb8b8b0);
    scene.add(stone);

    // Historians
    const H = 5;
    const spots: [number, number][] = [[-1.2, 1.5], [1.4, 1.2], [-2.0, 0.2], [2.3, 0.6], [-0.4, -1.7]];
    // arrival order chosen so the staggered procession never walks through itself
    const order = [0, 2, 3, 1, 4];
    const historians = Array.from({ length: H }, (_, i) => {
      const p = new Player({ shirt: [0x6b5844, 0x4a4e69, 0x5c4033, 0x3d405b, 0x7f5539][i], pants: 0x2b2b2b, hairStyle: i === 4 ? "bun" : "short", hair: 0x777777, accessories: i === 1 ? ["glasses", "beard"] : ["glasses"] }, 2620 + i);
      const kind = i % 3;
      const onHead = hat(kind);
      onHead.position.y = 0.36;
      p.head.add(onHead);
      const inHand = hat(kind);
      inHand.rotation.x = Math.PI / 2 + 0.3;
      inHand.position.set(0, -0.05, 0.12);
      p.handL.add(inHand);
      scene.add(p.root);
      return { p, onHead, inHand };
    });
    // Shovels for two of them
    const shovel = () => {
      const g = new THREE.Group();
      g.add(box(0.04, 1.1, 0.04, 0x8b5a2b, 0, -0.2, 0));
      g.add(box(0.2, 0.25, 0.03, 0x888888, 0, -0.8, 0));
      g.rotation.x = 0.2;
      return g;
    };
    const shovels = [shovel(), shovel()];
    historians[2].p.handR.add(shovels[0]);
    historians[3].p.handR.add(shovels[1]);

    // The printout
    const paper = textPlane(["— SCORE CARD —", "PLAYER ★★★", "", "RATING", "15.00", "", "proof we existed"], 0.34, 0.56, { bg: "#fffdf4", fg: "#1b1b1b", size: 24, font: "'Courier New', monospace", weight: "700", border: "#ccc", borderWidth: 3 }, 320);
    historians[0].p.handR.add(paper);

    sfx.ambient("wind", 0.3);
    sfx.ambient("droneSad", 0.25);

    // 0-5 procession | 5-11 printout aloft | 11-15 into capsule, lid shuts | 15-19 lowered
    // 19-23 dig | 23-24.5 headstone | 24.5-30 hats off, silence | 30-36 the inscription
    ctx.update((t) => {
      historians.forEach(({ p, onHead, inHand }, i) => {
        const [x, z] = spots[i];
        const k = smooth(seg(t, order[i] * 0.3, 4.5 + order[i] * 0.3));
        p.travel(x - 5.5, z + 3, x, z, k);
        const hatsOff = t > 24.8 && t < 30.5;
        onHead.visible = !hatsOff;
        inHand.visible = hatsOff;
        if (k < 1) {
          p.pose("walk", t * 0.6); // slow, dignified procession
          return;
        }
        p.face(0, 0);
        if (hatsOff) {
          p.pose("sad", t);
          p.armL.rotation.set(-1.2, 0, -0.5);
          p.torso.rotation.x = 0.35;
          if (t > 27.5 && t < 30 && i === 4) p.head.rotation.y = 0.6; // peeks: is it serious enough?
          return;
        }
        if (i === 0) {
          const aloft = smooth(seg(t, 5.5, 7)) * (1 - smooth(seg(t, 10.5, 11.5)));
          if (t < 11.5) {
            p.pose("hold", t);
            p.face(-0.6, 4); // presents it to the audience
            p.armR.rotation.x = lerp(-1.1, -2.7, aloft);
            p.armL.rotation.x = lerp(-1.1, -0.2, aloft);
            p.head.rotation.x = -0.3 * aloft;
          } else if (t < 15) {
            p.pose("reach", t, 0.5);
            p.face(-1.2, 0.6);
          } else p.pose(t > 23 && t < 24.8 ? "point" : "idle", t);
        } else if (i === 2 || i === 3) {
          if (t > 19 && t < 23) p.pose("dig", t + i);
          else if (t > 15 && t < 19) p.pose("kneel", t);
          else p.pose("idle", t);
        } else if (i === 1) {
          p.pose(t > 5 && t < 11 ? "talk" : "idle", t);
        } else p.pose(t > 14 && t < 15.5 ? "cheer" : "idle", t, 0.2);
      });

      // printout: kept upright against the arm rotation
      const ar = historians[0].p.armR.rotation.x;
      paper.rotation.set(-ar, 0, 0);
      paper.position.set(0, -0.12, 0.08);
      paper.visible = t < 13.2;

      // capsule: on the stand, lid shuts, then lowered into the hole
      lid.rotation.x = lerp(-1.9, 0, smooth(seg(t, 13.3, 14)));
      const toHole = smooth(seg(t, 14.8, 16));
      const sink = smooth(seg(t, 16, 19));
      capsule.position.set(lerp(-1.2, 0, toHole), lerp(0.6, 0.05, toHole) + 0.35 * Math.sin(toHole * Math.PI) - sink * 1.2, lerp(0.6, 0, toHole));
      capsule.visible = sink < 0.98;
      // dirt fills back in
      const f = smooth(seg(t, 19.2, 23));
      fill.scale.set(1, Math.max(0.01, f), 1);
      fill.position.set(0, -0.1 + f * 0.25, 0);
      fill.visible = f > 0;
      pile.scale.setScalar(lerp(1, 0.45, f));
      hole.visible = f < 0.5;

      // headstone drops into place
      const d = easeIn(seg(t, 23, 24));
      stone.position.set(0, lerp(3, 0, d), -0.55);
      stone.visible = t > 23;
    });

    // --- Sound ---
    ctx.at(0.2, () => sfx.bell(220, 4));
    for (let s = 0; s < 8; s++) ctx.at(0.5 + s * 0.55, () => sfx.footstep(-0.5 + s * 0.1));
    ctx.at(6.8, () => sfx.shimmer());
    ctx.at(7.5, () => sfx.chant(110, 3));
    ctx.at(13.9, () => sfx.thunk());
    ctx.at(16, () => sfx.dramaticChord());
    for (let s = 19.4; s < 23; s += 0.78) ctx.at(s, () => sfx.thud());
    ctx.at(24, () => sfx.boom());
    ctx.at(24.8, () => sfx.bell(220, 5));
    ctx.at(27.3, () => sfx.bell(220, 5));
    ctx.at(30.5, () => sfx.cricket(0.3));

    // --- Narration ---
    ctx.caption(0.6, "Day 26. The Historical Society convenes. Hats are mandatory. So is grief.", 4.6);
    ctx.caption(5.8, "The artifact: a printed scorecard. RATING 15.00. Proof that we existed.", 5);
    ctx.caption(11.4, "It is sealed in a capsule, for whoever comes after us.", 4);
    ctx.caption(16, "Future civilizations will dig it up and ask what a rating was. We will not be there to lie.", 5.5);
    ctx.caption(24.8, "A moment of silence.", 2.5);
    ctx.caption(27.4, "Then a second moment, because the first one was not serious enough.", 3.4);
    ctx.caption(31, "Estimated opening date: never. The Society considers this optimistic.", 5);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [3, 2.6, 8], look: [-2, 1, 1] },
      { t: 5, pos: [1.5, 1.8, 5], look: [-0.5, 1.2, 0.5] },
      { t: 6.5, pos: [-0.9, 1.9, 3.6], look: [-1.2, 2.2, 1.5], fov: 45 },
      { t: 10.5, pos: [-0.6, 1.9, 3.3], look: [-1.1, 2.1, 1.5], fov: 40 },
      { t: 12, pos: [0.2, 1.5, 2.5], look: [-1.2, 0.9, 0.6], fov: 45 },
      { t: 15, pos: [0.1, 2.0, 3.3], look: [0, 0.3, 0] },
      { t: 19, pos: [2.4, 4.4, 4.6], look: [0, 0, 0] },
      { t: 23, pos: [0, 2.2, 4.5], look: [0, 0.8, -0.5] },
      { t: 25, pos: [0, 4.5, 6.5], look: [0, 0.8, 0] },
      { t: 30.5, pos: [-2, 3.5, 6.5], look: [0, 0.8, 0] },
      { t: 32, pos: [0, 1.0, 1.4], look: [0, 0.85, -0.55], fov: 45 },
      { t: 36, pos: [0, 0.95, 1.1], look: [0, 0.85, -0.55], fov: 45 },
    ]);
    ctx.shake(24, 0.1, 0.4);
  },
};
export default scene;

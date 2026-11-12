// Day 4: Rationing. Coins are counted by candlelight in a basement shelter,
// then traded at the night barter market for instant noodles.
// The noodles are real. The hot water costs extra.
import * as THREE from "three";
import { box, glow, mat, mesh } from "../engine/materials";
import { bump, easeOut, hop, lerp, rng, seg, smooth } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { TextTexture, textPlane } from "../engine/textTexture";
import { Player } from "../kit/characters";
import { setupWorld, terrain } from "../kit/environments";
import { candle, card, coin, coinPile, crate, sign, table, torch } from "../kit/props";

const MX = 50; // market set offset

/** A cup of instant noodles. */
function noodleCup(lid = 0xffd166) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.16, 10).translate(0, 0.08, 0), mat(0xfafafa)));
  g.add(mesh(new THREE.CylinderGeometry(0.092, 0.092, 0.04, 10).translate(0, 0.1, 0), mat(0xe63946)));
  const top = mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.01, 10), mat(lid));
  top.position.y = 0.165;
  g.add(top);
  return Object.assign(g, { lid: top });
}

const scene: SceneDef = {
  duration: 40,
  build(ctx) {
    const { scene, sfx } = ctx;
    const world = setupWorld(ctx, { sky: 0x1a1030, fog: [14, 40], ground: 0x100808, hemi: 0.35, sun: 0x8a7bd6, sunIntensity: 0.35, sunPos: [-6, 10, 4] });
    const r = rng(404);

    // ---------- Shelter (basement, candle, ledger) ----------
    const shell = mesh(new THREE.BoxGeometry(6, 2.8, 6), mat(0x4a4038, { side: THREE.BackSide }), false, true);
    shell.position.y = 1.4;
    scene.add(shell);
    for (let i = 0; i < 5; i++) scene.add(box(6, 0.12, 0.2, 0x2e2620, 0, 2.74, -2.4 + i * 1.2)); // ceiling beams
    const pipe = box(0.12, 0.12, 6, 0x6b6b6b, 2.6, 2.4, 0);
    scene.add(pipe);
    const desk = crate(0.7, 0x8a5a2b);
    desk.position.set(0, 0, -0.6);
    scene.add(desk);
    const cnd = candle();
    cnd.position.set(-0.22, 0.7, -0.75);
    scene.add(cnd);
    const flame = cnd.children[1];
    const warm = new THREE.PointLight(0xffa040, 5, 6, 1.4);
    warm.position.set(-0.22, 1.1, -0.4);
    scene.add(warm);

    // the hoard: a pile, plus 24 counted coins that travel pile -> stacks
    const pile = coinPile(36, 7, 0.16);
    pile.position.set(0.18, 0.7, -0.75);
    scene.add(pile);
    const counted: THREE.Mesh[] = [];
    for (let i = 0; i < 24; i++) {
      const c = coin();
      scene.add(c);
      counted.push(c);
    }
    const ledgerTT = new TextTexture(256, 192);
    const ledger = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.24), new THREE.MeshLambertMaterial({ map: ledgerTT.texture }));
    ledger.rotation.x = -Math.PI / 2;
    ledger.position.set(-0.05, 0.705, -0.4);
    scene.add(ledger);
    const counter = new Player({ shirt: 0x6c757d, hairStyle: "short", hair: 0x3b2a1a, accessories: ["glasses"] }, 401);
    counter.at(0, -1.45, 0);
    const seat = crate(0.45, 0x5c3a1e);
    seat.position.set(0, 0, -1.6);
    scene.add(seat);
    scene.add(counter.root);
    // roommate hugging a jar in the corner
    const roomie = new Player({ shirt: 0x8e44ad, hairStyle: "long", hair: 0x9b5de5 }, 402);
    roomie.at(-1.9, -2.0, 0.55);
    scene.add(roomie.root);
    const jar = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 8), mat(0xbde0fe, { opacity: 0.6 }));
    jar.position.set(0, -0.1, 0.12);
    roomie.handR.add(jar);
    const jarCoins = coinPile(6, 3, 0.05);
    jarCoins.position.y = -0.1;
    jar.add(jarCoins);

    // stack positions: 3 stacks of 8
    const stackPos = (i: number) => new THREE.Vector3(-0.2 + Math.floor(i / 8) * 0.13, 0.71 + (i % 8) * 0.016, -0.62);
    const fromPos = new THREE.Vector3(0.18, 0.76, -0.75);
    const toPos = counted.map((_, i) => stackPos(i));
    const coinT = (i: number) => 1.5 + i * 0.36;

    // ---------- Market (night bazaar, torches, tarps) ----------
    const ground = terrain(60, 24, 0.25, 0x3d2f2a, 8, 10);
    ground.position.x = MX;
    scene.add(ground);
    const market = new THREE.Group();
    market.position.x = MX;
    scene.add(market);
    // back wall of a ruined building with graffiti
    market.add(box(16, 4, 0.4, 0x5c4d5a, 0, 2, -4));
    const graffiti = textPlane("NO CREDITS ACCEPTED HERE", 5, 0.7, { bg: "", fg: "#ff4fd8", size: 70, font: "'Trebuchet MS', sans-serif" });
    graffiti.position.set(-2, 2.6, -3.78);
    market.add(graffiti);
    // stalls
    const stallCols = [0xe63946, 0x2a9d8f, 0xf4a261];
    const stallX = [-3.6, 0, 3.6];
    stallX.forEach((x, i) => {
      const tb = table(2, 0.8, 0x6b4423);
      tb.position.set(x, 0, -1.6);
      market.add(tb);
      const tarp = box(2.4, 0.05, 1.6, stallCols[i], x, 2.2, -1.8);
      tarp.rotation.x = -0.18;
      market.add(tarp);
      for (const dx of [-1.1, 1.1]) market.add(box(0.06, 2.3, 0.06, 0x3b2a1a, x + dx, 1.15, -1.1), box(0.06, 2.4, 0.06, 0x3b2a1a, x + dx, 1.2, -2.5));
      // strings of lantern bulbs
      for (let b = 0; b < 6; b++) market.add(box(0.08, 0.1, 0.08, glow([0xffd166, 0xff70a6, 0x80ffdb][b % 3]), x - 1 + b * 0.4, 2.05 + Math.sin(b) * 0.04, -0.95));
    });
    // the noodle stall (centre): a pyramid of cups
    const cups: THREE.Group[] = [];
    for (let row = 0; row < 3; row++)
      for (let k = 0; k < 4 - row; k++) {
        const c = noodleCup(r.pick([0xffd166, 0xffffff, 0x06d6a0]));
        c.position.set(-0.4 + k * 0.22 + row * 0.11, 0.78 + row * 0.17, -1.7);
        market.add(c);
        cups.push(c);
      }
    // snacks on the other stalls
    for (let k = 0; k < 8; k++) market.add(box(0.18, 0.24, 0.06, r.pick([0xff006e, 0x3a86ff, 0xffbe0b, 0x8338ec]), -4.3 + k * 0.19, 0.9, -1.6));
    for (let k = 0; k < 5; k++) {
      const cd = card(r.pick([0x3a86ff, 0xff006e, 0xffbe0b]));
      cd.position.set(2.9 + k * 0.3, 0.8, -1.5);
      cd.rotation.y = r.range(-0.3, 0.3);
      market.add(cd);
    }
    const priceSign = sign(["CUP NOODLE", "= 50 COINS"], 1.0, 0.5, { bg: "#fff3b0", size: 48 }, false);
    priceSign.position.set(0, 2.4, -1.1);
    market.add(priceSign);
    const snackSign = sign(["CHIPS: 1 CARD", "(rare only)"], 1.0, 0.5, { bg: "#ffd6e0", size: 44 }, false);
    snackSign.position.set(-3.6, 2.4, -1.1);
    market.add(snackSign);
    const cardSign = sign(["WE BUY CARDS", "(we pay in cards)"], 1.1, 0.5, { bg: "#d8f3dc", size: 44 }, false);
    cardSign.position.set(3.6, 2.4, -1.1);
    market.add(cardSign);
    // the surprise fee sign, flips down from the tarp
    const feePivot = new THREE.Group();
    feePivot.position.set(0.55, 2.05, -0.95);
    const fee = textPlane(["HOT WATER", "+30 COINS"], 0.75, 0.42, { bg: "#c1121f", fg: "#fff", size: 50 });
    fee.position.y = -0.25;
    feePivot.add(fee);
    market.add(feePivot);
    for (const [tx, tz] of [[-5.6, 0.2], [5.6, 0.2], [-1.8, 0.2], [3.3, 5.0]]) {
      const tc = torch();
      tc.position.set(tx, 0, tz);
      market.add(tc);
    }
    const lantern = new THREE.PointLight(0xffc27a, 9, 12, 1.3);
    lantern.position.set(0, 2.4, 0.4);
    market.add(lantern);

    // market people
    const merchant = new Player({ shirt: 0x5c3a1e, robe: 0x3d2b1f, hairStyle: "bald", accessories: ["hood", "mask"] }, 403);
    merchant.at(MX, -2.2);
    const buyer = new Player({ shirt: 0xff70a6, hairStyle: "twin", hair: 0x3b2a1a, accessories: ["gloves", "backpack"] }, 404);
    scene.add(merchant.root, buyer.root);
    const purse = coinPile(26, 11, 0.12);
    const purseHold = new THREE.Group().add(purse);
    scene.add(purseHold);
    const goldCard = card(0xffd700);
    scene.add(goldCard);
    const boughtCup = noodleCup(0xffd166);
    scene.add(boughtCup);
    const shoppers = [0, 1, 2, 3, 4].map((i) => {
      const p = new Player({ hairStyle: r.pick(["short", "cap", "bun", "spiky"] as const), accessories: r.next() < 0.5 ? ["backpack"] : ["towel"] }, 410 + i);
      scene.add(p.root);
      return p;
    });

    sfx.ambient("fire", 0.3);

    // --- Timeline ---
    // 0-11 coins counted | 11.5 swept back, recount | 14-17.5 the roommate's jar
    // 17.5 cut to market | 21-27 buyer haggles & pays | 27-29 receives cup
    // 29.5 opens lid | 31 fee sign | 33-40 eats it dry
    const v = new THREE.Vector3();
    ctx.update((t) => {
      // ----- counting -----
      counter.pose("sit", t);
      counter.hips.position.y = 0.5;
      counter.torso.rotation.x = 0.2;
      counter.head.rotation.x = 0.3 - bump(t, 11.4, 13) * 0.5;
      const sweep = seg(t, 11.3, 11.9);
      let reachK = 0;
      counted.forEach((c, i) => {
        const t0 = coinT(i);
        const k = seg(t, t0, t0 + 0.3);
        if (k < 1 && k > 0) reachK = 1;
        v.lerpVectors(fromPos, toPos[i], easeOut(k));
        v.y += hop(k, 0.12);
        if (sweep > 0) v.lerp(fromPos, smooth(sweep));
        c.position.copy(v);
        c.visible = sweep < 1;
        c.rotation.x = k * Math.PI * 2 * (1 - sweep);
      });
      counter.armR.rotation.x = -1.2 - Math.sin(t * 17.4) * 0.15 * reachK;
      counter.armL.rotation.x = -0.9;
      counter.armR.rotation.z = 0.2 + Math.sin(t * 8.7) * 0.15 * reachK;
      if (sweep > 0 && sweep < 1) counter.armR.rotation.z = -0.4;
      let n = 0;
      if (t < 11.3) for (let i = 0; i < counted.length; i++) n += t > coinT(i) + 0.3 ? 1 : 0;
      else if (t > 13) n = Math.min(24, Math.floor((t - 13) / 0.36));
      ledgerTT.draw(["COIN LEDGER", `count #1,204`, `${n} / 60`], { bg: "#f4ecd8", fg: "#2b2b2b", size: 34, font: "monospace" });
      flame.scale.y = 1 + Math.sin(t * 13) * 0.2;
      warm.intensity = 5 + Math.sin(t * 17) * 0.4 + Math.sin(t * 5.1) * 0.3 - bump(t, 11.4, 12.2) * 2.5;
      roomie.pose("huddle", t, 1);
      roomie.armR.rotation.x = -1.2;
      roomie.armL.rotation.x = -1.2;
      roomie.head.rotation.y = bump(t, 14, 17) * 0.8;

      // ----- market -----
      merchant.pose(t > 31 && t < 33.5 ? "point" : t > 21 && t < 27 ? "talk" : "idle", t);
      merchant.at(MX, -2.2);
      if (t > 31 && t < 33.5) merchant.armR.rotation.x = -2.6;
      shoppers.forEach((p, i) => {
        const sp = 0.22 + i * 0.03;
        const x = MX - 8 + (((t * sp * 4 + i * 3.7) % 16) + 16) % 16;
        const z = 0.5 + (i % 3) * 0.45;
        p.root.position.set(i % 2 ? x : 2 * MX - x, 0, z);
        p.root.rotation.y = i % 2 ? Math.PI / 2 : -Math.PI / 2;
        p.pose("walk", t);
        if (t > 31.2 && t < 34) {
          p.face(MX, -0.7);
          p.pose("point", t);
        }
      });
      // buyer: walks in, haggles, pays, gets cup, opens it, despairs, eats dry
      const bw = smooth(seg(t, 18.5, 21));
      if (t < 33) {
        buyer.travel(MX - 6, 2.5, MX - 0.1, -0.65, bw);
        if (bw < 1) buyer.pose("walk", t);
        else {
          buyer.face(MX, -2.2);
          if (t < 24.5) buyer.pose("talk", t);
          else if (t < 27) buyer.pose("hold", t);
          else if (t < 31) buyer.pose("hold", t);
          else buyer.pose("sad", t);
        }
      } else {
        // retreats to a crate and eats it dry
        const ek = smooth(seg(t, 33, 34.5));
        buyer.travel(MX - 0.1, -0.65, MX + 2.2, 2.6, ek);
        if (ek < 1) buyer.pose("walk", t);
        else {
          buyer.face(MX + 1.6, 5);
          buyer.pose("sitFloor", t);
          buyer.armR.rotation.x = -2.0 - Math.max(0, Math.sin(t * 5)) * 0.4;
          buyer.armL.rotation.x = -1.2;
          buyer.head.rotation.x = 0.2 + Math.max(0, Math.sin(t * 5)) * 0.2;
        }
      }
      // purse goes from buyer's hands onto the counter
      const pay = smooth(seg(t, 24.6, 25.6));
      buyer.root.updateMatrixWorld(true);
      buyer.handR.getWorldPosition(v);
      purseHold.position.set(lerp(v.x, MX - 0.05, pay), lerp(v.y - 0.05, 0.79, pay), lerp(v.z, -1.35, pay));
      purseHold.visible = t > 18 && t < 36;
      if (pay >= 1 && t > 26) purseHold.position.lerp(v.set(MX, 0.95, -2.1), smooth(seg(t, 26, 26.6)));
      purseHold.visible = purseHold.visible && !(t > 26.6);
      // gold card too ("and your rarest card")
      const cardK = smooth(seg(t, 25.8, 26.6));
      goldCard.visible = t > 25.3 && t < 27;
      goldCard.position.set(lerp(MX - 0.25, MX + 0.1, cardK), 0.82 + hop(cardK, 0.25), lerp(-0.95, -2.0, cardK));
      // cup comes down from the pyramid
      const give = smooth(seg(t, 27, 28.2));
      cups[cups.length - 1].visible = t < 27;
      boughtCup.visible = t > 27;
      if (t <= 33) {
        boughtCup.position.set(lerp(MX + 0.11, MX - 0.1, give), lerp(0.78 + 0.34, 1.0, give) + hop(give, 0.2), lerp(-1.7, -0.25, give));
        if (give >= 1) {
          buyer.handR.getWorldPosition(v);
          boughtCup.position.set(lerp(MX - 0.1, v.x + 0.15, 1), 1.02, -0.25);
        }
      } else {
        buyer.handR.getWorldPosition(v);
        boughtCup.position.set(v.x, v.y - 0.08, v.z);
      }
      boughtCup.lid.position.y = 0.165 + seg(t, 29.5, 30.2) * 0.06;
      boughtCup.lid.rotation.x = -seg(t, 29.5, 30.2) * 1.4;
      // the fee sign flips down
      feePivot.rotation.x = lerp(-Math.PI / 2, 0, easeOut(seg(t, 31, 31.5))) + Math.sin(Math.max(0, t - 31.5) * 9) * 0.15 * (1 - seg(t, 31.5, 33));
      world.hemi.intensity = t < 17.5 ? 0.3 : 0.7;
    });

    // --- Sound ---
    counted.forEach((_, i) => ctx.at(coinT(i) + 0.3, () => sfx.tick()));
    ctx.at(8.5, () => sfx.coin());
    ctx.at(11.3, () => sfx.coinDrop(6));
    ctx.at(11.9, () => sfx.moan(0.9));
    for (let i = 0; i < 6; i++) ctx.at(13 + i * 0.36, () => sfx.tick());
    ctx.at(15, () => sfx.coinDrop(1));
    ctx.at(17.5, () => {
      sfx.ambient("crowd", 0.5);
      sfx.ambient("fire", 0.5);
    });
    ctx.at(21.5, () => sfx.mumble(1.6, 1.2, 0));
    ctx.at(23, () => sfx.mumble(1.2, 0.8, 0.2));
    ctx.at(25, () => sfx.coinDrop(8));
    ctx.at(26.2, () => sfx.cardSwipe());
    ctx.at(28.2, () => sfx.ding());
    ctx.at(29.7, () => sfx.pop());
    ctx.at(31.1, () => sfx.thunk());
    ctx.at(31.6, () => sfx.sadTrombone());
    ctx.at(32.4, () => sfx.crowdGasp());
    for (let i = 0; i < 8; i++) ctx.at(35 + i * 0.63, () => sfx.crumple());
    ctx.at(39.9, () => sfx.stopAmbient("crowd"));

    // --- Narration ---
    ctx.caption(0.8, "Day 4. Every coin is precious now. Every coin is counted.", 4);
    ctx.caption(5.2, "Twenty-three. Twenty-four. He loses count. He always loses count.", 5);
    ctx.caption(11.6, "He starts over. This is count number one thousand, two hundred and four.", 4.6);
    ctx.caption(17.8, "Night. The barter market. Here, coins are worth exactly what someone hungry says.", 4.8);
    ctx.caption(23, "Today's rate: one noodle cup for her life savings and her rarest card.", 4.4);
    ctx.caption(28, "A fair deal. She checks the cup.", 2.8);
    ctx.caption(31.2, "Ah.", 2);
    ctx.caption(34.2, "She ate it dry. Out of principle. The market respects principle. Not much else.", 5.4);

    // --- Camera ---
    ctx.cameraPath([
      { t: 0, pos: [1.3, 1.6, 1.3], look: [0, 0.75, -0.8], fov: 50 },
      { t: 5, pos: [0.45, 1.2, 0.35], look: [0, 0.74, -0.7], fov: 44 },
      { t: 10.8, pos: [-0.45, 1.2, 0.35], look: [0, 0.74, -0.7], fov: 42 },
      { t: 11.6, pos: [0.8, 1.5, 1.2], look: [0, 0.75, -0.8], fov: 50 },
      { t: 14, pos: [1.1, 1.6, 1.8], look: [-1.0, 0.6, -1.3], fov: 52 },
      { t: 17.4, pos: [1.4, 1.7, 2.2], look: [-1.5, 0.6, -1.8], fov: 52 },
      { t: 17.5, pos: [MX - 1, 3.4, 8.5], look: [MX, 1.2, -1.5], fov: 50 },
      { t: 21, pos: [MX + 2.4, 1.8, 2.4], look: [MX, 1.1, -1.2], fov: 50 },
      { t: 23, pos: [MX + 2.5, 1.5, -0.4], look: [MX - 0.2, 1.05, -1.4], fov: 50 },
      { t: 28.6, pos: [MX + 2.3, 1.55, -0.2], look: [MX - 0.2, 1.05, -1.2], fov: 46 },
      { t: 29.3, pos: [MX - 0.75, 1.75, 0.35], look: [MX - 0.1, 0.95, -0.3], fov: 42 },
      { t: 30.6, pos: [MX - 0.75, 1.75, 0.35], look: [MX - 0.05, 1.0, -0.3], fov: 38 },
      { t: 31, pos: [MX - 0.2, 1.6, 2.6], look: [MX + 0.3, 1.6, -1.0], fov: 50 },
      { t: 34.5, pos: [MX + 1.7, 1.25, 4.5], look: [MX + 2.2, 0.75, 2.6], fov: 48 },
      { t: 40, pos: [MX + 0.8, 1.9, 6.2], look: [MX + 1.6, 0.8, 1.6], fov: 54 },
    ]);
    ctx.flash(17.5, "#000000", 0.5);
    ctx.shake(31.1, 0.05, 0.3);
  },
};
export default scene;

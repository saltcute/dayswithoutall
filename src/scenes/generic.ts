// Fallback for days that don't have a hand-written scene yet (31+).
import * as THREE from "three";
import { box } from "../engine/materials";
import { seg } from "../engine/math";
import type { SceneDef } from "../engine/stage";
import { textPlane } from "../engine/textTexture";
import { Player } from "../kit/characters";
import { cabinet } from "../kit/cabinets";
import { desert, setupWorld } from "../kit/environments";
import { cactus, rock, tumbleweed } from "../kit/props";

const scene: SceneDef = {
  duration: 30,
  build(ctx) {
    const { scene, sfx, day } = ctx;
    setupWorld(ctx, { sky: 0xf4a261, fog: [15, 70], ground: 0x8a5a2b, sun: 0xffd6a5, sunIntensity: 2, sunPos: [-10, 6, 4] });
    desert(ctx, { color: 0xe0a96d });

    const cab = cabinet("round", 0xb08968);
    cab.setScreen("custom", ["STILL", "OFFLINE", `day ${day}`], { bg: "#1a0005", fg: "#ff3355", size: 44 });
    cab.group.rotation.z = 0.06;
    cab.group.position.set(0, 0, 0);
    scene.add(cab.group);

    // A very patient skeleton-ish player who never left.
    const p = new Player({ shirt: 0x8d8d8d, pants: 0x5c5c5c, skin: 0xe8e2d0, hair: 0x777777, hairStyle: "bald", accessories: ["gloves"] }, 31);
    p.at(0.2, 1.3, Math.PI);
    scene.add(p.root);

    // Billboard with the live count
    const board = new THREE.Group();
    board.add(box(0.2, 4, 0.2, 0x5c3a1e, -2.2, 2, 0), box(0.2, 4, 0.2, 0x5c3a1e, 2.2, 2, 0));
    const face = textPlane(["DAYS WITHOUT", "ALL.NET", String(day)], 5.4, 3, { bg: "#f7f3e8", fg: "#c1121f", size: 70, border: "#1b1b1b", borderWidth: 10 });
    face.position.y = 4.5;
    board.add(face);
    board.position.set(-7, 0, -10);
    board.rotation.y = 0.35;
    scene.add(board);

    for (let i = 0; i < 6; i++) {
      const c = cactus(1.2 + (i % 3) * 0.5);
      c.position.set(Math.cos(i * 1.7) * (10 + i * 2), 0, -8 - i * 3);
      scene.add(c);
      const r = rock(0.6, i + 2, 0xa47148);
      r.position.set(Math.sin(i * 2.3) * 12, 0, -4 - i * 2.5);
      scene.add(r);
    }

    const tw = tumbleweed();
    scene.add(tw);

    sfx.ambient("desert");
    sfx.ambient("droneSad", 0.6);

    ctx.update((t) => {
      p.pose("sitFloor", t);
      p.head.rotation.x = 0.5;
      const k = seg(t, 4, 20);
      tw.position.set(14 - k * 28, 0.4 + Math.abs(Math.sin(t * 4)) * 0.4, 3);
      tw.rotation.z = t * 4;
      // the screen occasionally flickers
      const fl = Math.sin(t * 37) > 0.97 ? 0.4 : 1;
      cab.screenMat.color.setScalar(fl);
      board.rotation.z = Math.sin(t * 0.7) * 0.01;
    });

    ctx.at(4.5, () => sfx.whoosh(1.2));
    ctx.at(12, () => sfx.whoosh(1.5));
    ctx.at(22, () => sfx.errorBeep(1));
    ctx.caption(1.5, `Day ${day}.`, 4);
    ctx.caption(7, "The chroniclers have run out of ink.", 5);
    ctx.caption(13, "Somewhere, a status page still says “investigating”.", 5);
    ctx.caption(20, "He said he'd wait until it came back online. He's a man of his word.", 6);

    const orbit = (a: number, r: number, y: number) => [Math.sin(a) * r, y, Math.cos(a) * r] as [number, number, number];
    ctx.cameraPath([
      { t: 0, pos: orbit(0.3, 12, 4), look: [-1, 2, -1] },
      { t: 12, pos: orbit(-0.4, 9, 2.5), look: [0, 1.4, 0] },
      { t: 22, pos: orbit(0.1, 4, 1.6), look: [0, 1.2, 0] },
      { t: 30, pos: orbit(0.3, 12, 4), look: [-1, 2, -1] },
    ]);
  },
};
export default scene;

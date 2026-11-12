// Headless geometry audit: steps through each scene and reports
//   - body parts penetrating props, walls or other characters ("clip")
//   - props attached to a hand that overlap the holder's body ("selfprop")
//   - props attached to a hand that float away from it ("float")
//   - arms passing through the character's own torso/head/legs ("self")
// Usage (with `vite preview --port 4173` running):
//   node scripts/audit.mjs [days...] [--step=0.25] [--min=0.04] [--url=http://localhost:4173]
// It reports approximate penetration depth in metres using mesh bounding boxes,
// so curved shapes give some false positives: always confirm with `npm run shots`.
import { chromium } from "playwright";

const args = process.argv.slice(2);
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split("=")[1];
const base = opt("url", "http://localhost:4173");
const step = +opt("step", "0.25");
const minDepth = +opt("min", "0.04");
const days = args.filter((a) => !a.startsWith("--")).flatMap((a) => {
  const [x, y] = a.split("-").map(Number);
  return y ? Array.from({ length: y - x + 1 }, (_, i) => x + i) : [x];
});
if (!days.length) for (let i = 1; i <= 31; i++) days.push(i); // 31 = the generic fallback scene

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
page.setDefaultTimeout(600_000);
await page.addInitScript(() => { window.__noAutoplay = true; });

for (const day of days) {
  await page.goto(`${base}/?day=${day}&today=40`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const res = await page.evaluate(({ step, minDepth }) => {
    const st = window.__stage;
    const scene = st.scene;
    const PARTS = new Set(["hips", "torso", "head", "armL", "armR", "legL", "legR"]);
    const hits = new Map();
    const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    const info = new Map();
    const meta = (m) => {
      let r = info.get(m);
      if (r) return r;
      let owner = null, part = null, hand = null;
      for (let p = m; p; p = p.parent) {
        if (!part && m.userData.part && PARTS.has(p.name)) part = p.name;
        if (!hand && p.userData.hand) hand = p;
        if (p.userData.player !== undefined) { owner = p; break; }
      }
      r = { owner, part: m.userData.part ? part : null, hand: m.userData.part ? null : hand };
      info.set(m, r);
      return r;
    };
    const fmt = (v) => v.toFixed(2);
    const desc = (m, wb) => {
      const g = m.geometry; const b = g.boundingBox; const s = m.getWorldScale(m.position.clone());
      const dims = [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z].map((d, i) => fmt(d * [s.x, s.y, s.z][i])).join("x");
      const c = wb.getCenter(m.position.clone());
      const mi = meta(m);
      const who = mi.owner ? `P${mi.owner.userData.player}.${mi.part ?? (mi.hand ? "hand" + mi.hand.userData.hand + "-prop" : "prop")}` : "env";
      return `${who}:${g.type.replace("Geometry", "")}(${dims})@(${fmt(c.x)},${fmt(c.y)},${fmt(c.z)})`;
    };
    function check(t) {
      scene.updateMatrixWorld(true);
      const ms = [];
      scene.traverse((o) => {
        if (!o.isMesh || !o.geometry || !shown(o)) return;
        const mt = Array.isArray(o.material) ? o.material[0] : o.material;
        if (mt.side === 1) return; // BackSide room shells
        if (o.userData.noAudit) return;
        if (o.geometry.parameters?.openEnded) return; // light beams, hollow shells
        if (mt.transparent && mt.opacity < 0.5) return; // ghosts, glows, glass
        if (o.geometry.type === "PlaneGeometry" || o.geometry.type === "CircleGeometry") return;
        const g = o.geometry;
        if (!g.boundingBox) g.computeBoundingBox();
        const b = g.boundingBox;
        const pts = [];
        for (let i = 0; i < 9; i++) {
          const v = i < 8 ? b.min.clone().set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z) : b.getCenter(b.min.clone());
          pts.push(v.applyMatrix4(o.matrixWorld));
        }
        const wb = b.clone().setFromPoints(pts);
        const sz = wb.getSize(b.min.clone());
        if (sz.x > 8 && sz.z > 8) return; // ground / terrain
        if (Math.max(sz.x, sz.y, sz.z) < 0.03) return; // tiny bits
        ms.push({ o, pts, wb, inv: o.matrixWorld.clone().invert(), b, m: meta(o) });
      });
      const tmp = scene.position.clone();
      const depthIn = (A, B) => {
        let d = 0;
        for (const p of A.pts) {
          tmp.copy(p).applyMatrix4(B.inv);
          const b = B.b;
          if (tmp.x <= b.min.x || tmp.x >= b.max.x || tmp.y <= b.min.y || tmp.y >= b.max.y || tmp.z <= b.min.z || tmp.z >= b.max.z) continue;
          // convert local depth to world-ish units using the scale of B
          const e = B.o.matrixWorld.elements;
          const sx = Math.hypot(e[0], e[1], e[2]), sy = Math.hypot(e[4], e[5], e[6]), sz = Math.hypot(e[8], e[9], e[10]);
          const dd = Math.min((tmp.x - b.min.x) * sx, (b.max.x - tmp.x) * sx, (tmp.y - b.min.y) * sy, (b.max.y - tmp.y) * sy, (tmp.z - b.min.z) * sz, (b.max.z - tmp.z) * sz);
          if (dd > d) d = dd;
        }
        return d;
      };
      const ent = (M) => {
        if (M.m.owner) return { id: M.m.owner.uuid, name: `P${M.m.owner.userData.player}`, sub: M.m.part ?? (M.m.hand ? "held" : "worn") };
        let g = M.o;
        while (g.parent && g.parent !== scene && g.parent.children.length <= 48 && !g.parent.userData.player) g = g.parent;
        return { id: g.uuid, name: desc(M.o, M.wb), sub: "" };
      };
      const record = (kind, A, B, d) => {
        const ea = ent(A), eb = B ? ent(B) : { id: "", name: "", sub: "" };
        const key = kind + "|" + ea.id + "|" + eb.id;
        let h = hits.get(key);
        if (!h) hits.set(key, (h = { kind, a: ea.name, b: eb.name, subs: new Set(), times: new Set(), max: 0, at: 0, where: "" }));
        h.subs.add(ea.sub + (eb.sub ? "/" + eb.sub : ""));
        h.times.add(t);
        if (d > h.max) { h.max = d; h.at = t; h.where = desc(A.o, A.wb) + " <-> " + (B ? desc(B.o, B.wb) : ""); }
      };
      for (let i = 0; i < ms.length; i++) {
        const A = ms[i];
        if (A.m.hand && A.o.parent === A.m.hand) {
          // a prop attached to a hand should touch that hand
          const hp = A.m.hand.getWorldPosition(tmp.clone());
          const gap = A.wb.distanceToPoint(hp);
          if (gap > 0.1) record("float", A, null, gap);
        }
        for (let j = i + 1; j < ms.length; j++) {
          const B = ms[j];
          if (!A.wb.intersectsBox(B.wb)) continue;
          const a = A.m, b = B.m;
          let kind = null;
          if (a.owner && b.owner && a.owner === b.owner) {
            if (a.part && b.part) {
              const arm = (p) => p === "armL" || p === "armR";
              if (a.part === b.part || !(arm(a.part) || arm(b.part))) continue;
              if (a.part === "hips" || b.part === "hips") continue; // hips only carry the robe
              kind = "self";
            } else if (a.part || b.part) {
              const prop = a.part ? b : a, body = a.part ? a : b;
              // the holding arm itself is expected to touch the prop
              let holdArm = null;
              for (let p = prop.hand; p; p = p.parent) if (p.name === "armL" || p.name === "armR") { holdArm = p.name; break; }
              if (prop.hand && body.part === holdArm) continue;
              if (!prop.hand) continue; // worn props (packs, robes...) are attached by design
              kind = "selfprop";
            } else continue;
          } else if (a.owner || b.owner) {
            if (!a.part && !b.part && !(a.owner && b.owner)) continue; // prop vs env: not a body clip
            kind = "clip";
          } else continue;
          const d = Math.max(depthIn(A, B), depthIn(B, A));
          const lim = kind === "self" ? minDepth + 0.03 : minDepth;
          if (d > lim) record(kind, A, B, d);
        }
      }
    }
    st.restart();
    const dt = 1 / 30;
    let next = 0;
    while (st.t + dt < st.duration - 0.05) {
      st.advance(dt, false);
      if (st.t >= next) { next += step; check(st.t); }
    }
    const spans = (ts) => {
      const a = [...ts].sort((x, y) => x - y), out = [];
      for (const v of a) {
        const l = out[out.length - 1];
        if (l && v - l[1] <= step * 1.5) l[1] = v; else out.push([v, v]);
      }
      return out.map(([x, y]) => x === y ? x.toFixed(1) : `${x.toFixed(1)}-${y.toFixed(1)}`).join(",");
    };
    return [...hits.values()].map((h) => ({ ...h, subs: [...h.subs].join(" "), n: h.times.size, span: spans(h.times) }))
      .sort((x, y) => y.max * Math.sqrt(y.n) - x.max * Math.sqrt(x.n));
  }, { step, minDepth });
  console.log(`\n=== day ${day}: ${res.length} issues`);
  for (const h of res)
    console.log(`  ${h.kind.padEnd(8)} d=${h.max.toFixed(2)}@${h.at.toFixed(1)} n=${h.n} t=[${h.span}]  ${h.a} <-> ${h.b}  {${h.subs}}\n      worst: ${h.where}`);
}
await browser.close();

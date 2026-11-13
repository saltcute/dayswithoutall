# AGENTS.md — dayswithoutall.net

Project-wide instructions for anyone (human or AI agent) working in this repo.

## What this is
This is a parody website that counts the days ALL.Net (the online server behind the SEGA arcade rhythm games maimai, CHUNITHM and ONGEKI) has been down. Each day lives on its own subdomain: `one.dayswithoutall.net`, `two.…`, `twentyone.…`. Every day plays a short **low-poly 3D scene with sound**: a dramatized, sarcastic, post-apocalyptic take on how the players (and "the world") cope with the ALL.Netpocalypse.

**Tone:** deadpan nature-documentary narration over an absurd apocalypse. Keep it affectionate toward the player community and never mean-spirited. No gore, slurs or real people.

**IP:** this is a fan parody, not affiliated with SEGA. Do not use official logos, art, music, fonts or sound. Cabinets, idols and mascots must be stylized, generic, procedural homages (for example "a white bear idol", "a penguin idol", "a star idol girl").

## Architecture
```
shared/            Pure TS used by both the Worker and the browser
  numberWords.ts   1 <-> "one", 21 <-> "twentyone" (canonical labels have no hyphens)
  dayCalc.ts       currentDay(now, OUTAGE_START); days roll over at JST midnight
  sceneMeta.ts     title/subtitle per day (Worker uses these for <title>/og: tags)
worker/index.ts    Cloudflare Worker: host -> day routing, redirects, HTML injection
src/main.ts        Browser entry: HUD, nav, start overlay, loads the day's scene chunk
src/engine/        Stage (render loop, timeline, captions, camera path), math, materials, text textures
src/kit/           Reusable low-poly builders: characters, cabinets, props, environments
src/audio/sfx.ts   Web Audio synthesizer; every sound effect and ambient bed is generated
src/scenes/        dayNN.ts (one per day) + generic.ts (fallback for days without a scene)
tests/             vitest unit tests for shared/
scripts/screenshots.mjs  Playwright: headless render of scenes into ./shots for visual review
scripts/og-images.mjs    Playwright: renders public/og/dayNN.jpg, the per-day social preview (og:image)
scripts/tweet.mjs        Daily X bot (GitHub Actions): renames the account and posts social/tweets.json
```

### Playback (src/main.ts)
- There is no blocking start screen. The page renders the opening frame with the "DAY N" title card, then autoplays the scene after 2 s (`AUTOPLAY_DELAY_MS`).
- Browsers block audio until a user gesture, so autoplay starts muted with a "Click anywhere for sound" hint. The first click or keypress anywhere unlocks the sound.
- The scene plays once (`stage.loop = false`). When it ends, the title screen appears with a "↻ REPLAY" button and audio is suspended.
- Test scripts set `window.__noAutoplay = true` to keep the start screen up.

### Routing rules (worker/index.ts)
- `OUTAGE_START` (wrangler var, default `2026-11-03T00:00:00+09:00`) is the start of Day 1. The day count changes at 00:00 JST.
- The apex domain, `www.`, unknown labels and future days get a **302** to today's subdomain (`no-store`).
- Non-canonical spellings (`twenty-one`) get a **301** to the canonical label (`twentyone`).
- A valid past or current day is served `index.html` with `window.__DAY__`, `__TODAY__`, `__HOST_SUFFIX__` and per-day meta tags injected.
- `*.localhost` works the same way locally (`http://seven.localhost:8799/`) via `wrangler dev --env local` (the `local` env has no routes; with routes, wrangler rewrites the Host header). `DEV_NOW` in `.dev.vars` or `--var DEV_NOW:<iso>` overrides the clock.
- With the plain Vite dev server (no Worker), use `?day=N&today=M`.

## Internationalization (en, zh-Hans, ja)
- **Keys are the English source text** (gettext style). Dictionaries live in `src/i18n/locales/{zh-Hans,ja}.json`; English needs none. Shared logic is in `shared/i18n.ts`, browser glue in `src/i18n/index.ts`.
- **Scenes are translated automatically.** `ctx.caption()` and `TextTexture.draw()` (so `textPlane`, `sign`, `placard`, `banner` and cabinet screens) pass text through `trAuto()`. Text containing numbers is also matched in templated form: `"count #1,204"` is looked up as `"count #{0}"`.
- **Hand-drawn canvas text** (`tt.paint(...)` + `fillText`) is NOT automatic. Wrap it: `c.fillText(trAuto("TO BE CONTINUED"), …)`, and add `cjkFonts()` to the canvas font. For a typewriter effect, translate the full string first, then slice the translation.
- **UI strings** use `tr("Day {n} ▶", { n })` with named variables.
- **Locale choice:** `?lang=` → the `lang` cookie (shared across all day subdomains) → `Accept-Language` / `navigator.languages` → English. All Chinese variants map to `zh-Hans`. The Worker localizes `<title>`, the description and og tags, sets `<html lang>`, and keeps `?lang` through redirects. The 🌐 picker sets the cookie and reloads.
- **Fonts:** CSS and canvas use locale-ordered CJK fallbacks (`--cjk`, `cjkFonts()`), with Japanese glyph forms first for `ja`.
- **After adding or changing any visible text:**
  1. `npm run build`, then start `npx vite preview --port 4173`.
  2. Run `npm run i18n:extract` to regenerate `src/i18n/catalog.json` by running every scene headlessly.
  3. Add the new keys to both locale files.
  4. Run `npm test`. `tests/i18n-coverage.test.ts` fails on missing keys, stale keys or broken `{placeholders}`.
- **Check visually** with `?lang=ja` / `?lang=zh-Hans`, e.g. `npm run shots -- 7 --url=…`. Keep sign translations short, since signs shrink text to fit.

## Writing a scene
Create `src/scenes/dayNN.ts` (two-digit zero-padded, e.g. `day07.ts`). The registry in `src/scenes/index.ts` picks it up automatically through `import.meta.glob`, and it becomes its own lazy chunk. Then add or adjust its entry in `shared/sceneMeta.ts`, and render its social preview with `npm run og -- NN` (commit the new `public/og/dayNN.jpg`; set `FRAME[NN]` in the script if the default mid-scene frame is weak). Days without an image fall back to `public/og/generic.jpg` only when they have no scene, so a new scene needs its image.

```ts
import type { SceneDef } from "../engine/stage";
const scene: SceneDef = {
  duration: 36,               // seconds; the scene plays once
  build(ctx) {
    // 1. world: setupWorld(ctx, {...}) + an environment from kit/environments
    // 2. actors/props: new Player(opts, seed), cabinet(kind), props…  -> ctx.scene.add(...)
    // 3. ctx.update((t, dt) => { ... })   pose/move everything as a pure function of t
    // 4. ctx.at(time, () => ctx.sfx.xxx()) sound cues (fire once per playthrough)
    // 5. ctx.caption(time, "Narration…", dur)
    // 6. ctx.cameraPath([{ t, pos, look, fov? }, ...]); ctx.shake(); ctx.flash()
  },
};
export default scene;
```

Rules:
- **Animate as a function of `t`** (seconds since the scene started) using `seg`, `smooth`, `keys` and `bump` from `engine/math`. This keeps replays identical and `stage.seek()` deterministic. Only particles may use `dt`. Use `ctx.onLoop` to reset any state (it runs on every start and replay).
- Use the seeded `rng(seed)`, never `Math.random()`, for layout, so every visitor sees the same scene. Random jitter inside poses or sounds is fine.
- `Player.pose(name, t, k)` resets all joints and then applies the pose. Call it every frame and apply small tweaks after it.
- Characters face **+Z**. Cabinets face +Z with their origin at the floor center. Use `player.face(x, z)` and `player.travel(...)`.
- **Held props:** parent them to `player.handR` / `handL` (the origin is the fist), or, for two-handed carries, place them between both hands' world positions after `root.updateMatrixWorld(true)`. Characters have no knees, so `sit` puts the legs straight out: seat them at open tables, not solid boxes. Crowds that cross each other need separate lanes or matching speeds.
- Keep the camera **inside** enclosed rooms (below the ceiling lights at `h - 0.05`, default h = 4) and avoid clipping through actors.
- Captions are short, dry and funny. Usually 5–8 per scene, 3–6 s each. The UI shows one at a time, so don't overlap them. All visible text must be translated (see Internationalization).
- Sound is synthesized only (`ctx.sfx.*`, including `ambient(name)` beds). No audio or model files. Sound calls before the user clicks "Enter" are harmless no-ops.
- Everything is procedural low-poly: flat-shaded `mat()` / `glow()` from `engine/materials`, with low segment counts.
- Put a one-off prop inside the scene file. Move it to `src/kit/` only when two or more scenes need it.
- Keep scenes light: a few dozen meshes, one or two lights beyond the world lights, and no per-frame allocations in hot paths.

## Commands
```
npm run dev            # Vite dev server at :5173 (use ?day=N&today=M)
npm test               # vitest (shared logic)
npm run build          # typecheck (app + worker) and build to dist/
npm run preview        # build + `wrangler dev --env local` at :8799 (try http://one.localhost:8799/)
npm run shots -- 1-5   # with `vite preview --port 4173` running: render scenes into ./shots/*.png
npm run i18n:extract   # with `vite preview` running: rebuild src/i18n/catalog.json from all scenes
npm run og -- 10       # with `vite preview` running: render public/og/day10.jpg (no args = all + generic)
node scripts/audit.mjs 1-5  # with `vite preview` running: report clipping and misplaced held props
npm run deploy         # manual build + wrangler deploy (needs `wrangler login`); normally not needed, see Deployment
```

## Deployment
- **Pushing to `master` deploys the live site automatically.** The Cloudflare Git integration builds and deploys the Worker; it isn't configured in `.github/workflows`. There is no staging step, so every push to `master` is a production release.
- Before pushing, finish the verification steps below, and check anything time-sensitive, such as `OUTAGE_START` and whether today's scene and `social/tweets.json` entry are ready.
- After pushing, run `curl -sI https://dayswithoutall.net/` to check the deploy. It should 302 to today's subdomain.
- `npm run deploy` is only a manual fallback.

## Verification before committing
1. `npm test` and `npm run build` pass.
2. Run `node scripts/audit.mjs <days>` for any scene you touched and fix real hits: characters walking through each other or through furniture, props inside bodies, held props that float off the hand. It measures bounding boxes, so confirm each hit on a screenshot before changing anything.
3. Run `npm run shots -- <days>` for any scene you touched. It must print `ok` (no console errors). Look at the PNGs to confirm the scene reads clearly: subject in frame, camera not inside geometry, nothing too dark.

## Git conventions
- Use **Conventional Commits**: `feat(scenes): add day 12 the shambling`, `fix(worker): …`, `chore: …`, `docs: …`, `test: …`, `refactor(engine): …`.
- Keep commits small and logical.
- Never commit `dist/`, `.wrangler/`, `.dev.vars` or `shots/`.

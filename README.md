# Days Without ALL.Net

> THIS ARCADE HAS GONE **[ 07 ]** DAYS WITHOUT ALL.NET

A fan-made parody site that counts how long ALL.Net (the server behind SEGA's maimai, CHUNITHM and ONGEKI) has been down. Each day has its own subdomain (`one.dayswithoutall.net`, `two.…`, `twentyone.…`) and its own low-poly 3D scene with synthesized sound, showing how the players slowly descend into a post-apocalyptic society.

- `dayswithoutall.net` or any future day redirects to **today**.
- Past days stay viewable and have ◀ / ▶ navigation. "Next" is hidden on today.
- Days 1–30 have hand-made scenes. Later days get a generic "still down" scene with the live count.

Not affiliated with SEGA. All models and sounds are generated procedurally in the browser.

## Development

```bash
npm install
npm run dev                 # http://localhost:5173/?day=7&today=30
npm test                    # unit tests (number words, JST day math, worker routing)
npm run preview             # build + Worker locally: http://one.localhost:8799/
npm run shots -- 1-5        # (dev server running) render scenes to ./shots/*.png
```

To preview a specific "today" through the Worker, create `.dev.vars` containing:

```
DEV_NOW=2026-12-16T09:00:00+09:00
```

See [AGENTS.md](AGENTS.md) for architecture, conventions and how to add a new day's scene.

## Configuration

`wrangler.jsonc` → `vars`:

| var | default | meaning |
| --- | --- | --- |
| `OUTAGE_START` | `2026-11-03T00:00:00+09:00` | Start of Day 1. Days roll over at 00:00 JST. |
| `BASE_DOMAIN` | `dayswithoutall.net` | Apex domain; subdomains are day numbers in words. |

## Deploying to Cloudflare

1. Add `dayswithoutall.net` as a zone in your Cloudflare account and point the registrar's nameservers at Cloudflare.
2. In **DNS**, create two **proxied** (orange-cloud) records so requests reach the Worker:
   - `AAAA  @  100::`
   - `AAAA  *  100::`

   Wildcard proxied records are supported on all plans. Universal SSL covers `*.dayswithoutall.net` at the first level, which is all this site uses.
3. Set `OUTAGE_START` in `wrangler.jsonc` to the real start of the outage.
4. Deploy:
   ```bash
   npx wrangler login
   npm run deploy
   ```
   The Worker attaches to the routes `dayswithoutall.net/*` and `*.dayswithoutall.net/*` (declared in `wrangler.jsonc`).
5. Visit `https://dayswithoutall.net/`. It should redirect to today's subdomain.

When the server comes back: congratulations, and set the Worker to show a celebration (or just leave it up as a memorial).

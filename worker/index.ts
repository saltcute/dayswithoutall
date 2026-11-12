import { currentDay, DEFAULT_OUTAGE_START } from "../shared/dayCalc";
import { parseWords, toWords } from "../shared/numberWords";
import { metaFor } from "../shared/sceneMeta";

export interface Env {
  ASSETS: Fetcher;
  OUTAGE_START?: string;
  BASE_DOMAIN?: string;
  /** Local testing only: ISO timestamp used instead of the real clock. */
  DEV_NOW?: string;
}

const NO_STORE = { "Cache-Control": "no-store" };

function redirect(location: string, status: 301 | 302): Response {
  return new Response(null, { status, headers: { Location: location, ...NO_STORE } });
}

/** Split a hostname into (first label, suffix) relative to a known base. */
function splitHost(hostname: string, base: string): { label: string | null; suffix: string } | null {
  const bases = [base, "localhost"];
  for (const b of bases) {
    if (hostname === b) return { label: null, suffix: b };
    if (hostname.endsWith("." + b)) {
      const sub = hostname.slice(0, -(b.length + 1));
      // Only a single label is meaningful (e.g. "seven"); deeper names are treated as invalid labels.
      return { label: sub, suffix: b };
    }
  }
  return null;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const base = env.BASE_DOMAIN || "dayswithoutall.net";

    // Static build output is served as-is from any host.
    if (url.pathname.startsWith("/assets/") || /\.[a-z0-9]{2,5}$/i.test(url.pathname) && url.pathname !== "/index.html") {
      const res = await env.ASSETS.fetch(request);
      if (url.pathname.startsWith("/assets/") && res.ok) {
        const out = new Response(res.body, res);
        out.headers.set("Cache-Control", "public, max-age=31536000, immutable");
        return out;
      }
      return res;
    }

    const now = env.DEV_NOW ? new Date(env.DEV_NOW) : new Date();
    const today = currentDay(now, env.OUTAGE_START || DEFAULT_OUTAGE_START);

    const split = splitHost(url.hostname, base);
    if (!split) return new Response("Unknown host", { status: 404 });

    const port = url.port ? `:${url.port}` : "";
    const hostFor = (n: number) => `${toWords(n)}.${split.suffix}${port}`;
    const urlFor = (n: number) => `${url.protocol}//${hostFor(n)}/`;

    const day = split.label ? parseWords(split.label) : null;
    if (day === null || day > today) return redirect(urlFor(today), 302);
    if (split.label !== toWords(day)) return redirect(urlFor(day), 301);
    if (url.pathname !== "/") return redirect(urlFor(day), 302);

    const shell = await env.ASSETS.fetch(new URL("/", request.url));
    if (!shell.ok) return shell;
    let html = await shell.text();

    const meta = metaFor(day);
    const title = `Day ${day} without ALL.Net: ${meta.title}`;
    const pageUrl = urlFor(day);
    const head = [
      `<meta name="description" content="${escapeHtml(meta.subtitle)}">`,
      `<meta property="og:title" content="${escapeHtml(title)}">`,
      `<meta property="og:description" content="${escapeHtml(meta.subtitle)}">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:url" content="${escapeHtml(pageUrl)}">`,
      `<meta name="twitter:card" content="summary">`,
      `<link rel="canonical" href="${escapeHtml(pageUrl)}">`,
      `<script>window.__DAY__=${day};window.__TODAY__=${today};window.__HOST_SUFFIX__=${JSON.stringify(split.suffix + port)};</script>`,
    ].join("\n    ");
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`).replace("</head>", `    ${head}\n  </head>`);

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8", ...NO_STORE },
    });
  },
} satisfies ExportedHandler<Env>;

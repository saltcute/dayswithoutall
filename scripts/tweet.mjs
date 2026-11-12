// Daily X (Twitter) bot: renames the account to "<N> Days Without ALL Net" and
// posts that day's entry from social/tweets.json (a thread if it has several
// posts), with the day's subdomain link appended to the last post.
//
//   node scripts/tweet.mjs --dry-run            # today's day (JST), print only
//   node scripts/tweet.mjs --dry-run --all      # check every entry's length
//   node scripts/tweet.mjs --day 10             # post a specific day for real
//   node scripts/tweet.mjs --whoami             # check credentials, post nothing
//
// Needs Node >= 22.18 (imports the shared .ts helpers via type stripping) and
// these env vars (OAuth 1.0a user context, app permission "Read and write"):
//   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
// Optional: OUTAGE_START (defaults to the site's), SKIP_RENAME=1.

import { createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { currentDay, DEFAULT_OUTAGE_START } from "../shared/dayCalc.ts";
import { toWords } from "../shared/numberWords.ts";

const BASE_DOMAIN = "dayswithoutall.net";
const MAX_WEIGHT = 280;
const URL_WEIGHT = 23;

// ---------- args ----------
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};
const dryRun = flag("--dry-run");
const tweets = JSON.parse(readFileSync(new URL("../social/tweets.json", import.meta.url), "utf8"));

// ---------- text helpers ----------
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const TEENS = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function titleWords(n) {
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
  if (n < 1000) return ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + titleWords(n % 100) : "");
  return String(n);
}
/** Display name, max 50 chars on X. */
export function nameFor(day) {
  const name = `${titleWords(day)} ${day === 1 ? "Day" : "Days"} Without ALL Net`;
  return name.length <= 50 ? name : `${day} Days Without ALL Net`;
}
const linkFor = (day) => `https://${toWords(day)}.${BASE_DOMAIN}`;

/** Approximates twitter-text weighting: URLs = 23, Latin/common punctuation = 1, everything else = 2. */
export function weight(text) {
  let w = 0;
  const rest = text.replace(/https?:\/\/\S+/g, () => {
    w += URL_WEIGHT;
    return "";
  });
  for (const ch of rest) {
    const c = ch.codePointAt(0);
    const light = c <= 4351 || (c >= 8192 && c <= 8205) || (c >= 8208 && c <= 8223) || (c >= 8242 && c <= 8247);
    w += light ? 1 : 2;
  }
  return w;
}

function postsFor(day) {
  const entry = tweets[String(day)];
  if (!entry) return null;
  const posts = [...entry];
  posts[posts.length - 1] += `\n\n${linkFor(day)}`;
  return posts;
}

function check(day, posts) {
  let ok = true;
  posts.forEach((p, i) => {
    const w = weight(p);
    if (w > MAX_WEIGHT) ok = false;
    console.log(`--- day ${day} post ${i + 1}/${posts.length} (${w}/${MAX_WEIGHT})${w > MAX_WEIGHT ? "  TOO LONG" : ""}\n${p}\n`);
  });
  return ok;
}

// ---------- OAuth 1.0a ----------
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`missing env var ${name}`);
  return v;
}

/** Signed request. `query` params are signed; a JSON body is not (per OAuth 1.0a). */
async function xRequest(method, url, { query = {}, json } = {}) {
  const oauth = {
    oauth_consumer_key: env("X_API_KEY"),
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: env("X_ACCESS_TOKEN"),
    oauth_version: "1.0",
  };
  const all = { ...query, ...oauth };
  const paramStr = Object.keys(all)
    .sort()
    .map((k) => `${enc(k)}=${enc(all[k])}`)
    .join("&");
  const base = [method, enc(url), enc(paramStr)].join("&");
  const key = `${enc(env("X_API_SECRET"))}&${enc(env("X_ACCESS_TOKEN_SECRET"))}`;
  oauth.oauth_signature = createHmac("sha1", key).update(base).digest("base64");
  const auth = "OAuth " + Object.keys(oauth).sort().map((k) => `${enc(k)}="${enc(oauth[k])}"`).join(", ");

  const qs = Object.keys(query).length ? "?" + Object.keys(query).map((k) => `${enc(k)}=${enc(query[k])}`).join("&") : "";
  const res = await fetch(url + qs, {
    method,
    headers: { Authorization: auth, ...(json ? { "Content-Type": "application/json" } : {}) },
    body: json ? JSON.stringify(json) : undefined,
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${body}`);
  return body ? JSON.parse(body) : {};
}

// ---------- main ----------
if (flag("--whoami")) {
  // Credential check only: shows which account the tokens post as.
  const me = await xRequest("GET", "https://api.x.com/2/users/me");
  console.log(`Authenticated as @${me.data.username} (${me.data.name})`);
  process.exit(0);
}

if (flag("--all")) {
  const days = Object.keys(tweets).filter((k) => /^\d+$/.test(k)).map(Number);
  const bad = days.filter((d) => !check(d, postsFor(d)));
  days.forEach((d) => console.log(`day ${d}: name "${nameFor(d)}"`));
  if (bad.length) {
    console.error(`Too long: days ${bad.join(", ")}`);
    process.exit(1);
  }
  console.log(`ok: ${days.length} days`);
  process.exit(0);
}

const day = opt("--day") ? Number(opt("--day")) : currentDay(new Date(), process.env.OUTAGE_START || DEFAULT_OUTAGE_START);
const name = nameFor(day);
const posts = postsFor(day);
console.log(`Day ${day}  name: "${name}"`);
if (posts && !check(day, posts)) process.exit(1);
if (!posts) console.log(`No entry for day ${day} in social/tweets.json; will only rename.`);
if (dryRun) process.exit(0);

let failed = false;
if (!process.env.SKIP_RENAME) {
  try {
    await xRequest("POST", "https://api.x.com/1.1/account/update_profile.json", { query: { name } });
    console.log(`Renamed to "${name}"`);
  } catch (e) {
    failed = true;
    console.error(`Rename failed (posting anyway): ${e.message}`);
  }
}

let replyTo;
for (const text of posts ?? []) {
  const json = { text, ...(replyTo ? { reply: { in_reply_to_tweet_id: replyTo } } : {}) };
  const res = await xRequest("POST", "https://api.x.com/2/tweets", { json });
  replyTo = res.data.id;
  console.log(`Posted ${replyTo}`);
}
process.exit(failed ? 1 : 0);

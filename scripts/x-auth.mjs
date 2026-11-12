// One-time helper: get an access token for the BOT account while the developer
// app (and its credits) belongs to your MAIN account. OAuth 1.0a PIN flow.
//
//   X_API_KEY=... X_API_SECRET=... node scripts/x-auth.mjs
//
// Open the printed URL in a browser where you are logged in as the BOT account
// (a private window is easiest), approve, and paste the PIN back here.

import { createHmac, randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";

const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
const key = process.env.X_API_KEY;
const secret = process.env.X_API_SECRET;
if (!key || !secret) throw new Error("set X_API_KEY and X_API_SECRET (the app's consumer keys)");

async function oauthPost(url, extra, tokenSecret = "") {
  const p = {
    oauth_consumer_key: key,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: "1.0",
    ...extra,
  };
  const paramStr = Object.keys(p).sort().map((k) => `${enc(k)}=${enc(p[k])}`).join("&");
  const base = ["POST", enc(url), enc(paramStr)].join("&");
  p.oauth_signature = createHmac("sha1", `${enc(secret)}&${enc(tokenSecret)}`).update(base).digest("base64");
  const auth = "OAuth " + Object.keys(p).sort().map((k) => `${enc(k)}="${enc(p[k])}"`).join(", ");
  const res = await fetch(url, { method: "POST", headers: { Authorization: auth } });
  const body = await res.text();
  if (!res.ok) throw new Error(`${url} -> ${res.status}: ${body}`);
  return Object.fromEntries(new URLSearchParams(body));
}

const req = await oauthPost("https://api.x.com/oauth/request_token", { oauth_callback: "oob" });
console.log(`\n1. Log in to X as the BOT account, then open:\n   https://api.x.com/oauth/authorize?oauth_token=${req.oauth_token}\n2. Click "Authorize app" and copy the PIN.\n`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const pin = (await rl.question("PIN: ")).trim();
rl.close();

const acc = await oauthPost(
  "https://api.x.com/oauth/access_token",
  { oauth_token: req.oauth_token, oauth_verifier: pin },
  req.oauth_token_secret,
);
console.log(`\nAuthorized as @${acc.screen_name} (id ${acc.user_id}). Save these as repo secrets:\n`);
console.log(`X_ACCESS_TOKEN=${acc.oauth_token}`);
console.log(`X_ACCESS_TOKEN_SECRET=${acc.oauth_token_secret}`);

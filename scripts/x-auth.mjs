// One-time helper: get an access token for the BOT account while the developer
// app (and its credits) belongs to your MAIN account. OAuth 1.0a PIN flow.
//
//   X_API_KEY=... X_API_SECRET=... node scripts/x-auth.mjs [--set-secrets]
//
// It verifies the new token right away (GET /2/users/me). With --set-secrets
// it also writes all four values to the GitHub repo secrets via `gh`.
//
// Open the printed URL in a browser where you are logged in as the BOT account
// (a private window is easiest), approve, and paste the PIN back here.

import { createHmac, randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { execFileSync } from "node:child_process";

const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
const key = process.env.X_API_KEY?.trim();
const secret = process.env.X_API_SECRET?.trim();
if (!key || !secret) throw new Error("set X_API_KEY and X_API_SECRET (the app's consumer keys)");

async function oauth(method, url, extra, tokenSecret = "") {
  const p = {
    oauth_consumer_key: key,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: "1.0",
    ...extra,
  };
  const paramStr = Object.keys(p).sort().map((k) => `${enc(k)}=${enc(p[k])}`).join("&");
  const base = [method, enc(url), enc(paramStr)].join("&");
  p.oauth_signature = createHmac("sha1", `${enc(secret)}&${enc(tokenSecret)}`).update(base).digest("base64");
  const auth = "OAuth " + Object.keys(p).sort().map((k) => `${enc(k)}="${enc(p[k])}"`).join(", ");
  const res = await fetch(url, { method, headers: { Authorization: auth } });
  const body = await res.text();
  if (!res.ok) throw new Error(`${url} -> ${res.status}: ${body}`);
  return { body, headers: res.headers };
}

const form = (r) => Object.fromEntries(new URLSearchParams(r.body));
const req = form(await oauth("POST", "https://api.x.com/oauth/request_token", { oauth_callback: "oob" }));
console.log("Consumer key/secret OK.");
console.log(`\n1. Log in to X as the BOT account, then open:\n   https://api.x.com/oauth/authorize?oauth_token=${req.oauth_token}\n2. Click "Authorize app" and copy the PIN.\n`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const pin = (await rl.question("PIN: ")).trim();
rl.close();

const acc = form(
  await oauth("POST", "https://api.x.com/oauth/access_token", { oauth_token: req.oauth_token, oauth_verifier: pin }, req.oauth_token_secret),
);
console.log(`\nAuthorized as @${acc.screen_name} (id ${acc.user_id}).`);

// Verify the new token works for API calls and report the app's permission level.
const me = await oauth("GET", "https://api.x.com/2/users/me", { oauth_token: acc.oauth_token }, acc.oauth_token_secret);
const level = me.headers.get("x-access-level") ?? "unknown";
console.log(`Verified: API calls work as @${JSON.parse(me.body).data.username}. Access level: ${level}`);
if (!level.includes("write")) console.log("WARNING: the token is not read-write. Set App permissions to 'Read and write', revoke the app on the bot account, and run this again.");

const values = {
  X_API_KEY: key,
  X_API_SECRET: secret,
  X_ACCESS_TOKEN: acc.oauth_token,
  X_ACCESS_TOKEN_SECRET: acc.oauth_token_secret,
};
if (process.argv.includes("--set-secrets")) {
  for (const [name, value] of Object.entries(values)) {
    execFileSync("gh", ["secret", "set", name], { input: value, stdio: ["pipe", "inherit", "inherit"] });
  }
  console.log("All four GitHub secrets updated.");
} else {
  console.log("\nSave these as repo secrets (value only, without the NAME= part):\n");
  for (const [name, value] of Object.entries(values)) console.log(`${name}=${value}`);
}

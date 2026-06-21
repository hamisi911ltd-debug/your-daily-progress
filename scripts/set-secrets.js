#!/usr/bin/env node
/**
 * Interactive helper: sets all required Cloudflare Workers secrets.
 * Run: node scripts/set-secrets.js
 * Requires: wrangler to be authenticated (run `wrangler login` first)
 */
import { execSync } from "child_process";
import { createInterface } from "readline";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

const secrets = [
  { name: "CF_ACCOUNT_ID",      label: "Cloudflare Account ID", required: true },
  { name: "CF_D1_DATABASE_ID",  label: "D1 Database ID",        required: true },
  { name: "CF_API_TOKEN",       label: "Cloudflare API Token (D1:Edit permission)", required: true },
  { name: "JWT_SECRET",         label: "JWT Secret (run: openssl rand -hex 32)", required: true },
  { name: "GOOGLE_CLIENT_ID",     label: "Google OAuth Client ID (optional, press Enter to skip)", required: false },
  { name: "GOOGLE_CLIENT_SECRET", label: "Google OAuth Client Secret (optional)", required: false },
  { name: "FACEBOOK_APP_ID",      label: "Facebook App ID (optional)", required: false },
  { name: "FACEBOOK_APP_SECRET",  label: "Facebook App Secret (optional)", required: false },
  { name: "TIKTOK_CLIENT_KEY",    label: "TikTok Client Key (optional)", required: false },
  { name: "TIKTOK_CLIENT_SECRET", label: "TikTok Client Secret (optional)", required: false },
];

console.log("\n🔐 Fanmeeet — Cloudflare Secrets Setup\n");

for (const secret of secrets) {
  const value = await ask(`  ${secret.label}: `);
  if (!value && secret.required) {
    console.error(`\n❌ ${secret.name} is required. Aborting.`);
    process.exit(1);
  }
  if (value) {
    execSync(`echo "${value}" | wrangler secret put ${secret.name}`, { stdio: "inherit" });
  } else {
    console.log(`  Skipped ${secret.name}`);
  }
}

rl.close();
console.log("\n✅ Secrets set. Run: npm run deploy\n");

#!/usr/bin/env node
/**
 * Run migrations on the local dev SQLite database.
 * Safe to run multiple times — ignores "column already exists" errors.
 * Usage: node scripts/migrate-local.js
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scryptSync, randomBytes } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", ".dev-data", "creatorconnect.db");
const DB_DIR = join(__dirname, "..", ".dev-data");

if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
if (!existsSync(DB_PATH)) {
  console.log("No local database found. Run: node scripts/seed.js first.");
  process.exit(0);
}

const db = new DatabaseSync(DB_PATH);

const migrations = [
  "ALTER TABLE users ADD COLUMN google_id TEXT",
  "ALTER TABLE users ADD COLUMN phone_number TEXT",
  "ALTER TABLE users ADD COLUMN facebook_id TEXT",
  "ALTER TABLE users ADD COLUMN tiktok_id TEXT",
  "ALTER TABLE profiles ADD COLUMN instagram_url TEXT",
  "ALTER TABLE profiles ADD COLUMN tiktok_url TEXT",
  "ALTER TABLE profiles ADD COLUMN snapchat_url TEXT",
  "ALTER TABLE profiles ADD COLUMN facebook_url TEXT",
  "ALTER TABLE profiles ADD COLUMN phone_number TEXT",
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS creator_gallery (
    id TEXT PRIMARY KEY NOT NULL,
    creator_id TEXT NOT NULL,
    image_url TEXT NOT NULL,
    caption TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  "CREATE INDEX IF NOT EXISTS idx_creator_gallery ON creator_gallery(creator_id, created_at)",
];

for (const sql of migrations) {
  try {
    db.exec(sql);
    console.log("✓", sql.slice(0, 60).trim() + (sql.length > 60 ? "…" : ""));
  } catch (e) {
    if (e.message?.includes("duplicate column") || e.message?.includes("already exists")) {
      console.log("  (already exists, skipped)");
    } else {
      console.warn("  ⚠", e.message);
    }
  }
}

// Add admin user if not present
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const ADMIN_ID = "ad000000-0000-4000-8000-000000000001";
const ADMIN_EMAIL = "admin@creatorconnect.co.ke";
const now = new Date().toISOString();

const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(ADMIN_EMAIL);
if (!existing) {
  db.prepare("INSERT INTO users (id, email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(ADMIN_ID, ADMIN_EMAIL, hashPassword("admin1234"), "Admin", now);
  db.prepare("INSERT OR IGNORE INTO profiles (id, display_name, created_at) VALUES (?, ?, ?)")
    .run(ADMIN_ID, "Admin", now);
  db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role, created_at) VALUES (?, 'admin', ?)")
    .run(ADMIN_ID, now);
  db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role, created_at) VALUES (?, 'fan', ?)")
    .run(ADMIN_ID, now);
  console.log("✓ Admin user created: admin@creatorconnect.co.ke / admin1234");
} else {
  // Make sure admin role exists
  db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role, created_at) VALUES (?, 'admin', ?)")
    .run(existing.id, now);
  console.log("✓ Admin user already exists");
}

db.close();
console.log("\n✅ Migration complete!");

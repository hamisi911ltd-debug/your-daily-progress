-- Migration: add new columns and tables to existing CreatorConnect databases
-- Run once on existing databases. Safe to run multiple times (errors are ignored).

ALTER TABLE users ADD COLUMN phone_number TEXT;
ALTER TABLE users ADD COLUMN facebook_id TEXT;
ALTER TABLE users ADD COLUMN tiktok_id TEXT;
ALTER TABLE profiles ADD COLUMN phone_number TEXT;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Run once on existing databases. Safe to run multiple times (errors are ignored).

ALTER TABLE users ADD COLUMN google_id TEXT;
ALTER TABLE profiles ADD COLUMN instagram_url TEXT;
ALTER TABLE profiles ADD COLUMN tiktok_url TEXT;
ALTER TABLE profiles ADD COLUMN snapchat_url TEXT;
ALTER TABLE profiles ADD COLUMN facebook_url TEXT;

CREATE TABLE IF NOT EXISTS creator_gallery (
  id TEXT PRIMARY KEY NOT NULL,
  creator_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_creator_gallery ON creator_gallery(creator_id, created_at);

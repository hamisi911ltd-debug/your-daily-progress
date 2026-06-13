-- Cloudflare D1 schema for CreatorConnect (SQLite)
-- Run with: wrangler d1 execute <DB_NAME> --file=./cloudflare/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, role),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS creator_profiles (
  user_id TEXT PRIMARY KEY NOT NULL,
  headline TEXT NOT NULL DEFAULT '',
  long_bio TEXT,
  hero_image_url TEXT,
  niche_tags TEXT NOT NULL DEFAULT '[]',
  verified INTEGER NOT NULL DEFAULT 0,
  average_rating REAL NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  starting_price_kes INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_packages (
  id TEXT PRIMARY KEY NOT NULL,
  creator_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price_kes INTEGER NOT NULL DEFAULT 0,
  session_type TEXT NOT NULL DEFAULT 'online'
    CHECK (session_type IN ('online', 'in-person', 'hybrid')),
  location TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY NOT NULL,
  fan_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  total_kes INTEGER NOT NULL DEFAULT 0,
  platform_fee_kes INTEGER NOT NULL DEFAULT 0,
  creator_payout_kes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'declined')),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  mpesa_reference TEXT,
  fan_note TEXT,
  meeting_room_id TEXT,
  zoom_meeting_id TEXT,
  zoom_meeting_password TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (fan_id) REFERENCES users(id),
  FOREIGN KEY (creator_id) REFERENCES users(id),
  FOREIGN KEY (package_id) REFERENCES session_packages(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY NOT NULL,
  booking_id TEXT NOT NULL UNIQUE,
  fan_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (fan_id) REFERENCES users(id),
  FOREIGN KEY (creator_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_creator_profiles_active ON creator_profiles(active, average_rating);
CREATE INDEX IF NOT EXISTS idx_session_packages_creator ON session_packages(creator_id, active);
CREATE INDEX IF NOT EXISTS idx_bookings_fan ON bookings(fan_id);
CREATE INDEX IF NOT EXISTS idx_bookings_creator ON bookings(creator_id);
CREATE INDEX IF NOT EXISTS idx_reviews_creator ON reviews(creator_id);

#!/usr/bin/env node
/**
 * Local dev seeder — creates .dev-data/creatorconnect.db and seeds realistic data.
 * Run: node scripts/seed.js
 * Node 22+ required (uses built-in node:sqlite).
 */
import { scryptSync, randomBytes } from "node:crypto";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DB_DIR = join(ROOT, ".dev-data");
const DB_PATH = join(DB_DIR, "creatorconnect.db");

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function img(id, w, h) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);

// ── Schema ────────────────────────────────────────────────────────────────
const schema = readFileSync(join(ROOT, "cloudflare", "schema.sql"), "utf8");
// Execute each statement individually
schema.split(";").map(s => s.trim()).filter(Boolean).forEach(stmt => {
  try { db.exec(stmt + ";"); } catch {}
});

console.log("✓ Schema applied");

// ── Seed data ─────────────────────────────────────────────────────────────
const PASSWORD = "test1234";

const FANS = [
  {
    id: "fa000000-0000-4000-8000-000000000001",
    email: "brian@test.com",
    name: "Brian Muriuki",
    avatar: img("1539571696357-5a69c17a67c6", 200, 200),
    bio: "Music lover and aspiring entrepreneur based in Mombasa.",
    location: "Mombasa, Kenya",
  },
  {
    id: "fa000000-0000-4000-8000-000000000002",
    email: "grace@test.com",
    name: "Grace Waweru",
    avatar: img("1438761681033-6461ffad8d80", 200, 200),
    bio: "Content creator learning the ropes of digital marketing.",
    location: "Nairobi, Kenya",
  },
];

const CREATORS = [
  {
    id: "ca000000-0000-4000-8000-000000000001",
    email: "zawadi@test.com",
    name: "Zawadi Achieng",
    avatar: img("1494790108377-be9c29b29330", 200, 200),
    heroImage: img("1557804506-669a67965ba0", 800, 500),
    bio: "Brand strategist with 8 years building iconic Kenyan companies.",
    location: "Nairobi, Kenya",
    headline: "I'll help you build a brand your customers can't ignore",
    longBio: "I've spent 8 years crafting brand strategies for Kenyan startups, NGOs, and consumer brands. From Airtel to small Nairobi barbershops — the same principles apply. Let's make your brand unforgettable.",
    niches: ["branding", "marketing", "business"],
    price: 2500,
    rating: 4.9,
    sessions: 47,
    verified: true,
    packages: [
      { id: "ab000001-0000-4000-8000-000000000001", title: "Brand Audit", desc: "30-min deep review of your brand identity, messaging and online presence.", duration: 30, price: 2500, type: "online" },
      { id: "ab000001-0000-4000-8000-000000000002", title: "Marketing Strategy Session", desc: "60-min structured marketing plan tailored to your business and budget.", duration: 60, price: 4500, type: "online" },
      { id: "ab000001-0000-4000-8000-000000000003", title: "Full Brand Overhaul Workshop", desc: "90-min intensive workshop to reposition your entire brand from scratch.", duration: 90, price: 7000, type: "online" },
    ],
  },
  {
    id: "ca000000-0000-4000-8000-000000000002",
    email: "kofi@test.com",
    name: "Kofi Mensah",
    avatar: img("1507003211169-0a1dd7228f2d", 200, 200),
    heroImage: img("1511671782779-c97d3d27a1d4", 800, 500),
    bio: "Music producer and songwriter behind some of Kenya's biggest afro-pop hits.",
    location: "Nairobi, Kenya",
    headline: "Grammy-nominated producer. Your next hit starts here.",
    longBio: "I've produced music for artists across East Africa and collaborated with international acts. Whether you're a new artist or an established name looking to evolve, I'll help you find your sound.",
    niches: ["music", "production", "artist-development"],
    price: 3000,
    rating: 4.8,
    sessions: 32,
    verified: true,
    packages: [
      { id: "ab000002-0000-4000-8000-000000000001", title: "Song Feedback Session", desc: "30-min honest critique of your track — arrangement, lyrics, mix, everything.", duration: 30, price: 3000, type: "online" },
      { id: "ab000002-0000-4000-8000-000000000002", title: "Artist Development Call", desc: "60-min career strategy session for emerging artists.", duration: 60, price: 5500, type: "online" },
    ],
  },
  {
    id: "ca000000-0000-4000-8000-000000000003",
    email: "amara@test.com",
    name: "Amara Njeri",
    avatar: img("1517841905240-472988babdf9", 200, 200),
    heroImage: img("1534438327276-14e5300c3a48", 800, 500),
    bio: "NASM-certified personal trainer helping Nairobi professionals get fit sustainably.",
    location: "Nairobi, Kenya",
    headline: "Sustainable fitness for busy Kenyans — no gimmicks, just results.",
    longBio: "After burning out chasing quick fixes myself, I became a certified personal trainer focused on sustainable, science-backed fitness. I work with corporate professionals, new moms, and athletes across Nairobi.",
    niches: ["fitness", "wellness", "nutrition"],
    price: 1500,
    rating: 4.7,
    sessions: 89,
    verified: true,
    packages: [
      { id: "ab000003-0000-4000-8000-000000000001", title: "Fitness Assessment", desc: "30-min analysis of your current fitness level and goal-setting session.", duration: 30, price: 1500, type: "online" },
      { id: "ab000003-0000-4000-8000-000000000002", title: "Custom Workout Plan", desc: "60-min session to design a 4-week personalised training programme.", duration: 60, price: 2800, type: "online" },
      { id: "ab000003-0000-4000-8000-000000000003", title: "Monthly Check-in", desc: "30-min monthly progress review and plan adjustment.", duration: 30, price: 1200, type: "online" },
    ],
  },
  {
    id: "ca000000-0000-4000-8000-000000000004",
    email: "farouk@test.com",
    name: "Farouk Hassan",
    avatar: img("1472099645785-5658abf4ff4e", 200, 200),
    heroImage: img("1460925895917-afdab827c52f", 800, 500),
    bio: "Certified financial planner helping Kenyans invest wisely and build generational wealth.",
    location: "Nairobi, Kenya",
    headline: "Stop living paycheck to paycheck. Let's build your wealth plan.",
    longBio: "I've helped 200+ Kenyans navigate investment options, start SACCOs, and escape debt. I combine formal financial planning with Kenyan market realities — no textbook Western advice.",
    niches: ["finance", "investment", "business"],
    price: 3500,
    rating: 4.9,
    sessions: 124,
    verified: true,
    packages: [
      { id: "ab000004-0000-4000-8000-000000000001", title: "Financial Health Check", desc: "45-min audit of your income, expenses, debts and savings to find your leaks.", duration: 45, price: 3500, type: "online" },
      { id: "ab000004-0000-4000-8000-000000000002", title: "Investment Strategy Session", desc: "60-min personalised investment plan covering NSE, SACCOs, real estate and more.", duration: 60, price: 5000, type: "online" },
    ],
  },
  {
    id: "ca000000-0000-4000-8000-000000000005",
    email: "wanjiku@test.com",
    name: "Wanjiku Kamau",
    avatar: img("1534528741775-53994a69daeb", 200, 200),
    heroImage: img("1573497019940-1c28c88b4f3e", 800, 500),
    bio: "Digital marketing strategist and founder of a Nairobi-based growth agency.",
    location: "Nairobi, Kenya",
    headline: "I help Kenyan businesses go from invisible to irresistible online.",
    longBio: "I built my first brand from 0 to 50K followers on a shoestring budget. Now I help businesses do the same. Specialising in Instagram, TikTok, and WhatsApp marketing for the Kenyan market.",
    niches: ["social-media", "marketing", "content"],
    price: 2000,
    rating: 4.6,
    sessions: 61,
    verified: false,
    packages: [
      { id: "ab000005-0000-4000-8000-000000000001", title: "Social Media Audit", desc: "30-min review of your social presence with quick wins you can act on today.", duration: 30, price: 2000, type: "online" },
      { id: "ab000005-0000-4000-8000-000000000002", title: "Content Strategy Sprint", desc: "90-min session to build a 30-day content calendar and posting strategy.", duration: 90, price: 5500, type: "online" },
    ],
  },
  {
    id: "ca000000-0000-4000-8000-000000000006",
    email: "baraka@test.com",
    name: "Baraka Oduya",
    avatar: img("1506794778202-cad84cf45f1d", 200, 200),
    heroImage: img("1519389950473-47ba0277781c", 800, 500),
    bio: "Tech entrepreneur and founder of two Y Combinator-backed startups.",
    location: "Nairobi, Kenya",
    headline: "From idea to funded startup — I've done it twice. Let me help you.",
    longBio: "I co-founded Peza (logistics) and AfyaTech (health tech), both YC-backed. I advise early-stage founders on product-market fit, fundraising, and building teams in the African market.",
    niches: ["tech", "startups", "entrepreneurship"],
    price: 5000,
    rating: 5.0,
    sessions: 28,
    verified: true,
    packages: [
      { id: "ab000006-0000-4000-8000-000000000001", title: "Startup Feedback Session", desc: "45-min honest feedback on your pitch deck, idea, or MVP.", duration: 45, price: 5000, type: "online" },
      { id: "ab000006-0000-4000-8000-000000000002", title: "Fundraising Strategy", desc: "60-min session on how to approach angels, VCs and accelerators in Africa.", duration: 60, price: 8000, type: "online" },
    ],
  },
  {
    id: "ca000000-0000-4000-8000-000000000007",
    email: "naomi@test.com",
    name: "Naomi Mwangi",
    avatar: img("1488426862026-3ee34a7d66df", 200, 200),
    heroImage: img("1560250097-0b93528c311a", 800, 500),
    bio: "ICF-certified life coach helping high-achievers find clarity, purpose, and balance.",
    location: "Kisumu, Kenya",
    headline: "You're succeeding on the outside. Let's fix the inside too.",
    longBio: "I coach senior professionals, entrepreneurs, and creatives who have achieved external success but feel lost or unfulfilled. My approach blends ICF-certified coaching with African values and lived experience.",
    niches: ["coaching", "wellness", "mindset"],
    price: 4000,
    rating: 4.8,
    sessions: 53,
    verified: true,
    packages: [
      { id: "ab000007-0000-4000-8000-000000000001", title: "Clarity Session", desc: "60-min guided session to identify what's blocking you and what you truly want.", duration: 60, price: 4000, type: "online" },
      { id: "ab000007-0000-4000-8000-000000000002", title: "Monthly Coaching Package", desc: "4 x 60-min sessions across the month with WhatsApp support in between.", duration: 60, price: 14000, type: "online" },
    ],
  },
  {
    id: "ca000000-0000-4000-8000-000000000008",
    email: "zara@test.com",
    name: "Zara Wanjiku",
    avatar: img("1529156069898-49953e39b3ac", 200, 200),
    heroImage: img("1611162617213-7d7a39e9b1d7", 800, 500),
    bio: "YouTube creator with 200K subscribers teaching African creatives to monetise online.",
    location: "Nairobi, Kenya",
    headline: "I turned my YouTube channel into a 6-figure business. You can too.",
    longBio: "I grew my YouTube channel to 200K subscribers in 2 years while working a full-time job. I now teach African creators how to build, grow, and monetise channels without selling out.",
    niches: ["content-creation", "youtube", "monetisation"],
    price: 2500,
    rating: 4.7,
    sessions: 72,
    verified: true,
    packages: [
      { id: "ab000008-0000-4000-8000-000000000001", title: "Channel Review", desc: "30-min deep review of your YouTube channel with growth recommendations.", duration: 30, price: 2500, type: "online" },
      { id: "ab000008-0000-4000-8000-000000000002", title: "Monetisation Roadmap", desc: "60-min session building your step-by-step plan to earn from your content.", duration: 60, price: 4500, type: "online" },
    ],
  },
];

const now = new Date().toISOString();

// Insert fans
for (const fan of FANS) {
  const hash = hashPassword(PASSWORD);
  db.prepare(`INSERT OR IGNORE INTO users (id, email, password_hash, display_name, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(fan.id, fan.email, hash, fan.name, fan.avatar, now);
  db.prepare(`INSERT OR IGNORE INTO profiles (id, display_name, avatar_url, bio, location, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(fan.id, fan.name, fan.avatar, fan.bio, fan.location, now);
  db.prepare(`INSERT OR IGNORE INTO user_roles (user_id, role, created_at) VALUES (?, 'fan', ?)`).run(fan.id, now);
  console.log(`  ✓ Fan: ${fan.name} (${fan.email})`);
}

// Insert creators
for (const c of CREATORS) {
  const hash = hashPassword(PASSWORD);
  db.prepare(`INSERT OR IGNORE INTO users (id, email, password_hash, display_name, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(c.id, c.email, hash, c.name, c.avatar, now);
  db.prepare(`INSERT OR IGNORE INTO profiles (id, display_name, avatar_url, bio, location, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(c.id, c.name, c.avatar, c.bio, c.location, now);
  db.prepare(`INSERT OR IGNORE INTO user_roles (user_id, role, created_at) VALUES (?, 'fan', ?)`).run(c.id, now);
  db.prepare(`INSERT OR IGNORE INTO user_roles (user_id, role, created_at) VALUES (?, 'creator', ?)`).run(c.id, now);
  db.prepare(`INSERT OR IGNORE INTO creator_profiles (user_id, headline, long_bio, hero_image_url, niche_tags, verified, average_rating, total_sessions, starting_price_kes, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`).run(c.id, c.headline, c.longBio, c.heroImage, JSON.stringify(c.niches), c.verified ? 1 : 0, c.rating, c.sessions, c.price, now);
  for (const pkg of c.packages) {
    db.prepare(`INSERT OR IGNORE INTO session_packages (id, creator_id, title, description, duration_minutes, price_kes, session_type, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`).run(pkg.id, c.id, pkg.title, pkg.desc, pkg.duration, pkg.price, pkg.type, now);
  }
  console.log(`  ✓ Creator: ${c.name} (${c.email}) — ${c.packages.length} packages`);
}

db.close();

console.log(`
✅ Seed complete! Database at .dev-data/creatorconnect.db

Test accounts (password: test1234):
  Fans:
    brian@test.com
    grace@test.com
  Creators (can also sign in as fans):
    zawadi@test.com   — Brand Strategy
    kofi@test.com     — Music Production
    amara@test.com    — Personal Training
    farouk@test.com   — Financial Planning
    wanjiku@test.com  — Social Media Marketing
    baraka@test.com   — Tech Startups
    naomi@test.com    — Life Coaching
    zara@test.com     — YouTube / Content

Full booking flow:
  1. Sign in as brian@test.com
  2. Browse creators → click any creator
  3. Click a package → "Book now"
  4. Pick a time → Continue
  5. Enter phone 0712345678 → Pay now
  6. Go to My bookings → Join room (Jitsi video call opens)
`);

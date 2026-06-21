import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { d1All, d1One } from "@/integrations/cloudflare/d1";

const SYSTEM_PROMPT = `You are FanmeeetBot, the friendly AI assistant for Fanmeeet — Kenya's premier marketplace for booking private live 1:1 video sessions with creators, coaches, musicians, influencers, and other professionals.

You have access to real-time database information. Use your tools to answer questions accurately.

## Platform Knowledge
- Fans browse creators, book sessions, and pay via M-Pesa (KES)
- Creators earn 87.5% of session fees; platform keeps 12.5%
- All sessions are live video calls (self-hosted WebRTC, peer-to-peer)
- Cancellation policy: >24h before = 75% refund; <24h = 0% refund
- Creator profiles show niche tags, ratings (1-5 stars), and session packages
- Users can link Instagram, TikTok, Snapchat, Facebook on their profile
- Bookings go: pending → confirmed (once paid) → completed

## Navigation Links (always use markdown [text](/path) for internal links)
- Home page: [Home](/)
- Browse all creators: [Browse creators](/browse)
- Sign in: [Sign in](/auth)
- Create fan account: [Sign up as a fan](/auth?mode=signup)
- Create creator account: [Sign up as a creator](/auth?mode=signup)
- Forgot password: [Reset your password](/auth?mode=signin) — click "Forgot password?"
- My bookings: [My bookings](/bookings)
- Creator dashboard: [Creator dashboard](/creator-dashboard)
- My profile & social links: [My profile](/profile)
- Apply as creator: [Become a creator](/become-creator)

## Your Capabilities
1. Search for creators by name, niche, or keyword (use search_creators tool)
2. Check if a specific person is a creator on the platform (use search_creators)
3. Get live platform statistics — total users, creators, bookings, revenue (use get_platform_stats)
4. Get full details on any creator — packages, prices, bio (use get_creator_details)
5. Guide users step-by-step through any process on the site

## Response Style
- Be warm, concise, and action-oriented
- Always end responses with a helpful next step or link
- When listing creators, show name, top niche, rating, starting price, and a profile link
- Format: **Creator Name** — niche • ⭐ rating • from KES price • [View profile](/creators/ID)
- For step-by-step guides, use numbered lists
- Don't make up information; use tools when unsure about platform data`;

const TOOLS = [
  {
    name: "search_creators",
    description:
      "Search for creators on the platform by name, niche tag, or keyword. Use this to find creators or verify if a specific person is on the platform.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name, niche, or keyword to search" },
        niche: {
          type: "string",
          description:
            "Optional niche filter. Available niches: fitness, music, business, marketing, content-creation, finance, coaching, wellness, tech, startups, branding, social-media, youtube, production, nutrition, entrepreneurship, mindset, investment",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_platform_stats",
    description:
      "Get current platform statistics: total users, creators, fans, bookings, and revenue figures.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_creator_details",
    description: "Get full details for a specific creator by their user ID, including bio, packages, and prices.",
    input_schema: {
      type: "object",
      properties: {
        creator_id: { type: "string", description: "The creator's user ID (UUID)" },
      },
      required: ["creator_id"],
    },
  },
];

async function executeTool(name: string, input: Record<string, any>): Promise<unknown> {
  if (name === "search_creators") {
    type Row = {
      user_id: string;
      display_name: string | null;
      headline: string;
      niche_tags: string;
      verified: number;
      average_rating: number;
      total_sessions: number;
      starting_price_kes: number;
    };

    let rows: Row[];
    if (input.niche) {
      rows = await d1All<Row>(
        `SELECT cp.user_id, p.display_name, cp.headline, cp.niche_tags, cp.verified,
                cp.average_rating, cp.total_sessions, cp.starting_price_kes
         FROM creator_profiles cp
         LEFT JOIN profiles p ON p.id = cp.user_id
         WHERE cp.active = 1
           AND EXISTS (SELECT 1 FROM json_each(cp.niche_tags) je WHERE je.value = ?)
         ORDER BY cp.verified DESC, cp.average_rating DESC
         LIMIT 8`,
        [input.niche]
      );
    } else {
      rows = await d1All<Row>(
        `SELECT cp.user_id, p.display_name, cp.headline, cp.niche_tags, cp.verified,
                cp.average_rating, cp.total_sessions, cp.starting_price_kes
         FROM creator_profiles cp
         LEFT JOIN profiles p ON p.id = cp.user_id
         WHERE cp.active = 1
         ORDER BY cp.verified DESC, cp.average_rating DESC
         LIMIT 60`,
        []
      );
    }

    const q = (input.query ?? "").toLowerCase();
    const filtered = rows
      .map((c) => ({
        id: c.user_id,
        name: c.display_name ?? "Creator",
        headline: c.headline,
        niches: (() => {
          try { return JSON.parse(c.niche_tags as string) as string[]; } catch { return [] as string[]; }
        })(),
        verified: c.verified === 1,
        rating: Number(c.average_rating) || 0,
        sessions: c.total_sessions,
        startingPriceKes: c.starting_price_kes,
        profileUrl: `/creators/${c.user_id}`,
      }))
      .filter(
        (c) =>
          q === "" ||
          c.name.toLowerCase().includes(q) ||
          c.headline.toLowerCase().includes(q) ||
          c.niches.some((n) => n.toLowerCase().includes(q))
      )
      .slice(0, 8);

    return {
      found: filtered.length,
      creators: filtered,
    };
  }

  if (name === "get_platform_stats") {
    const [users, creators, bookings, revenue] = await Promise.all([
      d1One<{ n: number }>("SELECT COUNT(*) as n FROM users"),
      d1One<{ n: number }>("SELECT COUNT(*) as n FROM creator_profiles WHERE active = 1"),
      d1One<{ n: number }>("SELECT COUNT(*) as n FROM bookings"),
      d1One<{ total: number }>(
        "SELECT COALESCE(SUM(total_kes),0) as total FROM bookings WHERE payment_status = 'paid'"
      ),
    ]);
    return {
      totalUsers: users?.n ?? 0,
      activeCreators: creators?.n ?? 0,
      totalBookings: bookings?.n ?? 0,
      totalRevenueKes: revenue?.total ?? 0,
      platformFeeKes: Math.round((revenue?.total ?? 0) * 0.125),
    };
  }

  if (name === "get_creator_details") {
    const creator = await d1One<any>(
      `SELECT cp.user_id, p.display_name, p.bio, p.location, p.avatar_url,
              cp.headline, cp.long_bio, cp.niche_tags, cp.verified,
              cp.average_rating, cp.total_sessions, cp.starting_price_kes
       FROM creator_profiles cp
       LEFT JOIN profiles p ON p.id = cp.user_id
       WHERE cp.user_id = ? AND cp.active = 1`,
      [input.creator_id]
    );
    if (!creator) return { found: false };

    const packages = await d1All<any>(
      `SELECT title, description, duration_minutes, price_kes, session_type
       FROM session_packages WHERE creator_id = ? AND active = 1 ORDER BY price_kes ASC`,
      [input.creator_id]
    );

    return {
      found: true,
      id: creator.user_id,
      name: creator.display_name ?? "Creator",
      headline: creator.headline,
      bio: creator.long_bio ?? creator.bio,
      location: creator.location,
      niches: (() => { try { return JSON.parse(creator.niche_tags); } catch { return []; } })(),
      verified: creator.verified === 1,
      rating: Number(creator.average_rating) || 0,
      totalSessions: creator.total_sessions,
      profileUrl: `/creators/${creator.user_id}`,
      packages: packages.map((p: any) => ({
        title: p.title,
        duration: p.duration_minutes,
        priceKes: p.price_kes,
        type: p.session_type,
      })),
    };
  }

  return { error: "Unknown tool" };
}

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const ChatInput = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
});

export const chat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        reply:
          "I'm not configured yet. Please ask the site admin to add the ANTHROPIC_API_KEY environment variable to enable the AI assistant.",
      };
    }

    // Build message history for Claude
    const messages: any[] = data.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Tool-use loop (max 5 iterations to prevent infinite loops)
    for (let i = 0; i < 5; i++) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Anthropic API error: ${err}`);
      }

      const response = (await res.json()) as any;

      if (response.stop_reason === "end_turn") {
        const textBlock = response.content?.find((b: any) => b.type === "text");
        return { reply: textBlock?.text ?? "I had trouble generating a response. Please try again." };
      }

      if (response.stop_reason === "tool_use") {
        // Collect tool calls
        const toolResults: any[] = [];
        for (const block of response.content ?? []) {
          if (block.type === "tool_use") {
            const result = await executeTool(block.name, block.input ?? {});
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          }
        }

        // Append assistant turn + tool results
        messages.push({ role: "assistant", content: response.content });
        messages.push({ role: "user", content: toolResults });
        continue;
      }

      // Unexpected stop reason — return whatever text is in the response
      const textBlock = response.content?.find((b: any) => b.type === "text");
      return { reply: textBlock?.text ?? "Something went wrong. Please try again." };
    }

    return { reply: "I needed too many steps to answer. Please try rephrasing your question." };
  });

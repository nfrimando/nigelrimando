# Project Overview

A personal website built with Next.js (App Router), Tailwind CSS, hosted on Vercel.
It serves as a resume, journal, thought log, and daily data tracker (exercises, expenses, etc.).
Database: Turso (libSQL) via Drizzle ORM.
Auth: Clerk (for private routes).

# Current Phase

Phase 4 — Journaling system, admin dashboard, and DB are live. Homepage is still the public entry point.

# Stack

- Next.js 14+ with App Router
- TypeScript
- Tailwind CSS
- Turso + Drizzle ORM
- iron-session (auth for protected routes)
- Hosted on Vercel

# Auth

iron-session protects all `/admin/*` and `/api/admin/*` routes. Session secret is the `SESSION_SECRET` env var. No Clerk.

# Timezone

The user lives in the Philippines (Asia/Manila, UTC+8). All date-related computations must use this timezone, not UTC. Vercel servers run in UTC, so `new Date().toISOString()` returns the wrong date during the 8 hours before midnight PH time. Always derive "today" using:

```ts
new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date())
// returns "YYYY-MM-DD" in PH local time
```

When computing differences between two `YYYY-MM-DD` strings, parse them as local Date objects (`new Date(y, m-1, d)`) to avoid UTC offset drift.

# Code Conventions

- Use App Router conventions (no `pages/` directory)
- Prefer server components by default; use `"use client"` only when needed
- Co-locate components in `/components` if reused, otherwise inline in the route file
- Use Tailwind utility classes only — no CSS modules or styled-components
- TypeScript strict mode on

# Personal Site Design System

## Brand

Sharp technical consultant. Friendly builder. Premium execution.

Tone:
precise, calm, intelligent, understated confidence.

Avoid:
neon gradients, loud colors, playful animations, corporate blue overload.

## Colors

--bg: #F7F3EE
--surface: #FFFFFF
--surface-alt: #EFE8DF

--text: #171A1F
--text-muted: #66707A

--accent: #4E6877
--accent-hover: #3E5663
Muted steel blue for trust + technical depth.

--warm: #8B6C61
Subtle warmth for humanity.

--success: #5E8365

## Typography

Headings: Inter Tight 700
Body: Inter 400–500
Metrics/code: JetBrains Mono

Tracking:
tight headings
normal body

## Layout

Max width: 1200px
Reading width: 760px
Large whitespace
12-column grid

## Components

Radius:
cards 20px
buttons 14px

Shadow:
soft, minimal

Borders:
1px subtle neutral

## Motion

180–220ms
fade / slide only
no bounce

## Visual Style

Editorial + product-grade.
Clean cards.
Strong spacing.
Minimal chrome.

## Personality

Feels like:
“Built by a serious systems thinker who ships polished products.”

## Imagery

Natural warm portraits.
Cat allowed as subtle recurring brand element.

## Homepage

1. Hero (clear value prop)
2. Data journal (exercise insights first)
3. Live projects
4. Stream ("Thinking out loud" — horizontal scroll feed)
5. Personal note
6. CTA

## Stream Section ("Thinking out loud")

Live on homepage (`#stream`). A horizontally scrollable feed of mixed content, sorted by date descending.

**Architecture:**
- `lib/content-stream.ts` — `ContentItem` union type + `getContentStream()` aggregator
- `lib/sources/medium.ts` — fetches `https://medium.com/feed/@nfrimando` via RSS (ISR, revalidates daily). Extracts title, url, pubDate, excerpt (stripped HTML), and `thumbnailUrl` (first `cdn-images` src from `content:encoded`)
- `lib/sources/thoughts.ts` — stub for now; will query `thoughts` DB table filtered by `published: true`

**ContentItem type:**
```ts
| { type: "medium"; title; url; date; excerpt; thumbnailUrl? }
| { type: "thought"; id; text; date; imageUrl? }
| { type: "youtube"; url; title; date }  // future
```

**To add a new source:** create `lib/sources/<name>.ts` returning `ContentItem[]`, add one `await` call in `getContentStream()`, add a card component + branch in the stream map in `page.tsx`. No other structural changes needed.

**Card layout:** fixed `w-72 shrink-0` cards in a `flex overflow-x-auto` container. `MediumCard` shows thumbnail image at top (h-44, object-cover), then type badge, date, title, excerpt, and "Read on Medium →" link. `ThoughtCard` shows date, text body, optional image.

**Future sources to consider:** curated links/reads worth sharing from other sites, YouTube embeds.

## TODO: Deferred homepage sections

### What I've built (Featured builds)
- PadelLens as the featured card (full-stack analytics for padel players/clubs; Next.js, TypeScript, PostgreSQL, Python; status: Live)
- Grid of smaller cards for other projects (Project Beta: Go CLI, open source; Project Gamma: React Native finance app)
- Each card: name, tagline, description, tags, status badge, GitHub/Live links

### How I can help (Consulting capability)
- 4 capability cards in a 2-col grid: Product Infrastructure, Data Systems, Full-Stack Development, Technical Strategy
- Closing paragraph: "I work best with early-stage teams that need a trusted technical partner…" with email CTA

## UI Structure

- Always make sure structure and content will adjust well in mobile view

# Folder Structure

app/
  layout.tsx, page.tsx       ← root + homepage (public)
  login/                     ← session login
  admin/                     ← protected dashboard
  journal/
    sets/                    ← workout log
    padel/                   ← padel analytics
    habits/                  ← habit tracker
    ebike/                   ← e-bike trips
  api/
    admin/*                  ← CRUD routes (session-protected)
    journal/*                ← data queries
    visitor-messages/        ← public contact
components/
  ui/                        ← reusable primitives (buttons, cards, etc.)
public/
  assets/                    ← images, icons
lib/
  db.ts                      ← Turso + Drizzle client
  schema.ts                  ← 11 tables (exercises, sets, padel, habits, thoughts, etc.)
  session.ts                 ← iron-session config
  content-stream.ts          ← Medium + thoughts aggregator
  sources/
    medium.ts                ← RSS parser (live)
    thoughts.ts              ← stub (will query thoughts table)

# Environment Variables

TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
SESSION_SECRET=

# Deployment

- Vercel, connected to GitHub repo
- Auto-deploy on push to `main`

# Phases

- [x] Phase 1: Homepage (who I am)
- [x] Phase 2: Exercise log (sets, padel, ebike)
- [x] Phase 3: Journal + habits (iron-session protected)
- [x] Phase 4: Daily log tracker (Turso DB, 11 tables)

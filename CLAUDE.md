# Project Overview

A personal website built with Next.js (App Router), Tailwind CSS, hosted on Vercel.
It serves as a resume, journal, thought log, and daily data tracker (exercises, expenses, etc.).
Database: Turso (libSQL) via Drizzle ORM.
Auth: Clerk (for private routes).

# Current Phase

Phase 1 — Public homepage (resume/portfolio). No auth or DB needed yet.

# Stack

- Next.js 14+ with App Router
- TypeScript
- Tailwind CSS
- Turso + Drizzle ORM (not wired up yet)
- Clerk (not wired up yet)
- Hosted on Vercel

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
3. Personal note + cat
4. CTA

## TODO: Deferred homepage sections

### What I've built (Featured builds)
- PadelLens as the featured card (full-stack analytics for padel players/clubs; Next.js, TypeScript, PostgreSQL, Python; status: Live)
- Grid of smaller cards for other projects (Project Beta: Go CLI, open source; Project Gamma: React Native finance app)
- Each card: name, tagline, description, tags, status badge, GitHub/Live links

### Writing & insights (Thinking out loud)
- Section label: "Thinking out loud"
- List of post cards: title, description, date (currently "Coming soon")
- Initial posts: "Why most data pipelines fail before they're useful", "The 80% rule for API design"
- Cards link out to full posts when published

### How I can help (Consulting capability)
- 4 capability cards in a 2-col grid: Product Infrastructure, Data Systems, Full-Stack Development, Technical Strategy
- Closing paragraph: "I work best with early-stage teams that need a trusted technical partner…" with email CTA

## UI Structure

- Always make sure structure and content will adjust well in mobile view

# Folder Structure

app/
layout.tsx ← root layout, global fonts/styles
page.tsx ← homepage (public resume)
components/
ui/ ← reusable primitives (buttons, cards, etc.)
public/
assets/ ← images, icons
lib/
db.ts ← Turso client (scaffold only for now)

# Environment Variables

TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
(Not needed for Phase 1 — leave blank)

# Deployment

- Vercel, connected to GitHub repo
- Auto-deploy on push to `main`

# Phases

- [x] Phase 1: Homepage (who I am)
- [ ] Phase 2: Exercise log page (from Google Sheets)
- [ ] Phase 3: Journal + thoughts (private, Clerk-protected)
- [ ] Phase 4: Daily log tracker (Turso DB)

# Personal Website

Personal website and portfolio built with Next.js, TypeScript, and Tailwind CSS.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Fonts**: Inter via `next/font/google`
- **Deployment**: Vercel

## Project Structure

```
app/
  layout.tsx      # Root layout, fonts, metadata
  page.tsx        # Homepage — all sections
  globals.css     # Tailwind import + theme vars
components/
  Nav.tsx         # Sticky navigation (client component)
  ui/
    Badge.tsx     # Skill / tag badge primitive
lib/
  db.ts           # Turso client scaffold (Phase 4)
public/
  assets/         # Images, icons
```

## Phases

- [x] Phase 1: Homepage (who I am)
- [ ] Phase 2: Exercise log page (from Google Sheets)
- [ ] Phase 3: Journal + thoughts (Clerk-protected)
- [ ] Phase 4: Daily log tracker (Turso DB)

## Customizing the content

All placeholder content lives at the top of [app/page.tsx](app/page.tsx) as plain data arrays — no CMS needed for Phase 1. Update the `skills`, `experience`, `projects`, and `education` objects, then replace all occurrences of `yourusername` and `you@example.com`.

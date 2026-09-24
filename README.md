# posted.

A private place for two people to leave pieces of their day for each other.

Built with Next.js 16 (App Router) and Supabase (Postgres, email sign-in, storage, realtime).
The design doc lives at https://claude.ai/artifact/6EZZham2hBEuZHFzfZ6qgo

## What's in it

- **Today.** Write, add up to 6 photos, record a voice memo, or post a My day (weather, energy,
  four optional prompts). Posts get a postmark with your city and local time. Spoken times,
  day headings, the "you were last here" line, both clocks, the visit countdown, and the next
  Sunday lesson. A quiet "Arya just posted" line appears if something arrives while you're reading.
- **Voice memos.** Tap to record (up to 5 minutes), listen back, post. The waveform is measured
  while you record. Memos that fail to upload are kept in the browser until they send.
  Players remember where you stopped, play one at a time, and switch between 1×, 1.5×, and 2×.
- **Writing back.** Each post has its own page with notes in the margin, by text or voice.
- **Reactions.** One tap for a heart; hover (or long-press on a phone) for 😂 😭 😮 🥹 👀.
  Each reaction is drawn in the ink of whoever left it. No counts anywhere.
- **Notebooks.** A shelf of covers. Pick a name, doodle (or emoji), cover color, and a line.
  Rename, archive, or delete. Posts in a notebook still appear on Today.
- **Lesson notebooks.** Turn on "Lesson notebook" for the Spanish notebook to get numbered
  Sunday lessons: topics, vocabulary, homework (checked off in the learner's ink), and questions
  for next Sunday. Unanswered questions move to the next lesson.
- **Kept.** Keep any post from its "…" menu, with an optional private note. Only you see it.
- **You two.** Name, ink, city, time zone, next visit, invite link, daily letter, export, sign out.
- **Phone.** Bottom tab bar with a mic in the middle. Add to Home Screen for an app icon.
- **Keyboard.** `n` writes, `v` records, Cmd/Ctrl+Enter posts.

`/preview` shows Today with sample posts, without a database (development only).

## Setup

1. `npm install`
2. Create a Supabase project at https://supabase.com (free tier is fine).
3. **Run both migrations, in order.** In the dashboard's SQL Editor, paste and run each file in
   `supabase/migrations/`:
   - `20260923000000_init.sql`
   - `20260924000000_everything_else.sql`
4. In Authentication → URL Configuration, set the Site URL and add
   `http://localhost:3000/auth/callback` (and later `https://your-domain/auth/callback`) to Redirect URLs.
5. Copy `.env.example` to `.env.local`. Fill in the Supabase URL and publishable key
   (Project Settings → API). Set `ALLOWED_EMAILS` to your two addresses.
6. `npm run dev`, then open http://localhost:3000

## Deploying

Vercel is the simplest: import the GitHub repo, add the same environment variables, and set
`NEXT_PUBLIC_SITE_URL` to your real address. Add `https://your-domain/auth/callback` to
Supabase's Redirect URLs. Then make a fresh invite link from You two and send it to Arya.

## Daily letter (optional)

An evening email, only on days the other person posted. To turn it on for the site:

1. Create a free account at https://resend.com, verify a sending domain, and create an API key.
2. Add these environment variables where the site is deployed:
   `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API; keep it secret),
   `RESEND_API_KEY`, `LETTER_FROM` (e.g. `posted. <letters@your-domain.com>`),
   `CRON_SECRET` (any long random string), and `NEXT_PUBLIC_SITE_URL`.
3. Call `GET https://your-domain/api/cron/letter` once an hour with the header
   `Authorization: Bearer <CRON_SECRET>`. Vercel's free plan only allows daily cron jobs, so use
   Supabase instead: Integrations → Cron → create an hourly job that makes that HTTP request.

Each person then picks a time under You two → Email.

## Drawings

Your original drawings live in `drawings/` (transparent PNGs). `node scripts/prepare-drawings.mjs`
crops them, thickens lines for small icons, writes app-ready files to `public/doodles/`, and
updates `src/lib/drawn.ts`. To add or replace one, drop the PNG in `drawings/`, add a line to the
list at the top of the script, and run it. Any icon without a drawing yet falls back to a
placeholder SVG in `public/doodles/`. See `public/doodles/README.md` for names.

## Layout

```
src/app/(app)/        signed-in pages: Today, post detail, Notebooks, notebook, Kept, You two
src/app/actions/      server actions (auth, space, posts, notebooks)
src/app/api/          last-seen beacon, export, daily letter
src/components/       UI components
src/lib/              data loading, voice recording, time formatting, feed grouping, inks
supabase/migrations/  database schema, row-level security, storage policies
drawings/             your original hand drawings
scripts/              prepare-drawings.mjs
public/doodles/       app-ready drawings and placeholder SVGs
```

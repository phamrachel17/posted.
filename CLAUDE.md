@AGENTS.md

# posted.

Private web app for exactly two people. The design doc is the source of truth for look and
behavior: https://claude.ai/artifact/6EZZham2hBEuZHFzfZ6qgo

- All MVP milestones from the doc are built (Today, voice, replies/reactions, notebooks, My day,
  lesson notebooks, Kept, daily letter, export). The couple's lesson notebook is Spanish.
- Never show counts about the other person (unread, seen, reactions). Time in cards is spoken
  ("last night"); exact times appear only in postmarks.
- All tables carry `space_id`; RLS compares it to `my_space_id()`. Schema changes go in a new file
  under `supabase/migrations/`. Update grants are column-level on purpose.
- Icons are `<Doodle name="…" />`, backed by files in `public/doodles/` (the user's own drawings
  will replace them). Colors come from tokens in `src/app/globals.css`; per-person color is
  `inkStyle(ink)`.
- `/preview` renders Today with sample data for visual checks without Supabase.

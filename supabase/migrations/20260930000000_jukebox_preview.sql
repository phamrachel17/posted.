-- posted. eighth migration: remember each song's 30-second preview so the
-- record player can play it right on the page.

alter table public.jukebox_songs
  add column preview text check (preview ~ '^https://p\.scdn\.co/');

grant insert (preview) on public.jukebox_songs to authenticated;

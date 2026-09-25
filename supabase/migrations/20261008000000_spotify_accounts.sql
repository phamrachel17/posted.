-- posted. sixteenth migration: connect your own Spotify so the record player can
-- play whole songs (Spotify's Web Playback SDK, which needs Premium). Tokens are
-- per account, not per space, and only you can see yours.

create table public.spotify_accounts (
  user_id       uuid primary key references auth.users on delete cascade,
  refresh_token text not null,
  access_token  text,
  expires_at    timestamptz,
  product       text,              -- 'premium', 'free', ... as Spotify reports it
  updated_at    timestamptz not null default now()
);

alter table public.spotify_accounts enable row level security;
revoke all on public.spotify_accounts from anon, authenticated;
grant select, insert, update, delete on public.spotify_accounts to authenticated;

create policy "spotify: own only" on public.spotify_accounts for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

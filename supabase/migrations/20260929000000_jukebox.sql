-- posted. seventh migration: the jukebox. Whatever song was put on last is
-- what's "playing" for both of you until one of you changes it.

create table public.jukebox_songs (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.spaces on delete cascade,
  kind       text not null default 'track' check (kind in ('track', 'album', 'playlist')),
  spotify_id text not null check (spotify_id ~ '^[A-Za-z0-9]{10,40}$'),
  title      text not null check (char_length(title) between 1 and 200),
  artist     text check (char_length(artist) <= 200),
  image      text check (image ~ '^https://i\.scdn\.co/'),
  set_by     uuid not null,
  created_at timestamptz not null default now(),
  foreign key (set_by, space_id) references public.members (id, space_id) on delete cascade
);
create index jukebox_songs_space_idx on public.jukebox_songs (space_id, created_at desc);

alter table public.jukebox_songs enable row level security;
revoke all on public.jukebox_songs from anon, authenticated;
grant select, delete on public.jukebox_songs to authenticated;
grant insert (space_id, kind, spotify_id, title, artist, image, set_by) on public.jukebox_songs to authenticated;

create policy "jukebox: read space" on public.jukebox_songs for select to authenticated
  using (space_id = (select public.my_space_id()));
create policy "jukebox: put on" on public.jukebox_songs for insert to authenticated
  with check (space_id = (select public.my_space_id()) and set_by = (select public.my_member_id()));
create policy "jukebox: remove own" on public.jukebox_songs for delete to authenticated
  using (set_by = (select public.my_member_id()));

-- The record changes live when the other person puts something on.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.jukebox_songs;
  end if;
end $$;

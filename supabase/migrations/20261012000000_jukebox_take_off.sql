-- posted.: take the song off the record player and leave it empty. The song
-- stays in "Played before"; the record player is empty until someone puts
-- another song on.

alter table public.jukebox_songs add column taken_off_at timestamptz;

grant update (taken_off_at) on public.jukebox_songs to authenticated;

-- Either of you can take the record off, whoever put it on.
create policy "jukebox: take off" on public.jukebox_songs for update to authenticated
  using (space_id = (select public.my_space_id()))
  with check (space_id = (select public.my_space_id()));

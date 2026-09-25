-- posted. fourteenth migration: postage stamps on Today posts.
-- Designed stamps live in the app; photo stamps go in a shared stamp book for the
-- space, so either of you can use one the other made. Each person has a default
-- stamp, and a post keeps the stamp it was sent with (in posts.meta.stamp).

create table public.stamps (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.spaces on delete cascade,
  added_by   uuid not null,
  path       text not null check (
    path ~ '^[0-9a-f-]{36}/stamp-[0-9a-f-]{36}\.jpg$'
    and split_part(path, '/', 1) = space_id::text
  ),
  created_at timestamptz not null default now(),
  unique (space_id, path),
  foreign key (added_by, space_id) references public.members (id, space_id) on delete cascade
);
create index stamps_space_idx on public.stamps (space_id, created_at desc);

alter table public.stamps enable row level security;
revoke all on public.stamps from anon, authenticated;
grant select, delete on public.stamps to authenticated;
grant insert (space_id, added_by, path) on public.stamps to authenticated;

create policy "stamps: read space" on public.stamps for select to authenticated
  using (space_id = (select public.my_space_id()));
create policy "stamps: add" on public.stamps for insert to authenticated
  with check (space_id = (select public.my_space_id()) and added_by = (select public.my_member_id()));
-- Taking a stamp out of the book is for whoever added it. Posts that used it keep it.
create policy "stamps: remove own" on public.stamps for delete to authenticated
  using (added_by = (select public.my_member_id()));

-- Your default stamp: a design ("design:tulip") or a photo from the book ("photo:<path>").
alter table public.members add column stamp text check (
  stamp ~ '^(design:[a-z0-9-]{1,40}|photo:[0-9a-f-]{36}/stamp-[0-9a-f-]{36}\.jpg)$'
);
grant update (stamp) on public.members to authenticated;

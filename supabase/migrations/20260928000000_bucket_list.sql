-- posted. sixth migration: a shared bucket list.
-- Either person can add, edit, check off, or remove anything on it.

create table public.bucket_items (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.spaces on delete cascade,
  body       text not null check (char_length(body) between 1 and 200),
  note       text check (char_length(note) <= 500),
  added_by   uuid not null,
  done_by    uuid,
  done_at    timestamptz,
  created_at timestamptz not null default now(),
  check ((done_by is null) = (done_at is null)),
  foreign key (added_by, space_id) references public.members (id, space_id) on delete cascade,
  foreign key (done_by, space_id) references public.members (id, space_id) on delete set null (done_by)
);
create index bucket_items_space_idx on public.bucket_items (space_id, created_at);

alter table public.bucket_items enable row level security;
revoke all on public.bucket_items from anon, authenticated;
grant select, delete on public.bucket_items to authenticated;
grant insert (space_id, body, note, added_by) on public.bucket_items to authenticated;
grant update (body, note, done_by, done_at) on public.bucket_items to authenticated;

create policy "bucket: read space" on public.bucket_items for select to authenticated
  using (space_id = (select public.my_space_id()));
create policy "bucket: add" on public.bucket_items for insert to authenticated
  with check (space_id = (select public.my_space_id()) and added_by = (select public.my_member_id()));
create policy "bucket: change" on public.bucket_items for update to authenticated
  using (space_id = (select public.my_space_id()))
  with check (space_id = (select public.my_space_id()));
create policy "bucket: remove" on public.bucket_items for delete to authenticated
  using (space_id = (select public.my_space_id()));

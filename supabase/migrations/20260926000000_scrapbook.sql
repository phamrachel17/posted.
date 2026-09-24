-- posted. fourth migration: the shared scrapbook.
-- Either person can add any post to the scrapbook, give it a title, or take it out.
-- The post itself isn't copied; removing it from the scrapbook never deletes the post.

create table public.scrapbook_items (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.spaces on delete cascade,
  post_id    uuid not null,
  added_by   uuid not null,
  title      text check (char_length(title) <= 80),
  created_at timestamptz not null default now(),
  unique (post_id),
  foreign key (post_id, space_id) references public.posts (id, space_id) on delete cascade,
  foreign key (added_by, space_id) references public.members (id, space_id) on delete cascade
);
create index scrapbook_items_space_idx on public.scrapbook_items (space_id);

alter table public.scrapbook_items enable row level security;
revoke all on public.scrapbook_items from anon, authenticated;
grant select, delete on public.scrapbook_items to authenticated;
grant insert (space_id, post_id, added_by, title) on public.scrapbook_items to authenticated;
grant update (title) on public.scrapbook_items to authenticated;

create policy "scrapbook: read space" on public.scrapbook_items for select to authenticated
  using (space_id = (select public.my_space_id()));
create policy "scrapbook: add" on public.scrapbook_items for insert to authenticated
  with check (space_id = (select public.my_space_id()) and added_by = (select public.my_member_id()));
create policy "scrapbook: retitle" on public.scrapbook_items for update to authenticated
  using (space_id = (select public.my_space_id()));
create policy "scrapbook: remove" on public.scrapbook_items for delete to authenticated
  using (space_id = (select public.my_space_id()));

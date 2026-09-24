-- posted. fifth migration: hand-made scrapbook pages (Phase 2).
-- A page is a free canvas; pieces are placed on it by percent so it looks the
-- same at any screen size. Both people can edit every page.

create table public.scrapbook_pages (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.spaces on delete cascade,
  title      text not null default 'Untitled page' check (char_length(title) between 1 and 80),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, space_id),
  foreign key (created_by, space_id) references public.members (id, space_id) on delete cascade
);
create index scrapbook_pages_space_idx on public.scrapbook_pages (space_id, updated_at desc);

create table public.scrapbook_pieces (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces on delete cascade,
  page_id     uuid not null,
  created_by  uuid not null,
  kind        text not null check (kind in ('photo', 'video', 'gif', 'sticker', 'text')),
  -- media pieces
  path        text,
  mime        text,
  width       int,
  height      int,
  duration_ms int,
  -- sticker and text pieces
  sticker     text check (char_length(sticker) <= 60),
  body        text check (char_length(body) <= 300),
  color       text check (char_length(color) <= 20),
  -- placement, as percentages of the page (x, y = top-left; w = width)
  x           real not null default 10 check (x between -50 and 150),
  y           real not null default 10 check (y between -50 and 150),
  w           real not null default 30 check (w between 3 and 100),
  rotation    real not null default 0 check (rotation between -180 and 180),
  z           int not null default 0,
  created_at  timestamptz not null default now(),
  check ((kind in ('photo', 'video', 'gif')) = (path is not null)),
  foreign key (page_id, space_id) references public.scrapbook_pages (id, space_id) on delete cascade,
  foreign key (created_by, space_id) references public.members (id, space_id) on delete cascade
);
create index scrapbook_pieces_page_idx on public.scrapbook_pieces (page_id);

alter table public.scrapbook_pages enable row level security;
alter table public.scrapbook_pieces enable row level security;
revoke all on public.scrapbook_pages, public.scrapbook_pieces from anon, authenticated;

grant select, delete on public.scrapbook_pages, public.scrapbook_pieces to authenticated;
grant insert (space_id, title, created_by) on public.scrapbook_pages to authenticated;
grant update (title, updated_at) on public.scrapbook_pages to authenticated;
grant insert (space_id, page_id, created_by, kind, path, mime, width, height, duration_ms, sticker, body, color, x, y, w, rotation, z)
  on public.scrapbook_pieces to authenticated;
grant update (body, color, x, y, w, rotation, z) on public.scrapbook_pieces to authenticated;

create policy "pages: space" on public.scrapbook_pages for all to authenticated
  using (space_id = (select public.my_space_id()))
  with check (space_id = (select public.my_space_id()));
create policy "pieces: space" on public.scrapbook_pieces for all to authenticated
  using (space_id = (select public.my_space_id()))
  with check (
    space_id = (select public.my_space_id())
    and (path is null or path like (select public.my_space_id())::text || '/%')
  );

-- Short videos and GIFs in the media bucket. 50 MB is Supabase's free-plan maximum per file.
update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif',
                                  'video/mp4', 'video/webm', 'video/quicktime',
                                  'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg']
 where id = 'media';

-- Pages are shared, so either person can clear out files when a piece or page is removed.
create policy "media bucket: delete in space" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select public.my_space_id())::text);

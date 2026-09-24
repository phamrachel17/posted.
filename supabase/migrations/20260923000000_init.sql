-- posted. initial schema
-- One space holds exactly two members. Every table carries space_id so
-- row-level security is a single comparison against my_space_id().

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.spaces (
  id               uuid primary key default gen_random_uuid(),
  name             text,
  next_visit_on    date,
  next_visit_place text check (char_length(next_visit_place) <= 60),
  created_at       timestamptz not null default now()
);

create table public.members (
  id           uuid primary key default gen_random_uuid(),
  space_id     uuid not null references public.spaces on delete cascade,
  user_id      uuid not null unique references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  ink          text not null check (ink in ('blue', 'verdigris', 'oxblood', 'sepia', 'slate', 'plum')),
  city         text not null check (char_length(city) between 1 and 40),
  timezone     text not null,
  last_seen_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (space_id, ink),
  unique (id, space_id)
);

create table public.invites (
  token      text primary key default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  space_id   uuid not null references public.spaces on delete cascade,
  created_by uuid not null,
  expires_at timestamptz not null default now() + interval '7 days',
  used_at    timestamptz,
  created_at timestamptz not null default now(),
  foreign key (created_by, space_id) references public.members (id, space_id) on delete cascade
);

create table public.notebooks (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces on delete cascade,
  slug        text not null,
  name        text not null check (char_length(name) between 1 and 40),
  doodle      text,
  cover       text,
  description text check (char_length(description) <= 140),
  kind        text not null default 'plain' check (kind in ('plain', 'lessons')),
  archived_at timestamptz,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  unique (space_id, slug),
  unique (id, space_id),
  foreign key (created_by, space_id) references public.members (id, space_id) on delete set null (created_by)
);

create table public.posts (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces on delete cascade,
  author_id   uuid not null,
  notebook_id uuid,
  kind        text not null check (kind in ('note', 'photo', 'voice', 'day', 'lesson')),
  body        text check (char_length(body) <= 10000),
  meta        jsonb not null default '{}'::jsonb,
  postmark    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  edited_at   timestamptz,
  deleted_at  timestamptz,
  unique (id, space_id),
  foreign key (author_id, space_id) references public.members (id, space_id) on delete cascade,
  foreign key (notebook_id, space_id) references public.notebooks (id, space_id) on delete set null (notebook_id)
);
create index posts_feed_idx on public.posts (space_id, created_at desc) where deleted_at is null;

create table public.replies (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.spaces on delete cascade,
  post_id    uuid not null,
  author_id  uuid not null,
  body       text check (char_length(body) <= 5000),
  created_at timestamptz not null default now(),
  edited_at  timestamptz,
  deleted_at timestamptz,
  unique (id, space_id),
  foreign key (post_id, space_id) references public.posts (id, space_id) on delete cascade,
  foreign key (author_id, space_id) references public.members (id, space_id) on delete cascade
);
create index replies_post_idx on public.replies (post_id, created_at);

create table public.media (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces on delete cascade,
  post_id     uuid,
  reply_id    uuid,
  created_by  uuid not null,
  type        text not null check (type in ('photo', 'audio')),
  path        text not null unique,
  mime        text not null,
  width       int,
  height      int,
  duration_ms int,
  peaks       smallint[],
  position    smallint not null default 0,
  created_at  timestamptz not null default now(),
  check (num_nonnulls(post_id, reply_id) = 1),
  foreign key (post_id, space_id) references public.posts (id, space_id) on delete cascade,
  foreign key (reply_id, space_id) references public.replies (id, space_id) on delete cascade,
  foreign key (created_by, space_id) references public.members (id, space_id) on delete cascade
);
create index media_post_idx on public.media (post_id);

create table public.reactions (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.spaces on delete cascade,
  member_id  uuid not null,
  post_id    uuid,
  reply_id   uuid,
  emoji      text not null check (emoji in ('heart', '😂', '😭', '😮', '🥹', '👀')),
  created_at timestamptz not null default now(),
  check (num_nonnulls(post_id, reply_id) = 1),
  unique nulls not distinct (member_id, post_id, reply_id, emoji),
  foreign key (member_id, space_id) references public.members (id, space_id) on delete cascade,
  foreign key (post_id, space_id) references public.posts (id, space_id) on delete cascade,
  foreign key (reply_id, space_id) references public.replies (id, space_id) on delete cascade
);

-- Kept is private: only the member who kept a post can see it.
create table public.keeps (
  member_id  uuid not null references public.members on delete cascade,
  post_id    uuid not null references public.posts on delete cascade,
  note       text check (char_length(note) <= 140),
  created_at timestamptz not null default now(),
  primary key (member_id, post_id)
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.my_space_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select space_id from public.members where user_id = auth.uid()
$$;

create function public.my_member_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.members where user_id = auth.uid()
$$;

-- Two people per space, and time zones must be real.
create function public.members_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Unknown time zone: %', new.timezone using errcode = '22023';
  end if;
  if tg_op = 'INSERT' then
    perform 1 from public.spaces where id = new.space_id for update;
    if (select count(*) from public.members where space_id = new.space_id) >= 2 then
      raise exception 'This space already has two people.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create trigger members_guard before insert or update of timezone on public.members
for each row execute function public.members_guard();

-- The postmark is stamped by the database from the author's settings at the
-- moment of posting, so it can't be faked or drift.
create function public.posts_stamp() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m public.members;
begin
  select * into m from public.members where id = new.author_id;
  new.created_at := now();
  new.postmark := jsonb_build_object(
    'city', m.city,
    'tz', m.timezone,
    'local', to_char(now() at time zone m.timezone, 'YYYY-MM-DD"T"HH24:MI:SS')
  );
  return new;
end $$;

create trigger posts_stamp before insert on public.posts
for each row execute function public.posts_stamp();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create function public.create_space(p_display_name text, p_ink text, p_city text, p_timezone text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_space uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  if exists (select 1 from public.members where user_id = auth.uid()) then
    raise exception 'You already belong to a space.' using errcode = 'P0001';
  end if;
  insert into public.spaces default values returning id into v_space;
  insert into public.members (space_id, user_id, display_name, ink, city, timezone)
  values (v_space, auth.uid(), trim(p_display_name), p_ink, trim(p_city), p_timezone);
  return v_space;
end $$;

-- What an invite link shows before you join. Safe to call signed out:
-- the token itself is the secret.
create function public.invite_preview(p_token text)
returns table (inviter_name text, taken_ink text, is_valid boolean)
language sql stable security definer set search_path = '' as $$
  select m.display_name, m.ink,
         (i.used_at is null and i.expires_at > now()
          and (select count(*) from public.members x where x.space_id = i.space_id) < 2)
  from public.invites i
  join public.members m on m.id = i.created_by
  where i.token = p_token
$$;

create function public.accept_invite(p_token text, p_display_name text, p_ink text, p_city text, p_timezone text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.invites;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  if exists (select 1 from public.members where user_id = auth.uid()) then
    raise exception 'You already belong to a space.' using errcode = 'P0001';
  end if;
  select * into v_invite from public.invites where token = p_token for update;
  if not found or v_invite.used_at is not null or v_invite.expires_at <= now() then
    raise exception 'This invite link has expired or was already used.' using errcode = 'P0001';
  end if;
  insert into public.members (space_id, user_id, display_name, ink, city, timezone)
  values (v_invite.space_id, auth.uid(), trim(p_display_name), p_ink, trim(p_city), p_timezone);
  update public.invites set used_at = now() where token = p_token;
  delete from public.invites where space_id = v_invite.space_id and used_at is null;
  return v_invite.space_id;
end $$;

-- A post and its media in one transaction. Runs as the caller, so RLS applies.
create function public.create_post(p_kind text, p_body text, p_notebook_id uuid, p_meta jsonb, p_media jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_space  uuid := public.my_space_id();
  v_member uuid := public.my_member_id();
  v_post   uuid;
begin
  if v_member is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  insert into public.posts (space_id, author_id, notebook_id, kind, body, meta)
  values (v_space, v_member, p_notebook_id, p_kind, nullif(trim(p_body), ''), coalesce(p_meta, '{}'::jsonb))
  returning id into v_post;

  insert into public.media (space_id, post_id, created_by, type, path, mime, width, height, duration_ms, peaks, position)
  select v_space, v_post, v_member, m->>'type', m->>'path', m->>'mime',
         (m->>'width')::int, (m->>'height')::int, (m->>'duration_ms')::int,
         case when m ? 'peaks' then array(select jsonb_array_elements_text(m->'peaks')::smallint) end,
         (ord - 1)::smallint
  from jsonb_array_elements(coalesce(p_media, '[]'::jsonb)) with ordinality as t(m, ord);

  return v_post;
end $$;

revoke execute on function public.create_space, public.accept_invite, public.create_post from public, anon;
grant execute on function public.create_space, public.accept_invite, public.create_post to authenticated;
grant execute on function public.invite_preview to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Privileges and row-level security
-- ---------------------------------------------------------------------------

revoke all on public.spaces, public.members, public.invites, public.notebooks, public.posts,
  public.replies, public.media, public.reactions, public.keeps from anon, authenticated;

grant select on public.spaces, public.members, public.invites, public.notebooks, public.posts,
  public.replies, public.media, public.reactions, public.keeps to authenticated;

-- Column-level update grants stop anyone moving a row to another space.
grant update (name, next_visit_on, next_visit_place) on public.spaces to authenticated;
grant update (display_name, ink, city, timezone, last_seen_at) on public.members to authenticated;
grant insert (space_id, created_by) on public.invites to authenticated;
grant delete on public.invites to authenticated;
grant insert (space_id, slug, name, doodle, cover, description, kind, created_by) on public.notebooks to authenticated;
grant update (slug, name, doodle, cover, description, kind, archived_at) on public.notebooks to authenticated;
grant delete on public.notebooks to authenticated;
grant insert (space_id, author_id, notebook_id, kind, body, meta) on public.posts to authenticated;
grant update (notebook_id, body, meta, edited_at, deleted_at) on public.posts to authenticated;
grant insert (space_id, post_id, author_id, body) on public.replies to authenticated;
grant update (body, edited_at, deleted_at) on public.replies to authenticated;
grant insert (space_id, post_id, reply_id, created_by, type, path, mime, width, height, duration_ms, peaks, position)
  on public.media to authenticated;
grant delete on public.media to authenticated;
grant insert (space_id, member_id, post_id, reply_id, emoji) on public.reactions to authenticated;
grant delete on public.reactions to authenticated;
grant insert, update (note), delete on public.keeps to authenticated;

alter table public.spaces    enable row level security;
alter table public.members   enable row level security;
alter table public.invites   enable row level security;
alter table public.notebooks enable row level security;
alter table public.posts     enable row level security;
alter table public.replies   enable row level security;
alter table public.media     enable row level security;
alter table public.reactions enable row level security;
alter table public.keeps     enable row level security;

create policy "spaces: read own" on public.spaces for select to authenticated
  using (id = (select public.my_space_id()));
create policy "spaces: update own" on public.spaces for update to authenticated
  using (id = (select public.my_space_id()));

create policy "members: read space" on public.members for select to authenticated
  using (space_id = (select public.my_space_id()));
create policy "members: update self" on public.members for update to authenticated
  using (user_id = (select auth.uid()));

create policy "invites: read space" on public.invites for select to authenticated
  using (space_id = (select public.my_space_id()));
create policy "invites: create while alone" on public.invites for insert to authenticated
  with check (
    space_id = (select public.my_space_id())
    and created_by = (select public.my_member_id())
    and (select count(*) from public.members where space_id = (select public.my_space_id())) < 2
  );
create policy "invites: delete space" on public.invites for delete to authenticated
  using (space_id = (select public.my_space_id()));

create policy "notebooks: read space" on public.notebooks for select to authenticated
  using (space_id = (select public.my_space_id()));
create policy "notebooks: create" on public.notebooks for insert to authenticated
  with check (space_id = (select public.my_space_id()) and created_by = (select public.my_member_id()));
create policy "notebooks: update" on public.notebooks for update to authenticated
  using (space_id = (select public.my_space_id()));
create policy "notebooks: delete" on public.notebooks for delete to authenticated
  using (space_id = (select public.my_space_id()));

create policy "posts: read space" on public.posts for select to authenticated
  using (space_id = (select public.my_space_id()));
create policy "posts: create own" on public.posts for insert to authenticated
  with check (space_id = (select public.my_space_id()) and author_id = (select public.my_member_id()));
create policy "posts: update own" on public.posts for update to authenticated
  using (author_id = (select public.my_member_id()));

create policy "replies: read space" on public.replies for select to authenticated
  using (space_id = (select public.my_space_id()));
create policy "replies: create own" on public.replies for insert to authenticated
  with check (space_id = (select public.my_space_id()) and author_id = (select public.my_member_id()));
create policy "replies: update own" on public.replies for update to authenticated
  using (author_id = (select public.my_member_id()));

create policy "media: read space" on public.media for select to authenticated
  using (space_id = (select public.my_space_id()));
create policy "media: create own" on public.media for insert to authenticated
  with check (
    space_id = (select public.my_space_id())
    and created_by = (select public.my_member_id())
    and path like (select public.my_space_id())::text || '/%'
  );
create policy "media: delete own" on public.media for delete to authenticated
  using (created_by = (select public.my_member_id()));

create policy "reactions: read space" on public.reactions for select to authenticated
  using (space_id = (select public.my_space_id()));
create policy "reactions: create own" on public.reactions for insert to authenticated
  with check (space_id = (select public.my_space_id()) and member_id = (select public.my_member_id()));
create policy "reactions: delete own" on public.reactions for delete to authenticated
  using (member_id = (select public.my_member_id()));

create policy "keeps: own only" on public.keeps for all to authenticated
  using (member_id = (select public.my_member_id()))
  with check (member_id = (select public.my_member_id()));

-- ---------------------------------------------------------------------------
-- Storage: one private bucket, one folder per space
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 26214400,
        array['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg'])
on conflict (id) do nothing;

create policy "media bucket: read space" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select public.my_space_id())::text);
create policy "media bucket: upload to space" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select public.my_space_id())::text);
create policy "media bucket: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and owner_id = (select auth.uid())::text);

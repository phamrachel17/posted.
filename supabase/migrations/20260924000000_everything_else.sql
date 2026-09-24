-- posted. second migration: voice replies, lessons, daily letter, realtime.

-- Daily letter: the hour (0–23, in the member's own time zone) to send it, or null for off.
alter table public.members add column daily_letter_hour smallint check (daily_letter_hour between 0 and 23);
alter table public.members add column daily_letter_sent_on date;
grant update (daily_letter_hour) on public.members to authenticated;

-- A reply and its voice memo in one transaction. Runs as the caller, so RLS applies.
create function public.create_reply(p_post_id uuid, p_body text, p_media jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_space  uuid := public.my_space_id();
  v_member uuid := public.my_member_id();
  v_reply  uuid;
begin
  if v_member is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  insert into public.replies (space_id, post_id, author_id, body)
  values (v_space, p_post_id, v_member, nullif(trim(p_body), ''))
  returning id into v_reply;

  insert into public.media (space_id, reply_id, created_by, type, path, mime, duration_ms, peaks)
  select v_space, v_reply, v_member, m->>'type', m->>'path', m->>'mime', (m->>'duration_ms')::int,
         case when m ? 'peaks' then array(select jsonb_array_elements_text(m->'peaks')::smallint) end
  from jsonb_array_elements(coalesce(p_media, '[]'::jsonb)) as t(m);

  return v_reply;
end $$;

-- Lessons are shared pages: either person can edit one, not just its author.
-- Only the meta changes; the post stays the teacher's.
create function public.update_lesson(p_post_id uuid, p_meta jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.my_member_id() is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  if pg_column_size(p_meta) > 200000 then
    raise exception 'That lesson is too long to save.' using errcode = 'P0001';
  end if;
  update public.posts
     set meta = p_meta, edited_at = now()
   where id = p_post_id
     and kind = 'lesson'
     and space_id = public.my_space_id()
     and deleted_at is null;
  if not found then
    raise exception 'That lesson could not be found.' using errcode = 'P0001';
  end if;
end $$;

revoke execute on function public.create_reply, public.update_lesson from public, anon;
grant execute on function public.create_reply, public.update_lesson to authenticated;

create index notebooks_space_idx on public.notebooks (space_id) where archived_at is null;
create index posts_notebook_idx on public.posts (notebook_id, created_at desc) where deleted_at is null;
create index reactions_post_idx on public.reactions (post_id);
create index reactions_reply_idx on public.reactions (reply_id);

-- Live "Arya just posted" line. Realtime respects RLS, so only your space is delivered.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.posts;
  end if;
end $$;

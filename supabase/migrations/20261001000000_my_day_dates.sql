-- posted. ninth migration: a My day can be for an earlier day, and can be edited.
-- A My day for a past day is placed at 9pm on that day (the author's time),
-- stamped with that date, and remembers when it was actually added.

create or replace function public.posts_stamp() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m public.members;
  v_today date;
  v_day date;
  v_at timestamptz := now();
begin
  select * into m from public.members where id = new.author_id;
  v_today := (now() at time zone m.timezone)::date;

  if new.kind = 'day' and new.meta ? 'day' then
    begin
      v_day := (new.meta->>'day')::date;
    exception when others then
      v_day := null;
    end;
    if v_day is not null and v_day < v_today and v_day >= v_today - 60 then
      v_at := (v_day::timestamp + time '21:00') at time zone m.timezone;
      new.meta := new.meta || jsonb_build_object('added_at', now());
    else
      new.meta := new.meta - 'day';
    end if;
  end if;

  new.created_at := v_at;
  new.postmark := jsonb_build_object(
    'city', m.city,
    'tz', m.timezone,
    'local', to_char(v_at at time zone m.timezone, 'YYYY-MM-DD"T"HH24:MI:SS')
  );
  return new;
end $$;

-- Edit your own My day: its answers, and which day it's for.
create function public.update_day(p_post_id uuid, p_meta jsonb, p_day date)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.posts;
  m public.members;
  v_today date;
  v_current date;
  v_at timestamptz;
  v_meta jsonb;
begin
  select * into p from public.posts
   where id = p_post_id and author_id = public.my_member_id() and kind = 'day' and deleted_at is null;
  if not found then
    raise exception 'That day could not be found.' using errcode = 'P0001';
  end if;
  select * into m from public.members where id = p.author_id;
  v_today := (now() at time zone m.timezone)::date;
  if p_day > v_today or p_day < v_today - 60 then
    raise exception 'Pick a day in the last two months.' using errcode = 'P0001';
  end if;

  v_current := (p.created_at at time zone m.timezone)::date;
  v_meta := (p_meta - 'day' - 'added_at');

  if p_day = v_current then
    v_at := p.created_at;
    if p.meta ? 'day' then
      v_meta := v_meta || jsonb_build_object('day', p_day, 'added_at', p.meta->'added_at');
    end if;
  elsif p_day = v_today then
    v_at := now();
  else
    v_at := (p_day::timestamp + time '21:00') at time zone m.timezone;
    v_meta := v_meta || jsonb_build_object('day', p_day, 'added_at', coalesce(p.meta->'added_at', to_jsonb(p.created_at)));
  end if;

  update public.posts
     set meta = v_meta,
         edited_at = now(),
         created_at = v_at,
         postmark = jsonb_set(p.postmark, '{local}', to_jsonb(to_char(v_at at time zone m.timezone, 'YYYY-MM-DD"T"HH24:MI:SS')))
   where id = p.id;
end $$;

revoke execute on function public.update_day from public, anon;
grant execute on function public.update_day to authenticated;

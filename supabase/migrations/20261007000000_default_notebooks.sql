-- posted. fifteenth migration: a new space starts with the notebooks Rachel and
-- Arya use, each with its drawing. Either person can rename, change, archive, or
-- delete them afterwards like any other notebook.

create or replace function public.create_space(p_display_name text, p_ink text, p_city text, p_timezone text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_space  uuid;
  v_member uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  if (select count(*) from public.members where user_id = auth.uid()) >= 10 then
    raise exception 'That''s a lot of spaces already.' using errcode = 'P0001';
  end if;
  insert into public.spaces default values returning id into v_space;
  insert into public.members (space_id, user_id, display_name, ink, city, timezone)
  values (v_space, auth.uid(), trim(p_display_name), p_ink, trim(p_city), p_timezone)
  returning id into v_member;

  -- Created a moment apart so the sidebar keeps this order.
  insert into public.notebooks (space_id, slug, name, doodle, cover, kind, created_by, created_at)
  select v_space, d.slug, d.name, d.doodle, d.cover, d.kind, v_member, now() + (d.ord * interval '1 millisecond')
  from (values
    (1, 'music',               'music',               'nb-music',    'lilac', 'plain'),
    (2, 'language',            'language',            'nb-language', 'sky',   'lessons'),
    (3, 'movies',              'movies',              'nb-popcorn',  'clay',  'plain'),
    (4, 'cooking',             'cooking',             'nb-cooking',  'sand',  'plain'),
    (5, 'reading',             'reading',             'nb-reading',  'stone', 'plain'),
    (6, 'health-and-exercise', 'health and exercise', 'nb-exercise', 'sage',  'plain')
  ) as d(ord, slug, name, doodle, cover, kind);

  perform public.set_active_space(v_space);
  return v_space;
end $$;

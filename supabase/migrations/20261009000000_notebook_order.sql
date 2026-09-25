-- posted. seventeenth migration: notebooks can be put in any order by dragging.
-- The order is shared: both of you see the same sidebar and shelf.

alter table public.notebooks add column position integer;

-- Existing notebooks keep the order they had (oldest first).
update public.notebooks n
   set position = r.rn
  from (select id, row_number() over (partition by space_id order by created_at) as rn from public.notebooks) r
 where r.id = n.id;

-- New notebooks go at the end.
create function public.notebooks_position() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.position is null then
    select coalesce(max(position), 0) + 1 into new.position from public.notebooks where space_id = new.space_id;
  end if;
  return new;
end $$;

create trigger notebooks_position before insert on public.notebooks
for each row execute function public.notebooks_position();

-- Save a new order: the ids in the order they should appear.
create function public.reorder_notebooks(p_ids uuid[]) returns void
language sql security invoker set search_path = '' as $$
  update public.notebooks n
     set position = t.ord
    from unnest(p_ids) with ordinality as t(id, ord)
   where n.id = t.id and n.space_id = public.my_space_id()
$$;

grant update (position) on public.notebooks to authenticated;
revoke execute on function public.reorder_notebooks from public, anon;
grant execute on function public.reorder_notebooks to authenticated;

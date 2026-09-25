-- posted. thirteenth migration: a notebook shows a dot whenever the other person
-- changed something in it since you last looked: a new post or note, an edit, a
-- My day added for an earlier day, or a change to a lesson.

-- Who last edited a post, filled in by the database so it can't be faked.
alter table public.posts add column edited_by uuid;

create function public.posts_edited_by() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.edited_at is distinct from old.edited_at then
    new.edited_by := public.my_member_id();
  end if;
  return new;
end $$;

create trigger posts_edited_by before update on public.posts
for each row execute function public.posts_edited_by();

create or replace function public.notebooks_with_news()
returns setof uuid
language sql stable security invoker set search_path = '' as $$
  select n.id
  from public.notebooks n
  left join public.notebook_reads r
    on r.notebook_id = n.id and r.member_id = public.my_member_id()
  where n.space_id = public.my_space_id()
    and n.archived_at is null
    and (
      exists (
        select 1 from public.posts p
        where p.notebook_id = n.id
          and p.deleted_at is null
          and (
            -- New from them. A My day for an earlier day counts from when it was added.
            (p.author_id <> public.my_member_id()
              and greatest(p.created_at, (p.meta->>'added_at')::timestamptz) > coalesce(r.seen_at, '-infinity'))
            -- Or they changed it, including a lesson you made.
            or (p.edited_by is not null and p.edited_by <> public.my_member_id()
              and p.edited_at > coalesce(r.seen_at, '-infinity'))
          )
      )
      or exists (
        select 1 from public.replies rp
        join public.posts p on p.id = rp.post_id
        where p.notebook_id = n.id
          and p.deleted_at is null
          and rp.deleted_at is null
          and rp.author_id <> public.my_member_id()
          and greatest(rp.created_at, rp.edited_at) > coalesce(r.seen_at, '-infinity')
      )
    )
$$;

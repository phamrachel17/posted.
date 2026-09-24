-- posted. third migration: remember when each person last opened each notebook,
-- so the sidebar can mark notebooks with something new from the other person.

create table public.notebook_reads (
  member_id   uuid not null references public.members on delete cascade,
  notebook_id uuid not null references public.notebooks on delete cascade,
  seen_at     timestamptz not null default now(),
  primary key (member_id, notebook_id)
);

alter table public.notebook_reads enable row level security;
revoke all on public.notebook_reads from anon, authenticated;
grant select, insert, update (seen_at) on public.notebook_reads to authenticated;

-- Your own read marks only. Your partner never sees when you opened a notebook.
create policy "notebook_reads: own only" on public.notebook_reads for all to authenticated
  using (member_id = (select public.my_member_id()))
  with check (member_id = (select public.my_member_id()));

create function public.mark_notebook_read(p_notebook_id uuid)
returns void
language sql security invoker set search_path = '' as $$
  insert into public.notebook_reads (member_id, notebook_id, seen_at)
  select public.my_member_id(), n.id, now()
  from public.notebooks n
  where n.id = p_notebook_id and n.space_id = public.my_space_id()
  on conflict (member_id, notebook_id) do update set seen_at = excluded.seen_at
$$;

-- Notebooks where the other person posted or wrote back since you last opened it.
create function public.notebooks_with_news()
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
          and p.author_id <> public.my_member_id()
          and p.created_at > coalesce(r.seen_at, '-infinity')
      )
      or exists (
        select 1 from public.replies rp
        join public.posts p on p.id = rp.post_id
        where p.notebook_id = n.id
          and p.deleted_at is null
          and rp.deleted_at is null
          and rp.author_id <> public.my_member_id()
          and rp.created_at > coalesce(r.seen_at, '-infinity')
      )
    )
$$;

revoke execute on function public.mark_notebook_read, public.notebooks_with_news from public, anon;
grant execute on function public.mark_notebook_read, public.notebooks_with_news to authenticated;

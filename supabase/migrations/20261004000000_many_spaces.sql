-- posted. twelfth migration: one account can be in more than one space (each
-- still exactly two people), and switches between them. Every policy already
-- compares against my_space_id(), so that now means "the space you're in right now".

-- Which space each person has open. Only reachable through the functions below.
create table public.active_spaces (
  user_id    uuid primary key references auth.users on delete cascade,
  space_id   uuid not null references public.spaces on delete cascade,
  updated_at timestamptz not null default now()
);
alter table public.active_spaces enable row level security;
revoke all on public.active_spaces from anon, authenticated;

-- One membership per space, instead of one per account.
alter table public.members drop constraint members_user_id_key;
alter table public.members add constraint members_user_space_key unique (user_id, space_id);

-- The space you have open, or your first one if you haven't picked.
create or replace function public.my_space_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select a.space_id from public.active_spaces a
       join public.members m on m.space_id = a.space_id and m.user_id = a.user_id
      where a.user_id = auth.uid()),
    (select m.space_id from public.members m where m.user_id = auth.uid() order by m.created_at limit 1)
  )
$$;

create or replace function public.my_member_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.members where user_id = auth.uid() and space_id = public.my_space_id()
$$;

create function public.set_active_space(p_space_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.members where user_id = auth.uid() and space_id = p_space_id) then
    raise exception 'That space could not be found.' using errcode = 'P0001';
  end if;
  insert into public.active_spaces (user_id, space_id) values (auth.uid(), p_space_id)
  on conflict (user_id) do update set space_id = excluded.space_id, updated_at = now();
end $$;

-- Every space you're in, with who's on the other side, for the switcher.
create function public.my_spaces()
returns table (space_id uuid, my_name text, my_ink text, partner_name text, partner_ink text, is_active boolean)
language sql stable security definer set search_path = '' as $$
  select me.space_id, me.display_name, me.ink, other.display_name, other.ink,
         me.space_id = public.my_space_id()
  from public.members me
  left join public.members other on other.space_id = me.space_id and other.id <> me.id
  where me.user_id = auth.uid()
  order by me.created_at
$$;

-- Starting a space no longer requires being in none; the new one opens.
create or replace function public.create_space(p_display_name text, p_ink text, p_city text, p_timezone text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_space uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  if (select count(*) from public.members where user_id = auth.uid()) >= 10 then
    raise exception 'That''s a lot of spaces already.' using errcode = 'P0001';
  end if;
  insert into public.spaces default values returning id into v_space;
  insert into public.members (space_id, user_id, display_name, ink, city, timezone)
  values (v_space, auth.uid(), trim(p_display_name), p_ink, trim(p_city), p_timezone);
  perform public.set_active_space(v_space);
  return v_space;
end $$;

-- Joining works while you're in other spaces, just not one you're already in.
create or replace function public.accept_invite(p_token text, p_display_name text, p_ink text, p_city text, p_timezone text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.invites;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  select * into v_invite from public.invites where token = p_token for update;
  if not found or v_invite.used_at is not null or v_invite.expires_at <= now() then
    raise exception 'This invite link has expired or was already used.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.members where user_id = auth.uid() and space_id = v_invite.space_id) then
    raise exception 'You''re already in this space.' using errcode = 'P0001';
  end if;
  insert into public.members (space_id, user_id, display_name, ink, city, timezone)
  values (v_invite.space_id, auth.uid(), trim(p_display_name), p_ink, trim(p_city), p_timezone);
  update public.invites set used_at = now() where token = p_token;
  delete from public.invites where space_id = v_invite.space_id and used_at is null;
  perform public.set_active_space(v_invite.space_id);
  return v_invite.space_id;
end $$;

-- Changing your profile only touches the space you're in.
drop policy "members: update self" on public.members;
create policy "members: update self" on public.members for update to authenticated
  using (id = (select public.my_member_id()));

revoke execute on function public.set_active_space, public.my_spaces from public, anon;
grant execute on function public.set_active_space, public.my_spaces to authenticated;

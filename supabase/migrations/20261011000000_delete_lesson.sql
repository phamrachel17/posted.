-- posted. nineteenth migration: lessons are shared, so either of you can delete one
-- (it's hidden, like a deleted post). Only lessons, and only in your own space.

create or replace function public.delete_lesson(p_post_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.my_member_id() is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  update public.posts
     set deleted_at = now()
   where id = p_post_id
     and kind = 'lesson'
     and space_id = public.my_space_id()
     and deleted_at is null;
  if not found then
    raise exception 'That lesson could not be found.' using errcode = 'P0001';
  end if;
end $$;

revoke execute on function public.delete_lesson from public, anon;
grant execute on function public.delete_lesson to authenticated;

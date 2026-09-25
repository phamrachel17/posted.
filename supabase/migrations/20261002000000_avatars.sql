-- posted. tenth migration: a profile picture or icon for each person.
-- A photo lives in the space's folder of the media bucket; an icon is the name of
-- one of the app's drawings. With neither, the app shows your initial.

alter table public.members
  add column avatar_path text check (
    avatar_path ~ '^[0-9a-f-]{36}/avatar-[0-9a-f-]{36}\.jpg$'
    and split_part(avatar_path, '/', 1) = space_id::text
  ),
  add column avatar_icon text check (avatar_icon ~ '^[a-z0-9-]{1,40}$');

grant update (avatar_path, avatar_icon) on public.members to authenticated;

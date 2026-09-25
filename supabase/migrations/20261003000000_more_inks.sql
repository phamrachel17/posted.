-- posted. eleventh migration: more inks to pick from, including light pink.

do $$
declare
  c text;
begin
  -- The original check was unnamed, so find it by what it checks.
  for c in
    select conname from pg_constraint
     where conrelid = 'public.members'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%ink%'
  loop
    execute format('alter table public.members drop constraint %I', c);
  end loop;
end $$;

alter table public.members add constraint members_ink_check check (ink in (
  'blue', 'verdigris', 'oxblood', 'sepia', 'slate', 'plum',
  'light-pink', 'rose', 'coral', 'marigold', 'teal', 'sky', 'lavender'
));

-- posted. eighteenth migration: draw on a scrapbook page. A drawing is a piece like
-- any other (move it, resize it, turn it); its strokes are stored as small SVG paths.
-- Safe to run more than once.

do $$
declare
  c text;
begin
  -- The original check on kind was unnamed; find it by what it checks.
  for c in
    select conname from pg_constraint
     where conrelid = 'public.scrapbook_pieces'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%kind%' and pg_get_constraintdef(oid) like '%sticker%'
       and pg_get_constraintdef(oid) not like '%path%'
  loop
    execute format('alter table public.scrapbook_pieces drop constraint %I', c);
  end loop;
end $$;

-- [{"s": pen width, "d": SVG path}, ...] in the drawing's own coordinates (width × height).
alter table public.scrapbook_pieces add column if not exists strokes text;

alter table public.scrapbook_pieces drop constraint if exists scrapbook_pieces_kind_check;
alter table public.scrapbook_pieces drop constraint if exists scrapbook_pieces_strokes_length;
alter table public.scrapbook_pieces drop constraint if exists scrapbook_pieces_drawing_strokes;

alter table public.scrapbook_pieces
  add constraint scrapbook_pieces_kind_check check (kind in ('photo', 'video', 'gif', 'sticker', 'text', 'drawing')),
  add constraint scrapbook_pieces_strokes_length check (char_length(strokes) <= 60000),
  add constraint scrapbook_pieces_drawing_strokes check ((kind = 'drawing') = (strokes is not null));

grant insert (strokes) on public.scrapbook_pieces to authenticated;

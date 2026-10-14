-- Remix and reference uploads. Safe to run on a database that already ran 0001.

alter table public.tracks drop constraint if exists tracks_mode_check;
alter table public.tracks add constraint tracks_mode_check
  check (mode in ('easy', 'song', 'instrumental', 'extend', 'remix'));

alter table public.tracks add column if not exists upload_path text;

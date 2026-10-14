-- AMIR REMIXES: one table of generations plus a private bucket for the audio.
-- Run once in Supabase: Dashboard -> SQL Editor -> paste -> Run.

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('easy', 'song', 'instrumental', 'extend', 'remix')),
  task_kind text not null check (task_kind in ('song', 'instrumental')),
  task_id text not null,
  title text,
  prompt text,
  lyrics text,
  -- the user's uploaded audio used as remix source or style reference, in our bucket
  upload_path text,
  status text not null default 'pending',
  failed_reason text,
  -- Mureka's own URLs, as returned
  source_urls text[] not null default '{}',
  -- Mureka song ids per choice, used to extend a song
  choice_ids text[] not null default '{}',
  -- Copies in our bucket, so the library survives Mureka's URLs expiring
  storage_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tracks_user_created_idx on public.tracks (user_id, created_at desc);

alter table public.tracks enable row level security;

create policy "own tracks: select" on public.tracks for select using (auth.uid() = user_id);
create policy "own tracks: insert" on public.tracks for insert with check (auth.uid() = user_id);
create policy "own tracks: update" on public.tracks for update using (auth.uid() = user_id);
create policy "own tracks: delete" on public.tracks for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('tracks', 'tracks', false)
on conflict (id) do nothing;

-- Files live under <user_id>/..., and each user reaches only their own folder
create policy "own audio: select" on storage.objects for select
  using (bucket_id = 'tracks' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own audio: insert" on storage.objects for insert
  with check (bucket_id = 'tracks' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own audio: delete" on storage.objects for delete
  using (bucket_id = 'tracks' and (storage.foldername(name))[1] = auth.uid()::text);
-- upsert (re-copying a finished song) needs update as well as insert
create policy "own audio: update" on storage.objects for update
  using (bucket_id = 'tracks' and (storage.foldername(name))[1] = auth.uid()::text);

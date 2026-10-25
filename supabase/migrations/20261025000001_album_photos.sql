-- Album photos (Sachi): backend-only storage for the ML-classified
-- photo collection. No UI reads this table yet.
--
-- ACTIVATION (run once in the Supabase dashboard SQL editor):
--   1. Run this file.
--   2. Set SUPABASE_SERVICE_ROLE_KEY in the Vercel project env.
--   3. Set ALBUM_SECRET_KEY in the Vercel project env to the one
--      shared secret key for the album.
-- The bucket is private and the table denies anonymous access, so the
-- Next.js API routes (service-role key) are the only path to photos.
-- The album itself is gated by that one secret key: every album route
-- checks it server-side, and all photos live under one shared namespace.

create table if not exists public.album_photos (
  id uuid primary key default gen_random_uuid(),
  room_code text not null,
  uploader text not null default '',
  storage_path text not null,
  thumb_path text not null,
  status text not null default 'pending'
    check (status in ('pending', 'ready', 'failed')),
  attempts integer not null default 0,
  taken_at timestamptz,
  face_count integer,
  scene_tags text[] not null default '{}',
  lat double precision,
  lon double precision,
  created_at timestamptz not null default now()
);

create index if not exists album_photos_room_idx on public.album_photos (room_code, created_at desc);
create index if not exists album_photos_status_idx on public.album_photos (status, created_at asc);

alter table public.album_photos enable row level security;
-- No policies for anon/authenticated: only the service role (API routes)
-- can read or write. Do not add a permissive policy here.

insert into storage.buckets (id, name, public)
values ('album-photos', 'album-photos', false)
on conflict (id) do nothing;
-- storage.objects has RLS enabled by default; with no policies, only
-- the service role can read or write album objects.

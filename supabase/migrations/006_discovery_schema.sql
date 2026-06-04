-- ============================================================
-- §13.1 — Discovery schema additions
-- Adds activity_type, run_subtype, PostGIS geog column,
-- GiST index, backfill, and sync trigger.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- =========================
-- 1. Enable PostGIS (if not already enabled)
-- =========================

create extension if not exists postgis;

-- =========================
-- 2. Add new columns
-- =========================

-- activity_type: text with default 'run'. Using text (not enum) so
-- new types can be added without a migration — just insert a new value.
alter table public.activities
  add column if not exists activity_type text not null default 'run';

-- run_subtype: only meaningful when activity_type = 'run'. Nullable.
alter table public.activities
  add column if not exists run_subtype text;

-- geog: PostGIS geography point for radius queries.
-- Derived from existing latitude/longitude columns.
alter table public.activities
  add column if not exists geog geography(Point, 4326);

-- =========================
-- 3. Backfill geog from existing latitude/longitude
-- =========================

update public.activities
set geog = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
where latitude is not null
  and longitude is not null
  and geog is null;

-- =========================
-- 4. Seed activity_type = 'run' on all existing rows
--    (default handles this, but be explicit for any rows
--    that might have been inserted before the default existed)
-- =========================

update public.activities
set activity_type = 'run'
where activity_type is null;

-- =========================
-- 5. GiST index on geog for fast radius queries
-- =========================

create index if not exists activities_geog_idx
  on public.activities using gist (geog);

-- =========================
-- 6. Trigger: keep geog in sync with latitude/longitude
--    per §13.7 — "never let a client write one without the other"
-- =========================

create or replace function public.sync_activity_geog()
returns trigger as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.geog := ST_SetSRID(ST_MakePoint(new.longitude, new.latitude), 4326)::geography;
  else
    new.geog := null;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_activity_location_change
  before insert or update of latitude, longitude on public.activities
  for each row execute function public.sync_activity_geog();

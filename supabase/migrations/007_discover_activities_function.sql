-- ============================================================
-- §13.2 — discover_activities function
-- Single source of truth for map + list discovery views.
-- SECURITY INVOKER so the caller's RLS and blocking ripples apply.
-- Run this in Supabase SQL Editor.
-- ============================================================

create or replace function public.discover_activities(
  p_lat            double precision,
  p_lng            double precision,
  p_radius_km      double precision default 10,
  p_activity_type  text default 'run',
  p_run_subtype    text[] default null,
  p_difficulty     text[] default null,
  p_date_from      timestamptz default now(),
  p_date_to        timestamptz default null,
  p_only_open      boolean default false
)
returns table (
  id             uuid,
  title          text,
  start_time     timestamptz,
  lat            double precision,
  lng            double precision,
  difficulty     text,
  run_subtype    text,
  capacity       int,
  approved_count bigint,
  spots_left     bigint,
  distance_km    double precision,
  host_id        uuid
)
language sql
security invoker
stable
as $$
  select
    a.id,
    a.title,
    a.start_time,
    a.latitude as lat,
    a.longitude as lng,
    a.difficulty,
    a.run_subtype,
    a.max_participants as capacity,
    coalesce(rsvp_counts.cnt, 0) as approved_count,
    case
      when a.max_participants is null then null
      else a.max_participants - coalesce(rsvp_counts.cnt, 0)
    end as spots_left,
    ST_Distance(
      a.geog,
      ST_MakePoint(p_lng, p_lat)::geography
    ) / 1000.0 as distance_km,
    a.host_id
  from public.activities a
  left join lateral (
    select count(*) as cnt
    from public.rsvps r
    where r.activity_id = a.id
      and r.status = 'approved'
  ) rsvp_counts on true
  where
    -- Must be upcoming
    a.status = 'upcoming'
    -- Must have location data
    and a.geog is not null
    -- Date range
    and a.start_time >= p_date_from
    and (p_date_to is null or a.start_time <= p_date_to)
    -- Radius filter
    and ST_DWithin(
      a.geog,
      ST_MakePoint(p_lng, p_lat)::geography,
      p_radius_km * 1000
    )
    -- Activity type
    and a.activity_type = p_activity_type
    -- Run subtype filter (null = any)
    and (p_run_subtype is null or a.run_subtype = any(p_run_subtype))
    -- Difficulty filter (null = any)
    and (p_difficulty is null or a.difficulty = any(p_difficulty))
    -- Only open (has spots left)
    and (
      not p_only_open
      or a.max_participants is null
      or a.max_participants > coalesce(rsvp_counts.cnt, 0)
    )
  order by distance_km asc, a.start_time asc;
$$;

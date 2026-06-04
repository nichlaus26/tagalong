-- ============================================================
-- TEST SCRIPT for discover_activities
-- Run this AFTER applying 007_discover_activities_function.sql
-- Run as a logged-in user (or via service role for testing).
-- This inserts temp data, runs the function, then cleans up.
-- ============================================================

-- Insert test activities around Brussels (50.8503, 4.3517)
-- Using a known host_id — replace with an actual profile ID from your DB.
-- To find one: SELECT id FROM profiles LIMIT 1;

-- You can test the function directly without inserting data if you
-- already have activities with latitude/longitude set. Just run:

select * from public.discover_activities(
  p_lat := 50.8503,           -- Brussels center
  p_lng := 4.3517,
  p_radius_km := 25,          -- 25km radius
  p_activity_type := 'run',
  p_run_subtype := null,      -- any subtype
  p_difficulty := null,       -- any difficulty
  p_date_from := now(),
  p_date_to := null,
  p_only_open := false
);

-- To test with difficulty filter:
-- select * from public.discover_activities(
--   p_lat := 50.8503,
--   p_lng := 4.3517,
--   p_radius_km := 25,
--   p_difficulty := array['easy', 'moderate']
-- );

-- To test only_open (activities with spots remaining):
-- select * from public.discover_activities(
--   p_lat := 50.8503,
--   p_lng := 4.3517,
--   p_radius_km := 25,
--   p_only_open := true
-- );

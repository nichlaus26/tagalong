-- ============================================================
-- Guard activity status transitions and prevent duplicate reports.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- =========================
-- 1. Activity status transition guard
-- =========================

create or replace function public.guard_activity_status()
returns trigger as $$
begin
  -- If status isn't changing, allow
  if old.status = new.status then
    return new;
  end if;

  -- Only 'upcoming' can transition to something else
  if old.status != 'upcoming' then
    raise exception 'Cannot change status from "%" — it is a final state', old.status;
  end if;

  -- From 'upcoming', only 'completed' or 'cancelled' are valid
  if new.status not in ('completed', 'cancelled') then
    raise exception 'Invalid status transition from "upcoming" to "%"', new.status;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_activity_status_change
  before update on public.activities
  for each row execute function public.guard_activity_status();

-- =========================
-- 2. Prevent duplicate reports
-- =========================

-- One report per reporter per user
create unique index if not exists idx_reports_unique_user
  on public.reports (reporter_id, reported_user_id)
  where reported_user_id is not null;

-- One report per reporter per activity
create unique index if not exists idx_reports_unique_activity
  on public.reports (reporter_id, activity_id)
  where activity_id is not null;

-- ============================================================
-- Enforce max_participants at the database level.
-- Prevents approving RSVPs beyond activity capacity.
-- Run this in Supabase SQL Editor.
-- ============================================================

create or replace function public.enforce_capacity()
returns trigger as $$
declare
  v_max int;
  v_current int;
begin
  -- Only check when status is being changed to 'approved'
  if new.status != 'approved' then
    return new;
  end if;

  -- If status was already approved, no need to recheck
  if old.status = 'approved' then
    return new;
  end if;

  -- Get the activity's max_participants
  select max_participants into v_max
  from public.activities where id = new.activity_id;

  -- If no limit set, allow
  if v_max is null then
    return new;
  end if;

  -- Count current approved RSVPs (excluding the one being updated)
  select count(*) into v_current
  from public.rsvps
  where activity_id = new.activity_id
    and status = 'approved'
    and id != new.id;

  if v_current >= v_max then
    raise exception 'Activity is full (% / % spots taken)', v_current, v_max;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_rsvp_approval_check
  before update on public.rsvps
  for each row execute function public.enforce_capacity();

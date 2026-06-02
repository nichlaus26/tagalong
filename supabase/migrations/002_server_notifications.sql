-- ============================================================
-- Move notification creation into Postgres triggers
-- and lock down the notifications table so users cannot INSERT.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- =========================
-- 1. Remove any existing INSERT policy on notifications
-- =========================

-- (none existed, but be safe)
drop policy if exists "notifications_insert" on public.notifications;

-- =========================
-- 2. Trigger: new RSVP → notify the activity host
-- =========================

create or replace function public.notify_new_rsvp()
returns trigger as $$
declare
  v_host_id uuid;
  v_title text;
begin
  select host_id, title into v_host_id, v_title
  from public.activities where id = new.activity_id;

  insert into public.notifications (user_id, type, activity_id, body)
  values (
    v_host_id,
    'new_request',
    new.activity_id,
    'Someone requested to join "' || v_title || '".'
  );

  return new;
end;
$$ language plpgsql security definer;

create trigger on_rsvp_created
  after insert on public.rsvps
  for each row execute function public.notify_new_rsvp();

-- =========================
-- 3. Trigger: RSVP status changed → notify the attendee
-- =========================

create or replace function public.notify_rsvp_status_change()
returns trigger as $$
declare
  v_title text;
begin
  -- Only fire when status actually changed to approved or declined
  if old.status = new.status then
    return new;
  end if;

  if new.status not in ('approved', 'declined') then
    return new;
  end if;

  select title into v_title
  from public.activities where id = new.activity_id;

  insert into public.notifications (user_id, type, activity_id, body)
  values (
    new.user_id,
    case when new.status = 'approved' then 'rsvp_approved' else 'rsvp_declined' end,
    new.activity_id,
    case when new.status = 'approved'
      then 'You''ve been approved for "' || v_title || '"!'
      else 'Your request for "' || v_title || '" was declined.'
    end
  );

  return new;
end;
$$ language plpgsql security definer;

create trigger on_rsvp_status_changed
  after update on public.rsvps
  for each row execute function public.notify_rsvp_status_change();

-- =========================
-- 4. Trigger: activity cancelled → notify all approved attendees
-- =========================

create or replace function public.notify_activity_cancelled()
returns trigger as $$
begin
  -- Only fire when status changes to 'cancelled'
  if old.status = new.status then
    return new;
  end if;

  if new.status != 'cancelled' then
    return new;
  end if;

  insert into public.notifications (user_id, type, activity_id, body)
  select
    r.user_id,
    'activity_cancelled',
    new.id,
    '"' || new.title || '" has been cancelled.'
  from public.rsvps r
  where r.activity_id = new.id
    and r.status = 'approved';

  return new;
end;
$$ language plpgsql security definer;

create trigger on_activity_cancelled
  after update on public.activities
  for each row execute function public.notify_activity_cancelled();

-- =========================
-- 5. Trigger: new review → notify the reviewee
-- =========================

create or replace function public.notify_new_review()
returns trigger as $$
declare
  v_title text;
begin
  select title into v_title
  from public.activities where id = new.activity_id;

  insert into public.notifications (user_id, type, activity_id, body)
  values (
    new.reviewee_id,
    'new_review',
    new.activity_id,
    'You received a ' || new.rating || '-star review for "' || v_title || '".'
  );

  return new;
end;
$$ language plpgsql security definer;

create trigger on_review_created
  after insert on public.reviews
  for each row execute function public.notify_new_review();

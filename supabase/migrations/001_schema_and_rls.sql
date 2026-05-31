-- ============================================================
-- TagAlong v1 — Full schema, triggers, and RLS policies
-- Run this in Supabase SQL Editor (one-shot migration)
-- ============================================================

-- =========================
-- TABLES
-- =========================

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  city text not null default 'Brussels, Belgium',
  bio text,
  interests text[] not null default '{}',
  photo_url text,
  verification_level text not null default 'none',
  rating_avg numeric not null default 0,
  rating_count int not null default 0,
  created_at timestamptz not null default now()
);

-- activities
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id),
  title text not null,
  type text not null,
  description text,
  location_text text not null,
  latitude double precision,
  longitude double precision,
  start_time timestamptz not null,
  difficulty text check (difficulty in ('easy', 'moderate', 'hard')),
  max_participants int,
  status text not null default 'upcoming' check (status in ('upcoming', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- rsvps
create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  unique (activity_id, user_id)
);

-- reviews
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  reviewee_id uuid not null references public.profiles(id),
  role text not null check (role in ('host', 'attendee')),
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (activity_id, reviewer_id, reviewee_id)
);

-- messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- reports
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  reported_user_id uuid references public.profiles(id),
  activity_id uuid references public.activities(id),
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'reviewed')),
  created_at timestamptz not null default now()
);

-- blocks
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id),
  blocked_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

-- notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  type text not null,
  activity_id uuid references public.activities(id),
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- =========================
-- INDEXES
-- =========================

create index idx_activities_host on public.activities(host_id);
create index idx_activities_start on public.activities(start_time);
create index idx_rsvps_activity on public.rsvps(activity_id);
create index idx_rsvps_user on public.rsvps(user_id);
create index idx_reviews_reviewee on public.reviews(reviewee_id);
create index idx_messages_activity on public.messages(activity_id);
create index idx_notifications_user on public.notifications(user_id);
create index idx_blocks_blocker on public.blocks(blocker_id);
create index idx_blocks_blocked on public.blocks(blocked_id);

-- =========================
-- TRIGGERS
-- =========================

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Recompute rating_avg and rating_count on the reviewee's profile after a review is inserted
create or replace function public.recompute_rating()
returns trigger as $$
begin
  update public.profiles
  set
    rating_count = (select count(*) from public.reviews where reviewee_id = new.reviewee_id),
    rating_avg   = (select coalesce(avg(rating), 0) from public.reviews where reviewee_id = new.reviewee_id)
  where id = new.reviewee_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_review_inserted
  after insert on public.reviews
  for each row execute function public.recompute_rating();

-- =========================
-- ENABLE RLS ON ALL TABLES
-- =========================

alter table public.profiles enable row level security;
alter table public.activities enable row level security;
alter table public.rsvps enable row level security;
alter table public.reviews enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.notifications enable row level security;

-- =========================
-- RLS POLICIES
-- =========================

-- ---- profiles ----
create policy "profiles_select" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

-- Users can update their own profile, but NOT verification_level, rating_avg, rating_count
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and verification_level = (select verification_level from public.profiles where id = auth.uid())
    and rating_avg = (select rating_avg from public.profiles where id = auth.uid())
    and rating_count = (select rating_count from public.profiles where id = auth.uid())
  );

-- ---- activities ----
create policy "activities_select" on public.activities
  for select using (true);

create policy "activities_insert" on public.activities
  for insert with check (auth.uid() = host_id);

create policy "activities_update" on public.activities
  for update using (auth.uid() = host_id);

create policy "activities_delete" on public.activities
  for delete using (auth.uid() = host_id);

-- ---- rsvps ----
-- INSERT: self only, not blocked by host, status must be pending
create policy "rsvps_insert" on public.rsvps
  for insert with check (
    auth.uid() = user_id
    and status = 'pending'
    and not exists (
      select 1 from public.blocks
      where (blocker_id = (select host_id from public.activities where id = activity_id)
             and blocked_id = auth.uid())
         or (blocker_id = auth.uid()
             and blocked_id = (select host_id from public.activities where id = activity_id))
    )
  );

-- SELECT: own rsvps OR you are the host of the activity
create policy "rsvps_select" on public.rsvps
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.activities
      where activities.id = rsvps.activity_id
        and activities.host_id = auth.uid()
    )
  );

-- UPDATE: only the activity's host (approve/decline)
create policy "rsvps_update" on public.rsvps
  for update using (
    exists (
      select 1 from public.activities
      where activities.id = rsvps.activity_id
        and activities.host_id = auth.uid()
    )
  );

-- DELETE: own rsvp only (withdraw)
create policy "rsvps_delete" on public.rsvps
  for delete using (auth.uid() = user_id);

-- ---- reviews ----
-- SELECT: public
create policy "reviews_select" on public.reviews
  for select using (true);

-- INSERT: activity completed or past-dated, reviewer participated, reviewee participated, reviewer != reviewee
create policy "reviews_insert" on public.reviews
  for insert with check (
    auth.uid() = reviewer_id
    and reviewer_id != reviewee_id
    -- activity must be completed or past its start_time
    and exists (
      select 1 from public.activities
      where activities.id = activity_id
        and (activities.status = 'completed' or activities.start_time < now())
    )
    -- reviewer must be host or approved attendee
    and (
      exists (
        select 1 from public.activities
        where activities.id = activity_id and activities.host_id = auth.uid()
      )
      or exists (
        select 1 from public.rsvps
        where rsvps.activity_id = reviews.activity_id
          and rsvps.user_id = auth.uid()
          and rsvps.status = 'approved'
      )
    )
    -- reviewee must be host or approved attendee
    and (
      exists (
        select 1 from public.activities
        where activities.id = activity_id and activities.host_id = reviewee_id
      )
      or exists (
        select 1 from public.rsvps
        where rsvps.activity_id = reviews.activity_id
          and rsvps.user_id = reviewee_id
          and rsvps.status = 'approved'
      )
    )
  );

-- ---- messages ----
-- SELECT: host or approved attendee
create policy "messages_select" on public.messages
  for select using (
    exists (
      select 1 from public.activities
      where activities.id = messages.activity_id and activities.host_id = auth.uid()
    )
    or exists (
      select 1 from public.rsvps
      where rsvps.activity_id = messages.activity_id
        and rsvps.user_id = auth.uid()
        and rsvps.status = 'approved'
    )
  );

-- INSERT: host or approved attendee
create policy "messages_insert" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and (
      exists (
        select 1 from public.activities
        where activities.id = activity_id and activities.host_id = auth.uid()
      )
      or exists (
        select 1 from public.rsvps
        where rsvps.activity_id = messages.activity_id
          and rsvps.user_id = auth.uid()
          and rsvps.status = 'approved'
      )
    )
  );

-- DELETE: own messages only
create policy "messages_delete" on public.messages
  for delete using (auth.uid() = sender_id);

-- ---- reports ----
create policy "reports_insert" on public.reports
  for insert with check (auth.uid() = reporter_id);

-- ---- blocks ----
create policy "blocks_select" on public.blocks
  for select using (auth.uid() = blocker_id);

create policy "blocks_insert" on public.blocks
  for insert with check (auth.uid() = blocker_id);

create policy "blocks_delete" on public.blocks
  for delete using (auth.uid() = blocker_id);

-- ---- notifications ----
create policy "notifications_select" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifications_update" on public.notifications
  for update using (auth.uid() = user_id);

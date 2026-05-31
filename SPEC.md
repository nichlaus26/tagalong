# TagAlong — Build Specification (v1)

> A mobile-first web app for discovering and joining casual, in-person activities
> (running, hiking, coffee meetups, climbing, etc.). Connects people with shared
> interests for low-pressure social outings. **Launching in a single city first.**

**This document is the source of truth for building the MVP. Build it phase by phase, in order. Do not skip ahead.**

---

## 0. Reading this if you've never built a web app

This project has two halves:

1. **Supabase** — a hosted backend. You'll click around a website to set up a database, login, and storage. Mostly configuration, not code. It gives us login, the database, and (later) photo storage out of the box.
2. **Next.js** — the actual app, written in code, that runs in the browser and talks to Supabase. This is what Claude Code writes.

You do **not** need to read the code to get this working. Follow the setup steps, then let Claude Code build each phase and explain it.

**Glossary:**
- *Schema* — the shape of the database (tables and their columns).
- *RLS (Row-Level Security)* — Supabase rules for who can read/write which rows. This is our security model; it matters.
- *RSVP* — a request to join an activity. Joins are **host-approved**, so an RSVP has a status (pending/approved/declined).
- *Polling* — the chat checks for new messages every few seconds (simple, works everywhere). The opposite is *real-time* (instant), which we are deferring.
- *Seam* — a deliberate spot in the data model left ready for a future feature, so adding it later doesn't require rebuilding.

---

## 1. Tech stack (decided — do not substitute)

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS (mobile-first)
- **Backend:** Supabase (Postgres + Auth + Storage)
- **Auth method:** email + password
- **Deployment:** Vercel (free tier), set up last
- **Maps/geo:** none in v1, but store lat/lng so it's addable later

Keep dependencies minimal. No state-management library, no UI kit beyond Tailwind, no ORM (use the Supabase client directly).

---

## 2. v1 scope (build exactly this)

**In scope:**
- Single-city launch (city defaulted, not a freeform global field)
- Auth + profiles + onboarding
- Activity creation / discovery / detail / edit / delete
- Host-approved RSVPs (pending → approved/declined)
- Reviews of hosts AND attendees — only after an activity is completed, only between co-attendees
- In-app chat per activity (polling, not real-time)
- Reporting and blocking users
- In-app notifications (bell icon) — e.g. activity cancelled, RSVP approved, new review

**Deferred — leave schema seams, do NOT build:**
- Verification (email/phone/ID) — coming before real users
- Activity photos
- External notifications (email / SMS / push)
- Real-time chat (upgrade from polling later)
- Map / radius discovery (lat/lng stored now)

---

## 3. Data model

Use `uuid` PKs with `gen_random_uuid()` defaults and `timestamptz` for times. Enable RLS on every table.

### profiles
One row per user, auto-created on signup.
- `id` (uuid, PK, = auth.users.id)
- `name` (text)
- `city` (text) — single-city for now; default it
- `bio` (text, nullable)
- `interests` (text[], default '{}')
- `photo_url` (text, nullable) — column exists; photo upload deferred
- `verification_level` (text, default 'none') — SEAM: 'none' | 'email' | 'phone' | 'id'. Not used in v1.
- `rating_avg` (numeric, default 0) — denormalized average of reviews received
- `rating_count` (int, default 0)
- `created_at` (timestamptz, default now())

### activities
- `id` (uuid, PK)
- `host_id` (uuid, FK → profiles.id)
- `title` (text)
- `type` (text) — running, hiking, coffee, climbing, etc.
- `description` (text, nullable)
- `location_text` (text)
- `latitude` (double precision, nullable) — SEAM for maps
- `longitude` (double precision, nullable) — SEAM for maps
- `start_time` (timestamptz)
- `difficulty` (text, nullable) — easy | moderate | hard
- `max_participants` (int, nullable)
- `status` (text, default 'upcoming') — 'upcoming' | 'completed' | 'cancelled'
- `created_at` (timestamptz, default now())

> The lifecycle matters now because reviews depend on it. An activity becomes
> 'completed' after its start_time has passed (a host action, or a scheduled job
> later; for v1 the host can mark it complete, and/or treat past-dated activities
> as completed in queries).

### rsvps
Join *request*. Host-approved, so status is required.
- `id` (uuid, PK)
- `activity_id` (uuid, FK → activities.id, ON DELETE CASCADE)
- `user_id` (uuid, FK → profiles.id)
- `status` (text, default 'pending') — 'pending' | 'approved' | 'declined'
- `created_at` (timestamptz, default now())
- UNIQUE (activity_id, user_id)

### reviews
A review left by one user about another, tied to a shared activity.
- `id` (uuid, PK)
- `activity_id` (uuid, FK → activities.id, ON DELETE CASCADE)
- `reviewer_id` (uuid, FK → profiles.id)
- `reviewee_id` (uuid, FK → profiles.id)
- `role` (text) — 'host' | 'attendee' (what the reviewee was in this activity)
- `rating` (int) — 1..5 (add a CHECK constraint)
- `comment` (text, nullable)
- `created_at` (timestamptz, default now())
- UNIQUE (activity_id, reviewer_id, reviewee_id) — one review per pair per activity
- A trigger recomputes reviewee's `rating_avg` / `rating_count` on insert.

### messages
Per-activity chat.
- `id` (uuid, PK)
- `activity_id` (uuid, FK → activities.id, ON DELETE CASCADE)
- `sender_id` (uuid, FK → profiles.id)
- `body` (text)
- `created_at` (timestamptz, default now())

### reports
- `id` (uuid, PK)
- `reporter_id` (uuid, FK → profiles.id)
- `reported_user_id` (uuid, FK → profiles.id, nullable)
- `activity_id` (uuid, FK → activities.id, nullable) — report a user or an activity
- `reason` (text)
- `details` (text, nullable)
- `status` (text, default 'open') — 'open' | 'reviewed'
- `created_at` (timestamptz, default now())

### blocks
- `id` (uuid, PK)
- `blocker_id` (uuid, FK → profiles.id)
- `blocked_id` (uuid, FK → profiles.id)
- `created_at` (timestamptz, default now())
- UNIQUE (blocker_id, blocked_id)

### notifications
In-app only for v1.
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles.id) — recipient
- `type` (text) — 'activity_cancelled' | 'rsvp_approved' | 'rsvp_declined' | 'new_request' | 'new_review' | 'new_message'
- `activity_id` (uuid, FK → activities.id, nullable)
- `body` (text)
- `read` (boolean, default false)
- `created_at` (timestamptz, default now())

> SEAM: this same table is what email/SMS/push would later read from. Keep it.

---

## 4. Row-Level Security (the security model — implement carefully)

Enable RLS on all tables. The blocking rules ripple into several policies — read carefully.

**profiles**
- Authenticated users can SELECT any profile.
- A user can INSERT/UPDATE only their own row (`auth.uid() = id`).
- `verification_level`, `rating_avg`, `rating_count` are not directly user-writable (set by triggers/server only).

**activities**
- Anyone (incl. logged-out) can SELECT.
- INSERT only by authenticated users, with `host_id = auth.uid()`.
- UPDATE/DELETE only by the host.

**rsvps**
- INSERT for self only (`user_id = auth.uid()`), status forced 'pending'.
- SELECT: own rsvps, plus the host of the activity sees all rsvps for it.
- UPDATE (approve/decline): only the activity's host.
- DELETE own rsvp (leave / withdraw).

**reviews**
- INSERT only if: the activity is 'completed' (or past-dated), the reviewer attended it (approved rsvp or is host), the reviewee attended it, and reviewer ≠ reviewee. Enforce with EXISTS subqueries in the policy — do NOT rely on the frontend.
- SELECT: public (reviews are visible on profiles).
- No UPDATE/DELETE by users in v1 (keep it simple).

**messages**
- SELECT/INSERT only if the user is the host or has an approved rsvp for that activity. EXISTS subquery.
- A user can DELETE their own message.

**reports**
- INSERT for self (`reporter_id = auth.uid()`). No SELECT for normal users (admin-only later).

**blocks**
- INSERT/DELETE/SELECT only for own blocks (`blocker_id = auth.uid()`).

**Blocking ripples (important):**
- The discovery feed and activity queries must exclude activities hosted by anyone the current user has blocked OR who has blocked the current user.
- A blocked user cannot RSVP to the blocker's activities (enforce in the rsvp INSERT policy via a NOT EXISTS against blocks).
- Blocked users' messages/reviews are hidden from the blocker in queries.
> Some of these are easiest as filtered queries/views; the security-critical ones (RSVP, messages) must be in RLS.

---

## 5. Storage

Skipped in v1 (photos deferred). When added: `avatars` and `activity-photos` buckets, public read, owner-scoped write. The `photo_url` columns already exist as seams.

---

## 6. Screens / routes (mobile-first, design for ~390px first)

1. `/` — **Discovery feed.** Upcoming activities (card: title, type, time, location, host name + rating, spots remaining). Filter by type. Public. Excludes blocked users.
2. `/auth` — sign in / sign up toggle.
3. `/onboarding` — first-time: name, (city defaulted), bio, interests.
4. `/activities/new` — create form (host only).
5. `/activities/[id]` — **detail.** Info, host (name + rating), approved participants. RSVP button / "request pending" / "you're going". Host view: edit/delete, mark complete, requests panel (approve/decline), participant list. **Chat tab** (approved participants + host). After completion: **leave reviews** for co-attendees/host. Report / block actions on users.
6. `/activities/[id]/edit` — edit form (host only).
7. `/profile/[id]` — public profile: bio, interests, rating, reviews received. Report / block buttons.
8. `/me` — own profile + tabs: "Hosting", "Going/Requested", and a notifications bell (or a `/notifications` view).

---

## 7. Build order (phases — finish and verify each before the next)

**Phase 1 — Skeleton.** Next.js + TS + Tailwind running locally with a placeholder home page. Supabase client wired via env vars. Commit.

**Phase 2 — Database & RLS.** One migration: all tables (§3), constraints, CHECKs, the auto-create-profile trigger on signup, and the rating-recompute trigger. All RLS policies from §4. Apply to Supabase; verify in the table editor.

**Phase 3 — Auth + profiles + onboarding.** Signup/login, auto-profile trigger, onboarding, view/edit own profile, view others'.

**Phase 4 — Activities CRUD + discovery.** Create/edit/delete (host-gated), feed on `/`, detail page, type filter, status lifecycle (host can mark complete; treat past-dated as completed in review logic).

**Phase 5 — RSVPs (host-approval flow).** Request → pending; host requests panel approve/decline; enforce `max_participants` on approval; approved participant list; leave/withdraw; `/me` tabs. Write a `notifications` row on approve/decline and on new request.

**Phase 6 — Chat (polling).** `messages` per activity, gated to approved participants + host. Poll every few seconds for new messages. Notification on new message (optional, keep light).

**Phase 7 — Reviews.** Post-completion only; gate per §4. Star rating + comment; recompute profile aggregate via trigger; show on profiles; notification on new review.

**Phase 8 — Reporting / blocking.** Report a user or activity; block/unblock; wire the blocking ripples (§4) into queries and RLS.

**Phase 9 — Notifications UI.** Bell icon with unread count; list view; mark-as-read. (Data already written by earlier phases.)

**Phase 10 — Polish & deploy.** Loading/empty/error states, validation, full/cancelled/deleted-activity handling, then deploy to Vercel with env vars set.

After each phase: run the app, click through the feature, confirm before continuing.

---

## 8. Non-negotiables / guardrails

- **Never trust the frontend for security.** Permission rules live in RLS (§4). The UI just hides what users can't do.
- **Secrets in `.env.local`, never committed.** Only the Supabase *anon* key reaches the browser; the service-role key must never be in client code.
- **Mobile-first.** If it looks bad on a phone, it's not done.
- **One feature at a time.** Don't scaffold later phases early.
- Keep components small and readable — the owner is non-technical.
- **Respect the seams.** When building, don't rip out the deferred-feature columns (`photo_url`, `verification_level`, `latitude`/`longitude`).

---

## 9. Supabase setup checklist (once, before Phase 2)

In your browser at supabase.com (Claude Code can't click for you — have it walk you through it):
1. Create a free account + new project. Save the database password.
2. Project Settings → API: copy **Project URL** and **anon public key**.
3. Put them in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Authentication → Providers → Email: enable. During development you may turn OFF "Confirm email" for easier testing.
5. (Storage buckets skipped until photos are added.)

---

## 10. Driving Claude Code through this

- Start: *"Read SPEC.md. Summarize the plan back to me, then build Phase 1 only."*
- Each phase: *"Build the next phase from SPEC.md. Explain what you did in plain English and how to test it."*
- On errors: paste the exact error; ask it to explain the cause before fixing.
- Ask it to commit to git after each working phase.
- If a phase feels too big, ask it to break the phase into smaller steps and do the first.

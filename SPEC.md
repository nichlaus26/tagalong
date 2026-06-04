# TagAlong — Build Specification (v1)

> A mobile-first web app built on a single idea: **"I'm already going to do this thing,
> and I wouldn't mind if people joined."** You post where and when you'll be heading out,
> others can see it and tag along — no commitment, no organizing, no big group.
>
> **Launch wedge: running, in Brussels, only.** The software is general (any activity,
> any city — `type` and `city` are just fields), but v1 launches, seeds, and is messaged
> as a running app for one city. Breadth is earned later (see §LAUNCH and §EXPANSION),
> not shipped on day one. The broad vision ("anything people are doing, anywhere") is the
> destination; running-in-Brussels is the entry point that earns the right to get there.

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

## L. Launch strategy (the wedge — read before building anything)

**The product framing is "tag along," not "meet up."** Every word of copy, every screen,
every default should reflect: *the activity is happening whether or not anyone joins.*
The user was going for a run anyway; posting is just sending up a flare. This is the whole
reason the app survives the cold-start period — a post with zero joins is not a failure,
it's just a run. Do not let the language drift toward "organize an event" or "host a group."

**Launch target: runners in Brussels.** One activity, one city. Reasons (do not relitigate
without strong evidence):
- Running is genuinely solo-but-open — you lose nothing if no one joins, any pace can
  accommodate a tag-along, no equipment / booking / venue, and it's high-frequency
  (people run several times a week → more posts → more chances for a real join).
- Density within one activity in one city is the only thing that creates the "magic
  moment" (a stranger actually shows up). Breadth dilutes the only thing that matters early.
- The founder is the first user (a runner who moved to Brussels and wanted exactly this),
  which is one of the strongest possible founding positions.

**Discipline note:** the code is already general — adding an activity `type` or a new
`city` is trivial. That is *exactly why* the narrowness must be a deliberate product
decision enforced by judgment, not by the software. Keep the app capable of anything;
keep the launch ruthlessly about running in Brussels.

**The riskiest assumption is behavioral, not technical.** It is *"will a stranger actually
show up to my run?"* — not "can we build RSVP flows." That assumption is testable in a week
with a WhatsApp group / a single Instagram post and zero code. Confirm the behavior exists
before over-investing in the scaling machinery (chat, reviews, blocking). The app scales a
behavior; make sure the behavior is real first.

---

## E. Expansion strategy (the destination — reviewed and agreed)

The broad vision is "anything people are doing, anywhere." That vision is the *destination*,
reached by sequencing — not by launching broad. Companies that own broad categories almost
all started suffocatingly narrow (one college, books, black cars in one city). Narrowness is
the strategy that makes breadth possible, not a compromise of it.

**Governing principle:** each expansion step is **unlocked by density, not by time, boredom,
or a stalled growth chart.** The bar is qualitative and deliberately not a hard metric:
*expand only once the network produces the magic moment on its own* — i.e. a typical run,
posted at a normal time, tends to get a join from someone the poster didn't personally
recruit. Until that's reliably true, expanding only spreads thin seeding effort across more
empty segments and dilutes the density that makes the thing work.

> ⚠️ The strongest pull will be to add breadth to *feel* like progress when growth stalls.
> That is the exact move that kills apps in this category. Resist it. Stalled growth is a
> signal to deepen the current segment, not to widen.

**Sequence (each step gated on the prior hitting the density bar):**

1. **Running, Brussels** (now) — founder is user zero; seed by hand.
2. **Second segment — direction chosen by observed organic pull, not chosen in advance.**
   Watch where real demand appears and follow it. The two possible directions, with their
   trade-offs, so the decision is informed when the time comes:
   - *New activity, same city* (e.g. cycling in Brussels) — founder is physically present to
     seed it; proves the model **generalizes beyond running**, which de-risks the broad vision.
     Caveat: cycling has a pace/route-compatibility wrinkle (a much slower tag-along can spoil
     the ride), so it's less purely "no pressure" than running.
   - *Same activity, new city* (e.g. running in Ghent/Amsterdam) — proves the model **travels**;
     lower product risk (running already works) but higher operational cost (cold-starting a
     city the founder doesn't live in).
   Pick whichever the users pull toward, not whichever looks better on paper.
3. **Broaden activities within the proven city** — other solo-friendly-but-open activities
   (swimming, walks, bouldering-as-tag-along). Each new `type` should still pass the
   "solo-but-open, low-commitment, frequent" test that made running ideal.
4. **Multi-city, multi-activity** — only once the single-city playbook is repeatable. This is
   the broad "anything, anywhere" vision finally arriving — earned, not assumed.

**⚠️ Climbing splits into two modes — don't treat it as one thing.**
- *Bouldering* **is a valid tag-along activity type.** It's solo-but-open like running — you're
  going anyway, company optional, no belayer required. The only difference from running is an
  **access gate**: it happens at a specific gym, and a tag-along needs gym access (most/all gyms
  sell day passes). So bouldering fits the standard feed, just with a venue and an access
  consideration the poster should be able to note (e.g. "day passes available at the door").
- *Lead climbing & top-rope* cross into **partner-matching**, not tag-along: you *need* a belayer
  — "I need someone," not "I wouldn't mind someone." If/when these are supported, treat them as a
  **separate partner-matching mode** (commitment expected, 1:1 pairing), not another row in the
  drop-in feed. Don't rebuild that mechanic by accident by lumping it in with bouldering.

> Practical seam: venue-gated activities (bouldering, and later swimming/gym sessions) may want
> an optional "access note" field on a post so the tag-along knows what's required to join. Not a
> v1 build item — just a known future need so it isn't a surprise.

---

## 1. Tech stack (decided — do not substitute)

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS (mobile-first)
- **Backend:** Supabase (Postgres + Auth + Storage)
- **Auth method:** email + password
- **Deployment:** Vercel (free tier), set up last
- **Maps/geo:** PostGIS for radius queries; MapLibre GL for the map view (see §13)

Keep dependencies minimal. No state-management library, no UI kit beyond Tailwind, no ORM (use the Supabase client directly).

---

## 2. v1 scope (build exactly this)

**In scope:**
- Single-city launch — **Brussels**, seeded and messaged as a **running** app (city defaulted, not a freeform global field; activity types exist in the schema but launch is running-focused — see §L)
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
- ~~Map / radius discovery~~ → now built in §13

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

---

## §11 — Mobile / Native App Strategy

**Intent:** Native iOS + Android apps are a primary target, not a maybe. The
web app ships first, but every decision below should preserve a clean path to a
React Native (Expo) client that reuses this same backend. Do NOT take shortcuts
that lock logic into the Next.js frontend.

### Architecture principle: backend is client-agnostic

- Supabase (Postgres + Auth + Storage + RLS) is the single shared backend for
  BOTH the web app and the future native app. Neither client is privileged.
- All security and business rules live in the database via RLS policies and
  Postgres functions — NOT in Next.js route handlers or server components.
  A rule enforced only in web code does not exist for the native client.
- Any server-side logic that must exist (e.g. complex RSVP transitions, the
  blocking "ripple") should live in Postgres functions / RPCs callable from any
  client, or in Supabase Edge Functions — never in Next.js-only API routes.

### Auth

- Use Supabase Auth (already planned). It has official React Native / Expo
  support, so the same auth system serves both clients.
- Avoid Next.js-specific auth helpers (e.g. cookie-only session patterns) as the
  source of truth. Sessions should work via the Supabase JS client, which both
  web and native use.

### Data contract

- Keep all data access going through the Supabase client / generated types.
  Generate and commit TypeScript types from the schema (`supabase gen types`)
  so the native app can import the same type definitions later.
- No web-only data shaping in server components that the native app couldn't
  reproduce. If the web UI needs derived data, derive it in a Postgres
  view/function so native gets it too.

### Deferred-but-seamed for native

- **Push notifications:** the existing in-app notifications table (bell icon)
  stays the source of truth. Leave a seam to add native push (Expo push tokens)
  later: a `push_tokens` table keyed to profile_id is enough to scaffold now
  (table + RLS only; no send logic yet).
- **Storage:** profile/activity photos via Supabase Storage already work
  identically from native — no change needed.
- **Realtime chat:** current plan is polling. Supabase Realtime works from
  native too, so the eventual upgrade benefits both clients equally.

### What NOT to build yet

- Do not start the React Native app in this phase. Do not add Expo to this repo.
- Do not abstract prematurely into a shared monorepo. The goal here is only to
  keep the backend and data contract clean so a separate Expo app can be added
  later with minimal friction.

### When native work begins (future phase, not now)

- New Expo (React Native) project, separate repo or workspace.
- Reuses: Supabase project, schema, RLS, auth, storage, generated types.
- Rebuilds: the UI layer only (screens in React Native components).

---

## §12 — Security Invariants (DB-enforced)

**Principle (restates and hardens §8):** Every access rule and every business
rule must be enforced in the database — via RLS policies, CHECK constraints,
unique constraints, or Postgres functions/triggers. The frontend may *also*
check these for UX (hiding buttons, showing friendly errors), but a frontend
check is never the enforcement point. Any client — the Next.js web app, the
future native app, or a raw API call — must hit the same wall.

**Why this is load-bearing here:** the native app (see §11) talks directly to
Supabase. Any rule that lives only in Next.js does not exist for native. These
invariants are the contract both clients share.

### Invariants that MUST hold in the database

1. **Notifications are server-generated only.** Clients cannot INSERT
   notifications. Rows are created by Postgres triggers/functions on the events
   that cause them (rsvp approved/declined, new request, new message, new
   review, activity cancelled). RLS: a user may SELECT and UPDATE (mark-read)
   only their own notifications; no client INSERT. Notification `body`/`type`
   are composed server-side, never from client input.

2. **Activity capacity is enforced in the database.** Approving an RSVP when the
   activity is already at `max_participants` must fail at the DB level (trigger
   or function on the rsvp approval path), not just in the UI.

3. **Activity status transitions are guarded in the database.** Only legal
   transitions are allowed (e.g. upcoming → completed, upcoming → cancelled).
   Illegal transitions (e.g. cancelled → upcoming) are rejected by a trigger.

4. **Reports cannot be duplicated.** A unique constraint prevents a user filing
   multiple identical reports for the same target (reporter + reported_user
   and/or activity).

5. **Blocking ripples are enforced, not just filtered.** Per §4: a blocked user
   cannot RSVP to the blocker's activities (RLS on rsvp INSERT). Feed/query
   visibility filtering may be a query/view concern, but the security-critical
   directions (RSVP permission, message access) live in RLS.

### Standing rule for all future work

- When adding any feature, ask: "If someone called the Supabase API directly,
  bypassing my UI, could they break this rule?" If yes, the rule belongs in the
  database, not the frontend.
- Before merging a phase, audit for logic that lives only in route handlers /
  server components / client code and move anything security- or
  integrity-related into RLS or Postgres functions.

---

## §13 — Discovery & Map UX

This section specifies the first-login experience: a branded splash screen, a map of nearby upcoming runs, a map/list toggle, and filters. It pulls forward two previously deferred features — **geo/radius discovery (PostGIS)** and the **map view** — and introduces an `activity_type` seam so non-run activities slot in later without migration.

**Guiding principle (unchanged):** All discovery logic, location filtering, and security live at the database level (a single Postgres function + RLS), never in client code. The Next.js web app and the future React Native app call the identical function.

---

### 13.1 — Schema additions (`activities` table)

New columns only — `difficulty` (text, nullable), `latitude` (double precision, nullable), and `longitude` (double precision, nullable) already exist in the schema (§3). Do not re-add them.

| Column | Type | Notes |
|---|---|---|
| `activity_type` | enum / FK to lookup | v1 is effectively always `'run'`. Model as enum or lookup table so `hike`, `climb`, `coffee`, etc. add later with no migration. **This is the seam.** |
| `run_subtype` | text / enum, nullable | `long_run`, `sprint_workout`, `hill_workout`, etc. Only meaningful when `activity_type = 'run'`. Nullable. |
| `geog` | `geography(Point, 4326)` | PostGIS point used for the radius query. Index with GiST. Populate from existing `latitude`/`longitude` via trigger or on insert so it never drifts. |

No new columns needed for **date/time** (use existing activity start time) or **spots available** (capacity minus approved-RSVP count).

**Index:** `CREATE INDEX activities_geog_idx ON activities USING GIST (geog);`

---

### 13.2 — The discovery function (single source of truth)

One Postgres function backs **both** map and list views. Both pass the same params; map reads coordinates for pins, list reads full card data — returned together in one call.

```
discover_activities(
  p_lat            double precision,   -- center (user location or city fallback)
  p_lng            double precision,
  p_radius_km      double precision,   -- default 10
  p_activity_type  text default 'run',
  p_run_subtype    text[] default null,-- null = any
  p_difficulty     text[] default null,-- null = any
  p_date_from      timestamptz default now(),
  p_date_to        timestamptz default null,
  p_only_open      boolean default false -- true = exclude full activities
) returns table (
  id uuid, title text, start_time timestamptz,
  lat double precision, lng double precision,
  difficulty text, run_subtype text,
  capacity int, approved_count int, spots_left int,
  distance_km double precision,
  host_id uuid
)
```

Inside the function:
- Filter to upcoming activities (`start_time >= p_date_from`, and `<= p_date_to` when provided).
- Radius: `ST_DWithin(geog, ST_MakePoint(p_lng, p_lat)::geography, p_radius_km * 1000)`.
- `distance_km`: `ST_Distance(...) / 1000`, returned for sorting and list display. Order by distance ascending by default.
- Apply existing **RLS and blocking ripples** — blocked-user filtering happens here, consistent with §12 invariants. Discovery must never surface an activity the viewer shouldn't see.
- `spots_left` and `p_only_open` derive from capacity vs. approved RSVP count (§ existing RSVP model).

Mark `SECURITY INVOKER` so the caller's RLS applies, or `SECURITY DEFINER` with explicit re-checks if you need it to bypass row visibility for the distance math — **prefer INVOKER** to keep the blocking ripples honest.

---

### 13.3 — Location flow ("ask, fall back to city")

On first authenticated load:
1. Request browser geolocation with a **~5s timeout** (so the splash never hangs).
2. **Granted** → center map on the user's coordinates.
3. **Denied / timeout / unavailable** → center on the **launch city's** fixed center coordinates.
4. **Cache the resolved center** (in-memory + persisted per session) so the app doesn't re-prompt on every load.
5. Default `p_radius_km = 10` for a single-city launch; expose radius as a user-adjustable filter so they can widen it.

Native note: the React Native app swaps the browser geolocation call for the Expo Location API — the fallback logic and the `discover_activities` call are identical.

---

### 13.4 — Filters (v1)

All filters map directly to `discover_activities` params. UI is shared between map and list; changing a filter re-runs the one query and both views update.

| Filter | Param | UI |
|---|---|---|
| Date/time | `p_date_from` / `p_date_to` | Quick chips: Today, This week, plus a custom range. |
| Distance / radius | `p_radius_km` | Slider or stepped options (5 / 10 / 25 km). |
| Difficulty | `p_difficulty` | Multi-select: easy / moderate / hard. |
| Type of run | `p_run_subtype` | Multi-select: long run, sprint workout, hill workout, etc. |
| Spots available | `p_only_open` | Toggle: hide full activities. |

(`activity_type` is fixed to `'run'` in the UI for v1; it's a param so the filter bar can expose activity types once you broaden beyond runs.)

---

### 13.5 — Screens & components

- **Splash screen** — Branded loading screen on initial authenticated mount. Not a route; a transition. Shown while the first `discover_activities` call resolves (and while geolocation is being requested). Fades to the map on first data resolve.
- **Discovery screen** — Hosts the filter bar + a map/list toggle. Default view: map.
  - **Map view** — Map library renders one pin per returned activity. Tapping a pin opens an activity preview → activity detail.
  - **List view** — Same query results as cards, sorted by distance (then start time). Each card shows title, start time, difficulty, subtype, distance, spots left.
  - **Toggle** — Pure client state. Both views read the same fetched result set; no refetch on toggle.

**Map library:** MapLibre GL (free vector tiles, no key) is the low-friction default and keeps cost at zero for the MVP. Mapbox or Google give richer styling but add API keys and per-load cost — defer unless you specifically want their look. Whichever you pick, isolate it behind a thin component so the native app can substitute its own map (e.g. `react-native-maps` / Expo) without touching the data layer.

---

### 13.6 — Build order

1. **Schema migration** — add `activity_type`, `run_subtype`, `geog` columns; backfill `geog` from existing `latitude`/`longitude`; add the GiST index; seed `activity_type='run'` on existing rows.
2. **`discover_activities` function** — with all filters, distance, RLS/blocking applied. Test directly in SQL before any UI.
3. **Shared query/data layer** in Next.js — one hook/fetcher that calls the function and holds filter state.
4. **List view** — build first; simpler, and it validates the data layer end-to-end.
5. **Map view** — add on top of the working query, behind the isolated map component.
6. **Toggle + splash** — last, as polish.

Building list before map means the query is proven before map-library complexity enters the picture.

---

### 13.7 — Claude Code guardrails

- Do **not** put any filtering, distance, or blocking logic in frontend/React code — it belongs in `discover_activities`. The frontend only passes params and renders results.
- Do **not** add `run_subtype` or `difficulty` checks as ad-hoc client conditionals; they are function params.
- Keep the map library behind a single wrapper component; no map-vendor imports scattered through the app.
- `geog` must stay in sync with `latitude`/`longitude` — enforce via trigger or set both on write, never let a client write one without the other.
- Respect existing §12 security invariants: discovery is a read path that must honor RLS and blocking ripples exactly as the rest of the app does.

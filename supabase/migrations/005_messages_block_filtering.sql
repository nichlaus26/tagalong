-- ============================================================
-- Add block filtering to messages RLS policies.
-- SELECT: hide messages from users the caller has blocked.
-- INSERT: prevent posting if a block exists between caller
--         and the activity host (both directions).
-- Run this in Supabase SQL Editor.
-- ============================================================

-- ---- messages SELECT: add block filtering ----
drop policy "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (
    -- Must be host or approved attendee
    (
      exists (
        select 1 from public.activities
        where activities.id = messages.activity_id
          and activities.host_id = auth.uid()
      )
      or exists (
        select 1 from public.rsvps
        where rsvps.activity_id = messages.activity_id
          and rsvps.user_id = auth.uid()
          and rsvps.status = 'approved'
      )
    )
    -- Hide messages from users the caller has blocked
    and not exists (
      select 1 from public.blocks
      where blocker_id = auth.uid()
        and blocked_id = messages.sender_id
    )
  );

-- ---- messages INSERT: add host-block prevention ----
drop policy "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (
    auth.uid() = sender_id
    -- Must be host or approved attendee
    and (
      exists (
        select 1 from public.activities
        where activities.id = activity_id
          and activities.host_id = auth.uid()
      )
      or exists (
        select 1 from public.rsvps
        where rsvps.activity_id = messages.activity_id
          and rsvps.user_id = auth.uid()
          and rsvps.status = 'approved'
      )
    )
    -- Cannot post if a block exists between sender and host
    and not exists (
      select 1 from public.blocks
      where (blocker_id = (select host_id from public.activities where id = activity_id)
             and blocked_id = auth.uid())
         or (blocker_id = auth.uid()
             and blocked_id = (select host_id from public.activities where id = activity_id))
    )
  );

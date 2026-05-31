"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import ActivityChat from "@/components/ActivityChat";
import { supabase } from "@/lib/supabase";

type Activity = {
  id: string;
  host_id: string;
  title: string;
  type: string;
  description: string | null;
  location_text: string;
  start_time: string;
  difficulty: string | null;
  max_participants: number | null;
  status: string;
  created_at: string;
  host: { id: string; name: string; rating_avg: number; rating_count: number };
};

type Rsvp = {
  id: string;
  user_id: string;
  status: string;
  user: { id: string; name: string };
};

export default function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [confirming, setConfirming] = useState<"delete" | "complete" | "cancel" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // RSVP state
  const [myRsvp, setMyRsvp] = useState<{ id: string; status: string } | null>(null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  const loadRsvps = useCallback(async () => {
    if (!user) return;

    // Load own RSVP
    const { data: mine } = await supabase
      .from("rsvps")
      .select("id, status")
      .eq("activity_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    setMyRsvp(mine);

    // Host sees all RSVPs
    const { data: all } = await supabase
      .from("rsvps")
      .select("id, user_id, status, user:profiles!rsvps_user_id_fkey(id, name)")
      .eq("activity_id", id)
      .order("created_at", { ascending: true });

    if (all) setRsvps(all as unknown as Rsvp[]);
  }, [id, user]);

  useEffect(() => {
    supabase
      .from("activities")
      .select("*, host:profiles!activities_host_id_fkey(id, name, rating_avg, rating_count)")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setActivity(data as unknown as Activity);
        }
      });
  }, [id]);

  useEffect(() => {
    if (activity && user) loadRsvps();
  }, [activity, user, loadRsvps]);

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <p className="text-zinc-500">Activity not found</p>
      </div>
    );
  }

  if (!activity) return null;

  const isHost = user?.id === activity.host_id;
  const isPast = new Date(activity.start_time) < new Date();
  const isCompleted = activity.status === "completed" || (activity.status === "upcoming" && isPast);
  const isCancelled = activity.status === "cancelled";
  const approvedRsvps = rsvps.filter((r) => r.status === "approved");
  const pendingRsvps = rsvps.filter((r) => r.status === "pending");
  const approvedCount = approvedRsvps.length;
  const isFull = activity.max_participants ? approvedCount >= activity.max_participants : false;

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) + " at " + d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  async function handleDelete() {
    setActionLoading(true);
    await supabase.from("activities").delete().eq("id", activity!.id);
    router.push("/");
  }

  async function handleStatusChange(status: "completed" | "cancelled") {
    setActionLoading(true);

    // If cancelling, create notifications for approved attendees
    if (status === "cancelled") {
      const notifs = approvedRsvps.map((r) => ({
        user_id: r.user_id,
        type: "activity_cancelled",
        activity_id: activity!.id,
        body: `"${activity!.title}" has been cancelled.`,
      }));
      if (notifs.length > 0) {
        await supabase.from("notifications").insert(notifs);
      }
    }

    const { error } = await supabase
      .from("activities")
      .update({ status })
      .eq("id", activity!.id);
    if (!error) {
      setActivity((a) => (a ? { ...a, status } : a));
    }
    setActionLoading(false);
    setConfirming(null);
  }

  async function handleRsvp() {
    if (!user) {
      router.push("/auth");
      return;
    }
    setRsvpLoading(true);
    const { error } = await supabase.from("rsvps").insert({
      activity_id: id,
      user_id: user.id,
      status: "pending",
    });
    if (!error) {
      // Notify host of new request
      await supabase.from("notifications").insert({
        user_id: activity!.host_id,
        type: "new_request",
        activity_id: activity!.id,
        body: `Someone requested to join "${activity!.title}".`,
      });
      await loadRsvps();
    }
    setRsvpLoading(false);
  }

  async function handleWithdraw() {
    if (!myRsvp) return;
    setRsvpLoading(true);
    await supabase.from("rsvps").delete().eq("id", myRsvp.id);
    setMyRsvp(null);
    await loadRsvps();
    setRsvpLoading(false);
  }

  async function handleRsvpAction(rsvpId: string, userId: string, status: "approved" | "declined") {
    // Check capacity before approving
    if (status === "approved" && isFull) return;

    await supabase.from("rsvps").update({ status }).eq("id", rsvpId);

    // Notify the user
    await supabase.from("notifications").insert({
      user_id: userId,
      type: status === "approved" ? "rsvp_approved" : "rsvp_declined",
      activity_id: activity!.id,
      body: status === "approved"
        ? `You've been approved for "${activity!.title}"!`
        : `Your request for "${activity!.title}" was declined.`,
    });

    await loadRsvps();
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
        &larr; Back
      </Link>

      <div className="mt-4 flex flex-col gap-4">
        {(isCancelled || isCompleted) && (
          <span
            className={`self-start rounded-full px-3 py-1 text-xs font-medium ${
              isCancelled
                ? "bg-red-100 text-red-700"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {isCancelled ? "Cancelled" : "Completed"}
          </span>
        )}

        <h1 className="text-2xl font-bold">{activity.title}</h1>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700">
            {activity.type}
          </span>
          {activity.difficulty && (
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 capitalize">
              {activity.difficulty}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1 text-sm text-zinc-600">
          <p>{formatDate(activity.start_time)}</p>
          <p>{activity.location_text}</p>
          {activity.max_participants && (
            <p>{approvedCount}/{activity.max_participants} spots filled</p>
          )}
        </div>

        {activity.description && (
          <p className="text-zinc-700">{activity.description}</p>
        )}

        <div className="border-t pt-4">
          <p className="text-sm text-zinc-500 mb-1">Hosted by</p>
          <Link
            href={`/profile/${activity.host.id}`}
            className="font-medium hover:underline"
          >
            {activity.host.name}
            {activity.host.rating_count > 0 && (
              <span className="text-sm text-zinc-500 ml-2">
                {activity.host.rating_avg.toFixed(1)} ({activity.host.rating_count})
              </span>
            )}
          </Link>
        </div>

        {/* RSVP button for non-hosts on upcoming activities */}
        {user && !isHost && !isCancelled && !isCompleted && (
          <div className="border-t pt-4">
            {!myRsvp ? (
              <button
                onClick={handleRsvp}
                disabled={rsvpLoading || isFull}
                className="w-full rounded-lg bg-black px-4 py-3 text-white font-medium hover:bg-zinc-800 disabled:opacity-50"
              >
                {isFull ? "Activity Full" : rsvpLoading ? "Requesting..." : "Request to Join"}
              </button>
            ) : myRsvp.status === "pending" ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-zinc-500 text-center">Request pending</p>
                <button
                  onClick={handleWithdraw}
                  disabled={rsvpLoading}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 font-medium hover:bg-zinc-50 disabled:opacity-50"
                >
                  Withdraw Request
                </button>
              </div>
            ) : myRsvp.status === "approved" ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-green-600 text-center font-medium">You&apos;re going!</p>
                <button
                  onClick={handleWithdraw}
                  disabled={rsvpLoading}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 font-medium hover:bg-zinc-50 disabled:opacity-50"
                >
                  Leave Activity
                </button>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 text-center">Your request was declined</p>
            )}
          </div>
        )}

        {!user && !isCancelled && !isCompleted && (
          <div className="border-t pt-4">
            <Link
              href="/auth"
              className="block w-full rounded-lg bg-black px-4 py-3 text-center text-white font-medium hover:bg-zinc-800"
            >
              Sign in to join
            </Link>
          </div>
        )}

        {/* Approved participants */}
        {approvedRsvps.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-zinc-500 mb-2">
              Going ({approvedRsvps.length})
            </p>
            <div className="flex flex-col gap-2">
              {approvedRsvps.map((r) => (
                <Link
                  key={r.id}
                  href={`/profile/${r.user.id}`}
                  className="text-sm hover:underline"
                >
                  {r.user.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Chat — visible to host and approved attendees */}
        {user && (isHost || myRsvp?.status === "approved") && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-zinc-500 mb-2">Chat</p>
            <ActivityChat activityId={activity.id} userId={user.id} />
          </div>
        )}

        {/* Host: pending requests panel */}
        {isHost && pendingRsvps.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-zinc-500 mb-2">
              Pending Requests ({pendingRsvps.length})
            </p>
            <div className="flex flex-col gap-3">
              {pendingRsvps.map((r) => (
                <div key={r.id} className="flex items-center justify-between">
                  <Link
                    href={`/profile/${r.user.id}`}
                    className="text-sm hover:underline"
                  >
                    {r.user.name}
                  </Link>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRsvpAction(r.id, r.user_id, "approved")}
                      disabled={isFull}
                      className="rounded-lg bg-black px-3 py-1.5 text-xs text-white font-medium hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRsvpAction(r.id, r.user_id, "declined")}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Host actions */}
        {isHost && !isCancelled && (
          <div className="border-t pt-4 flex flex-col gap-2">
            <p className="text-sm font-medium text-zinc-500">Host Actions</p>

            {activity.status === "upcoming" && (
              <Link
                href={`/activities/${activity.id}/edit`}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-center font-medium hover:bg-zinc-50"
              >
                Edit Activity
              </Link>
            )}

            {activity.status === "upcoming" && !isPast && (
              <>
                {confirming === "complete" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange("completed")}
                      disabled={actionLoading}
                      className="flex-1 rounded-lg bg-black px-4 py-3 text-white font-medium disabled:opacity-50"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirming(null)}
                      className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirming("complete")}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-3 font-medium hover:bg-zinc-50"
                  >
                    Mark as Complete
                  </button>
                )}

                {confirming === "cancel" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange("cancelled")}
                      disabled={actionLoading}
                      className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-white font-medium disabled:opacity-50"
                    >
                      Confirm Cancel
                    </button>
                    <button
                      onClick={() => setConfirming(null)}
                      className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 font-medium"
                    >
                      Back
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirming("cancel")}
                    className="w-full rounded-lg border border-red-300 px-4 py-3 font-medium text-red-600 hover:bg-red-50"
                  >
                    Cancel Activity
                  </button>
                )}
              </>
            )}

            {confirming === "delete" ? (
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-white font-medium disabled:opacity-50"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 font-medium"
                >
                  Back
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming("delete")}
                className="w-full rounded-lg border border-red-300 px-4 py-3 font-medium text-red-600 hover:bg-red-50"
              >
                Delete Activity
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

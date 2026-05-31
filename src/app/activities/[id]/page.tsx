"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
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

export default function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [confirming, setConfirming] = useState<"delete" | "complete" | "cancel" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
            <p>{activity.max_participants} spots</p>
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

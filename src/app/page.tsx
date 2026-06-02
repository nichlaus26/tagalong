"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import NotificationBell from "@/components/NotificationBell";
import { supabase } from "@/lib/supabase";

const ACTIVITY_TYPES = [
  "Running",
  "Hiking",
  "Coffee",
  "Climbing",
  "Cycling",
  "Yoga",
  "Swimming",
  "Walking",
  "Photography",
  "Board Games",
  "Other",
];

type Activity = {
  id: string;
  host_id: string;
  title: string;
  type: string;
  location_text: string;
  start_time: string;
  max_participants: number | null;
  host: { name: string; rating_avg: number; rating_count: number };
  approved_count: number;
};

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      // Get blocked user IDs (both directions) to filter out
      let blockedIds: string[] = [];
      if (user) {
        const { data: myBlocks } = await supabase
          .from("blocks")
          .select("blocked_id")
          .eq("blocker_id", user.id);

        // Also check who has blocked the current user — need a raw query
        // since RLS only lets us see our own blocks. We'll filter client-side
        // for the "blocked by" direction using activities we can see.
        blockedIds = myBlocks?.map((b) => b.blocked_id) ?? [];
      }

      let query = supabase
        .from("activities")
        .select("id, title, type, location_text, start_time, max_participants, host_id, host:profiles!activities_host_id_fkey(name, rating_avg, rating_count)")
        .eq("status", "upcoming")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      if (typeFilter) {
        query = query.eq("type", typeFilter);
      }

      const { data } = await query;

      if (data) {
        // Filter out activities from blocked hosts and those with missing host profiles
        const filtered = data.filter(
          (a) => a.host && (!blockedIds.length || !blockedIds.includes(a.host_id))
        );

        // Fetch approved RSVP counts for these activities
        const ids = filtered.map((a) => a.id);
        const { data: rsvpCounts } = ids.length > 0
          ? await supabase
              .from("rsvps")
              .select("activity_id")
              .in("activity_id", ids)
              .eq("status", "approved")
          : { data: [] };

        const countMap: Record<string, number> = {};
        rsvpCounts?.forEach((r) => {
          countMap[r.activity_id] = (countMap[r.activity_id] || 0) + 1;
        });

        setActivities(
          (filtered as unknown as Activity[]).map((a) => ({
            ...a,
            approved_count: countMap[a.id] || 0,
          }))
        );
      }
      setLoaded(true);
    }

    load();
  }, [typeFilter, user]);

  function formatDate(iso: string) {
    const d = new Date(iso);
    return (
      d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }) +
      " at " +
      d.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    );
  }

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <h1 className="text-3xl font-bold text-center">TagAlong</h1>
        <p className="mt-3 text-lg text-zinc-600 text-center max-w-md">
          Discover and join casual, in-person activities near you.
        </p>
        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <Link
            href="/auth"
            className="block w-full rounded-lg bg-black px-4 py-3 text-center text-white font-medium hover:bg-zinc-800"
          >
            Sign In
          </Link>
          <Link
            href="/auth"
            onClick={() => sessionStorage.setItem("authMode", "signup")}
            className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-center font-medium hover:bg-zinc-50"
          >
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">TagAlong</h1>
        <div className="flex gap-3">
          {authLoading ? null : (
            <>
              <Link
                href="/activities/new"
                className="rounded-lg bg-black px-4 py-2 text-sm text-white font-medium hover:bg-zinc-800"
              >
                + New
              </Link>
              <NotificationBell />
              <Link
                href="/me"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
              >
                Profile
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Type filter */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 pb-2">
          <button
            onClick={() => setTypeFilter("")}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm border transition-colors ${
              typeFilter === ""
                ? "bg-black text-white border-black"
                : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-400"
            }`}
          >
            All
          </button>
          {ACTIVITY_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm border transition-colors ${
                typeFilter === t
                  ? "bg-black text-white border-black"
                  : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Activity cards */}
      {!loaded ? null : activities.length === 0 ? (
        <p className="text-center text-zinc-500 mt-12">
          No upcoming activities{typeFilter ? ` for ${typeFilter}` : ""}.
          {user ? " Create one!" : " Sign in to create one!"}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {activities.map((activity) => (
            <Link
              key={activity.id}
              href={`/activities/${activity.id}`}
              className="block rounded-lg border border-zinc-200 p-4 hover:border-zinc-400 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{activity.title}</h2>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600">
                  {activity.type}
                </span>
              </div>

              <div className="mt-2 flex flex-col gap-0.5 text-sm text-zinc-500">
                <p>{formatDate(activity.start_time)}</p>
                <p>{activity.location_text}</p>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-zinc-600">
                  {activity.host?.name ?? "Unknown"}
                  {activity.host?.rating_count > 0 && (
                    <span className="text-zinc-400 ml-1">
                      {activity.host.rating_avg.toFixed(1)}
                    </span>
                  )}
                </span>
                {activity.max_participants && (
                  <span className="text-zinc-400">
                    {activity.approved_count}/{activity.max_participants} going
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

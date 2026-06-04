"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import NotificationBell from "@/components/NotificationBell";
import Spinner from "@/components/Spinner";
import { useDiscoverActivities } from "@/lib/useDiscoverActivities";

const RUN_SUBTYPES = [
  { value: "long_run", label: "Long Run" },
  { value: "sprint_workout", label: "Sprint" },
  { value: "hill_workout", label: "Hills" },
  { value: "easy_run", label: "Easy Run" },
  { value: "trail", label: "Trail" },
];

const DIFFICULTIES = ["easy", "moderate", "hard"];
const RADIUS_OPTIONS = [5, 10, 25];

export default function Home() {
  const { user, loading: authLoading } = useAuth();

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

  return <DiscoveryFeed />;
}

function DiscoveryFeed() {
  const {
    activities,
    loading,
    filters,
    setRadius,
    setDifficulty,
    setRunSubtype,
    setDateRange,
    setOnlyOpen,
  } = useDiscoverActivities();

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

  // Date chip helpers
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  type DatePreset = "anytime" | "today" | "week";
  function getDatePreset(): DatePreset {
    if (!filters.dateTo) return "anytime";
    const to = new Date(filters.dateTo);
    if (Math.abs(to.getTime() - todayEnd.getTime()) < 60000) return "today";
    if (Math.abs(to.getTime() - weekEnd.getTime()) < 60000) return "week";
    return "anytime";
  }

  function setDatePreset(preset: DatePreset) {
    if (preset === "today") {
      setDateRange(now.toISOString(), todayEnd.toISOString());
    } else if (preset === "week") {
      setDateRange(now.toISOString(), weekEnd.toISOString());
    } else {
      setDateRange(now.toISOString(), null);
    }
  }

  const datePreset = getDatePreset();

  // Multi-select toggle helpers
  function toggleDifficulty(d: string) {
    const current = filters.difficulty ?? [];
    if (current.includes(d)) {
      const next = current.filter((x) => x !== d);
      setDifficulty(next.length > 0 ? next : null);
    } else {
      setDifficulty([...current, d]);
    }
  }

  function toggleSubtype(s: string) {
    const current = filters.runSubtype ?? [];
    if (current.includes(s)) {
      const next = current.filter((x) => x !== s);
      setRunSubtype(next.length > 0 ? next : null);
    } else {
      setRunSubtype([...current, s]);
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">TagAlong</h1>
        <div className="flex gap-3">
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
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Date chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["anytime", "today", "week"] as DatePreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => setDatePreset(preset)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm border transition-colors ${
                datePreset === preset
                  ? "bg-black text-white border-black"
                  : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-400"
              }`}
            >
              {preset === "anytime" ? "Anytime" : preset === "today" ? "Today" : "This week"}
            </button>
          ))}
        </div>

        {/* Radius */}
        <div className="flex gap-2 items-center">
          <span className="text-xs text-zinc-500 shrink-0">Radius</span>
          {RADIUS_OPTIONS.map((km) => (
            <button
              key={km}
              onClick={() => setRadius(km)}
              className={`rounded-full px-3 py-1.5 text-sm border transition-colors ${
                filters.radiusKm === km
                  ? "bg-black text-white border-black"
                  : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-400"
              }`}
            >
              {km} km
            </button>
          ))}
        </div>

        {/* Difficulty */}
        <div className="flex gap-2 items-center">
          <span className="text-xs text-zinc-500 shrink-0">Difficulty</span>
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => toggleDifficulty(d)}
              className={`rounded-full px-3 py-1.5 text-sm border transition-colors capitalize ${
                filters.difficulty?.includes(d)
                  ? "bg-black text-white border-black"
                  : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-400"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Run subtype */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-zinc-500 shrink-0 self-center">Type</span>
          {RUN_SUBTYPES.map((s) => (
            <button
              key={s.value}
              onClick={() => toggleSubtype(s.value)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm border transition-colors ${
                filters.runSubtype?.includes(s.value)
                  ? "bg-black text-white border-black"
                  : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-400"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Only open toggle */}
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={filters.onlyOpen}
            onChange={(e) => setOnlyOpen(e.target.checked)}
            className="rounded border-zinc-300"
          />
          Hide full activities
        </label>
      </div>

      {/* Activity list */}
      {loading ? (
        <Spinner />
      ) : activities.length === 0 ? (
        <div className="text-center mt-12">
          <p className="text-zinc-500">No runs found nearby.</p>
          <p className="text-sm text-zinc-400 mt-1">
            Try widening the radius or clearing filters.
          </p>
        </div>
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
                {activity.difficulty && (
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 capitalize">
                    {activity.difficulty}
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-col gap-0.5 text-sm text-zinc-500">
                <p>{formatDate(activity.start_time)}</p>
                {activity.run_subtype && (
                  <p className="capitalize">{activity.run_subtype.replace(/_/g, " ")}</p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-zinc-400">
                  {activity.distance_km.toFixed(1)} km away
                </span>
                {activity.capacity != null ? (
                  <span className="text-zinc-400">
                    {activity.spots_left != null && activity.spots_left > 0
                      ? `${activity.spots_left} spot${activity.spots_left === 1 ? "" : "s"} left`
                      : "Full"}
                  </span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

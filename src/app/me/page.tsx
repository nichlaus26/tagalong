"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import Spinner from "@/components/Spinner";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  name: string;
  city: string;
  bio: string | null;
  interests: string[];
  rating_avg: number;
  rating_count: number;
};

type ActivitySummary = {
  id: string;
  title: string;
  type: string;
  start_time: string;
  status: string;
};

type RsvpWithActivity = {
  id: string;
  status: string;
  activity: ActivitySummary;
};

const INTEREST_OPTIONS = [
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
];

export default function MePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [tab, setTab] = useState<"hosting" | "going">("hosting");
  const [hosting, setHosting] = useState<ActivitySummary[]>([]);
  const [rsvps, setRsvps] = useState<RsvpWithActivity[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth");
      return;
    }

    supabase
      .from("profiles")
      .select("id, name, city, bio, interests, rating_avg, rating_count")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          setName(data.name);
          setBio(data.bio ?? "");
          setInterests(data.interests);
        }
      });

    // Load hosting
    supabase
      .from("activities")
      .select("id, title, type, start_time, status")
      .eq("host_id", user.id)
      .order("start_time", { ascending: false })
      .then(({ data }) => {
        if (data) setHosting(data);
      });

    // Load RSVPs with activity info
    supabase
      .from("rsvps")
      .select("id, status, activity:activities(id, title, type, start_time, status)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setRsvps(data as unknown as RsvpWithActivity[]);
      });
  }, [user, authLoading, router]);

  if (authLoading || !profile) return <Spinner />;

  function toggleInterest(interest: string) {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        name: name.trim(),
        bio: bio.trim() || null,
        interests,
      })
      .eq("id", user!.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setProfile((p) =>
      p ? { ...p, name: name.trim(), bio: bio.trim() || null, interests } : p
    );
    setEditing(false);
    setSaving(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  function statusLabel(status: string) {
    if (status === "pending") return "Pending";
    if (status === "approved") return "Approved";
    if (status === "declined") return "Declined";
    return status;
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
          &larr; Home
        </Link>
        <button
          onClick={handleSignOut}
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          Sign Out
        </button>
      </div>

      {editing ? (
        <div className="flex flex-col gap-4 mb-8">
          <h1 className="text-2xl font-bold">Edit Profile</h1>
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Interests</label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`rounded-full px-3 py-1.5 text-sm border transition-colors ${
                    interests.includes(interest)
                      ? "bg-black text-white border-black"
                      : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-400"
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-lg bg-black px-4 py-3 text-white font-medium hover:bg-zinc-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setName(profile.name);
                setBio(profile.bio ?? "");
                setInterests(profile.interests);
                setEditing(false);
                setError("");
              }}
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 font-medium hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <h1 className="text-xl font-semibold">{profile.name}</h1>
            <p className="text-sm text-zinc-500">{profile.city}</p>
          </div>

          {profile.rating_count > 0 && (
            <p className="text-sm text-zinc-600">
              {profile.rating_avg.toFixed(1)} stars ({profile.rating_count}{" "}
              {profile.rating_count === 1 ? "review" : "reviews"})
            </p>
          )}

          {profile.bio && <p className="text-zinc-700">{profile.bio}</p>}

          {profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <span
                  key={interest}
                  className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700"
                >
                  {interest}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={() => setEditing(true)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 font-medium hover:bg-zinc-50"
          >
            Edit Profile
          </button>
        </div>
      )}

      {/* Hosting / Going tabs */}
      <div className="border-t pt-4">
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setTab("hosting")}
            className={`text-sm font-medium pb-1 ${
              tab === "hosting"
                ? "text-black border-b-2 border-black"
                : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            Hosting ({hosting.length})
          </button>
          <button
            onClick={() => setTab("going")}
            className={`text-sm font-medium pb-1 ${
              tab === "going"
                ? "text-black border-b-2 border-black"
                : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            Going / Requested ({rsvps.length})
          </button>
        </div>

        {tab === "hosting" && (
          <div className="flex flex-col gap-2">
            {hosting.length === 0 ? (
              <p className="text-sm text-zinc-500">No activities hosted yet.</p>
            ) : (
              hosting.map((a) => (
                <Link
                  key={a.id}
                  href={`/activities/${a.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 hover:border-zinc-400 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{a.title}</p>
                    <p className="text-xs text-zinc-500">
                      {formatDate(a.start_time)} &middot; {a.type}
                    </p>
                  </div>
                  <span
                    className={`text-xs rounded-full px-2 py-0.5 ${
                      a.status === "cancelled"
                        ? "bg-red-100 text-red-700"
                        : a.status === "completed"
                          ? "bg-zinc-100 text-zinc-500"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {a.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        )}

        {tab === "going" && (
          <div className="flex flex-col gap-2">
            {rsvps.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No activities joined yet.
              </p>
            ) : (
              rsvps.map((r) => (
                <Link
                  key={r.id}
                  href={`/activities/${r.activity.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 hover:border-zinc-400 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{r.activity.title}</p>
                    <p className="text-xs text-zinc-500">
                      {formatDate(r.activity.start_time)} &middot;{" "}
                      {r.activity.type}
                    </p>
                  </div>
                  <span
                    className={`text-xs rounded-full px-2 py-0.5 ${
                      r.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : r.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {statusLabel(r.status)}
                  </span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

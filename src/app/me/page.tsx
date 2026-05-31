"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
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
  }, [user, authLoading, router]);

  if (authLoading || !profile) return null;

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

  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <button
          onClick={handleSignOut}
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          Sign Out
        </button>
      </div>

      {editing ? (
        <div className="flex flex-col gap-4">
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
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold">{profile.name}</h2>
            <p className="text-sm text-zinc-500">{profile.city}</p>
          </div>

          {profile.rating_count > 0 && (
            <p className="text-sm text-zinc-600">
              {profile.rating_avg.toFixed(1)} stars ({profile.rating_count}{" "}
              {profile.rating_count === 1 ? "review" : "reviews"})
            </p>
          )}

          {profile.bio && (
            <p className="text-zinc-700">{profile.bio}</p>
          )}

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
    </div>
  );
}

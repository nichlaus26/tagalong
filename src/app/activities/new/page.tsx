"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
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

export default function NewActivityPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [locationText, setLocationText] = useState("");
  const [startTime, setStartTime] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (authLoading) return null;
  if (!user) {
    router.push("/auth");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const { data, error: insertError } = await supabase
      .from("activities")
      .insert({
        host_id: user!.id,
        title: title.trim(),
        type,
        description: description.trim() || null,
        location_text: locationText.trim(),
        start_time: new Date(startTime).toISOString(),
        difficulty: difficulty || null,
        max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    router.push(`/activities/${data.id}`);
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Activity</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Morning run in the park"
            required
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Type *</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
          >
            <option value="">Select a type</option>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What should people know about this activity?"
            rows={3}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Location *</label>
          <input
            type="text"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            placeholder="Bois de la Cambre entrance"
            required
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Date & Time *
          </label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
          >
            <option value="">None</option>
            <option value="easy">Easy</option>
            <option value="moderate">Moderate</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Max Participants
          </label>
          <input
            type="number"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
            placeholder="Leave blank for unlimited"
            min={1}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-black px-4 py-3 text-white font-medium hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create Activity"}
        </button>
      </form>
    </div>
  );
}

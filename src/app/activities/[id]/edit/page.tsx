"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Spinner from "@/components/Spinner";
import { supabase } from "@/lib/supabase";
import { ALL_ALL_ACTIVITY_TYPES } from "@/lib/activityTypes";

export default function EditActivityPage() {
  const { id } = useParams<{ id: string }>();
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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth");
      return;
    }

    supabase
      .from("activities")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data || data.host_id !== user.id) {
          router.push(`/activities/${id}`);
          return;
        }
        setTitle(data.title);
        setType(data.type);
        setDescription(data.description ?? "");
        setLocationText(data.location_text);
        // Format for datetime-local input
        const dt = new Date(data.start_time);
        const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setStartTime(local);
        setDifficulty(data.difficulty ?? "");
        setMaxParticipants(data.max_participants?.toString() ?? "");
        setLoaded(true);
      });
  }, [id, user, authLoading, router]);

  if (!loaded) return <Spinner />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const { error: updateError } = await supabase
      .from("activities")
      .update({
        title: title.trim(),
        type,
        description: description.trim() || null,
        location_text: locationText.trim(),
        start_time: new Date(startTime).toISOString(),
        difficulty: difficulty || null,
        max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    router.push(`/activities/${id}`);
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Activity</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
            {ALL_ACTIVITY_TYPES.map((t) => (
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

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-black px-4 py-3 text-white font-medium hover:bg-zinc-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/activities/${id}`)}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 font-medium hover:bg-zinc-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

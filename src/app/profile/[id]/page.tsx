"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, name, city, bio, interests, rating_avg, rating_count")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setProfile(data);
        }
      });
  }, [id]);

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <p className="text-zinc-500">Profile not found</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto">
      <div className="flex flex-col gap-4">
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
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  role: string;
  created_at: string;
  reviewer: { id: string; name: string };
  activity: { id: string; title: string };
};

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
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

    supabase
      .from("reviews")
      .select("id, rating, comment, role, created_at, reviewer:profiles!reviews_reviewer_id_fkey(id, name), activity:activities!reviews_activity_id_fkey(id, title)")
      .eq("reviewee_id", id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setReviews(data as unknown as Review[]);
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
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
        &larr; Back
      </Link>

      <div className="mt-4 flex flex-col gap-4">
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

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-zinc-500 mb-3">Reviews</p>
            <div className="flex flex-col gap-3">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-lg border border-zinc-200 p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 text-sm">
                        {"★".repeat(review.rating)}
                        {"★".repeat(5 - review.rating).split("").map((_, i) => (
                          <span key={i} className="text-zinc-300">★</span>
                        ))}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-400 capitalize">
                      as {review.role}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-zinc-700 mb-1">{review.comment}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <Link
                      href={`/profile/${review.reviewer.id}`}
                      className="hover:underline"
                    >
                      by {review.reviewer.name}
                    </Link>
                    <Link
                      href={`/activities/${review.activity.id}`}
                      className="hover:underline"
                    >
                      {review.activity.title}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

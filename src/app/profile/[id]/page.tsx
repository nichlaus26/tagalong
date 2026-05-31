"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  role: string;
  created_at: string;
  reviewer: { id: string; name: string };
  activity: { id: string; title: string };
};

const REPORT_REASONS = [
  "Inappropriate behavior",
  "Harassment",
  "Spam",
  "Fake profile",
  "Other",
];

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notFound, setNotFound] = useState(false);

  // Block state
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  // Report state
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSaving, setReportSaving] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const isOwnProfile = user?.id === id;

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

  // Check block status
  useEffect(() => {
    if (!user || isOwnProfile) return;
    supabase
      .from("blocks")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", id)
      .maybeSingle()
      .then(({ data }) => {
        setIsBlocked(!!data);
      });
  }, [user, id, isOwnProfile]);

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <p className="text-zinc-500">Profile not found</p>
      </div>
    );
  }

  if (!profile) return <Spinner />;

  async function handleBlock() {
    if (!user) return;
    setBlockLoading(true);
    if (isBlocked) {
      await supabase
        .from("blocks")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", id);
      setIsBlocked(false);
    } else {
      await supabase.from("blocks").insert({
        blocker_id: user.id,
        blocked_id: id,
      });
      setIsBlocked(true);
    }
    setBlockLoading(false);
  }

  async function handleReport(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !reportReason) return;
    setReportSaving(true);
    await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: id,
      reason: reportReason,
      details: reportDetails.trim() || null,
    });
    setReportSaving(false);
    setReportSent(true);
    setShowReport(false);
  }

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

        {isOwnProfile && (
          <Link
            href="/me"
            className="text-sm text-zinc-500 hover:text-zinc-800"
          >
            Go to My Profile &rarr;
          </Link>
        )}

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

        {/* Report & Block — only for other users */}
        {user && !isOwnProfile && (
          <div className="border-t pt-4 flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={handleBlock}
                disabled={blockLoading}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  isBlocked
                    ? "border-red-300 text-red-600 hover:bg-red-50"
                    : "border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                {isBlocked ? "Unblock" : "Block"}
              </button>
              {!reportSent ? (
                <button
                  onClick={() => setShowReport(!showReport)}
                  className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium hover:bg-zinc-50"
                >
                  {showReport ? "Cancel" : "Report"}
                </button>
              ) : (
                <span className="flex-1 rounded-lg border border-green-300 bg-green-50 px-4 py-2.5 text-sm text-green-700 text-center">
                  Reported
                </span>
              )}
            </div>

            {showReport && (
              <form onSubmit={handleReport} className="flex flex-col gap-2 mt-1">
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Select reason</option>
                  {REPORT_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Additional details (optional)"
                  rows={2}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
                />
                <button
                  type="submit"
                  disabled={reportSaving || !reportReason}
                  className="rounded-lg bg-red-600 px-4 py-2.5 text-sm text-white font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {reportSaving ? "Sending..." : "Submit Report"}
                </button>
              </form>
            )}
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

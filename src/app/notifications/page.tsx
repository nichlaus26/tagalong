"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

type Notification = {
  id: string;
  type: string;
  activity_id: string | null;
  body: string;
  read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth");
      return;
    }

    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setNotifications(data);
        setLoaded(true);
      });
  }, [user, authLoading, router]);

  if (authLoading || !loaded) return null;

  async function markAsRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
          &larr; Home
        </Link>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-zinc-500 hover:text-zinc-800"
          >
            Mark all as read
          </button>
        )}
      </div>

      <h1 className="text-2xl font-bold mb-4">Notifications</h1>

      {notifications.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center mt-12">
          No notifications yet.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                n.read ? "bg-white" : "bg-zinc-50"
              }`}
            >
              {!n.read && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-black" />
              )}
              <div className={`flex-1 ${n.read ? "ml-5" : ""}`}>
                {n.activity_id ? (
                  <Link
                    href={`/activities/${n.activity_id}`}
                    onClick={() => !n.read && markAsRead(n.id)}
                    className="text-sm hover:underline"
                  >
                    {n.body}
                  </Link>
                ) : (
                  <p className="text-sm">{n.body}</p>
                )}
                <p className="text-xs text-zinc-400 mt-0.5">
                  {formatTime(n.created_at)}
                </p>
              </div>
              {!n.read && (
                <button
                  onClick={() => markAsRead(n.id)}
                  className="shrink-0 text-xs text-zinc-400 hover:text-zinc-600"
                >
                  dismiss
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender: { id: string; name: string };
};

const POLL_INTERVAL = 5000;

export default function ActivityChat({
  activityId,
  userId,
}: {
  activityId: string;
  userId: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastFetchRef = useRef<string | null>(null);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, body, created_at, sender:profiles!messages_sender_id_fkey(id, name)")
      .eq("activity_id", activityId)
      .order("created_at", { ascending: true });

    if (data) {
      const msgs = data as unknown as Message[];
      const lastId = msgs.length > 0 ? msgs[msgs.length - 1].id : null;
      // Only scroll if new messages arrived
      const shouldScroll = lastId !== lastFetchRef.current;
      lastFetchRef.current = lastId;
      setMessages(msgs);
      if (shouldScroll) {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    }
  }, [activityId]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadMessages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);

    const { error } = await supabase.from("messages").insert({
      activity_id: activityId,
      sender_id: userId,
      body: body.trim(),
    });

    if (!error) {
      setBody("");
      await loadMessages();
    }
    setSending(false);
  }

  async function handleDelete(messageId: string) {
    await supabase.from("messages").delete().eq("id", messageId);
    await loadMessages();
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function formatDateHeader(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }

  // Group messages by date
  let lastDate = "";

  return (
    <div className="flex flex-col h-80">
      <div className="flex-1 overflow-y-auto px-1 py-2 flex flex-col gap-1">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-400 text-center mt-8">
            No messages yet. Start the conversation!
          </p>
        )}
        {messages.map((msg) => {
          const dateStr = formatDateHeader(msg.created_at);
          const showDate = dateStr !== lastDate;
          lastDate = dateStr;
          const isMe = msg.sender_id === userId;

          return (
            <div key={msg.id}>
              {showDate && (
                <p className="text-xs text-zinc-400 text-center my-2">
                  {dateStr}
                </p>
              )}
              <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${
                    isMe
                      ? "bg-black text-white"
                      : "bg-zinc-100 text-zinc-900"
                  }`}
                >
                  {!isMe && (
                    <Link
                      href={`/profile/${msg.sender.id}`}
                      className="block text-xs font-medium mb-0.5 hover:underline"
                    >
                      {msg.sender.name}
                    </Link>
                  )}
                  <p className="text-sm break-words">{msg.body}</p>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <span className={`text-[10px] ${isMe ? "text-zinc-400" : "text-zinc-400"}`}>
                      {formatTime(msg.created_at)}
                    </span>
                    {isMe && (
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className={`text-[10px] ${isMe ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-400 hover:text-zinc-600"}`}
                      >
                        delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 pt-2 border-t">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="rounded-lg bg-black px-4 py-2 text-sm text-white font-medium hover:bg-zinc-800 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

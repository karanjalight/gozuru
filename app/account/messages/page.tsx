"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircleMore, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type MessageThread = {
  booking_id: string;
  experience_id: string | null;
  experience_title: string | null;
  slot_starts_at: string | null;
  slot_ends_at: string | null;
  counterpart_user_id: string;
  counterpart_name: string | null;
  counterpart_email: string | null;
  counterpart_avatar_path: string | null;
  last_message_id: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  last_message_sender_id: string | null;
  unread_count: number;
};

type BookingMessage = {
  id: string;
  booking_id: string;
  sender_user_id: string;
  message_text: string;
  read_at: string | null;
  created_at: string;
};

function moveThreadToTop(threads: MessageThread[], bookingId: string) {
  const index = threads.findIndex((thread) => thread.booking_id === bookingId);
  if (index <= 0) return threads;
  const next = [...threads];
  const [thread] = next.splice(index, 1);
  next.unshift(thread);
  return next;
}

function getInitials(name?: string | null, email?: string | null) {
  const source = (name || email || "User").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function toAvatarUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

export default function AccountMessagesPage() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.booking_id === selectedBookingId) ?? null,
    [threads, selectedBookingId],
  );

  const applyIncomingMessage = useCallback(
    (incomingMessage: BookingMessage) => {
      setThreads((previous) => {
        const index = previous.findIndex((thread) => thread.booking_id === incomingMessage.booking_id);
        if (index === -1) return previous;
        const next = [...previous];
        const current = next[index];
        const isIncomingForViewer = incomingMessage.sender_user_id !== user?.id;
        next[index] = {
          ...current,
          last_message_id: incomingMessage.id,
          last_message_text: incomingMessage.message_text,
          last_message_at: incomingMessage.created_at,
          last_message_sender_id: incomingMessage.sender_user_id,
          unread_count:
            selectedBookingId === incomingMessage.booking_id
              ? 0
              : isIncomingForViewer
                ? current.unread_count + 1
                : current.unread_count,
        };
        return moveThreadToTop(next, incomingMessage.booking_id);
      });

      if (selectedBookingId === incomingMessage.booking_id) {
        setMessages((previous) => {
          if (previous.some((message) => message.id === incomingMessage.id)) return previous;
          const withoutMatchingTemp = previous.filter((message) => {
            if (!message.id.startsWith("temp-")) return true;
            return !(
              message.sender_user_id === incomingMessage.sender_user_id &&
              message.message_text === incomingMessage.message_text
            );
          });
          return [...withoutMatchingTemp, incomingMessage];
        });
      }
    },
    [selectedBookingId, user?.id],
  );

  const loadThreads = useCallback(async (showLoader = true) => {
    if (!user) return;
    if (showLoader) setLoadingThreads(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("get_account_message_threads", {
      p_limit: 30,
    });

    if (rpcError) {
      setError(rpcError.message);
      setThreads([]);
      setSelectedBookingId(null);
    } else {
      const nextThreads = ((data ?? []) as unknown as MessageThread[]).map((thread) => ({
        ...thread,
        unread_count: Number(thread.unread_count ?? 0),
      }));
      setThreads(nextThreads);
      setSelectedBookingId((previous) => {
        if (previous && nextThreads.some((thread) => thread.booking_id === previous)) {
          return previous;
        }
        return nextThreads[0]?.booking_id ?? null;
      });
    }

    if (showLoader) setLoadingThreads(false);
  }, [user]);

  const loadMessages = useCallback(async (bookingId: string, showLoader = true) => {
    if (!user) return;
    if (showLoader) setLoadingMessages(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("booking_messages")
      .select("id,booking_id,sender_user_id,message_text,read_at,created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true })
      .limit(400);

    if (queryError) {
      setError(queryError.message);
      setMessages([]);
    } else {
      setMessages((data ?? []) as BookingMessage[]);
      await supabase.rpc("mark_booking_messages_read", { p_booking_id: bookingId });
      setThreads((previous) =>
        previous.map((thread) =>
          thread.booking_id === bookingId ? { ...thread, unread_count: 0 } : thread,
        ),
      );
    }

    if (showLoader) setLoadingMessages(false);
  }, [user]);

  const applyMessageUpdate = useCallback((messageUpdate: BookingMessage) => {
    setMessages((previous) =>
      previous.map((message) =>
        message.id === messageUpdate.id ? { ...message, read_at: messageUpdate.read_at } : message,
      ),
    );
  }, []);

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => {
        setThreads([]);
        setMessages([]);
        setSelectedBookingId(null);
        setLoadingThreads(false);
      });
      return;
    }
    queueMicrotask(() => {
      void loadThreads();
    });
  }, [user, loadThreads]);

  useEffect(() => {
    if (!user || !selectedBookingId) {
      queueMicrotask(() => setMessages([]));
      return;
    }
    queueMicrotask(() => {
      void loadMessages(selectedBookingId);
    });
  }, [user, selectedBookingId, loadMessages]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`booking-messages-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "booking_messages" },
        (payload) => {
          const incomingMessage = payload.new as BookingMessage;
          if (!incomingMessage?.id || !incomingMessage.booking_id) return;
          applyIncomingMessage(incomingMessage);
          if (
            selectedBookingId &&
            incomingMessage.booking_id === selectedBookingId &&
            incomingMessage.sender_user_id !== user.id
          ) {
            void supabase.rpc("mark_booking_messages_read", { p_booking_id: selectedBookingId });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "booking_messages" },
        (payload) => {
          const updatedMessage = payload.new as BookingMessage;
          if (!updatedMessage?.id) return;
          applyMessageUpdate(updatedMessage);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [applyIncomingMessage, applyMessageUpdate, selectedBookingId, user]);

  async function sendMessage() {
    if (!selectedThread) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc("send_booking_message", {
      p_booking_id: selectedThread.booking_id,
      p_message_text: trimmed,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setMessages((previous) => {
        const optimisticMessage: BookingMessage = {
          id: `temp-${Date.now()}`,
          booking_id: selectedThread.booking_id,
          sender_user_id: user?.id ?? "",
          message_text: trimmed,
          read_at: null,
          created_at: new Date().toISOString(),
        };
        return [...previous, optimisticMessage];
      });
      setThreads((previous) =>
        moveThreadToTop(
          previous.map((thread) =>
            thread.booking_id === selectedThread.booking_id
              ? {
                  ...thread,
                  last_message_text: trimmed,
                  last_message_at: new Date().toISOString(),
                  last_message_sender_id: user?.id ?? null,
                }
              : thread,
          ),
          selectedThread.booking_id,
        ),
      );
      setDraft("");
    }

    setSending(false);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-3xl border border-orange-200/70 bg-gradient-to-br from-orange-50/80 via-background to-background p-6 shadow-sm dark:border-orange-500/20 dark:from-orange-500/10">
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Chat with experts and guests for active paid experiences.
        </p>
      </div>

      {error ? (
        <Card className="mt-4 rounded-2xl border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </Card>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-[70vh] overflow-hidden rounded-2xl border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Conversations</p>
          </div>
          <div className="h-[calc(70vh-53px)] overflow-auto p-2">
            {loadingThreads ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Loading conversations...</p>
            ) : threads.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                No active conversations yet. Once a traveler pays and books, chat appears here.
              </p>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.booking_id}
                  type="button"
                  onClick={() => setSelectedBookingId(thread.booking_id)}
                  className={cn(
                    "mb-2 w-full rounded-xl border px-3 py-3 text-left transition",
                    thread.booking_id === selectedBookingId
                      ? "border-orange-300 bg-orange-50 dark:border-orange-500/40 dark:bg-orange-500/10"
                      : "border-border bg-background hover:border-orange-200 hover:bg-muted/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <Avatar size="sm" className="mt-0.5">
                        <AvatarImage
                          src={toAvatarUrl(thread.counterpart_avatar_path) ?? undefined}
                          alt={thread.counterpart_name ?? thread.counterpart_email ?? "Profile"}
                        />
                        <AvatarFallback>
                          {getInitials(thread.counterpart_name, thread.counterpart_email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {thread.counterpart_name || thread.counterpart_email || "Expert"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {thread.experience_title ?? "Experience"}
                      </p>
                      </div>
                    </div>
                    {thread.unread_count > 0 ? (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {thread.unread_count}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {thread.last_message_text ?? "No messages yet"}
                  </p>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="h-[70vh] rounded-2xl border-border bg-card">
          {!selectedThread ? (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <div className="rounded-full bg-orange-50 p-3 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
                <MessageCircleMore className="size-6" />
              </div>
              <p className="mt-4 text-sm font-semibold">Select a conversation</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose a message thread from the left to start chatting.
              </p>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Avatar>
                  <AvatarImage
                    src={toAvatarUrl(selectedThread.counterpart_avatar_path) ?? undefined}
                    alt={selectedThread.counterpart_name ?? selectedThread.counterpart_email ?? "Profile"}
                  />
                  <AvatarFallback>
                    {getInitials(selectedThread.counterpart_name, selectedThread.counterpart_email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {selectedThread.counterpart_name || selectedThread.counterpart_email || "Conversation"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedThread.experience_title ?? "Experience"}
                  </p>
                </div>
              </div>
              <div className="flex-1 overflow-auto px-4 py-3">
                {loadingMessages ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">Loading messages...</p>
                ) : messages.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Start the conversation with your first message.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message) => {
                      const isOwn = message.sender_user_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                              isOwn
                                ? "rounded-br-md bg-orange-500 text-white"
                                : "rounded-bl-md border border-border bg-muted/30 text-foreground",
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.message_text}</p>
                            <p
                              className={cn(
                                "mt-1 text-[10px]",
                                isOwn ? "text-orange-100" : "text-muted-foreground",
                              )}
                            >
                              {new Date(message.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="border-t border-border p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={2}
                    maxLength={2000}
                    placeholder="Type your message..."
                    className="max-h-32 min-h-[44px] flex-1 resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                  <Button
                    type="button"
                    className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
                    onClick={() => void sendMessage()}
                    disabled={sending || draft.trim().length === 0}
                  >
                    <Send className="mr-1 size-4" />
                    {sending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

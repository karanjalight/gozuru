"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  Minus,
  Search,
  Send,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type MessageThread = {
  booking_id: string;
  experience_title: string | null;
  counterpart_name: string | null;
  counterpart_email: string | null;
  counterpart_avatar_path: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
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

export function LinkedInMessagesDock() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [activeTab, setActiveTab] = useState<"focused" | "other">("focused");
  const [draft, setDraft] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const totalUnread = useMemo(
    () => threads.reduce((sum, thread) => sum + Number(thread.unread_count || 0), 0),
    [threads],
  );

  const filteredThreads = useMemo(() => {
    const search = searchValue.trim().toLowerCase();
    if (!search) return threads;
    return threads.filter((thread) => {
      const counterpart = (thread.counterpart_name || thread.counterpart_email || "").toLowerCase();
      const experience = (thread.experience_title || "").toLowerCase();
      return counterpart.includes(search) || experience.includes(search);
    });
  }, [threads, searchValue]);

  const focusedThreads = useMemo(
    () => filteredThreads.filter((thread) => thread.unread_count > 0 || !!thread.last_message_text),
    [filteredThreads],
  );

  const visibleThreads = activeTab === "focused" ? focusedThreads : filteredThreads;

  const formatThreadTime = useCallback((value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    return sameDay
      ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : date.toLocaleDateString([], { month: "short", day: "numeric" });
  }, []);

  const formatMessageTime = useCallback((value: string) => {
    const date = new Date(value);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }, []);

  const playSendBeep = useCallback(() => {
    if (!audioEnabled || typeof window === "undefined") return;
    const audioContext = new window.AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gainNode.gain.value = 0.05;
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.08);
    oscillator.onended = () => {
      void audioContext.close();
    };
  }, [audioEnabled]);

  const notifyMessageSent = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification("Message sent", { body: "Your message was delivered." });
      return;
    }
    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.booking_id === activeBookingId) ?? null,
    [threads, activeBookingId],
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
          last_message_text: incomingMessage.message_text,
          last_message_at: incomingMessage.created_at,
          unread_count:
            activeBookingId === incomingMessage.booking_id && expanded
              ? 0
              : isIncomingForViewer
                ? current.unread_count + 1
                : current.unread_count,
        };
        return moveThreadToTop(next, incomingMessage.booking_id);
      });

      if (activeBookingId === incomingMessage.booking_id && expanded) {
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
    [activeBookingId, expanded, user?.id],
  );

  const loadThreads = useCallback(async () => {
    if (!user) return;
    setLoadingThreads(true);
    const { data } = await supabase.rpc("get_account_message_threads", { p_limit: 30 });
    const nextThreads = ((data ?? []) as unknown as MessageThread[]).map((thread) => ({
      ...thread,
      unread_count: Number(thread.unread_count ?? 0),
    }));
    setThreads(nextThreads);
    setActiveBookingId((previous) => {
      if (previous && nextThreads.some((thread) => thread.booking_id === previous)) return previous;
      return nextThreads[0]?.booking_id ?? null;
    });
    setLoadingThreads(false);
  }, [user]);

  const loadMessages = useCallback(
    async (bookingId: string) => {
      if (!user) return;
      setLoadingMessages(true);
      const { data } = await supabase
        .from("booking_messages")
        .select("id,booking_id,sender_user_id,message_text,read_at,created_at")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as BookingMessage[]);
      await supabase.rpc("mark_booking_messages_read", { p_booking_id: bookingId });
      setThreads((previous) =>
        previous.map((thread) =>
          thread.booking_id === bookingId ? { ...thread, unread_count: 0 } : thread,
        ),
      );
      setLoadingMessages(false);
    },
    [user],
  );

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
        setExpanded(false);
        setActiveBookingId(null);
      });
      return;
    }
    queueMicrotask(() => {
      void loadThreads();
    });
  }, [user, loadThreads]);

  useEffect(() => {
    if (!user || !activeBookingId || !expanded) return;
    queueMicrotask(() => {
      void loadMessages(activeBookingId);
    });
  }, [activeBookingId, expanded, loadMessages, user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dock-messages-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "booking_messages" },
        (payload) => {
          const incomingMessage = payload.new as BookingMessage;
          if (!incomingMessage?.id || !incomingMessage.booking_id) return;
          applyIncomingMessage(incomingMessage);
          if (
            activeBookingId &&
            expanded &&
            incomingMessage.booking_id === activeBookingId &&
            incomingMessage.sender_user_id !== user.id
          ) {
            void supabase.rpc("mark_booking_messages_read", { p_booking_id: activeBookingId });
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
  }, [activeBookingId, applyIncomingMessage, applyMessageUpdate, expanded, user]);

  async function sendMessage() {
    if (!user) return;
    if (!activeBookingId) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSending(true);
    const { error } = await supabase.rpc("send_booking_message", {
      p_booking_id: activeBookingId,
      p_message_text: trimmed,
    });
    if (!error) {
      const nowIso = new Date().toISOString();
      setMessages((previous) => [
        ...previous,
        {
          id: `temp-${Date.now()}`,
          booking_id: activeBookingId,
          sender_user_id: user.id,
          message_text: trimmed,
          read_at: null,
          created_at: nowIso,
        },
      ]);
      setThreads((previous) =>
        moveThreadToTop(
          previous.map((thread) =>
            thread.booking_id === activeBookingId
              ? {
                  ...thread,
                  last_message_text: trimmed,
                  last_message_at: nowIso,
                }
              : thread,
          ),
          activeBookingId,
        ),
      );
      setDraft("");
      playSendBeep();
      notifyMessageSent();
    }
    setSending(false);
  }

  if (!user) return null;

  return (
    <div className="fixed bottom-0 right-5 z-50 hidden w-[320px] md:block">
      {!expanded ? (
        <button
          type="button"
          className="flex h-12 w-[320px] items-center justify-between rounded-t-xl border border-b-0 border-border bg-background px-3 text-sm font-semibold shadow-lg"
          onClick={() => setExpanded(true)}
        >
          <span className="inline-flex items-center gap-2.5">
            <Avatar size="sm">
              <AvatarFallback>M</AvatarFallback>
            </Avatar>
            Messaging
          </span>
          <span className="inline-flex items-center gap-2">
            {totalUnread > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-semibold text-white">
                {totalUnread}
              </span>
            ) : null}
            <ChevronDown className="size-4 text-muted-foreground" />
          </span>
        </button>
      ) : (
        <div className="relative w-[320px]">
          {activeThread ? (
            <div className="absolute bottom-0 right-[332px] h-[520px] w-[520px] overflow-hidden rounded-t-xl border border-border bg-background shadow-2xl">
              <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar>
                    <AvatarImage
                      src={toAvatarUrl(activeThread.counterpart_avatar_path) ?? undefined}
                      alt={activeThread.counterpart_name ?? activeThread.counterpart_email ?? "Profile"}
                    />
                    <AvatarFallback>
                      {getInitials(activeThread.counterpart_name, activeThread.counterpart_email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {activeThread.counterpart_name || activeThread.counterpart_email || "Conversation"}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {activeThread.experience_title || "Experience"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-full p-1 hover:bg-muted/50"
                    onClick={() => setActiveBookingId(null)}
                  >
                    <Minus className="size-4 text-muted-foreground" />
                  </button>
                  <button
                    type="button"
                    className="rounded-full p-1 hover:bg-muted/50"
                    onClick={() => setActiveBookingId(null)}
                  >
                    <X className="size-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="h-[390px] overflow-auto px-3 py-3">
                {loadingMessages ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">Loading messages...</p>
                ) : messages.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    Start the conversation.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {messages.map((message) => {
                      const isMine = message.sender_user_id === user.id;
                      return (
                        <div
                          key={message.id}
                          className={cn("flex", isMine ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[82%] rounded-2xl px-3 py-2 text-xs",
                              isMine
                                ? "rounded-br-md bg-orange-500 text-white"
                                : "rounded-bl-md border border-border bg-muted/40 text-foreground",
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.message_text}</p>
                            <p
                              className={cn(
                                "mt-1 text-[10px]",
                                isMine ? "text-orange-100" : "text-muted-foreground",
                              )}
                            >
                              {formatMessageTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="border-t border-border p-2.5">
                <div className="flex items-end gap-2">
                  <textarea
                    rows={1}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Write a message..."
                    className="min-h-[36px] flex-1 resize-none rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none ring-orange-500 focus:ring-2"
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={sending || draft.trim().length === 0}
                    className="rounded-full bg-orange-500 p-2 text-white disabled:opacity-60"
                  >
                    <Send className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="h-[620px] w-[320px] overflow-hidden rounded-t-xl border border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <Avatar size="sm">
                  <AvatarFallback>M</AvatarFallback>
                </Avatar>
                <p className="text-2xl font-semibold leading-none tracking-tight">Messaging</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={cn(
                    "rounded-full p-1 transition hover:bg-muted/50",
                    audioEnabled ? "text-emerald-600" : "text-muted-foreground",
                  )}
                  onClick={() => setAudioEnabled((previous) => !previous)}
                  aria-label={audioEnabled ? "Disable message beep" : "Enable message beep"}
                  title={audioEnabled ? "Disable message beep" : "Enable message beep"}
                >
                  <Bell className="size-4" />
                </button>
                <button
                  type="button"
                  className="rounded-full p-1 hover:bg-muted/50"
                  onClick={() => setExpanded(false)}
                  aria-label="Minimize messages"
                >
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>
              </div>
            </div>
              {/* <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="truncate text-xl font-semibold leading-none">
                  {user.email?.split("@")[0] || "Your profile"}
                </p>
                <ArrowRight className="size-5 text-foreground" />
              </div> */}
            <div className="border-b border-border px-3 py-3">
              <div className="flex items-center gap-2 rounded-md bg-muted px-2 py-2">
                <Search className="size-3.5 text-muted-foreground" />
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search messages"
                  className="w-full bg-transparent text-xs outline-none"
                />
              </div>
            </div>
            <div className="border-b border-border px-3">
              <div className="grid grid-cols-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("focused")}
                  className={cn(
                    "border-b-2 py-2 text-base font-semibold",
                    activeTab === "focused"
                      ? "border-blue-600 text-blue-700 dark:border-blue-500 dark:text-blue-300"
                      : "border-transparent text-muted-foreground",
                  )}
                >
                  Focused
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("other")}
                  className={cn(
                    "border-b-2 py-2 text-base font-semibold",
                    activeTab === "other"
                      ? "border-blue-600 text-blue-700 dark:border-blue-500 dark:text-blue-300"
                      : "border-transparent text-muted-foreground",
                  )}
                >
                  Other
                </button>
              </div>
            </div>
            <div className="h-[440px] overflow-auto">
              {loadingThreads ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Loading conversations...</p>
              ) : visibleThreads.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No conversations for active bookings yet.
                </p>
              ) : (
                visibleThreads.map((thread) => {
                  const selected = thread.booking_id === activeBookingId;
                  return (
                    <button
                      key={thread.booking_id}
                      type="button"
                      onClick={() => setActiveBookingId(thread.booking_id)}
                      className={cn(
                        "w-full border-b border-border/80 px-3 py-2 text-left transition-colors",
                        selected
                          ? "bg-blue-100/80 dark:bg-blue-500/15"
                          : "hover:bg-muted/70",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-2">
                          <Avatar>
                            <AvatarImage
                              src={toAvatarUrl(thread.counterpart_avatar_path) ?? undefined}
                              alt={thread.counterpart_name ?? thread.counterpart_email ?? "Profile"}
                            />
                            <AvatarFallback>
                              {getInitials(thread.counterpart_name, thread.counterpart_email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-base font-medium leading-tight text-foreground">
                              {thread.counterpart_name || thread.counterpart_email || "Conversation"}
                            </p>
                            <p className="mt-1 truncate text-sm text-muted-foreground">
                              {thread.last_message_text || "No messages yet"}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatThreadTime(thread.last_message_at)}
                        </p>
                      </div>
                      {thread.unread_count > 0 ? (
                        <div className="mt-1 flex justify-end">
                          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white dark:bg-blue-500 dark:text-blue-50">
                            {thread.unread_count}
                          </span>
                        </div>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

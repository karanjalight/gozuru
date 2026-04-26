"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { CalendarClock, CircleCheckBig, FileText, Inbox, Send } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ApplicationRow = {
  id: string;
  booked_at: string;
  status: string;
  guests_count: number;
  availability_id: string | null;
  host_note: string | null;
  experience_id: string | null;
  experience_title: string | null;
  slot_starts_at: string | null;
  slot_ends_at: string | null;
};

export default function AppliedExperiencesPage() {
  const searchParams = useSearchParams();
  const experienceIdFilter = searchParams.get("experienceId");
  const requestedView = searchParams.get("view");
  const activeView: "incoming" | "sent" = requestedView === "sent" ? "sent" : "incoming";
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExperienceTitle, setSelectedExperienceTitle] = useState<string | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => {
        setApplications([]);
        setLoading(false);
      });
      return;
    }
    void loadApplications();
  }, [activeView, experienceIdFilter, user]);

  const rows = useMemo(() => {
    return applications.slice(0, 50).map((application) => ({
      id: application.id,
      title: application.experience_title ?? "Untitled experience",
      status: application.status.replaceAll("_", " "),
      guestsCount: application.guests_count,
      createdAt: new Date(application.booked_at).toLocaleDateString(),
      startsAt: application.slot_starts_at ?? null,
      endsAt: application.slot_ends_at ?? null,
      hostNote: application.host_note,
    }));
  }, [applications]);

  const stats = useMemo(() => {
    const requested = rows.filter((row) => row.status === "requested").length;
    const confirmed = rows.filter((row) => row.status === "confirmed").length;
    return {
      total: rows.length,
      requested,
      confirmed,
    };
  }, [rows]);

  const getStatusClassName = (status: string) => {
    if (status === "confirmed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "requested") return "border-amber-200 bg-amber-50 text-amber-800";
    if (status.includes("cancelled")) return "border-rose-200 bg-rose-50 text-rose-700";
    return "border-slate-200 bg-slate-50 text-slate-700";
  };

  async function loadApplications() {
    if (!user) return;
    setLoading(true);
    setError(null);
    setActionMessage(null);
    const { data, error: queryError } = await supabase.rpc("get_account_applications", {
      p_view: activeView,
      p_experience_id: experienceIdFilter,
      p_limit: 50,
    });
    if (queryError) {
      setError(queryError.message);
      setApplications([]);
    } else {
      const nextRows = (data ?? []) as unknown as ApplicationRow[];
      setApplications(nextRows);
      const firstTitle = nextRows[0]?.experience_title ?? null;
      setSelectedExperienceTitle(firstTitle ?? null);
    }
    setLoading(false);
  }

  async function updateBookingStatus(bookingId: string, nextStatus: "confirmed" | "cancelled_by_host") {
    setActionMessage(null);
    setError(null);
    setUpdatingBookingId(bookingId);
    const { error: rpcError } = await supabase.rpc("host_respond_to_booking", {
      p_booking_id: bookingId,
      p_next_status: nextStatus,
      p_host_note: nextStatus === "confirmed" ? "Approved by host." : "Declined by host.",
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setActionMessage(nextStatus === "confirmed" ? "Booking approved." : "Booking declined.");
      await loadApplications();
    }
    setUpdatingBookingId(null);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-background to-background p-6 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage booking requests with a clear overview of status, schedule, and next actions.
        </p>
      </div>
      {experienceIdFilter ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Showing applications for{" "}
          <span className="font-medium text-foreground">
            {selectedExperienceTitle ?? "selected experience"}
          </span>
          .
        </p>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          {activeView === "incoming"
            ? "Applications received across your experiences."
            : "Applications you have made across experiences."}
        </p>
      )}
      <div className="mt-4 inline-flex rounded-full border border-border bg-muted/20 p-1">
        <Link
          href={experienceIdFilter ? `/account/applied?experienceId=${experienceIdFilter}` : "/account/applied"}
          className={cn(
            "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
            activeView === "incoming"
              ? "bg-orange-500 text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Inbox className="mr-1 inline-flex size-3.5" />
          Incoming
        </Link>
        <Link
          href={
            experienceIdFilter
              ? `/account/applied?view=sent&experienceId=${experienceIdFilter}`
              : "/account/applied?view=sent"
          }
          className={cn(
            "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
            activeView === "sent"
              ? "bg-orange-500 text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Send className="mr-1 inline-flex size-3.5" />
          Sent
        </Link>
      </div>
      {experienceIdFilter ? (
        <Link
          href={activeView === "sent" ? "/account/applied?view=sent" : "/account/applied"}
          className={cn(buttonVariants({ variant: "outline" }), "mt-3 rounded-full")}
        >
          View all applications
        </Link>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</p>
          <p className="mt-2 text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="rounded-2xl border-border bg-card p-4">
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarClock className="size-3.5" />
            Requested
          </p>
          <p className="mt-2 text-2xl font-bold">{stats.requested}</p>
        </Card>
        <Card className="rounded-2xl border-border bg-card p-4">
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <CircleCheckBig className="size-3.5" />
            Confirmed
          </p>
          <p className="mt-2 text-2xl font-bold">{stats.confirmed}</p>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="rounded-2xl border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Applications</h2>
          </div>
          {actionMessage ? (
            <p className="mt-3 text-xs text-emerald-700">{actionMessage}</p>
          ) : null}

          <div className="mt-4">
            <div className="hidden md:block">
              <div className="rounded-2xl border border-border/80 bg-muted/20 p-3">
                <div
                  className={cn(
                    "grid items-center rounded-xl bg-background px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
                    activeView === "incoming"
                      ? "grid-cols-[2fr_0.7fr_0.9fr_1.5fr_0.8fr_1.2fr]"
                      : "grid-cols-[2fr_0.7fr_0.9fr_1.5fr_0.8fr]",
                  )}
                >
                  <span>Experience</span>
                  <span>Guests</span>
                  <span>Requested</span>
                  <span>Slot</span>
                  <span>Status</span>
                  {activeView === "incoming" ? <span>Action</span> : null}
                </div>

                <div className="mt-2 max-h-[420px] space-y-2 overflow-auto pr-1">
                  {loading ? (
                    <div className="rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center text-xs text-muted-foreground">
                      Loading applications...
                    </div>
                  ) : error ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-8 text-center text-xs text-rose-700">
                      Failed to load applications: {error}
                    </div>
                  ) : rows.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center text-xs text-muted-foreground">
                      No applications yet for this selection.
                    </div>
                  ) : (
                    rows.map((r) => (
                      <div
                        key={r.id}
                        className={cn(
                          "grid items-center rounded-xl border border-border/70 bg-background px-4 py-3 shadow-sm transition hover:border-orange-200 hover:shadow",
                          activeView === "incoming"
                            ? "grid-cols-[2fr_0.7fr_0.9fr_1.5fr_0.8fr_1.2fr]"
                            : "grid-cols-[2fr_0.7fr_0.9fr_1.5fr_0.8fr]",
                        )}
                      >
                        <span className="truncate pr-3 text-sm font-semibold text-foreground">{r.title}</span>
                        <span className="text-sm font-medium text-foreground">{r.guestsCount}</span>
                        <span className="text-xs text-muted-foreground">{r.createdAt}</span>
                        <span className="truncate pr-2 text-xs text-muted-foreground">
                          {r.startsAt && r.endsAt
                            ? `${new Date(r.startsAt).toLocaleString()} - ${new Date(r.endsAt).toLocaleString()}`
                            : "No slot linked"}
                        </span>
                        <span
                          className={cn(
                            "inline-flex w-fit rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                            getStatusClassName(r.status),
                          )}
                        >
                          {r.status}
                        </span>
                        {activeView === "incoming" ? (
                          <div className="flex items-center justify-end gap-2">
                            {r.status === "requested" ? (
                              <>
                                <button
                                  type="button"
                                  disabled={updatingBookingId === r.id}
                                  onClick={() => updateBookingStatus(r.id, "confirmed")}
                                  className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={updatingBookingId === r.id}
                                  onClick={() => updateBookingStatus(r.id, "cancelled_by_host")}
                                  className="rounded-full bg-zinc-700 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
                                >
                                  Decline
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                {r.hostNote || "No action required"}
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-3 md:hidden">
              {loading ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Loading applications...</p>
              ) : error ? (
                <p className="py-4 text-center text-xs text-red-500">Failed to load applications: {error}</p>
              ) : rows.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">No applications yet for this selection.</p>
              ) : (
                rows.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <p className="line-clamp-1 text-sm font-semibold">{r.title}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <p>Guests: <span className="font-medium text-foreground">{r.guestsCount}</span></p>
                      <p>Requested: <span className="font-medium text-foreground">{r.createdAt}</span></p>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {r.startsAt && r.endsAt
                        ? `${new Date(r.startsAt).toLocaleString()} - ${new Date(r.endsAt).toLocaleString()}`
                        : "No slot linked"}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold", getStatusClassName(r.status))}>
                        {r.status}
                      </span>
                      {activeView === "incoming" && r.status === "requested" ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={updatingBookingId === r.id}
                            onClick={() => updateBookingStatus(r.id, "confirmed")}
                            className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={updatingBookingId === r.id}
                            onClick={() => updateBookingStatus(r.id, "cancelled_by_host")}
                            className="rounded-full bg-zinc-700 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                          >
                            Decline
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}


"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { FileText } from "lucide-react";
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
      <h1 className="text-2xl font-bold tracking-tight">Applied experiences</h1>
      {experienceIdFilter ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Showing applications for{" "}
          <span className="font-medium text-foreground">
            {selectedExperienceTitle ?? "selected experience"}
          </span>
          .
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          {activeView === "incoming"
            ? "Applications received across your experiences."
            : "Applications you have made across experiences."}
        </p>
      )}
      <div className="mt-3 inline-flex rounded-full border border-border bg-muted/20 p-1">
        <Link
          href={experienceIdFilter ? `/account/applied?experienceId=${experienceIdFilter}` : "/account/applied"}
          className={cn(
            "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
            activeView === "incoming"
              ? "bg-orange-500 text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
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

      <div className="mt-8">
        <Card className="rounded-2xl border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Applications</h2>
          </div>
          {actionMessage ? (
            <p className="mt-3 text-xs text-emerald-700">{actionMessage}</p>
          ) : null}

          <div className="mt-4">
            <div className="max-h-64 overflow-auto">
              <table className="w-full border-separate border-spacing-y-1">
                <thead>
                  <tr className="text-left text-[11px] font-semibold text-muted-foreground">
                    <th className="pb-2 pr-2">Experience</th>
                    <th className="pb-2 pr-2">Guests</th>
                    <th className="pb-2 pr-2">Requested</th>
                    <th className="pb-2 pr-2">Slot</th>
                    <th className="pb-2">Status</th>
                    {activeView === "incoming" ? <th className="pb-2">Action</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={activeView === "incoming" ? 6 : 5}
                        className="py-4 text-center text-xs text-muted-foreground"
                      >
                        Loading applications...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td
                        colSpan={activeView === "incoming" ? 6 : 5}
                        className="py-4 text-center text-xs text-red-500"
                      >
                        Failed to load applications: {error}
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={activeView === "incoming" ? 6 : 5}
                        className="py-4 text-center text-xs text-muted-foreground"
                      >
                        No applications yet for this selection.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, idx) => (
                      <tr key={r.id} className="text-sm">
                        <td className="pr-2">
                          <span className="block max-w-[260px] truncate font-medium">
                            {r.title}
                          </span>
                        </td>
                        <td className="pr-2">{r.guestsCount}</td>
                        <td className="pr-2">{r.createdAt}</td>
                        <td className="pr-2 text-xs text-muted-foreground">
                          {r.startsAt && r.endsAt
                            ? `${new Date(r.startsAt).toLocaleString()} - ${new Date(r.endsAt).toLocaleString()}`
                            : "No slot linked"}
                        </td>
                        <td>
                          <span
                            className={[
                              "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                              idx % 3 === 0
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : idx % 3 === 1
                                  ? "border-amber-200 bg-amber-50 text-amber-800"
                                  : "border-slate-200 bg-slate-50 text-slate-700",
                            ].join(" ")}
                          >
                            {r.status}
                          </span>
                        </td>
                        {activeView === "incoming" ? (
                          <td>
                            {r.status === "requested" ? (
                              <div className="flex items-center gap-2">
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
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                {r.hostNote || "No action required"}
                              </span>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}


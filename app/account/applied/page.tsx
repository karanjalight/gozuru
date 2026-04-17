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
  created_at: string;
  status: string;
  guests_count: number;
  experiences: {
    id: string;
    title: string;
  } | {
    id: string;
    title: string;
  }[] | null;
};

export default function AppliedExperiencesPage() {
  const searchParams = useSearchParams();
  const experienceIdFilter = searchParams.get("experienceId");
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExperienceTitle, setSelectedExperienceTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => {
        setApplications([]);
        setLoading(false);
      });
      return;
    }

    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("bookings")
        .select("id,created_at,status,guests_count,experiences(id,title)")
        .eq("host_user_id", user.id)
        .order("created_at", { ascending: false });

      if (experienceIdFilter) {
        query = query.eq("experience_id", experienceIdFilter);
      }

      const { data, error: queryError } = await query;
      if (!mounted) return;

      if (queryError) {
        setError(queryError.message);
        setApplications([]);
      } else {
        const rows = (data ?? []) as unknown as ApplicationRow[];
        setApplications(rows);
        const firstExperience = rows[0]?.experiences;
        const firstTitle = Array.isArray(firstExperience)
          ? firstExperience[0]?.title
          : firstExperience?.title;
        setSelectedExperienceTitle(firstTitle ?? null);
      }
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [experienceIdFilter, user]);

  const rows = useMemo(() => {
    return applications.slice(0, 50).map((application) => ({
      id: application.id,
      title: Array.isArray(application.experiences)
        ? application.experiences[0]?.title ?? "Untitled experience"
        : application.experiences?.title ?? "Untitled experience",
      status: application.status.replaceAll("_", " "),
      guestsCount: application.guests_count,
      createdAt: new Date(application.created_at).toLocaleDateString(),
    }));
  }, [applications]);

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
          Applications received across your experiences.
        </p>
      )}
      {experienceIdFilter ? (
        <Link
          href="/account/applied"
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

          <div className="mt-4">
            <div className="max-h-64 overflow-auto">
              <table className="w-full border-separate border-spacing-y-1">
                <thead>
                  <tr className="text-left text-[11px] font-semibold text-muted-foreground">
                    <th className="pb-2 pr-2">Experience</th>
                    <th className="pb-2 pr-2">Guests</th>
                    <th className="pb-2 pr-2">Date</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-4 text-center text-xs text-muted-foreground"
                      >
                        Loading applications...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-4 text-center text-xs text-red-500"
                      >
                        Failed to load applications: {error}
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
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


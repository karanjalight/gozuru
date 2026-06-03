"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CircleCheckBig,
  Clock3,
  Eye,
  FileText,
  MapPin,
  MoreHorizontal,
  Pencil,
  PlusSquare,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { ExperienceMediaDisplay } from "@/components/experience/ExperienceMediaDisplay";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  buildCoverByExperienceId,
  type ExperienceMediaItem,
  type ExperienceMediaRowInput,
} from "@/lib/experience-media";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type HostExperience = {
  id: string;
  title: string;
  status: string;
  subtitle: string | null;
  meeting_point_name: string | null;
  duration_minutes: number | null;
  price_amount: number | null;
  currency: string;
  max_guests: number;
  requirements: string[];
  created_at: string;
  categories: { name: string } | { name: string }[] | null;
};

type ExperienceMedia = {
  experience_id: string;
  storage_path: string;
  media_type?: "image" | "video";
};

type AvailabilityRow = {
  experience_id: string;
  starts_at: string;
  is_cancelled: boolean;
};

function getCategoryName(categories: HostExperience["categories"]): string | null {
  if (Array.isArray(categories)) return categories[0]?.name ?? null;
  return categories?.name ?? null;
}

const experienceMenuItemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-muted";

function getStatusStyles(status: string) {
  if (status === "published") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status.includes("review") || status === "submitted") {
    return "bg-amber-100 text-amber-700";
  }
  if (status === "rejected") {
    return "bg-red-100 text-red-700";
  }
  return "bg-zinc-100 text-zinc-700";
}

export default function ExperiencesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [experiences, setExperiences] = useState<HostExperience[]>([]);
  const [coverByExperienceId, setCoverByExperienceId] = useState<Record<string, ExperienceMediaItem>>({});
  const [activeSlotsByExperienceId, setActiveSlotsByExperienceId] = useState<Record<string, number>>({});
  const [nextSlotByExperienceId, setNextSlotByExperienceId] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const publishedCount = experiences.filter((exp) => exp.status === "published").length;
  const inReviewCount = experiences.filter((exp) => exp.status.includes("review")).length;

  const updateExperienceStatus = async (experienceId: string, nextStatus: "published" | "unpublished") => {
    if (!user) return;
    setStatusUpdatingId(experienceId);
    setError(null);
    const { error: updateError } = await supabase
      .from("experiences")
      .update({ status: nextStatus })
      .eq("id", experienceId)
      .eq("host_user_id", user.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setExperiences((prev) =>
        prev.map((exp) => (exp.id === experienceId ? { ...exp, status: nextStatus } : exp)),
      );
    }
    setStatusUpdatingId(null);
  };

  const deleteExperience = async (experience: HostExperience) => {
    if (!user) return;
    const confirmed = window.confirm(
      `Delete "${experience.title}"?\n\nThis permanently removes the experience and any bookings linked to it (including payment records). This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleteLoadingId(experience.id);
    setOpenMenuId(null);
    setError(null);
    const { error: deleteError } = await supabase
      .from("experiences")
      .delete()
      .eq("id", experience.id)
      .eq("host_user_id", user.id);

    if (deleteError) {
      const message = deleteError.message.includes("bookings_experience_id_fkey")
        ? "This experience still has bookings. Apply the latest database migration, or cancel active bookings before deleting."
        : deleteError.message.includes("foreign key")
          ? "This experience is still linked to other records and cannot be deleted yet."
          : deleteError.message;
      setError(message);
    } else {
      setExperiences((prev) => prev.filter((item) => item.id !== experience.id));
      setCoverByExperienceId((prev) => {
        const next = { ...prev };
        delete next[experience.id];
        return next;
      });
      setActiveSlotsByExperienceId((prev) => {
        const next = { ...prev };
        delete next[experience.id];
        return next;
      });
      setNextSlotByExperienceId((prev) => {
        const next = { ...prev };
        delete next[experience.id];
        return next;
      });
    }
    setDeleteLoadingId(null);
  };

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => {
        setExperiences([]);
        setLoading(false);
      });
      return;
    }

    let mounted = true;

    const loadExperiences = async () => {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from("experiences")
        .select("id,title,status,subtitle,meeting_point_name,duration_minutes,price_amount,currency,max_guests,requirements,created_at,categories(name)")
        .eq("host_user_id", user.id)
        .order("created_at", { ascending: false });

      if (!mounted) return;
      if (queryError) {
        setError(queryError.message);
        setExperiences([]);
      } else {
        const rows = (data ?? []) as unknown as HostExperience[];
        setExperiences(rows);

        if (rows.length > 0) {
          const experienceIds = rows.map((row) => row.id);
          const [{ data: mediaRows }, { data: availabilityRows }] = await Promise.all([
            supabase
              .from("experience_media")
              .select("experience_id,storage_path,sort_order,media_type")
              .in("experience_id", experienceIds)
              .order("sort_order", { ascending: true }),
            supabase
              .from("experience_availability")
              .select("experience_id,starts_at,is_cancelled")
              .in("experience_id", experienceIds)
              .order("starts_at", { ascending: true }),
          ]);

          if (mounted && mediaRows) {
            setCoverByExperienceId(
              buildCoverByExperienceId(
                supabase,
                mediaRows as Array<ExperienceMediaRowInput & { sort_order: number }>,
              ),
            );
          }
          if (mounted) {
            const nextActiveSlots: Record<string, number> = {};
            const nextUpcomingSlots: Record<string, string | null> = {};
            const nowIso = new Date().toISOString();
            for (const expId of experienceIds) {
              nextActiveSlots[expId] = 0;
              nextUpcomingSlots[expId] = null;
            }
            for (const row of (availabilityRows ?? []) as AvailabilityRow[]) {
              if (row.is_cancelled) continue;
              nextActiveSlots[row.experience_id] = (nextActiveSlots[row.experience_id] ?? 0) + 1;
              if (!nextUpcomingSlots[row.experience_id] && row.starts_at >= nowIso) {
                nextUpcomingSlots[row.experience_id] = row.starts_at;
              }
            }
            setActiveSlotsByExperienceId(nextActiveSlots);
            setNextSlotByExperienceId(nextUpcomingSlots);
          }
        } else {
          setCoverByExperienceId({});
          setActiveSlotsByExperienceId({});
          setNextSlotByExperienceId({});
        }
      }
      setLoading(false);
    };

    void loadExperiences();

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!openMenuId) return;
    const closeMenu = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!(target instanceof Element)) return;
      if (!target.closest("[data-experience-actions]")) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [openMenuId]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-700">
            <Sparkles className="size-3.5" />
            Host dashboard
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Experiences</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your live and draft experiences in one place.
          </p>
        </div>
        <Button
          type="button"
          className="shrink-0 rounded-full bg-orange-500 text-white hover:bg-orange-600"
          onClick={() => router.push("/account/experiences/create")}
        >
          <PlusSquare className="mr-2 size-4" />
          Create experience
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Total experiences
          </p>
          <p className="mt-2 text-2xl font-bold">{experiences.length}</p>
        </Card>
        <Card className="rounded-2xl border-border bg-card p-4">
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <CircleCheckBig className="size-3.5" />
            Published
          </p>
          <p className="mt-2 text-2xl font-bold">{publishedCount}</p>
        </Card>
        <Card className="rounded-2xl border-border bg-card p-4">
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Clock3 className="size-3.5" />
            In review
          </p>
          <p className="mt-2 text-2xl font-bold">{inReviewCount}</p>
        </Card>
      </div>

      <div className="mt-8 space-y-4">
        {error ? (
          <Card className="rounded-2xl border-border bg-card p-6 text-sm text-red-500">
            Failed to load experiences: {error}
          </Card>
        ) : null}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Card
                key={idx}
                className="flex animate-pulse flex-col gap-4 rounded-2xl border-border bg-card p-4 sm:flex-row sm:items-center"
              >
                <div className="h-28 w-full rounded-xl bg-muted sm:h-24 sm:w-36" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-2/3 rounded-lg bg-muted" />
                  <div className="h-4 w-full rounded-lg bg-muted" />
                  <div className="h-4 w-1/2 rounded-lg bg-muted" />
                </div>
              </Card>
            ))}
          </div>
        ) : null}

        {!loading && experiences.length === 0 ? (
          <Card className="rounded-2xl border-border bg-card p-12 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-orange-50 text-orange-600">
              <FileText className="size-5" />
            </div>
            <p className="mt-5 text-lg font-semibold text-foreground">No experiences yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start by creating your first premium experience for travelers.
            </p>
            <Button
              type="button"
              className="mt-6 rounded-full bg-orange-500 text-white hover:bg-orange-600"
              onClick={() => router.push("/account/experiences/create")}
            >
              <PlusSquare className="mr-2 size-4" />
              Create an experience
            </Button>
          </Card>
        ) : null}

        {!loading && experiences.length > 0 ? (
          <ul className="space-y-3">
            {experiences.map((exp) => {
              const isPublished = exp.status === "published";
              const isPublishing = statusUpdatingId === exp.id;
              const isDeleting = deleteLoadingId === exp.id;
              const categoryName = getCategoryName(exp.categories);

              return (
                <li key={exp.id} className={cn(openMenuId === exp.id && "relative z-30")}>
                  <Card className="overflow-visible rounded-2xl border border-border/80 bg-card shadow-sm transition hover:border-orange-200/80 hover:shadow-md">
                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
                      <Link
                        href={`/account/experiences/${exp.id}`}
                        className="relative block h-36 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-24 sm:w-36"
                      >
                        <ExperienceMediaDisplay
                          media={coverByExperienceId[exp.id]}
                          alt={exp.title}
                          fill
                          sizes="144px"
                          videoAutoplay
                          showVideoBadge={false}
                          emptyLabel="No media"
                        />
                        <span
                          className={cn(
                            "absolute left-2 top-2 rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize",
                            getStatusStyles(exp.status),
                          )}
                        >
                          {exp.status.replaceAll("_", " ")}
                        </span>
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/account/experiences/${exp.id}`}
                          className="block hover:underline"
                        >
                          <h2 className="line-clamp-1 text-lg font-semibold tracking-tight">
                            {exp.title}
                          </h2>
                        </Link>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {exp.subtitle || "No subtitle yet"}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-lg bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                            {exp.price_amount
                              ? `${exp.currency} ${Number(exp.price_amount).toFixed(2)}`
                              : "Price TBD"}
                          </span>
                          <span className="rounded-lg bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                            {exp.duration_minutes && exp.duration_minutes > 0
                              ? `${Math.round(exp.duration_minutes / 60)}h`
                              : "Flexible"}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                            <Users className="size-3" />
                            Up to {exp.max_guests || 1}
                          </span>
                          <span className="rounded-lg bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                            {activeSlotsByExperienceId[exp.id] ?? 0} slot
                            {(activeSlotsByExperienceId[exp.id] ?? 0) === 1 ? "" : "s"}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {categoryName ? <span>{categoryName}</span> : null}
                          {exp.meeting_point_name ? (
                            <span className="inline-flex max-w-[200px] items-center gap-1 truncate">
                              <MapPin className="size-3 shrink-0" />
                              {exp.meeting_point_name}
                            </span>
                          ) : null}
                          {nextSlotByExperienceId[exp.id] ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="size-3" />
                              Next{" "}
                              {new Date(nextSlotByExperienceId[exp.id] as string).toLocaleDateString()}
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="size-3" />
                            Created {new Date(exp.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div
                        className="relative z-10 flex shrink-0 items-center justify-end gap-2 sm:flex-col sm:items-stretch lg:flex-row lg:items-center"
                        data-experience-actions
                      >
                        <Button
                          type="button"
                          size="sm"
                          disabled={isPublishing || isDeleting}
                          onClick={() =>
                            updateExperienceStatus(
                              exp.id,
                              isPublished ? "unpublished" : "published",
                            )
                          }
                          className={cn(
                            "min-w-[108px] rounded-full px-4 font-semibold",
                            isPublished
                              ? "bg-zinc-700 text-white hover:bg-zinc-800"
                              : "bg-emerald-600 text-white hover:bg-emerald-700",
                          )}
                        >
                          {isPublishing
                            ? "Updating..."
                            : isPublished
                              ? "Unpublish"
                              : "Publish"}
                        </Button>

                        <div className="relative z-20">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            className="rounded-full"
                            aria-label={`Actions for ${exp.title}`}
                            aria-expanded={openMenuId === exp.id}
                            disabled={isDeleting}
                            onClick={() =>
                              setOpenMenuId((prev) => (prev === exp.id ? null : exp.id))
                            }
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>

                          {openMenuId === exp.id ? (
                            <div
                              role="menu"
                              className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-border bg-card p-1.5 text-card-foreground shadow-xl ring-1 ring-border/80"
                            >
                              <Link
                                href={`/account/experiences/${exp.id}`}
                                role="menuitem"
                                className={cn(experienceMenuItemClass, "text-foreground")}
                                onClick={() => setOpenMenuId(null)}
                              >
                                <Eye className="size-4 text-muted-foreground" />
                                View
                              </Link>
                              <Link
                                href={`/account/experiences/create?edit=${exp.id}`}
                                role="menuitem"
                                className={cn(experienceMenuItemClass, "text-foreground")}
                                onClick={() => setOpenMenuId(null)}
                              >
                                <Pencil className="size-4 text-muted-foreground" />
                                Edit
                              </Link>
                              <button
                                type="button"
                                role="menuitem"
                                className={cn(
                                  experienceMenuItemClass,
                                  "text-red-600 hover:bg-red-50 disabled:opacity-50",
                                )}
                                disabled={isDeleting}
                                onClick={() => void deleteExperience(exp)}
                              >
                                <Trash2 className="size-4" />
                                {isDeleting ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CircleCheckBig,
  Clock3,
  FileText,
  MapPin,
  PlusSquare,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/auth/AuthProvider";
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

export default function ExperiencesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [experiences, setExperiences] = useState<HostExperience[]>([]);
  const [coverByExperienceId, setCoverByExperienceId] = useState<Record<string, string>>({});
  const [activeSlotsByExperienceId, setActiveSlotsByExperienceId] = useState<Record<string, number>>({});
  const [nextSlotByExperienceId, setNextSlotByExperienceId] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
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
      `Delete "${experience.title}"? This will remove the experience and cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleteLoadingId(experience.id);
    setError(null);
    const { error: deleteError } = await supabase
      .from("experiences")
      .delete()
      .eq("id", experience.id)
      .eq("host_user_id", user.id);

    if (deleteError) {
      setError(deleteError.message);
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
            const nextMap: Record<string, string> = {};
            const typedRows = mediaRows as Array<ExperienceMedia & { sort_order: number }>;
            for (const mediaRow of typedRows) {
              if (mediaRow.media_type === "video") continue;
              if (nextMap[mediaRow.experience_id]) continue;
              const {
                data: { publicUrl },
              } = supabase.storage.from("experience-media").getPublicUrl(mediaRow.storage_path);
              nextMap[mediaRow.experience_id] = publicUrl;
            }
            // Fallback: if an experience has only videos, still show first asset url.
            for (const mediaRow of typedRows) {
              if (nextMap[mediaRow.experience_id]) continue;
              const {
                data: { publicUrl },
              } = supabase.storage.from("experience-media").getPublicUrl(mediaRow.storage_path);
              nextMap[mediaRow.experience_id] = publicUrl;
            }
            setCoverByExperienceId(nextMap);
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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <div className="flex items-start justify-between gap-4">
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
          className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
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

      <div className="mt-8">
        {error ? (
          <Card className="rounded-2xl border-border bg-card p-6 text-sm text-red-500">
            Failed to load experiences: {error}
          </Card>
        ) : null}
        {loading ? (
          <Card className="rounded-2xl border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">Loading experiences...</p>
          </Card>
        ) : null}
        {!loading && experiences.length === 0 ? (
          <Card className="rounded-2xl border-border bg-card p-12 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-orange-50 text-orange-600">
              <FileText className="size-5 text-muted-foreground" />
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
        ) : !loading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {experiences.map((exp) => (
              <Card
                key={exp.id}
                className="group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {coverByExperienceId[exp.id] ? (
                    <Image
                      src={coverByExperienceId[exp.id]}
                      alt={exp.title}
                      fill
                      className="object-cover transition duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                      No media uploaded
                    </div>
                  )}
                  <div
                    className={cn(
                      "absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-semibold capitalize backdrop-blur",
                      exp.status === "published"
                        ? "bg-emerald-100/95 text-emerald-700"
                        : exp.status.includes("review")
                          ? "bg-amber-100/95 text-amber-700"
                          : "bg-zinc-100/95 text-zinc-700",
                    )}
                  >
                    {exp.status.replaceAll("_", " ")}
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div>
                    <p className="line-clamp-1 text-lg font-semibold">{exp.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {exp.subtitle || "Awaiting full review details from your host setup."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-border/70 bg-muted/25 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Price</p>
                      <p className="mt-0.5 font-semibold text-foreground">
                        {exp.price_amount
                          ? `${exp.currency} ${Number(exp.price_amount).toFixed(2)}`
                          : "On request"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/25 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Duration</p>
                      <p className="mt-0.5 font-semibold text-foreground">
                        {exp.duration_minutes && exp.duration_minutes > 0
                          ? `${(exp.duration_minutes / 60).toLocaleString()}h`
                          : "Flexible"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/25 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Guests</p>
                      <p className="mt-0.5 inline-flex items-center gap-1 font-semibold text-foreground">
                        <Users className="size-3.5" />
                        Up to {exp.max_guests || 1}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/25 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Active slots</p>
                      <p className="mt-0.5 font-semibold text-foreground">
                        {activeSlotsByExperienceId[exp.id] ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-muted-foreground">
                    {(Array.isArray(exp.categories)
                      ? exp.categories[0]?.name
                      : exp.categories?.name) ? (
                      <p>
                        Category:{" "}
                        <span className="font-medium text-foreground">
                          {Array.isArray(exp.categories)
                            ? exp.categories[0]?.name
                            : exp.categories?.name}
                        </span>
                      </p>
                    ) : null}
                    {exp.requirements?.length ? (
                      <p>
                        Requirements:{" "}
                        <span className="font-medium text-foreground">
                          {exp.requirements.length} item{exp.requirements.length === 1 ? "" : "s"}
                        </span>
                      </p>
                    ) : null}
                    {exp.meeting_point_name ? (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="size-3.5" />
                        <span className="line-clamp-1">{exp.meeting_point_name}</span>
                      </p>
                    ) : null}
                    {nextSlotByExperienceId[exp.id] ? (
                      <p className="flex items-center gap-1.5">
                        <Clock3 className="size-3.5" />
                        Next slot {new Date(nextSlotByExperienceId[exp.id] as string).toLocaleString()}
                      </p>
                    ) : null}
                    <p className="flex items-center gap-1.5">
                      <CalendarClock className="size-3.5" />
                      Created {new Date(exp.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={`/account/experiences/${exp.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "h-9 flex-1 rounded-full",
                      )}
                    >
                      View
                    </Link>
                    <Link
                      href={`/account/applied?experienceId=${exp.id}`}
                      className={cn(
                        buttonVariants({ variant: "default" }),
                        "h-9 flex-1 rounded-full bg-orange-500 text-white hover:bg-orange-600",
                      )}
                    >
                      Applied
                    </Link>
                  </div>
                  <Link
                    href={`/account/experiences/create?edit=${exp.id}`}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "h-9 w-full rounded-full",
                    )}
                  >
                    Edit
                  </Link>
                  <Button
                    type="button"
                    onClick={() =>
                      updateExperienceStatus(
                        exp.id,
                        exp.status === "published" ? "unpublished" : "published",
                      )
                    }
                    disabled={statusUpdatingId === exp.id}
                    className={cn(
                      "h-9 w-full rounded-full",
                      exp.status === "published"
                        ? "bg-zinc-700 text-white hover:bg-zinc-800"
                        : "bg-emerald-600 text-white hover:bg-emerald-700",
                    )}
                  >
                    {statusUpdatingId === exp.id
                      ? "Updating..."
                      : exp.status === "published"
                        ? "Unpublish"
                        : "Go live"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => deleteExperience(exp)}
                    disabled={deleteLoadingId === exp.id}
                    className="h-9 w-full rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="mr-2 size-4" />
                    {deleteLoadingId === exp.id ? "Deleting..." : "Delete experience"}
                  </Button>
                </div>
              </Card>
            ))}

          </div>
        ) : null}
      </div>
    </div>
  );
}


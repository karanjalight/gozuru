"use client";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExperienceMediaDisplay } from "@/components/experience/ExperienceMediaDisplay";
import { useEffect, useMemo, useState } from "react";
import {
  fetchLandingExperiences,
  listImageTransform,
  pickExperienceCategory,
  type LandingExperiencesResult,
} from "@/lib/queries/experiences";
import { cn } from "@/lib/utils";

type ExperienceFilter = "all" | "latest" | string;

const LATEST_WINDOW_MS = 1000 * 60 * 60 * 24 * 14;

export function ExperiencesGrid({ initialData }: { initialData?: LandingExperiencesResult }) {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("query")?.trim().toLowerCase() ?? "";
  const [activeFilter, setActiveFilter] = useState<ExperienceFilter>("all");
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const { data } = useQuery({
    queryKey: ["landing", "experiences-grid"],
    queryFn: () => fetchLandingExperiences(24, listImageTransform),
    staleTime: 1000 * 60 * 10,
    refetchOnMount: false,
    initialData,
  });

  const experiences = useMemo(() => data?.experiences ?? [], [data?.experiences]);
  const coverByExperienceId = useMemo(() => data?.coverByExperienceId ?? {}, [data?.coverByExperienceId]);
  const locationByExperienceId = useMemo(() => data?.locationByExperienceId ?? {}, [data?.locationByExperienceId]);

  useEffect(() => {
    queueMicrotask(() => {
      setCurrentTimestamp(Date.now());
    });
  }, []);

  const normalizedExperiences = useMemo(
    () =>
      experiences.map((exp) => {
        const category = pickExperienceCategory(exp.categories);
        const createdAt = new Date(exp.created_at).getTime();
        const isLatest = currentTimestamp - createdAt <= LATEST_WINDOW_MS;
        const durationHours = exp.duration_minutes ? Math.max(1, Math.round(exp.duration_minutes / 60)) : null;
        const durationLabel = durationHours ? `${durationHours}h` : "Flexible";
        const price =
          exp.price_amount && Number(exp.price_amount) > 0
            ? `${exp.currency} ${Number(exp.price_amount).toFixed(2)}`
            : "Price on request";

        return {
          id: exp.id,
          title: exp.title,
          location:
            locationByExperienceId[exp.id] || exp.meeting_point_name || "Location to be confirmed",
          description: exp.description?.trim() || exp.subtitle?.trim() || "Discover this host-led experience.",
          tag: category?.name || "Experience",
          categorySlug: category?.slug ?? null,
          isLatest,
          rating: 5.0,
          reviews: 0,
          price,
          durationLabel,
          coverMedia: coverByExperienceId[exp.id],
        };
      }),
    [coverByExperienceId, currentTimestamp, experiences, locationByExperienceId],
  );

  const categoryFilters = useMemo(() => {
    const bySlug = new Map<string, string>();
    for (const exp of normalizedExperiences) {
      if (exp.categorySlug) {
        bySlug.set(exp.categorySlug, exp.tag);
      }
    }
    return Array.from(bySlug.entries()).map(([id, label]) => ({ id, label }));
  }, [normalizedExperiences]);

  const filterOptions = useMemo(
    () => [
      { id: "all" as const, label: "All" },
      { id: "latest" as const, label: "Latest" },
      ...categoryFilters,
    ],
    [categoryFilters],
  );

  const filteredExperiences = normalizedExperiences.filter((exp) => {
    if (searchQuery) {
      const haystack = `${exp.title} ${exp.location} ${exp.description} ${exp.tag}`.toLowerCase();
      if (!haystack.includes(searchQuery)) return false;
    }
    if (activeFilter === "all") return true;
    if (activeFilter === "latest") return exp.isLatest;
    return exp.categorySlug === activeFilter;
  });

  return (
    <section
      id="experiences"
      className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-foreground transition-colors lg:px-6 lg:py-14"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
              Discover experiences
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Learn directly from local experts
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {searchQuery
                ? `Showing experiences matching "${searchParams.get("query")?.trim()}".`
                : "Browse real, host-led experiences with clear details on location, duration, and price."}
            </p>
          </div>
          <Link
            href="/experiences"
            className="inline-flex shrink-0 items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dark:hover:border-orange-500/40 dark:hover:bg-orange-950/30 dark:hover:text-orange-300"
          >
            Browse all experiences
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        <div className="flex flex-wrap gap-2.5 text-sm">
          {[
            "Verified hosts",
            "Transparent pricing",
            "Clear locations",
            "Instant booking",
          ].map((item) => (
            <span
              key={item}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-muted-foreground shadow-sm"
            >
              {item}
            </span>
          ))}
        </div>

        <div className="flex w-full flex-wrap gap-x-6 gap-y-2 border-b border-border pb-1">
          {filterOptions.map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  "pb-2 text-sm font-semibold transition-colors",
                  isActive
                    ? "border-b-2 border-orange-500 text-orange-600 dark:text-orange-400"
                    : "border-b-2 border-transparent text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400",
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredExperiences.map((exp, idx) => (
          <article
            key={exp.id}
            className="group overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:border-orange-300/70 hover:shadow-lg hover:shadow-orange-500/10 dark:hover:border-orange-500/30 dark:hover:shadow-orange-950/20"
          >
            <div className="relative h-80 w-full overflow-hidden bg-muted">
              <ExperienceMediaDisplay
                media={exp.coverMedia}
                alt={exp.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={idx < 4}
                videoAutoplay
                showVideoBadge={false}
                emptyLabel="No media uploaded"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <div className="absolute inset-x-3 bottom-3 flex flex-col gap-2 text-white">
                <span className="inline-flex w-fit items-center rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                  {exp.tag}
                </span>
                <h3 className="line-clamp-2 text-lg font-semibold leading-snug">{exp.title}</h3>
                <p className="line-clamp-2 text-sm text-white/80">{exp.description}</p>

                <div className="mt-1 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/35 px-3 py-2 backdrop-blur-sm">
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-amber-300">★</span>
                    <span className="font-semibold">{exp.rating.toFixed(1)}</span>
                    <span className="text-white/70">({exp.reviews.toLocaleString()})</span>
                  </div>
                  <div className="text-right text-sm">
                    <span className="font-semibold">{exp.price}</span>
                    <span className="ml-1 text-[11px] text-white/75">/guest · {exp.durationLabel}</span>
                  </div>
                </div>

                <Link
                  href={`/experiences/${exp.id}`}
                  className="inline-flex w-full items-center justify-center rounded-full bg-white px-4 py-3 text-sm font-semibold tracking-wide text-zinc-900 shadow-sm transition hover:bg-orange-500 hover:text-white dark:bg-orange-500 dark:text-white dark:hover:bg-orange-400"
                >
                  View details
                </Link>
              </div>
            </div>
          </article>
        ))}
        {filteredExperiences.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">No experiences available yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try another filter, or check back when hosts publish new experiences.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  pickExperienceCategory,
  type LandingExperiencesResult,
} from "@/lib/queries/experiences";
import { cn } from "@/lib/utils";
import { ExperienceCard, mapExperienceToCardData } from "./ExperienceCard";

type ExperienceFilter = "all" | "latest" | string;

const LATEST_WINDOW_MS = 1000 * 60 * 60 * 24 * 14;

export function ExperiencesGrid({ initialData }: { initialData: LandingExperiencesResult }) {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("query")?.trim().toLowerCase() ?? "";
  const categoryParam = searchParams.get("category")?.trim() ?? "";
  const [activeFilter, setActiveFilter] = useState<ExperienceFilter>(categoryParam || "all");
  const [currentTimestamp, setCurrentTimestamp] = useState(0);

  const experiences = initialData.experiences;
  const coverByExperienceId = initialData.coverByExperienceId;
  const locationByExperienceId = initialData.locationByExperienceId;

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

        return {
          ...mapExperienceToCardData(
            exp,
            locationByExperienceId,
            coverByExperienceId,
            pickExperienceCategory,
          ),
          categorySlug: category?.slug ?? null,
          isLatest,
        };
      }),
    [coverByExperienceId, currentTimestamp, experiences, locationByExperienceId],
  );

  const categoryFilters = useMemo(() => {
    const bySlug = new Map<string, string>();
    for (const exp of normalizedExperiences) {
      if (exp.categorySlug) {
        bySlug.set(exp.categorySlug, exp.category);
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
      const haystack =
        `${exp.title} ${exp.location} ${exp.category} ${exp.expert}`.toLowerCase();
      if (!haystack.includes(searchQuery)) return false;
    }
    if (activeFilter === "all") return true;
    if (activeFilter === "latest") return exp.isLatest;
    return exp.categorySlug === activeFilter;
  });

  return (
    <section
      id="experiences"
      className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-foreground transition-colors lg:px-8 lg:py-14"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
              Discover experiences
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {searchQuery ? "Search results" : "All experiences"}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {searchQuery
                ? `Showing experiences matching "${searchParams.get("query")?.trim()}".`
                : "Browse real, host-led experiences with clear details on location, duration, and price."}
            </p>
          </div>
          <p className="shrink-0 text-sm font-medium text-muted-foreground">
            {filteredExperiences.length} experience{filteredExperiences.length === 1 ? "" : "s"}
          </p>
        </div>

        {filterOptions.length > 1 ? (
          <div className="flex w-full flex-wrap gap-2">
            {filterOptions.map((filter) => {
              const isActive = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-orange-600 text-white shadow-sm"
                      : "border border-border bg-card text-muted-foreground hover:border-orange-300 hover:text-orange-600 dark:hover:border-orange-500/40 dark:hover:text-orange-400",
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {filteredExperiences.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">No experiences found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {experiences.length === 0
              ? "Check back when hosts publish new experiences."
              : "Try another filter or search term."}
          </p>
          {searchQuery ? (
            <Link
              href="/experiences"
              className="mt-4 inline-flex text-sm font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400"
            >
              View all experiences
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-12">
          {filteredExperiences.map((exp, idx) => (
            <ExperienceCard key={exp.id} experience={exp} priority={idx < 6} />
          ))}
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Compass, LayoutGrid, List } from "lucide-react";
import { ExperienceCard, mapExperienceToCardData } from "@/app/(landing)/components/sections/ExperienceCard";
import { ExperienceOfferCard, type ExperienceOffer } from "@/app/(landing)/components/sections/ExperienceOfferCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  fetchLandingExperiences,
  listImageTransform,
  pickExperienceCategory,
  type ExperienceRow,
} from "@/lib/queries/experiences";
import type { ExperienceMediaItem } from "@/lib/experience-media";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";
const VIEW_MODE_STORAGE_KEY = "gozuru:account-experiences-view-mode";

export function ClientExperiencesBrowser() {
  const [experiences, setExperiences] = useState<ExperienceRow[]>([]);
  const [coverByExperienceId, setCoverByExperienceId] = useState<Record<string, ExperienceMediaItem>>({});
  const [locationByExperienceId, setLocationByExperienceId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (stored === "grid" || stored === "list") setViewMode(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchLandingExperiences(48, listImageTransform);
        if (!mounted) return;
        setExperiences(result.experiences);
        setCoverByExperienceId(result.coverByExperienceId);
        setLocationByExperienceId(result.locationByExperienceId);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load experiences");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const gridCards = useMemo(
    () =>
      experiences.map((exp) =>
        mapExperienceToCardData(exp, locationByExperienceId, coverByExperienceId, pickExperienceCategory),
      ),
    [coverByExperienceId, experiences, locationByExperienceId],
  );

  const offerCards = useMemo<ExperienceOffer[]>(
    () =>
      experiences.map((exp) => {
        const category = pickExperienceCategory(exp.categories);
        return {
          id: exp.id,
          title: exp.title,
          subtitle: exp.subtitle,
          description: exp.description,
          price_amount: exp.price_amount,
          currency: exp.currency,
          duration_minutes: exp.duration_minutes,
          max_guests: exp.max_guests,
          category: category?.name ?? null,
          location:
            locationByExperienceId[exp.id] || exp.meeting_point_name || "Location shared after booking",
          coverMedia: coverByExperienceId[exp.id],
        };
      }),
    [coverByExperienceId, experiences, locationByExperienceId],
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-700">
            <Compass className="size-3.5" />
            Discover
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Experiences</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse experiences created by our hosts and find your next adventure.
          </p>
        </div>

        <div
          role="group"
          aria-label="Switch view"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted/30 p-1"
        >
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-pressed={viewMode === "grid"}
            onClick={() => setViewMode("grid")}
            className={cn(
              "rounded-full px-3",
              viewMode === "grid" ? "bg-card shadow-sm" : "text-muted-foreground",
            )}
          >
            <LayoutGrid className="mr-1.5 size-4" />
            Grid
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-pressed={viewMode === "list"}
            onClick={() => setViewMode("list")}
            className={cn(
              "rounded-full px-3",
              viewMode === "list" ? "bg-card shadow-sm" : "text-muted-foreground",
            )}
          >
            <List className="mr-1.5 size-4" />
            List
          </Button>
        </div>
      </div>

      <div className="mt-8">
        {error ? (
          <Card className="rounded-2xl border-border bg-card p-6 text-sm text-red-500">
            Failed to load experiences: {error}
          </Card>
        ) : null}

        {loading ? <ExperiencesLoadingState viewMode={viewMode} /> : null}

        {!loading && !error && experiences.length === 0 ? (
          <Card className="rounded-2xl border-border bg-card p-12 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-orange-50 text-orange-600">
              <Compass className="size-5" />
            </div>
            <p className="mt-5 text-lg font-semibold text-foreground">No experiences yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check back soon — hosts are adding new experiences all the time.
            </p>
          </Card>
        ) : null}

        {!loading && experiences.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {gridCards.map((card, idx) => (
                <ExperienceCard key={card.id} experience={card} priority={idx < 6} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {offerCards.map((offer) => (
                <ExperienceOfferCard key={offer.id} experience={offer} />
              ))}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

function ExperiencesLoadingState({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="animate-pulse space-y-3">
            <div className="aspect-[4/3] rounded-xl bg-muted" />
            <div className="h-4 w-2/3 rounded-lg bg-muted" />
            <div className="h-4 w-1/2 rounded-lg bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div
          key={idx}
          className="grid animate-pulse overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[minmax(0,280px)_1fr_auto]"
        >
          <div className="aspect-[16/10] bg-muted lg:aspect-auto lg:min-h-[220px]" />
          <div className="space-y-3 p-6">
            <div className="h-5 w-2/3 rounded-lg bg-muted" />
            <div className="h-4 w-1/2 rounded-lg bg-muted" />
            <div className="h-4 w-full rounded-lg bg-muted" />
          </div>
          <div className="hidden w-40 bg-muted/40 lg:block" />
        </div>
      ))}
    </div>
  );
}

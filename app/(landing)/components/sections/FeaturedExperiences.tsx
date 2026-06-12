"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ExperienceMediaDisplay } from "@/components/experience/ExperienceMediaDisplay";
import { motion } from "framer-motion";
import { ArrowRight, Clock, MapPin, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { type LandingExperiencesResult } from "@/lib/queries/experiences";
import { cn } from "@/lib/utils";
import { Section } from "./Section";

export function FeaturedExperiences({ initialData }: { initialData: LandingExperiencesResult }) {
  const experiences = initialData.experiences;
  const coverByExperienceId = initialData.coverByExperienceId;
  const locationByExperienceId = initialData.locationByExperienceId;

  const cards = useMemo(() => {
    return experiences.map((exp) => {
      const durationHours = exp.duration_minutes ? Math.max(1, Math.round(exp.duration_minutes / 60)) : null;
      const durationLabel = durationHours ? `${durationHours} hour${durationHours > 1 ? "s" : ""}` : "Flexible";
      const priceLabel =
        exp.price_amount && Number(exp.price_amount) > 0
          ? `${exp.currency} ${Number(exp.price_amount).toFixed(2)}`
          : "Price on request";
      const locationLabel =
        locationByExperienceId[exp.id] || exp.meeting_point_name || "Location shared after booking";
      const expertName = exp.subtitle?.split(" led by ").at(1)?.trim() || "Local Host";
      return {
        ...exp,
        durationLabel,
        priceLabel,
        locationLabel,
        expertName,
        coverMedia: coverByExperienceId[exp.id],
      };
    });
  }, [coverByExperienceId, experiences, locationByExperienceId]);

  return (
    <Section
      id="featured-experiences"
      className="border-y border-border/60 "
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
              <Sparkles className="size-3.5" />
              Featured picks
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl [font-family:var(--font-heading)]">
              Popular on Gozuru
            </h2>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">
              Real conversations and immersive experiences from verified local hosts.
            </p>
          </div>
          <Link
            href="/experiences"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dark:border-border dark:bg-card dark:hover:border-orange-500/40 dark:hover:bg-orange-950/30 dark:hover:text-orange-300"
          >
            See all experiences
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {cards.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
            <p className="text-sm font-medium text-foreground">No featured experiences yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Check back soon as hosts publish new experiences.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((exp, i) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="h-full"
              >
                <Link href={`/experiences/${exp.id}`} className="group block h-full">
                  <Card
                    className={cn(
                      "flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all duration-300",
                      "hover:border-orange-300/80 hover:shadow-lg hover:shadow-orange-500/10",
                      "dark:hover:border-orange-500/30 dark:hover:shadow-orange-950/20",
                    )}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      <ExperienceMediaDisplay
                        media={exp.coverMedia}
                        alt={exp.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        priority={i < 3}
                        videoAutoplay
                        showVideoBadge={false}
                        emptyLabel="No media uploaded"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-2xl border border-white/15 bg-black/45 px-3 py-2 backdrop-blur-md">
                        <span className="text-sm font-semibold text-white">{exp.priceLabel}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white/90">
                          <Clock className="size-3" />
                          {exp.durationLabel}
                        </span>
                      </div>
                    </div>

                    <CardContent className="flex flex-1 flex-col p-5 sm:p-6">
                      <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-foreground [font-family:var(--font-heading)]">
                        {exp.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm leading-6 text-muted-foreground">
                        {exp.description || "Discover this host-led experience."}
                      </p>

                      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-3.5 shrink-0 text-orange-500 dark:text-orange-400" />
                          <span className="line-clamp-1">{exp.locationLabel}</span>
                        </span>
                        <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                          with {exp.expertName}
                        </p>
                      </div>

                      <div className="mt-auto pt-5">
                        <span
                          className={cn(
                            "inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold tracking-wide text-white transition",
                            "bg-orange-500 shadow-md shadow-orange-500/25 hover:bg-orange-600",
                            "dark:bg-orange-500 dark:shadow-orange-950/40 dark:hover:bg-orange-400",
                            "group-hover:scale-[1.01]",
                          )}
                        >
                          View experience
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </Section>
  );
}

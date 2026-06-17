"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  pickExperienceCategory,
  type LandingExperiencesResult,
} from "@/lib/queries/experiences";
import { ExperienceCard, mapExperienceToCardData } from "./ExperienceCard";
import { Section } from "./Section";

export function FeaturedExperiences({ initialData }: { initialData: LandingExperiencesResult }) {
  const experiences = initialData.experiences;
  const coverByExperienceId = initialData.coverByExperienceId;
  const locationByExperienceId = initialData.locationByExperienceId;

  const cards = useMemo(
    () =>
      experiences.map((exp) =>
        mapExperienceToCardData(
          exp,
          locationByExperienceId,
          coverByExperienceId,
          pickExperienceCategory,
        ),
      ),
    [coverByExperienceId, experiences, locationByExperienceId],
  );

  return (
    <Section
      id="featured-experiences"
      className="border-y border-border/60"
      containerClassName="max-w-7xl"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
              <Sparkles className="size-3.5" />
              Featured picks
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Popular on Gozuru
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
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
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
            <p className="text-sm font-medium text-foreground">No featured experiences yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Check back soon as hosts publish new experiences.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-12">
            {cards.map((exp, i) => (
              <ExperienceCard key={exp.id} experience={exp} priority={i < 3} />
            ))}
          </div>
        )}
      </motion.div>
    </Section>
  );
}

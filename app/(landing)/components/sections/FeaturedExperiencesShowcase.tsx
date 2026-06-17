"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ExperienceMediaDisplay } from "@/components/experience/ExperienceMediaDisplay";
import { HOW_IT_WORKS_STEPS } from "@/app/(landing)/lib/how-it-works";
import {
  pickExperienceCategory,
  type LandingExperiencesResult,
} from "@/lib/queries/experiences";
import { cn } from "@/lib/utils";
import { mapExperienceToCardData } from "./ExperienceCard";
import { Section } from "./Section";

type ShowcaseStep = {
  id: string;
  navLabel: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  coverMedia?: ReturnType<typeof mapExperienceToCardData>["coverMedia"];
  fallbackImage: string;
  detailImage?: string;
  location?: string;
  expert?: string;
  priceLabel?: string;
};

function buildShowcaseSteps(initialData: LandingExperiencesResult): ShowcaseStep[] {
  const featured = initialData.experiences.slice(0, 4);

  if (featured.length === 0) {
    return HOW_IT_WORKS_STEPS.map((step) => ({
      id: step.id,
      navLabel: step.navLabel,
      title: step.title,
      description: step.description,
      href: "/experiences",
      ctaLabel: "Start exploring",
      fallbackImage: step.image,
      detailImage: step.detailImage,
    }));
  }

  return featured.map((exp, index) => {
    const card = mapExperienceToCardData(
      exp,
      initialData.locationByExperienceId,
      initialData.coverByExperienceId,
      pickExperienceCategory,
    );
    const fallbackStep = HOW_IT_WORKS_STEPS[index] ?? HOW_IT_WORKS_STEPS[0];

    return {
      id: exp.id,
      navLabel: fallbackStep.navLabel,
      title: card.title,
      description:
        exp.description?.trim() ||
        exp.subtitle?.trim() ||
        fallbackStep.description,
      href: `/experiences/${exp.id}`,
      ctaLabel: "View experience",
      coverMedia: card.coverMedia,
      fallbackImage: fallbackStep.image,
      detailImage: fallbackStep.detailImage,
      location: card.location,
      expert: card.expert,
      priceLabel: card.priceLabel,
    };
  });
}

export function FeaturedExperiencesShowcase({
  initialData,
}: {
  initialData: LandingExperiencesResult;
}) {
  const steps = useMemo(() => buildShowcaseSteps(initialData), [initialData]);
  const [activeIndex, setActiveIndex] = useState(0);
  const step = steps[activeIndex] ?? steps[0];

  if (!step) return null;

  return (
    <Section
      id="featured-experiences"
      className="border-t border-gray-100  bg-orange-100"
      containerClassName="max-w-7xl"
    >
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-16 lg:items-start">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
          Featured experiences
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base lg:pt-2">
          From hotel welcome visits to rooftop meetups and travel expos — discover,
          connect, and experience the world through people who know it best.
        </p>
      </div>

      <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-12">
        <div className="flex flex-col justify-between gap-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
              {step.navLabel}
            </p>
            <h3 className="mt-2 text-xl font-bold text-foreground sm:text-2xl">{step.title}</h3>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              {step.description}
            </p>
            {step.location ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {step.location}
                {step.expert ? ` · with ${step.expert}` : ""}
              </p>
            ) : null}
            {step.priceLabel ? (
              <p className="mt-1 text-sm font-semibold text-orange-600 dark:text-orange-400">
                {step.priceLabel}
              </p>
            ) : null}
            <Link
              href={step.href}
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              {step.ctaLabel}
            </Link>
          </div>

          <nav aria-label="Featured experience steps" className="space-y-3">
            {steps.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "block text-left text-sm transition-colors sm:text-base",
                  index === activeIndex
                    ? "font-bold text-foreground"
                    : "font-normal text-muted-foreground/70 hover:text-muted-foreground",
                )}
              >
                {item.navLabel}
              </button>
            ))}
          </nav>
        </div>

        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-zinc-100 shadow-lg dark:bg-zinc-800">
          {step.coverMedia?.url ? (
            <ExperienceMediaDisplay
              key={step.id}
              media={step.coverMedia}
              alt={step.title}
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              priority={activeIndex === 0}
              videoAutoplay
              showVideoBadge={false}
              emptyLabel=""
            />
          ) : (
            <Image
              key={step.fallbackImage}
              src={step.fallbackImage}
              alt={step.title}
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
            />
          )}
          {step.detailImage ? (
            <div className="absolute bottom-4 right-4 w-[38%] max-w-[200px] overflow-hidden rounded-xl border-2 border-white/90 bg-white shadow-xl sm:bottom-6 sm:right-6">
              <div className="relative aspect-[4/3]">
                <Image
                  src={step.detailImage}
                  alt=""
                  fill
                  sizes="200px"
                  className="object-cover"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Section>
  );
}

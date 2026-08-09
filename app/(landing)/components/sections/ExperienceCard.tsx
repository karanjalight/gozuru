"use client";

import Link from "next/link";
import { Clock, MapPin, Users } from "lucide-react";
import { ExperienceMediaDisplay } from "@/components/experience/ExperienceMediaDisplay";
import type { ExperienceMediaItem } from "@/lib/experience-media";
import { cn } from "@/lib/utils";
import { formatDisplayMoney } from "@/lib/currency";
import { categoryBadgeClass } from "@/lib/category-styles";
import { PropertyCTAButton } from "./PropertyCTAButton";

export function mapExperienceToCardData(
  exp: {
    id: string;
    title: string;
    subtitle: string | null;
    duration_minutes: number | null;
    max_guests: number | null;
    price_amount: number | null;
    currency: string;
    meeting_point_name: string | null;
    categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
  },
  locationByExperienceId: Record<string, string>,
  coverByExperienceId: Record<string, ExperienceMediaItem | undefined>,
  pickCategory: (categories: typeof exp.categories) => { name: string; slug: string } | null,
): ExperienceCardData {
  const category = pickCategory(exp.categories);
  const durationHours = exp.duration_minutes
    ? Math.max(1, Math.round(exp.duration_minutes / 60))
    : null;
  const priceLabel =
    exp.price_amount && Number(exp.price_amount) > 0
      ? formatDisplayMoney(Number(exp.price_amount), exp.currency)
      : "Price on request";
  const location =
    locationByExperienceId[exp.id] ||
    exp.meeting_point_name ||
    "Location shared after booking";
  const expert = exp.subtitle?.split(" led by ").at(1)?.trim() || "Local Host";

  return {
    id: exp.id,
    title: exp.title,
    location,
    expert,
    priceLabel,
    durationHours,
    maxGuests: exp.max_guests,
    category: category?.name || "Experience",
    coverMedia: coverByExperienceId[exp.id],
  };
}

export type ExperienceCardData = {
  id: string;
  title: string;
  location: string;
  expert: string;
  priceLabel: string;
  durationHours: number | null;
  maxGuests?: number | null;
  category: string;
  coverMedia?: ExperienceMediaItem;
};

export function ExperienceCard({
  experience,
  priority = false,
}: {
  experience: ExperienceCardData;
  priority?: boolean;
}) {
  const durationLabel = experience.durationHours
    ? experience.durationHours === 1
      ? "1 hour"
      : `${experience.durationHours} hours`
    : "Flexible";
  const guestLabel =
    experience.maxGuests && experience.maxGuests > 0
      ? experience.maxGuests === 1
        ? "1 guest"
        : `Up to ${experience.maxGuests} guests`
      : "Flexible group";

  return (
    <article className="group flex h-full flex-col">
      <Link href={`/experiences/${experience.id}`} className="block overflow-hidden rounded-xl">
        <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          <ExperienceMediaDisplay
            media={experience.coverMedia}
            alt={experience.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            videoAutoplay
            showVideoBadge={false}
            emptyLabel="No media uploaded"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <span
            className={cn(
              "absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm",
              categoryBadgeClass(experience.category),
            )}
          >
            {experience.category}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-base font-bold text-foreground">
            <Link
              href={`/experiences/${experience.id}`}
              className="hover:text-orange-600 dark:hover:text-orange-400"
            >
              {experience.title}
            </Link>
          </h3>
          <p className="shrink-0 text-sm font-bold text-orange-600 dark:text-orange-400">
            {experience.priceLabel}
          </p>
        </div>

        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {experience.location}
        </p>

        <p className="mt-1 text-sm font-medium text-foreground/80">with {experience.expert}</p>

        <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <Clock className="size-4 shrink-0 stroke-[1.5]" aria-hidden />
            {durationLabel}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Users className="size-4 shrink-0 stroke-[1.5]" aria-hidden />
            {guestLabel}
          </li>
        </ul>

        <PropertyCTAButton href={`/experiences/${experience.id}`} variant="card" className="mt-4">
          Book experience
        </PropertyCTAButton>
      </div>
    </article>
  );
}

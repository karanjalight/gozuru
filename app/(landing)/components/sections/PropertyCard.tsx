"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin, Users } from "lucide-react";
import {
  formatExperiencePrice,
  type FeaturedExperience,
} from "@/app/(landing)/lib/properties";
import { getSampleExperienceHref } from "@/app/(landing)/lib/sample-experiences";
import { cn } from "@/lib/utils";
import { PropertyCTAButton } from "./PropertyCTAButton";

const CATEGORY_COLORS: Record<FeaturedExperience["category"], string> = {
  "Hotel visit": "bg-blue-600/90",
  Meetup: "bg-orange-600/90",
  "Social event": "bg-purple-600/90",
  Expo: "bg-emerald-600/90",
  "Expert session": "bg-rose-600/90",
};

export function PropertyCard({ property }: { property: FeaturedExperience }) {
  const detailHref = getSampleExperienceHref(property.id);
  const durationLabel =
    property.durationHours === 1 ? "1 hour" : `${property.durationHours} hours`;
  const guestLabel =
    property.maxGuests === 1 ? "1 guest" : `Up to ${property.maxGuests} guests`;

  return (
    <article className="group flex h-full flex-col">
      <Link href={detailHref} className="block overflow-hidden rounded-xl">
        <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          <Image
            src={property.image}
            alt={property.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <span
            className={cn(
              "absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm",
              CATEGORY_COLORS[property.category],
            )}
          >
            {property.category}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-base font-bold text-foreground">
            <Link href={detailHref} className="hover:text-orange-600 dark:hover:text-orange-400">
              {property.name}
            </Link>
          </h3>
          <p className="shrink-0 text-sm font-bold text-orange-600 dark:text-orange-400">
            {formatExperiencePrice(property.priceFrom)}
          </p>
        </div>

        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {property.location}
        </p>

        <p className="mt-1 text-sm font-medium text-foreground/80">
          with {property.expert}
        </p>

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

        <PropertyCTAButton href={detailHref} variant="card" className="mt-4">
          Book experience
        </PropertyCTAButton>
      </div>
    </article>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Clock, MapPin, Users } from "lucide-react";
import { Navbar } from "../components/Navbar";
import {
  formatExperiencePrice,
  FEATURED_EXPERIENCES,
} from "../lib/properties";
import { getSampleExperienceHref } from "../lib/sample-experiences";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sample experiences – Gozuru",
  description: "Preview Gozuru experience detail pages with sample listings, photos, and booking slots.",
};

const CATEGORY_COLORS: Record<(typeof FEATURED_EXPERIENCES)[number]["category"], string> = {
  "Hotel visit": "bg-blue-600/90",
  Meetup: "bg-orange-600/90",
  "Social event": "bg-purple-600/90",
  Expo: "bg-emerald-600/90",
  "Expert session": "bg-rose-600/90",
};

export default function SampleExperiencesIndexPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 pt-24 sm:px-6 lg:py-14">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
            Demo listings
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Sample experiences</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Explore full detail pages with gallery photos, dummy time slots, and booking UI — built to showcase
            how Gozuru experiences look before going live.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-12">
          {FEATURED_EXPERIENCES.map((experience) => {
            const href = getSampleExperienceHref(experience.id);
            const durationLabel =
              experience.durationHours === 1 ? "1 hour" : `${experience.durationHours} hours`;

            return (
              <article key={experience.id} className="group flex h-full flex-col">
                <Link href={href} className="block overflow-hidden rounded-xl">
                  <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    <Image
                      src={experience.image}
                      alt={experience.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <span
                      className={cn(
                        "absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm",
                        CATEGORY_COLORS[experience.category],
                      )}
                    >
                      {experience.category}
                    </span>
                  </div>
                </Link>

                <div className="flex flex-1 flex-col pt-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-base font-bold text-foreground">
                      <Link href={href} className="hover:text-orange-600 dark:hover:text-orange-400">
                        {experience.name}
                      </Link>
                    </h2>
                    <p className="shrink-0 text-sm font-bold text-orange-600 dark:text-orange-400">
                      {formatExperiencePrice(experience.priceFrom)}
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
                      Up to {experience.maxGuests} guests
                    </li>
                  </ul>

                  <Link
                    href={href}
                    className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-foreground text-sm font-semibold text-background transition-opacity hover:opacity-90"
                  >
                    View sample page
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </>
  );
}

import Link from "next/link";
import { Calendar, Clock, MapPin, Star, Users } from "lucide-react";
import { ExperienceMediaDisplay } from "@/components/experience/ExperienceMediaDisplay";
import type { ExperienceMediaItem } from "@/lib/experience-media";
import { formatDisplayMoney } from "@/lib/currency";

export type ExperienceOffer = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  price_amount: number | null;
  currency: string;
  duration_minutes: number | null;
  max_guests: number | null;
  category: string | null;
  location: string;
  coverMedia?: ExperienceMediaItem;
  rating?: number | null;
  reviewCount?: number | null;
};

export function ExperienceOfferCard({ experience }: { experience: ExperienceOffer }) {
  const detailHref = `/experiences/${experience.id}`;
  const bookHref = `${detailHref}#book-experience`;
  const durationHours =
    experience.duration_minutes && experience.duration_minutes > 0
      ? Math.max(1, Math.round(experience.duration_minutes / 60))
      : null;
  const durationLabel = durationHours
    ? durationHours === 1
      ? "1 hour"
      : `${durationHours} hours`
    : "Flexible";
  const guestLabel =
    experience.max_guests && experience.max_guests > 0
      ? experience.max_guests === 1
        ? "1 guest"
        : `Up to ${experience.max_guests} guests`
      : "Flexible group";
  const priceLabel =
    experience.price_amount && experience.price_amount > 0
      ? formatDisplayMoney(experience.price_amount, experience.currency)
      : "On request";
  const rating =
    experience.rating && experience.rating > 0 ? experience.rating : null;
  const reviewCount =
    experience.reviewCount && experience.reviewCount > 0 ? experience.reviewCount : null;

  return (
    <article className="grid overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:bg-card lg:grid-cols-[minmax(0,280px)_1fr_auto]">
      <Link
        href={detailHref}
        className="relative aspect-[16/10] w-full bg-zinc-100 lg:aspect-auto lg:min-h-[220px] dark:bg-zinc-800"
      >
        <ExperienceMediaDisplay
          media={experience.coverMedia}
          alt={experience.title}
          fill
          sizes="(max-width: 1024px) 100vw, 280px"
          videoAutoplay
          showVideoBadge={false}
          emptyLabel="No media"
        />
        {experience.category ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-900 backdrop-blur-sm">
            {experience.category}
          </span>
        ) : null}
      </Link>

      <div className="flex flex-col justify-center p-5 sm:p-6">
        <h3 className="text-lg font-bold text-foreground">
          <Link href={detailHref} className="hover:text-orange-600 dark:hover:text-orange-400">
            {experience.title}
          </Link>
        </h3>
        {experience.location ? (
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {experience.location}
          </p>
        ) : null}

        <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <Calendar className="size-4 shrink-0 stroke-[1.5]" aria-hidden />
            {durationLabel}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Users className="size-4 shrink-0 stroke-[1.5]" aria-hidden />
            {guestLabel}
          </li>
        </ul>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {experience.description ||
            experience.subtitle ||
            "Host-led experience you can book directly on Gozuru."}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={bookHref}
            className="inline-flex items-center justify-center rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Book now
          </Link>
          <Link
            href={detailHref}
            className="inline-flex items-center justify-center rounded-lg border border-foreground bg-white px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground hover:text-background dark:bg-card"
          >
            Learn more
          </Link>
        </div>
      </div>

      <div className="flex flex-row items-center justify-around gap-6 border-t border-border p-5 sm:p-6 lg:flex-col lg:justify-center lg:border-l lg:border-t-0 lg:px-8">
        <div className="text-center">
          <p className="text-xl font-bold text-foreground sm:text-2xl">{priceLabel}</p>
          <p className="mt-1 text-sm text-muted-foreground">Per guest</p>
        </div>
        <div className="text-center">
          {rating ? (
            <>
              <p className="inline-flex items-center justify-center gap-1 text-xl font-bold text-foreground sm:text-2xl">
                <Star className="size-5 fill-orange-500 text-orange-500" aria-hidden />
                {rating.toFixed(1)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {reviewCount ? `${reviewCount} reviews` : "Rating"}
              </p>
            </>
          ) : (
            <>
              <p className="inline-flex items-center justify-center gap-1 text-xl font-bold text-foreground sm:text-2xl">
                <Clock className="size-5 text-orange-500" aria-hidden />
                {durationHours ?? "—"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Hours</p>
            </>
          )}
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-foreground sm:text-2xl">
            {experience.max_guests && experience.max_guests > 0
              ? experience.max_guests
              : "—"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Max guests</p>
        </div>
      </div>
    </article>
  );
}

import Link from "next/link";
import { Calendar, MapPin, Users } from "lucide-react";
import { ExperienceMediaDisplay } from "@/components/experience/ExperienceMediaDisplay";
import { formatSlotDate, formatSlotTime } from "@/lib/booking/checkout";
import { categoryBadgeClass } from "@/lib/category-styles";
import { cn } from "@/lib/utils";
import { PropertyCTAButton } from "./PropertyCTAButton";
import type { UpcomingEventCardData } from "@/lib/queries/upcoming-events";

export function UpcomingEventCard({ event }: { event: UpcomingEventCardData }) {
  const detailHref = `/experiences/${event.id}`;
  const whenLabel = `${formatSlotDate(event.nextStartsAt)} · ${formatSlotTime(event.nextStartsAt)}`;

  return (
    <article className="grid overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:bg-card lg:grid-cols-[minmax(0,280px)_1fr]">
      <Link
        href={detailHref}
        className="relative aspect-[16/10] w-full bg-zinc-100 dark:bg-zinc-800 lg:aspect-auto lg:min-h-[220px]"
      >
        <ExperienceMediaDisplay
          media={event.coverMedia}
          alt={event.title}
          fill
          sizes="(max-width: 1024px) 100vw, 280px"
          videoAutoplay
          showVideoBadge={false}
          emptyLabel="No media uploaded"
        />
        <span
          className={cn(
            "absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm",
            categoryBadgeClass(event.category) ?? "bg-orange-600/90",
          )}
        >
          {event.category}
        </span>
      </Link>

      <div className="flex flex-col justify-center p-5 sm:p-6">
        <h3 className="text-lg font-bold text-foreground">
          <Link href={detailHref} className="hover:text-orange-600 dark:hover:text-orange-400">
            {event.title}
          </Link>
        </h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {event.location}
        </p>

        <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <Calendar className="size-4 shrink-0 stroke-[1.5]" aria-hidden />
            {whenLabel}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Users className="size-4 shrink-0 stroke-[1.5]" aria-hidden />
            Up to {event.maxAttendees} attendees
          </li>
        </ul>

        {event.description ? (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {event.description}
          </p>
        ) : null}

        <div className="mt-5">
          <PropertyCTAButton href={detailHref} variant="card" className="sm:w-auto">
            View experience
          </PropertyCTAButton>
        </div>
      </div>
    </article>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Users } from "lucide-react";
import {
  getSampleEventHref,
  getSampleEventTicketHref,
} from "@/app/(landing)/lib/sample-events";
import { type FeaturedEvent } from "@/app/(landing)/lib/investments";

export function InvestmentOfferCard({ offer }: { offer: FeaturedEvent }) {
  const durationLabel =
    offer.durationHours === 1 ? "1 hour" : `${offer.durationHours} hours`;
  const detailHref = getSampleEventHref(offer.id);
  const ticketHref = getSampleEventTicketHref(offer.id);

  return (
    <article className="grid overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:bg-card lg:grid-cols-[minmax(0,280px)_1fr_auto]">
      <Link href={detailHref} className="relative aspect-[16/10] w-full bg-zinc-100 lg:aspect-auto lg:min-h-[220px]">
        <Image
          src={offer.image}
          alt={offer.name}
          fill
          sizes="(max-width: 1024px) 100vw, 280px"
          className="object-cover"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground backdrop-blur-sm">
          {offer.category}
        </span>
      </Link>

      <div className="flex flex-col justify-center p-5 sm:p-6">
        <h3 className="text-lg font-bold text-foreground">
          <Link href={detailHref} className="hover:text-orange-600 dark:hover:text-orange-400">
            {offer.name}
          </Link>
        </h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {offer.location}
        </p>

        <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <Calendar className="size-4 shrink-0 stroke-[1.5]" aria-hidden />
            {durationLabel}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Users className="size-4 shrink-0 stroke-[1.5]" aria-hidden />
            Up to {offer.maxAttendees} attendees
          </li>
        </ul>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {offer.description}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={ticketHref}
            className="inline-flex items-center justify-center rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Buy ticket
          </Link>
          <Link
            href={detailHref}
            className="inline-flex items-center justify-center rounded-lg border border-foreground bg-white px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground hover:text-background dark:bg-card"
          >
            Learn more
          </Link>
        </div>
      </div>

      <div className="flex flex-row items-center justify-center gap-6 border-t border-border p-5 sm:p-6 lg:flex-col lg:border-l lg:border-t-0 lg:px-8">
        <div className="text-center">
          <p className="text-xl font-bold text-foreground sm:text-2xl">
            Up to {offer.maxAttendees}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Spots</p>
        </div>
      </div>
    </article>
  );
}

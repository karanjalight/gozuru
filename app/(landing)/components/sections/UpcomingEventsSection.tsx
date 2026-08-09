import { FEATURED_EVENTS } from "@/app/(landing)/lib/investments";
import { InvestmentOfferCard } from "./InvestmentOfferCard";
import { Section } from "./Section";

export function UpcomingEventsSection() {
  return (
    <Section
      id="upcoming-events"
      className="bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600"
      containerClassName="max-w-7xl"
    >
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
          Meetups & expos
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
          Events & gatherings
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-base">
          Meetups, expos, and welcome visits — different from a 1:1 session with a
          host. Browse those in the experiences grid above.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-6">
        {FEATURED_EVENTS.map((event) => (
          <InvestmentOfferCard key={event.id} offer={event} />
        ))}
      </div>
    </Section>
  );
}

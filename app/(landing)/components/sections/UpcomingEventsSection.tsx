import type { UpcomingEventCardData } from "@/lib/queries/upcoming-events";
import { Section } from "./Section";
import { UpcomingEventCard } from "./UpcomingEventCard";

export function UpcomingEventsSection({
  events,
}: {
  events: UpcomingEventCardData[];
}) {
  if (events.length === 0) return null;

  return (
    <Section
      id="upcoming-events"
      className="bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600"
      containerClassName="max-w-7xl"
    >
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
          Open dates
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
          Upcoming experiences
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-base">
          Real sessions with confirmed dates in the days ahead — reserve your spot
          before they fill up.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-6">
        {events.map((event) => (
          <UpcomingEventCard key={event.id} event={event} />
        ))}
      </div>
    </Section>
  );
}

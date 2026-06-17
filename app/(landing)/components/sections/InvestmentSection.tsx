import {
  FEATURED_EVENTS,
  PLATFORM_STATS,
} from "@/app/(landing)/lib/investments";
import { InvestmentOfferCard } from "./InvestmentOfferCard";
import { InvestmentStatCard } from "./InvestmentStatCard";
import { Section } from "./Section";

export function InvestmentSection() {
  return (
    <Section
      id="platform-metrics"
      className="bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600"
      containerClassName="max-w-7xl"
    >
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-16 lg:items-start">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
          Gozuru by the numbers
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-white/90 sm:text-base">
          <p>
            Travelers and experts alike rate Gozuru highly — from hotel welcome visits
            to community meetups and travel expos across 45+ cities.
          </p>
          <p>
            Our platform is built on positive feedback, expert satisfaction, and
            experiences people come back for.
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
        {PLATFORM_STATS.map((stat) => (
          <InvestmentStatCard key={stat.id} stat={stat} />
        ))}
      </div>

      <h3 className="mt-16 text-2xl font-bold tracking-tight text-white sm:text-3xl">
        Upcoming meetups & expos
      </h3>
      <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">
        Join social events, hotel partner series, and travel expos where the Gozuru
        community comes together.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        {FEATURED_EVENTS.map((event) => (
          <InvestmentOfferCard key={event.id} offer={event} />
        ))}
      </div>
    </Section>
  );
}

import { FEATURED_EXPERIENCES } from "@/app/(landing)/lib/properties";
import { PropertyCard } from "./PropertyCard";
import { PropertyCTAButton } from "./PropertyCTAButton";
import { Section } from "./Section";

export function NewPropertiesSection() {
  return (
    <Section
      id="featured-experiences"
      className="bg-white dark:bg-background"
      containerClassName="max-w-7xl"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
            Curated for curious travelers
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Featured experiences
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Hotel partner visits, expert-led sessions, community meetups, social dinners,
            and travel expos — handpicked by the Gozuru team.
          </p>
        </div>
        <PropertyCTAButton href="/experiences" variant="outline">
         <div className="p-4">
         Browse all experiences
         </div>
        </PropertyCTAButton>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-12">
        {FEATURED_EXPERIENCES.map((experience) => (
          <PropertyCard key={experience.id} property={experience} />
        ))}
      </div>

      <div className="mt-14 flex flex-col items-center justify-between gap-6 rounded-2xl border border-border  px-6 py-8 text-center sm:flex-row sm:px-10 sm:text-left dark:from-orange-950/20 dark:to-background">
        <div>
          <p className="text-lg font-semibold text-foreground">
            Ready to reward your curiosity?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Join a meetup, book a hotel visit, or explore what&apos;s happening at the next expo.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <PropertyCTAButton href="/experiences" variant="outline">
            <div className="p-4">
            Browse all experiences
            </div>
          </PropertyCTAButton>
          <PropertyCTAButton href="#platform-metrics" variant="outline">
            See our metrics
          </PropertyCTAButton>
        </div>
      </div>
    </Section>
  );
}

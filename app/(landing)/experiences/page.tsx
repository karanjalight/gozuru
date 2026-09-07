import type { Metadata } from "next";
import { Suspense } from "react";
import {
  featuredImageTransform,
  listImageTransform,
} from "@/lib/queries/experiences";
import { fetchLandingExperiencesServer } from "@/lib/queries/experiences-server";
import { fetchUpcomingEventsServer } from "@/lib/queries/upcoming-events";
import { socialPreviewImage } from "@/lib/seo";
import { ExperienceHero } from "../components/HeroExperience copy";
import { ExperiencesGrid } from "../components/sections/ExperiencesSection";
import { FeaturedExperiencesShowcase } from "../components/sections/FeaturedExperiencesShowcase";
import { UpcomingEventsSection } from "../components/sections/UpcomingEventsSection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Experiences – Gozuru",
  description:
    "Browse host-led experiences from local experts. Discover immersive conversations, workshops, and curated journeys worldwide.",
  openGraph: {
    title: "Experiences – Gozuru",
    description:
      "Browse real, host-led experiences with clear details on location, duration, and price.",
    images: [socialPreviewImage],
  },
};

export default async function ExperiencesPage() {
  const [experiencesData, featuredData, upcomingEvents] = await Promise.all([
    fetchLandingExperiencesServer(48, listImageTransform),
    fetchLandingExperiencesServer(4, featuredImageTransform),
    fetchUpcomingEventsServer(3, listImageTransform),
  ]);

  return (
    <>
      <ExperienceHero initialData={experiencesData} />

      <Suspense fallback={null}>
        <ExperiencesGrid initialData={experiencesData} />
      </Suspense>
      <Suspense fallback={null}>
        <UpcomingEventsSection events={upcomingEvents} />
      </Suspense>
      <Suspense fallback={null}>
        <FeaturedExperiencesShowcase initialData={featuredData} />
      </Suspense>
    </>
  );
}

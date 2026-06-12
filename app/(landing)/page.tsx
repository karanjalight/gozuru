import type { Metadata } from "next";
import { Suspense } from "react";
import {
  ExpertGrid,
  CategorySection,
  FeaturedExperiences,
  TestimonialsSection,
  CTASection,
} from "./components/sections";
import { LandingHero } from "./components/HeroLanding";
import { ExperiencesGrid } from "./components/sections/ExperiencesSection";
import {
  featuredImageTransform,
  listImageTransform,
} from "@/lib/queries/experiences";
import { fetchLandingExperiencesServer } from "@/lib/queries/experiences-server";
import { socialPreviewImage } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gozuru – Reward Your Curiosity",
  description:
    "The Gozuru of curious travelers. Connect with local experts, discover hidden gems, and experience the world through human connection and knowledge sharing.",
  openGraph: {
    title: "Gozuru – Reward Your Curiosity",
    description:
      "Connect with local experts. Discover hidden gems, stories, and knowledge — not just sights.",
    images: [socialPreviewImage],
  },
};

export default async function LandingPage() {
  const [sharedLandingData, featuredLandingData] = await Promise.all([
    fetchLandingExperiencesServer(24, listImageTransform),
    fetchLandingExperiencesServer(6, featuredImageTransform),
  ]);

  return (
    <>
      <LandingHero initialData={sharedLandingData} />
      {/* <HeroSection /> */}
      {/* <SearchSection /> */}
      <Suspense fallback={null}>
        <ExperiencesGrid initialData={sharedLandingData} />
      </Suspense>
      <ExpertGrid />
      <CategorySection />
      <FeaturedExperiences initialData={featuredLandingData} />
      <TestimonialsSection />
      <CTASection />
    </>
  );
}

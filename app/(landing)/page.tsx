import type { Metadata } from "next";
import {
  ExpertGrid,
  CategorySection,
  FeaturedExperiences,
  TestimonialsSection,
  CTASection,
} from "./components/sections";
import { LandingHero } from "./components/HeroLanding";
import { ExperiencesGrid } from "./components/sections/ExperiencesSection";
import { LandingSignupPrompt } from "./components/LandingSignupPrompt";
import {
  featuredImageTransform,
  listImageTransform,
} from "@/lib/queries/experiences";
import { fetchLandingExperiencesServer } from "@/lib/queries/experiences-server";

export const metadata: Metadata = {
  title: "Gozuru – Reward Your Curiosity",
  description:
    "The Gozuru of curious travelers. Connect with local experts, discover hidden gems, and experience the world through human connection and knowledge sharing.",
  openGraph: {
    title: "Gozuru – Reward Your Curiosity",
    description:
      "Connect with local experts. Discover hidden gems, stories, and knowledge — not just sights.",
  },
};

export default async function LandingPage() {
  const [sharedLandingData, featuredLandingData] = await Promise.all([
    fetchLandingExperiencesServer(24, listImageTransform),
    fetchLandingExperiencesServer(6, featuredImageTransform),
  ]);

  return (
    <>
      <LandingSignupPrompt />
      <LandingHero initialData={sharedLandingData} />
      {/* <HeroSection /> */}
      {/* <SearchSection /> */}
      <ExperiencesGrid initialData={sharedLandingData} />
      <ExpertGrid />
      <CategorySection />
      <FeaturedExperiences initialData={featuredLandingData} />
      <TestimonialsSection />
      <CTASection />
    </>
  );
}

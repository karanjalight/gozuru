import type { Metadata } from "next";
import {
  HeroSection,
  SearchSection,
  ExpertGrid,
  CategorySection,
  FeaturedExperiences,
  TestimonialsSection,
  CTASection,
} from "./components/sections";
import { LandingHero } from "./components/HeroLanding";
import { ExperiencesGrid } from "./components/sections/ExperiencesSection";

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

export default function LandingPage() {
  return (
    <>
      <LandingHero />
      {/* <HeroSection /> */}
      {/* <SearchSection /> */}
      <ExperiencesGrid />
      <ExpertGrid />
      <CategorySection />
      <FeaturedExperiences />
      <TestimonialsSection />
      <CTASection />
    </>
  );
}

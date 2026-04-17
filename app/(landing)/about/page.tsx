import type { Metadata } from "next";
import { TestimonialsSection } from "../components/sections";
import { AboutHero } from "../components/HeroAbout";
import { KochiApp } from "../components/sections/AboutSection";

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
    <AboutHero />
    <KochiApp />
      {/* <HeroSection /> */}
      {/* <SearchSection /> */}
      {/* <ExperiencesGrid /> */}
      {/* <ExpertGrid /> */}
      {/* <FeaturedExperiences /> */}
      {/* <CategorySection /> */}

      <TestimonialsSection />
      {/* <CTASection /> */}
    </>
  );
}

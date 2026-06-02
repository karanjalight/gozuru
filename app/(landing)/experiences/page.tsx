import type { Metadata } from "next";
import { socialPreviewImage } from "@/lib/seo";
import { CategorySection, ExpertGrid, FeaturedExperiences } from "../components/sections";
import { ExperienceHero } from "../components/HeroExperience copy";
import { Navbar } from "../components/Navbar";

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

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <div className="">
        <ExperienceHero />
      </div>
      <FeaturedExperiences />
      <ExpertGrid />
      <CategorySection />
    </>
  );
}

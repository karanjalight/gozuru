import type { Metadata } from "next";
import {
  ContactTeamSection,
  ExpertAgentsSection,
  FeaturedExperiences,
  HowItWorksSection,
  InvestmentSection,
  NewPropertiesSection,
  TestimonialsSection,
} from "./components/sections";
import { LandingHero } from "./components/HeroLanding";
import {
  featuredImageTransform,
  listImageTransform,
} from "@/lib/queries/experiences";
import { fetchLandingExperiencesServer } from "@/lib/queries/experiences-server";
import { fetchLandingExpertsServer } from "@/lib/queries/experts-server";
import { socialPreviewImage } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gozuru – Reward Your Curiosity",
  description:
    "Book hotel partner visits, expert-led experiences, community meetups, social events, and travel expos. Connect with local experts and reward your curiosity on Gozuru.",
  openGraph: {
    title: "Gozuru – Reward Your Curiosity",
    description:
      "Hotel visits, featured experiences, meetups, expos, and verified local experts — all on Gozuru.",
    images: [socialPreviewImage],
  },
};

export default async function LandingPage() {
  const [sharedLandingData, featuredLandingData, { experts }] = await Promise.all([
    fetchLandingExperiencesServer(24, listImageTransform),
    fetchLandingExperiencesServer(6, featuredImageTransform),
    fetchLandingExpertsServer(12),
  ]);

  return (
    <>
      <LandingHero initialData={sharedLandingData} />
      {/* <FeaturedExperiences initialData={featuredLandingData} /> */}
      <ExpertAgentsSection experts={experts} />

      <NewPropertiesSection />
      <HowItWorksSection />
      <InvestmentSection />
      <TestimonialsSection />
      <ContactTeamSection />
    </>
  );
}

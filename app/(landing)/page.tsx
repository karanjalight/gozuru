import type { Metadata } from "next";
import {
  ContactTeamSection,
  ExpertAgentsSection,
  FeaturedExperiences,
  HowItWorksSection,
  TestimonialsSection,
} from "./components/sections";
import { LandingHero } from "./components/HeroLanding";
import {
  featuredImageTransform,
  listImageTransform,
} from "@/lib/queries/experiences";
import { fetchLandingExperiencesServer } from "@/lib/queries/experiences-server";
import { fetchLandingExpertsServer } from "@/lib/queries/experts-server";
import { siteDescription, siteTitle, socialPreviewImage } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: siteTitle },
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
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
      <ExpertAgentsSection experts={experts} />

      <FeaturedExperiences initialData={featuredLandingData} />
      <HowItWorksSection />
      <TestimonialsSection />
      <ContactTeamSection />
    </>
  );
}

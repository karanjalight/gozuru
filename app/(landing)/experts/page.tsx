import type { Metadata } from "next";
import { Suspense } from "react";
import { fetchLandingExpertsServer } from "@/lib/queries/experts-server";
import { socialPreviewImage } from "@/lib/seo";
import { HeroExperts } from "../components/HeroExperts";
import { ExpertsGrid } from "../components/sections/ExpertsSection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Experts – Gozuru",
  description:
    "Meet verified local experts on Gozuru — hotel curators, culture guides, event hosts, and community builders ready to share their city with you.",
  openGraph: {
    title: "Experts – Gozuru",
    description:
      "Browse verified Gozuru experts by specialty, city, and traveler ratings.",
    images: [socialPreviewImage],
  },
};

export default async function ExpertsPage() {
  const { experts } = await fetchLandingExpertsServer();

  return (
    <>
      <HeroExperts experts={experts} />
      <Suspense fallback={null}>
        <ExpertsGrid experts={experts} />
      </Suspense>
    </>
  );
}

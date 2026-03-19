import type { Metadata } from "next";
import { HostsHero } from "../components/HeroHosts";
import { HostsSection } from "../components/sections";

export const metadata: Metadata = {
  title: "Become a Host – Gozuru",
  description:
    "Share your craft and local insight with curious travelers. Create your expert profile, set availability, and get booked on GOZURU.",
};

export default function HostsPage() {
  return (
    <>
      <HostsHero />
      <HostsSection />
    </>
  );
}


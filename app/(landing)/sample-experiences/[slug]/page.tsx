import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SampleExperienceDetail } from "../../components/SampleExperienceDetail";
import {
  getSampleExperience,
  SAMPLE_EXPERIENCE_SLUGS,
} from "../../lib/sample-experiences";
import { socialPreviewImage } from "@/lib/seo";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return SAMPLE_EXPERIENCE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const experience = getSampleExperience(slug);

  if (!experience) {
    return { title: "Sample experience not found – Gozuru" };
  }

  return {
    title: `${experience.title} – Sample – Gozuru`,
    description: experience.subtitle,
    openGraph: {
      title: `${experience.title} – Gozuru`,
      description: experience.subtitle,
      images: [experience.images[0] ?? socialPreviewImage.url],
    },
  };
}

export default async function SampleExperiencePage({ params }: PageProps) {
  const { slug } = await params;
  const experience = getSampleExperience(slug);

  if (!experience) {
    notFound();
  }

  return <SampleExperienceDetail experience={experience} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SampleEventDetail } from "../../components/SampleEventDetail";
import { getSampleEvent, SAMPLE_EVENT_SLUGS } from "../../lib/sample-events";
import { socialPreviewImage } from "@/lib/seo";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return SAMPLE_EVENT_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = getSampleEvent(slug);

  if (!event) {
    return { title: "Event not found – Gozuru" };
  }

  return {
    title: `${event.title} – Gozuru`,
    description: event.subtitle,
    openGraph: {
      title: `${event.title} – Gozuru`,
      description: event.subtitle,
      images: [event.images[0] ?? socialPreviewImage.url],
    },
  };
}

export default async function SampleEventPage({ params }: PageProps) {
  const { slug } = await params;
  const event = getSampleEvent(slug);

  if (!event) {
    notFound();
  }

  return <SampleEventDetail event={event} />;
}

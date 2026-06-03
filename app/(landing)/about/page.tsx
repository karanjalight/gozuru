import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Compass, Quote, Sparkles } from "lucide-react";
import { socialPreviewImage } from "@/lib/seo";
import { Navbar } from "../components/Navbar";

export const metadata: Metadata = {
  title: "About Us – Gozuru 1.0",
  description:
    "Gozuru connects curious travelers with knowledgeable local experts, masters, and curators. Reward your curiosity.",
  openGraph: {
    title: "About Us – Gozuru 1.0",
    description:
      "Travel is the most progressive expression of human curiosity. Meet the people behind Gozuru.",
    images: [socialPreviewImage],
  },
};

const curiosityQuestions = [
  "How do people live in this place?",
  "What's unique about the tech in this city?",
  "How can I experience someone actually making the pots?",
  "Is the art scene vibrant enough?",
  "And how alive is the nightlife?",
];

const teamMembers = [
  {
    name: "Humphrey Mumita",
    role: "Co-Founder, Gozuru",
    featured: true,
    quote:
      "Travel is not just about seeing places. It is about accessing people, ideas, cultures, and experiences that transform the way we understand the world.",
    bio: "Humphrey is an architect and experiential travel entrepreneur with over a decade of experience designing transformative global travel and knowledge tours across Africa, Europe, Asia, and the Middle East. As Co-Founder of Gozuru, he brings deep expertise in curating experiences tailored for Africa's growing middle-class demographic in search of rewarding experiences. He believes people-to-people connection is what makes travel impactful. His work blends architecture, travel, culture, learning, and human connection, creating journeys that go far beyond tourism into meaningful discovery and global perspective.",
    image:
      "https://media.licdn.com/dms/image/v2/D4D03AQEGQ_uTYyLMBg/profile-displayphoto-shrink_400_400/B4DZTRTARsG8Ag-/0/1738678208563?e=1782345600&v=beta&t=x-r4cXno7PW1fVsb3ny6tPnMBoLzQRV81gnWFuV1XaI",
  },
  {
    name: "Samuel Njuguna",
    role: "Co-Founder, Gozuru",
    image:
      "https://media.licdn.com/dms/image/v2/D4D03AQFWhR3qq6te9A/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1725214991829?e=1782345600&v=beta&t=M7F069RA8QNoOqgtgTLFedQ-PGsa7_I-hVvQ8VObCYc",
  },
  {
    name: "Paul Karanja",
    role: "Software Engineer, Gozuru",
    image:
      "https://media.licdn.com/dms/image/v2/D4D03AQHZa4QO3KPs-w/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1721202851887?e=1782345600&v=beta&t=-uwPK-Lj6Nb6uDOV04WYsC4fSFt0-j9g2lyA3WBUPfE",
  },
  {
    name: "Esther Cheroben",
    role: "Team, Gozuru",
    image:
      "https://media.licdn.com/dms/image/v2/D4D03AQGOWS_eHL29kA/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1669701482104?e=1782345600&v=beta&t=WYEIAyzPMeih1p1h9kegQNGkNNDvcWUZHLN0yb1demM",
  },
];

const storyImages = {
  hero: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1800&h=1000&fit=crop",
  curiosity:
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=900&fit=crop",
  connection:
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=900&fit=crop",
  craft:
    "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=1200&h=900&fit=crop",
};

export default function AboutPage() {
  const featuredMember = teamMembers.find((member) => member.featured);
  const otherMembers = teamMembers.filter((member) => !member.featured);

  return (
    <main className="bg-background text-foreground">
      <Navbar />
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div aria-hidden className="absolute inset-0 z-0">
          <Image
            src={storyImages.hero}
            alt=""
            fill
            priority
            className="object-cover opacity-35"
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-950 via-slate-950/90 to-slate-900/60" />
        <div className="relative z-10 mx-auto grid min-h-[72vh] max-w-6xl items-center gap-12 px-4 pb-16 pt-32 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
              <Compass className="size-4" aria-hidden />
              Gozuru 1.0
            </div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">
              About us
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl [font-family:var(--font-heading)]">
              Reward your curiosity.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
              At Gozuru, curious travelers connect with knowledgeable but hard-to-find local
              experts, masters, and curators shaping their fields.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Sign up
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/experiences"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                Explore experiences
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative min-h-[280px] overflow-hidden rounded-[2rem] sm:row-span-2 sm:min-h-[420px]">
              <Image
                src={storyImages.curiosity}
                alt="Travelers exploring a new city"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 400px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <p className="absolute bottom-5 left-5 text-sm font-semibold">Curiosity in motion</p>
            </div>
            <div className="relative min-h-[180px] overflow-hidden rounded-[2rem]">
              <Image
                src={storyImages.craft}
                alt="Local craft and culture"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 300px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <p className="absolute bottom-5 left-5 text-sm font-semibold">Masters at work</p>
            </div>
            <div className="relative min-h-[180px] overflow-hidden rounded-[2rem]">
              <Image
                src={storyImages.connection}
                alt="People learning together"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 300px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <p className="absolute bottom-5 left-5 text-sm font-semibold">Real connection</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">
                Why travel?
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl [font-family:var(--font-heading)]">
                The most progressive expression of human curiosity.
              </h2>
              <p className="mt-5 text-base leading-8 text-muted-foreground">
                We believe travel is the most progressive expression of human curiosity. In a world
                of meaningful travel, our curiosity constantly builds up. We ask ourselves:
              </p>
            </div>

            <ul className="grid gap-3">
              {curiosityQuestions.map((question) => (
                <li
                  key={question}
                  className="rounded-2xl border border-border bg-card px-5 py-4 text-sm leading-6 text-foreground shadow-sm"
                >
                  {question}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12 rounded-[2rem] border border-border bg-muted/20 p-6 sm:p-8">
            <p className="text-base leading-8 text-muted-foreground">
              But the real answers rarely come from guidebooks. They come from people who practice a
              craft, refine it, curate it, live it, and master it—yet are often hard to find or even
              know.
            </p>
            <p className="mt-4 text-base leading-8 text-muted-foreground">
              So the question becomes: how do we reach them? How do we engage, meet, and learn
              directly?
            </p>
            <p className="mt-6 text-lg font-semibold text-foreground">
              That&apos;s why we built Gozuru.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="relative min-h-[320px] overflow-hidden rounded-[2rem]">
              <Image
                src={storyImages.connection}
                alt="Travelers meeting a local expert"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 600px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                What we do
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl [font-family:var(--font-heading)]">
                Access to people who live the work.
              </h2>
              <p className="mt-5 text-base leading-8 text-muted-foreground">
                We bring together listings of experts across every area of interest, their
                availability and rates—saving you time while enabling meaningful social and
                professional connections.
              </p>
              <blockquote className="mt-8 border-l-4 border-orange-500 pl-5 text-lg font-medium leading-8 text-foreground">
                Today you&apos;re the local expert. Tomorrow, the curious traveler.
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      <section id="team" className="border-y border-border bg-muted/20 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              The team
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl [font-family:var(--font-heading)]">
              People building access, not just itineraries.
            </h2>
          </div>

          {featuredMember ? (
            <div className="mt-10 overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
              <div className="grid lg:grid-cols-[340px_1fr]">
                <div className="relative min-h-[320px] lg:min-h-full">
                  <Image
                    src={featuredMember.image}
                    alt={featuredMember.name}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 340px"
                  />
                </div>
                <div className="p-6 sm:p-8 lg:p-10">
                  <p className="text-sm font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                    {featuredMember.role}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold [font-family:var(--font-heading)]">
                    {featuredMember.name}
                  </h3>
                  {featuredMember.quote ? (
                    <div className="mt-5 flex gap-3 rounded-2xl border border-border bg-muted/30 p-4">
                      <Quote className="mt-0.5 size-5 shrink-0 text-orange-500" aria-hidden />
                      <p className="text-sm italic leading-7 text-muted-foreground">
                        {featuredMember.quote}
                      </p>
                    </div>
                  ) : null}
                  {featuredMember.bio ? (
                    <p className="mt-5 text-sm leading-7 text-muted-foreground">{featuredMember.bio}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {otherMembers.map((member) => (
              <div
                key={member.name}
                className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
              >
                <div className="relative aspect-[4/5]">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 320px"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold [font-family:var(--font-heading)]">
                    {member.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white sm:p-10 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Sparkles className="size-8 text-orange-400" aria-hidden />
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">
                Gozuru
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight [font-family:var(--font-heading)]">
                Sign up, learn and earn.
              </h2>
              <p className="mt-3 max-w-2xl text-slate-300">
                Reward your curiosity. Join as a traveler, host, or expert—and turn what you know
                into meaningful experiences for others.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Sign up
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/hosts"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                Become a host
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

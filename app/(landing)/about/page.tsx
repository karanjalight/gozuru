import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Compass,
  Globe2,
  Handshake,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { socialPreviewImage } from "@/lib/seo";
import { Navbar } from "../components/Navbar";

export const metadata: Metadata = {
  title: "About Gozuru – Reward Your Curiosity",
  description:
    "Learn how Gozuru connects curious travelers with local experts, makers, operators, and people who know the real story behind a place.",
  openGraph: {
    title: "About Gozuru – Reward Your Curiosity",
    description:
      "Connect with local experts. Discover hidden gems, stories, and knowledge, not just sights.",
    images: [socialPreviewImage],
  },
};

const values = [
  {
    title: "Curiosity with context",
    description:
      "We help travelers understand how people live, work, build, cook, create, and make decisions in a place.",
    icon: BookOpen,
  },
  {
    title: "People over checklists",
    description:
      "Every experience starts with a real host: a professional, maker, farmer, founder, operator, or local insider.",
    icon: Users,
  },
  {
    title: "Trust by design",
    description:
      "Profiles, reviews, clear expectations, secure payments, and meet-up details make bookings feel safer.",
    icon: ShieldCheck,
  },
];

const stats = [
  { value: "6", label: "interest categories" },
  { value: "600+", label: "expert profiles planned" },
  { value: "1:1", label: "human-led experiences" },
];

const steps = [
  {
    title: "Choose what you care about",
    description:
      "Start with an interest like tech, farming, culture, hospitality, business, or career insight.",
  },
  {
    title: "Meet someone with lived knowledge",
    description:
      "Book a host who can show you the real systems, places, routines, and stories behind that interest.",
  },
  {
    title: "Leave with practical understanding",
    description:
      "Gozuru is built for travelers who want memories, but also useful context they can carry forward.",
  },
];

const imageCards = [
  {
    title: "Local knowledge",
    image:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&h=1100&fit=crop",
  },
  {
    title: "Real conversations",
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&h=700&fit=crop",
  },
  {
    title: "Field experiences",
    image:
      "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=900&h=700&fit=crop",
  },
];

export default function AboutPage() {
  return (
    <main className="bg-background text-foreground">
      <section className="relative isolate overflow-hidden bg-slate-950 text-white">
        <Navbar />
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1800&h=1000&fit=crop)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/85 to-slate-900/55" />
        <div className="relative mx-auto grid min-h-[72vh] max-w-6xl items-center gap-12 px-4 pb-16 pt-32 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur">
              <Compass className="size-4" aria-hidden />
              About Gozuru
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl [font-family:var(--font-heading)]">
              Travel that introduces you to people, not just places.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
              Gozuru connects curious travelers with local experts and hosts who
              can explain the real culture, industries, systems, and everyday
              decisions that shape a destination.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/experiences"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Explore experiences
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/hosts"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                Become a host
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {imageCards.map((card, index) => (
              <div
                key={card.title}
                className={
                  index === 0
                    ? "relative min-h-[340px] overflow-hidden rounded-[2rem] sm:row-span-2"
                    : "relative min-h-[160px] overflow-hidden rounded-[2rem]"
                }
              >
                <div
                  aria-hidden
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${card.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <p className="absolute bottom-5 left-5 text-sm font-semibold text-white">
                  {card.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b bg-muted/25 py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-3xl border bg-card p-6 shadow-sm"
            >
              <p className="text-4xl font-bold text-foreground [font-family:var(--font-heading)]">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Our Mission
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl [font-family:var(--font-heading)]">
                Make meaningful access easier.
              </h2>
              <p className="mt-5 text-base leading-8 text-muted-foreground">
                Most travel platforms help people find activities. Gozuru helps
                people find understanding. We believe a place becomes more
                memorable when you can meet someone who lives the work, culture,
                craft, or industry you are curious about.
              </p>
            </div>

            <div className="grid gap-5">
              {values.map((value) => {
                const Icon = value.icon;
                return (
                  <div
                    key={value.title}
                    className="rounded-3xl border bg-card p-6 shadow-sm"
                  >
                    <div className="flex gap-4">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                        <Icon className="size-5" aria-hidden />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {value.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {value.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-16 text-white sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-slate-200">
                <Globe2 className="size-4" aria-hidden />
                How it works
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl [font-family:var(--font-heading)]">
                A better way to explore by interest.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-300">
                The platform is designed around what travelers care about:
                access, trust, clarity, and hosts who can teach from experience.
              </p>
            </div>
            <div className="grid gap-4">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.06] p-6"
                >
                  <div className="flex gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{step.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "For travelers",
                description:
                  "Book hosts who can help you understand a topic, career, craft, supply chain, or local way of life.",
                icon: MapPin,
              },
              {
                title: "For hosts",
                description:
                  "Package your knowledge into a visit, conversation, workshop, or guided local experience.",
                icon: Handshake,
              },
              {
                title: "For communities",
                description:
                  "Create value around local expertise while encouraging more respectful, useful travel.",
                icon: BadgeCheck,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-3xl border bg-card p-6 shadow-sm"
                >
                  <Icon className="size-8 text-slate-950 dark:text-white" aria-hidden />
                  <h3 className="mt-5 font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white sm:p-10 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Sparkles className="size-8 text-white/70" aria-hidden />
              <h2 className="mt-4 text-3xl font-bold tracking-tight [font-family:var(--font-heading)]">
                Curious about something specific?
              </h2>
              <p className="mt-3 max-w-2xl text-slate-300">
                Tell us what you want to understand, and Gozuru can help you
                find the kind of host or experience that fits.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              Contact us
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

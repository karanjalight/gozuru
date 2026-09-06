"use client";

import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Globe,
  MapPin,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import { ExperienceOfferCard } from "./sections/ExperienceOfferCard";
import type { ExperienceMediaItem } from "@/lib/experience-media";
import { formatDisplayMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";

export type HostPortfolioExperience = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  price_amount: number | null;
  currency: string;
  duration_minutes: number | null;
  max_guests: number | null;
  category: string | null;
  location: string;
  coverMedia?: ExperienceMediaItem;
};

export type HostPortfolioProps = {
  profileName: string;
  headline: string;
  aboutText: string;
  expertiseText?: string | null;
  careerHighlight?: string | null;
  highlightStory?: string | null;
  primaryLocation: string;
  yearsExperience: number | null;
  isVerified: boolean;
  avatarUrl: string | null;
  bannerImage: string;
  experiences: HostPortfolioExperience[];
  focusAreas: string[];
  socialLinks: Array<{ id: string; url: string; label: string }>;
};

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function SkillBar({ label, percent }: { label: string; percent: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-foreground">{label}</span>
        <span className="font-bold text-orange-600">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-orange-500 transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function FeatureTile({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-white p-5 shadow-sm dark:bg-card">
      <div className="flex size-10 items-center justify-center rounded-full bg-orange-50 text-orange-600">
        <Icon className="size-5" aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

export function HostProfilePortfolio({
  profileName,
  headline,
  aboutText,
  expertiseText,
  careerHighlight,
  highlightStory,
  primaryLocation,
  yearsExperience,
  isVerified,
  avatarUrl,
  bannerImage,
  experiences,
  focusAreas,
  socialLinks,
}: HostPortfolioProps) {
  const firstExperience = experiences[0];
  const hireHref = firstExperience
    ? `/experiences/${firstExperience.id}`
    : "/contact";
  const serviceItems =
    experiences.length > 0
      ? experiences.slice(0, 5)
      : focusAreas.slice(0, 5).map((area, index) => ({
          id: `focus-${index}`,
          title: area,
          subtitle: headline,
          description: aboutText,
          price_amount: null,
          currency: "KES",
          duration_minutes: null,
          max_guests: null,
          category: null,
          location: primaryLocation,
          coverMedia: undefined,
        }));

  const skillItems = (focusAreas.length > 0 ? focusAreas : [headline, "Hosting", "Local culture"])
    .slice(0, 3)
    .map((label, index) => ({
      label,
      percent: Math.max(55, 92 - index * 12),
    }));

  const galleryImages = experiences
    .slice(0, 2)
    .map((exp) => exp.coverMedia?.url ?? bannerImage);

  const clientsStat = experiences.length > 0 ? `${experiences.length * 12}+` : "10+";
  const projectsStat = experiences.length > 0 ? `${experiences.length * 40}+` : "25+";

  return (
    <div className="bg-white text-foreground dark:bg-background">
      {/* Hero */}
      <section className="border-b border-border/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:gap-12 lg:py-16">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-orange-600">
              {isVerified ? "Verified Gozuru expert" : "Gozuru expert"}
            </p>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.25rem]">
              {profileName}
              <span className="mt-2 block text-2xl font-normal italic text-muted-foreground sm:text-3xl">
                {headline}
              </span>
              <span className="mt-1 block text-lg font-sans font-medium not-italic text-foreground/80 sm:text-xl">
                Based in {primaryLocation}
              </span>
            </h1>
            {/* <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              {aboutText}
            </p> */}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={hireHref}
                className="inline-flex items-center justify-center rounded-full bg-orange-500 px-7 py-3 text-sm font-bold text-white shadow-md transition hover:bg-orange-600"
              >
                Book experience
              </Link>
              <a
                href="#portfolio"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-7 py-3 text-sm font-bold text-background transition hover:opacity-90"
              >
                Portfolio
                <ArrowUpRight className="size-4" aria-hidden />
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[320px] lg:mx-0 lg:max-w-none">
            <div className="relative mx-auto aspect-square w-full max-w-[300px] overflow-hidden rounded-full border-[6px] border-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] sm:max-w-[320px]">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={profileName}
                  fill
                  unoptimized
                  priority
                  className="object-cover"
                  sizes="420px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-100">
                  <UserRound className="size-20 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border/60">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid flex-1 grid-cols-1 gap-8 sm:grid-cols-3">
              <StatBlock
                value={yearsExperience ? String(yearsExperience) : "5+"}
                label="Years of experience"
              />
              <StatBlock value={clientsStat} label="Travelers hosted" />
              <StatBlock value={projectsStat} label="Experiences delivered" />
            </div>

            {socialLinks.length > 0 ? (
              <div className="lg:max-w-xs lg:text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  Check & follow me
                </p>
                <div className="mt-3 flex flex-wrap gap-2 lg:justify-end">
                  {socialLinks.map((social) => (
                    <a
                      key={social.id}
                      href={social.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-orange-400 hover:text-orange-600"
                    >
                      <Globe className="size-3.5" aria-hidden />
                      {social.label}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Services — orange band */}
      <section className="bg-orange-500 text-white">
        <div className="mx-auto grd max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14 lg:py-16">
          <div>
          <div className="mt-10 max-w-6xl mx-auto pb-10">
              <h2 className="font-serif text-2xl font-bold sm:text-3xl">
                {careerHighlight || "Why book with me"}
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-zinc-900 sm:text-base">
                <p>{highlightStory || aboutText}</p>
                {expertiseText && expertiseText !== aboutText ? <p>{expertiseText}</p> : null}
              </div>
              <Link
                href={hireHref}
                className="mt-8 inline-flex items-center justify-center rounded-full bg-foreground px-8 py-3 text-sm font-bold text-background transition hover:bg-orange-600 hover:text-white"
              >
                Book experience
              </Link>
            </div>
          </div>
 
        </div>
      </section>

      {/* Skills & highlights */}
      <section className="border-b border-border/60">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-16 lg:py-16">
          <div>
            <div className="relative mx-auto aspect-square w-full max-w-[260px] overflow-hidden rounded-full border-4 border-orange-100 shadow-lg lg:mx-0">
              <Image
                src={bannerImage}
                alt=""
                fill
                unoptimized
                className="object-cover"
                sizes="260px"
              />
            </div>
            <div className="mt-8 space-y-5">
              {skillItems.map((skill) => (
                <SkillBar key={skill.label} label={skill.label} percent={skill.percent} />
              ))}
            </div>
          </div>

          <div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FeatureTile
                icon={BadgeCheck}
                title={isVerified ? "Verified quality" : "Trusted host"}
                description="Background-checked and reviewed by travelers on Gozuru."
              />
              <FeatureTile
                icon={Star}
                title="Top-rated sessions"
                description="Consistently high ratings from guests who book direct on the platform."
              />
              <FeatureTile
                icon={CalendarDays}
                title={
                  yearsExperience
                    ? `${yearsExperience}+ years experience`
                    : "Experienced guide"
                }
                description="Deep local knowledge built from years of hosting and cultural immersion."
              />
              <FeatureTile
                icon={MapPin}
                title={`Based in ${primaryLocation}`}
                description="Authentic, location-led experiences designed around where you are."
              />
            </div>

            
          </div>
        </div>
                
      </section>

      {/* Portfolio — same card layout as upcoming events */}
      <section id="portfolio" className="scroll-mt-24 border-b border-border/60 bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              Portfolio
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              Experiences you can book today
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-base">
              Published offerings from this expert — book directly on Gozuru.
              {experiences.length > 0
                ? ` ${experiences.length} live offering${experiences.length === 1 ? "" : "s"} available.`
                : ""}
            </p>
          </div>

          {experiences.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-white/30 bg-white/10 px-6 py-14 text-center backdrop-blur-sm">
              <Sparkles className="mx-auto size-8 text-white/70" />
              <p className="mt-3 font-semibold text-white">Portfolio coming soon</p>
              <p className="mt-2 text-sm text-white/80">
                This expert is building their public offerings. Check back for new experiences.
              </p>
            </div>
          ) : (
            <div className="mt-10 flex flex-col gap-6">
              {experiences.map((exp) => (
                <ExperienceOfferCard key={exp.id} experience={exp} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

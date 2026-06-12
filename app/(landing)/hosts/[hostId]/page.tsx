"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExperienceMediaDisplay } from "@/components/experience/ExperienceMediaDisplay";
import {
  buildCoverByExperienceId,
  type ExperienceMediaItem,
  type ExperienceMediaRowInput,
} from "@/lib/experience-media";
import { useParams } from "next/navigation";
import {
  ArrowUpRight,
  Award,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Globe,
  MapPin,
  Sparkles,
  UserRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "../../components/Navbar";

type ExperienceListRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  price_amount: number | null;
  currency: string;
  duration_minutes: number | null;
  categories: { name: string } | { name: string }[] | null;
  experience_locations:
    | { city: string | null; country_region: string | null }
    | { city: string | null; country_region: string | null }[]
    | null;
};

type MediaRow = {
  experience_id: string;
  storage_path: string;
  sort_order: number;
  media_type?: string | null;
};

type HostProfileRow = {
  headline: string | null;
  expertise: string | null;
  years_experience: number | null;
  career_highlight: string | null;
  highlight_story: string | null;
  verification_status: string | null;
};

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  avatar_path: string | null;
  bio: string | null;
  city: string | null;
  country_code: string | null;
};

type HostSocialRow = {
  id: string;
  url: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&h=400&fit=crop";

function isSafeImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return [
      "images.unsplash.com",
      "images.pexels.com",
      "omeztanuxcfpmnpenicd.supabase.co",
    ].includes(url.hostname);
  } catch {
    return value.startsWith("/");
  }
}

function publicStorageUrl(bucket: string, path?: string | null): string | null {
  const value = path?.trim();
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return isSafeImageUrl(value) ? value : null;
  }
  return supabase.storage.from(bucket).getPublicUrl(value).data.publicUrl;
}

function normalizeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function socialLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (hostname.includes("linkedin")) return "LinkedIn";
    if (hostname.includes("instagram")) return "Instagram";
    if (hostname.includes("twitter") || hostname.includes("x.com")) return "X";
    if (hostname.includes("youtube")) return "YouTube";
    if (hostname.includes("facebook")) return "Facebook";
    return hostname;
  } catch {
    return "Website";
  }
}

function formatPrice(amount: number | null, currency: string) {
  if (!amount || amount <= 0) return "Price on request";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function pickLocationRow(row: ExperienceListRow): { city: string | null; country_region: string | null } | null {
  const loc = row.experience_locations;
  if (!loc) return null;
  if (Array.isArray(loc)) return loc[0] ?? null;
  return loc;
}

function locationLabel(row: ExperienceListRow): string {
  const loc = pickLocationRow(row);
  if (!loc) return "";
  if (loc.city && loc.country_region) return `${loc.city}, ${loc.country_region}`;
  return loc.city || loc.country_region || "";
}

function pickCategory(row: ExperienceListRow): string | null {
  const cat = row.categories;
  if (!cat) return null;
  if (Array.isArray(cat)) return cat[0]?.name ?? null;
  return cat.name;
}

export default function HostProfilePage() {
  const params = useParams<{ hostId: string }>();
  const hostId = params?.hostId ?? "";

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hostProfile, setHostProfile] = useState<HostProfileRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [socialLinks, setSocialLinks] = useState<HostSocialRow[]>([]);
  const [experiences, setExperiences] = useState<ExperienceListRow[]>([]);
  const [coverByExperienceId, setCoverByExperienceId] = useState<
    Record<string, ExperienceMediaItem>
  >({});

  const isInvalidHost = useMemo(() => !hostId || !UUID_RE.test(hostId), [hostId]);

  useEffect(() => {
    if (isInvalidHost) return;

    let mounted = true;

    const load = async () => {
      setLoading(true);
      setNotFound(false);

      const [
        { data: expRows, error: expError },
        { data: hostRow, error: hostError },
        { data: profileRow },
        { data: socialRows },
      ] = await Promise.all([
        supabase
          .from("experiences")
          .select(
            "id,title,subtitle,description,price_amount,currency,duration_minutes,categories(name),experience_locations(city,country_region)",
          )
          .eq("host_user_id", hostId)
          .eq("status", "published")
          .order("created_at", { ascending: false }),
        supabase
          .from("host_profiles")
          .select(
            "headline,expertise,years_experience,career_highlight,highlight_story,verification_status",
          )
          .eq("user_id", hostId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("first_name,last_name,avatar_path,bio,city,country_code")
          .eq("user_id", hostId)
          .maybeSingle(),
        supabase.from("host_social_links").select("id,url").eq("host_user_id", hostId).limit(8),
      ]);

      if (!mounted) return;

      if (expError || hostError || !hostRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const rows = (expRows ?? []) as unknown as ExperienceListRow[];
      setExperiences(rows);
      setHostProfile(hostRow as HostProfileRow);
      setProfile((profileRow ?? null) as ProfileRow | null);
      setSocialLinks((socialRows ?? []) as HostSocialRow[]);

      const ids = rows.map((r) => r.id);
      const { data: mediaRows } =
        ids.length > 0
          ? await supabase
              .from("experience_media")
              .select("experience_id,storage_path,sort_order,media_type")
              .in("experience_id", ids)
              .order("sort_order", { ascending: true })
          : { data: [] as MediaRow[] };

      if (!mounted) return;

      setCoverByExperienceId(
        buildCoverByExperienceId(supabase, (mediaRows ?? []) as ExperienceMediaRowInput[]),
      );
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [hostId, isInvalidHost]);

  const bannerImage = useMemo(() => {
    const first = experiences[0];
    if (!first) return FALLBACK_COVER;
    return coverByExperienceId[first.id]?.url ?? FALLBACK_COVER;
  }, [coverByExperienceId, experiences]);

  if (isInvalidHost) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 pt-24 pb-16 sm:px-6">
          <h1 className="text-2xl font-semibold">Invalid profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">This link is not valid.</p>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "default" }),
              "mt-6 rounded-full bg-orange-500 text-white hover:bg-orange-600",
            )}
          >
            Back home
          </Link>
        </main>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 pt-24 pb-16 sm:px-6">
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </main>
      </>
    );
  }

  if (notFound || !hostProfile) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 pt-24 pb-16 sm:px-6">
          <h1 className="text-2xl font-semibold">Expert not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This profile is unavailable or has not been activated yet.
          </p>
          <Link
            href="/experiences"
            className={cn(
              buttonVariants({ variant: "default" }),
              "mt-6 rounded-full bg-orange-500 text-white hover:bg-orange-600",
            )}
          >
            Browse experiences
          </Link>
        </main>
      </>
    );
  }

  const profileName =
    `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "Gozuru Expert";
  const headline =
    hostProfile.headline?.trim() ||
    hostProfile.career_highlight?.trim() ||
    "Local expert on Gozuru";
  const aboutText =
    profile?.bio?.trim() ||
    hostProfile.highlight_story?.trim() ||
    hostProfile.expertise?.trim() ||
    "Passionate about sharing authentic local knowledge through immersive, host-led experiences.";
  const expertiseText = hostProfile.expertise?.trim();
  const careerHighlight = hostProfile.career_highlight?.trim();
  const highlightStory = hostProfile.highlight_story?.trim();
  const yearsExperience =
    typeof hostProfile.years_experience === "number" && hostProfile.years_experience > 0
      ? hostProfile.years_experience
      : null;
  const experienceLocations = [
    ...new Set(experiences.map((exp) => locationLabel(exp)).filter(Boolean)),
  ];
  const profileLocation = [profile?.city, profile?.country_code].filter(Boolean).join(", ");
  const primaryLocation =
    profileLocation || experienceLocations[0] || "Available globally";
  const isVerified = hostProfile.verification_status === "approved";
  const avatarUrl = publicStorageUrl("avatars", profile?.avatar_path);
  const focusAreas = (expertiseText || aboutText)
    .split(/[,.\n]/)
    .map((token) => token.trim())
    .filter((token) => token.length > 3)
    .slice(0, 6);
  const safeSocialLinks = socialLinks
    .map((social) => ({
      ...social,
      url: normalizeExternalUrl(social.url),
    }))
    .filter((social): social is HostSocialRow & { url: string } => Boolean(social.url));

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-24 sm:px-6">
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400">
            Home
          </Link>
          <span>/</span>
          <Link href="/experiences" className="font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400">
            Experts
          </Link>
          <span>/</span>
          <span className="line-clamp-1 text-foreground">{profileName}</span>
        </nav>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="relative h-32 bg-muted sm:h-40 md:h-48">
            <Image
              src={bannerImage}
              alt=""
              fill
              unoptimized
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1024px"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/50 via-slate-900/20 to-transparent" />
          </div>

          <div className="relative px-4 pb-5 sm:px-6 sm:pb-6">
            <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="relative size-24 shrink-0 overflow-hidden rounded-full border-4 border-card bg-muted shadow-md sm:size-28">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={profileName}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="112px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-800">
                      <UserRound className="size-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                      {profileName}
                    </h1>
                    {isVerified ? (
                      <Badge className="rounded-full bg-emerald-600 text-white hover:bg-emerald-600">
                        <CheckCircle2 className="mr-1 size-3" />
                        Verified
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-base font-medium text-foreground/90">{headline}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5 shrink-0" />
                      {primaryLocation}
                    </span>
                    {yearsExperience ? (
                      <span className="inline-flex items-center gap-1">
                        <BriefcaseBusiness className="size-3.5 shrink-0" />
                        {yearsExperience}+ years experience
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>

              <Link
                href="/experiences"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "inline-flex shrink-0 items-center justify-center rounded-full border-2 border-orange-700 bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-orange-700 dark:border-orange-500 dark:bg-orange-500 dark:hover:bg-orange-400",
                )}
              >
                Browse experiences
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="space-y-6">
            <Card className="rounded-xl border border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
                <p>{aboutText}</p>
                {highlightStory && highlightStory !== aboutText ? (
                  <p>{highlightStory}</p>
                ) : null}
                {expertiseText && expertiseText !== aboutText ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                      Expertise
                    </p>
                    <p>{expertiseText}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {careerHighlight ? (
              <Card className="rounded-xl border border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Award className="size-5 text-orange-500" />
                    Career highlight
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-7 text-muted-foreground">{careerHighlight}</p>
                </CardContent>
              </Card>
            ) : null}

            <section>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">Experience portfolio</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Published offerings you can book directly on Gozuru.
                  </p>
                </div>
                <Badge variant="outline" className="rounded-full">
                  {experiences.length} live
                </Badge>
              </div>

              {experiences.length === 0 ? (
                <Card className="rounded-xl border border-dashed border-border">
                  <CardContent className="p-8 text-center">
                    <Sparkles className="mx-auto size-8 text-muted-foreground/70" />
                    <p className="mt-3 font-medium text-foreground">Portfolio coming soon</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      This expert is building their public offerings. Check back for new experiences.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {experiences.map((exp) => {
                    const coverMedia = coverByExperienceId[exp.id];
                    const loc = locationLabel(exp);
                    const category = pickCategory(exp);
                    const hours = exp.duration_minutes
                      ? Math.max(1, Math.round(exp.duration_minutes / 60))
                      : null;

                    return (
                      <Link key={exp.id} href={`/experiences/${exp.id}`} className="group block">
                        <Card className="overflow-hidden rounded-xl border border-border transition hover:border-orange-300 hover:shadow-md dark:hover:border-orange-500/40">
                          <div className="grid gap-0 sm:grid-cols-[220px_minmax(0,1fr)]">
                            <div className="relative aspect-[16/10] bg-muted sm:aspect-auto sm:min-h-[148px]">
                              <ExperienceMediaDisplay
                                media={coverMedia}
                                alt={exp.title}
                                fill
                                sizes="220px"
                                videoAutoplay
                                showVideoBadge={false}
                                emptyLabel="No media"
                              />
                            </div>
                            <CardContent className="flex flex-col justify-center p-4 sm:p-5">
                              <div className="flex flex-wrap items-center gap-2">
                                {category ? (
                                  <Badge variant="secondary" className="rounded-full text-[11px]">
                                    {category}
                                  </Badge>
                                ) : null}
                                <span className="text-xs text-muted-foreground">
                                  {formatPrice(exp.price_amount, exp.currency)}
                                  {hours ? ` · ${hours}h` : ""}
                                </span>
                              </div>
                              <h3 className="mt-2 text-base font-semibold text-foreground group-hover:text-orange-700 dark:group-hover:text-orange-300">
                                {exp.title}
                              </h3>
                              <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                                {exp.description || exp.subtitle || "Host-led experience on Gozuru."}
                              </p>
                              {loc ? (
                                <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="size-3.5" />
                                  {loc}
                                </p>
                              ) : null}
                            </CardContent>
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <Card className="rounded-xl border border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Profile highlights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <BriefcaseBusiness className="mt-0.5 size-4 shrink-0 text-orange-500" />
                  <div>
                    <p className="font-medium text-foreground">Experience</p>
                    <p className="text-muted-foreground">
                      {yearsExperience ? `${yearsExperience}+ years in the field` : "Professional host"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-orange-500" />
                  <div>
                    <p className="font-medium text-foreground">Location</p>
                    <p className="text-muted-foreground">{primaryLocation}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 size-4 shrink-0 text-orange-500" />
                  <div>
                    <p className="font-medium text-foreground">Live offerings</p>
                    <p className="text-muted-foreground">
                      {experiences.length} published experience{experiences.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                {experienceLocations.length > 1 ? (
                  <div className="flex items-start gap-3">
                    <Globe className="mt-0.5 size-4 shrink-0 text-orange-500" />
                    <div>
                      <p className="font-medium text-foreground">Also hosts in</p>
                      <p className="text-muted-foreground">{experienceLocations.slice(1, 4).join(" · ")}</p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {focusAreas.length > 0 ? (
              <Card className="rounded-xl border border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Focus areas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {focusAreas.map((area) => (
                      <Badge key={area} variant="secondary" className="rounded-full font-normal">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {safeSocialLinks.length > 0 ? (
              <Card className="rounded-xl border border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Online presence</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {safeSocialLinks.map((social) => (
                    <a
                      key={social.id}
                      href={social.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-foreground transition hover:border-orange-300 hover:bg-orange-50/50 dark:hover:border-orange-500/40 dark:hover:bg-orange-950/20"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Globe className="size-4 text-muted-foreground" />
                        {socialLabel(social.url)}
                      </span>
                      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                    </a>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </aside>
        </div>
      </main>
    </>
  );
}

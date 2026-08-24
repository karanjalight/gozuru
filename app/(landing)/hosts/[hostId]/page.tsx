"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildCoverByExperienceId,
  type ExperienceMediaItem,
  type ExperienceMediaRowInput,
} from "@/lib/experience-media";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HostProfilePortfolio } from "../../components/HostProfilePortfolio";
import { HostProfilePortfolioSkeleton } from "../../components/LoadingSkeletons";
import { Navbar } from "../../components/Navbar";

type ExperienceListRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  price_amount: number | null;
  currency: string;
  duration_minutes: number | null;
  max_guests: number | null;
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

function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <Navbar />
      <main className={cn("pt-16", className)}>{children}</main>
    </>
  );
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
            "id,title,subtitle,description,price_amount,currency,duration_minutes,max_guests,categories(name),experience_locations(city,country_region)",
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
      <PageShell className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <h1 className="pt-8 text-2xl font-semibold">Invalid profile</h1>
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
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell>
        <HostProfilePortfolioSkeleton />
      </PageShell>
    );
  }

  if (notFound || !hostProfile) {
    return (
      <PageShell className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <h1 className="pt-8 text-2xl font-semibold">Expert not found</h1>
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
      </PageShell>
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
    .map((social) => {
      const url = normalizeExternalUrl(social.url);
      if (!url) return null;
      return { id: social.id, url, label: socialLabel(url) };
    })
    .filter((social): social is { id: string; url: string; label: string } => Boolean(social));

  const portfolioExperiences = experiences.map((exp) => ({
    id: exp.id,
    title: exp.title,
    subtitle: exp.subtitle,
    description: exp.description,
    price_amount: exp.price_amount,
    currency: exp.currency,
    duration_minutes: exp.duration_minutes,
    max_guests: exp.max_guests,
    category: pickCategory(exp),
    location: locationLabel(exp),
    coverMedia: coverByExperienceId[exp.id],
  }));

  return (
    <PageShell>
      <HostProfilePortfolio
        profileName={profileName}
        headline={headline}
        aboutText={aboutText}
        expertiseText={expertiseText}
        careerHighlight={careerHighlight}
        highlightStory={highlightStory}
        primaryLocation={primaryLocation}
        yearsExperience={yearsExperience}
        isVerified={isVerified}
        avatarUrl={avatarUrl}
        bannerImage={bannerImage}
        experiences={portfolioExperiences}
        focusAreas={focusAreas}
        socialLinks={safeSocialLinks}
      />
    </PageShell>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowUpRight, BriefcaseBusiness, Globe, MapPin, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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
};

type HostProfileRow = {
  headline: string | null;
  expertise: string | null;
  years_experience: number | null;
  career_highlight: string | null;
  highlight_story: string | null;
};

type HostSocialRow = {
  id: string;
  url: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export default function HostProfilePage() {
  const params = useParams<{ hostId: string }>();
  const hostId = params?.hostId ?? "";

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hostProfile, setHostProfile] = useState<HostProfileRow | null>(null);
  const [socialLinks, setSocialLinks] = useState<HostSocialRow[]>([]);
  const [experiences, setExperiences] = useState<ExperienceListRow[]>([]);
  const [coverByExperienceId, setCoverByExperienceId] = useState<Record<string, string>>({});

  const isInvalidHost = useMemo(() => !hostId || !UUID_RE.test(hostId), [hostId]);

  useEffect(() => {
    if (isInvalidHost) {
      return;
    }

    let mounted = true;

    const load = async () => {
      setLoading(true);
      setNotFound(false);

      const [{ data: expRows, error: expError }, { data: hostRow }, { data: socialRows }] = await Promise.all([
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
          .select("headline,expertise,years_experience,career_highlight,highlight_story")
          .eq("user_id", hostId)
          .maybeSingle(),
        supabase.from("host_social_links").select("id,url").eq("host_user_id", hostId).limit(6),
      ]);

      if (!mounted) return;

      if (expError || !hostRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const rows = (expRows ?? []) as unknown as ExperienceListRow[];
      setExperiences(rows);
      setHostProfile(hostRow as HostProfileRow);
      setSocialLinks((socialRows ?? []) as HostSocialRow[]);

      const ids = rows.map((r) => r.id);
      const { data: mediaRows } =
        ids.length > 0
          ? await supabase
              .from("experience_media")
              .select("experience_id,storage_path,sort_order")
              .in("experience_id", ids)
              .order("sort_order", { ascending: true })
          : { data: [] as MediaRow[] };

      if (!mounted) return;

      const map: Record<string, string> = {};
      for (const m of (mediaRows ?? []) as MediaRow[]) {
        if (map[m.experience_id]) continue;
        const {
          data: { publicUrl },
        } = supabase.storage.from("experience-media").getPublicUrl(m.storage_path);
        map[m.experience_id] = publicUrl;
      }
      setCoverByExperienceId(map);
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [hostId, isInvalidHost]);

  const heroCover = useMemo(() => {
    const first = experiences[0];
    if (!first) return null;
    return coverByExperienceId[first.id] ?? null;
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

  const displayTitle =
    hostProfile.headline?.trim() ||
    hostProfile.career_highlight?.trim() ||
    "Expert on Gozuru";
  const profileStatement =
    hostProfile.expertise?.trim() ||
    hostProfile.highlight_story?.trim() ||
    "Shares practical local knowledge and host-led experiences.";
  const yearsExperience =
    typeof hostProfile.years_experience === "number" && hostProfile.years_experience > 0
      ? `${hostProfile.years_experience}+ years experience`
      : "Experienced host";
  const primaryLocation = experiences.length > 0 ? locationLabel(experiences[0]) : "Global";
  const focusAreas = profileStatement
    .split(/[,.]/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
    .slice(0, 4);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6">
        <div className="mb-6">
          <Link href="/" className="text-sm font-medium text-orange-500 hover:text-orange-600">
            Home
          </Link>
          <span className="text-muted-foreground"> / </span>
          <Link href="/experiences" className="text-sm font-medium text-orange-500 hover:text-orange-600">
            Experts
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="relative aspect-[21/9] w-full bg-muted md:aspect-[3/1]">
            {heroCover ? (
              <Image src={heroCover} alt={displayTitle} fill className="object-cover" priority />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                No cover image
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white md:p-8">
              <p className="text-xs uppercase tracking-[0.2em] text-white/80">Expert Portfolio</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-4xl">{displayTitle}</h1>
              <p className="mt-2 max-w-3xl text-sm text-white/90 md:text-base">{profileStatement}</p>
            </div>
          </div>
        </div>

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          <Card className="rounded-2xl border-2 border-border md:col-span-2">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold tracking-tight">About this expert</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{profileStatement}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {(focusAreas.length > 0 ? focusAreas : ["Local guidance", "Learning by doing"]).map(
                  (area) => (
                    <Badge key={area} variant="secondary" className="rounded-full">
                      {area}
                    </Badge>
                  ),
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-2 border-border">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <BriefcaseBusiness className="size-4" />
                {yearsExperience}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4" />
                {primaryLocation || "Global"}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="size-4" />
                {experiences.length} published experience{experiences.length === 1 ? "" : "s"}
              </div>
              {socialLinks.length > 0 ? (
                <div className="pt-2">
                  <p className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">On the web</p>
                  <div className="space-y-2">
                    {socialLinks.map((social) => (
                      <a
                        key={social.id}
                        href={social.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm text-foreground transition hover:bg-muted"
                      >
                        <span className="truncate">{social.url}</span>
                        <ArrowUpRight className="size-4 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="size-4" />
                  Social links will appear here
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <h2 className="mt-10 text-xl font-semibold tracking-tight">Featured work on Gozuru</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Explore this expert&apos;s live experiences and book a session.
        </p>

        {experiences.length === 0 ? (
          <Card className="mt-6 rounded-2xl border-2 border-dashed border-border">
            <CardContent className="p-8 text-center">
              <p className="font-medium text-foreground">No published experiences yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                This expert has completed profile setup and will publish offerings soon.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((exp) => {
              const cover = coverByExperienceId[exp.id];
              const loc = locationLabel(exp);
              const hours = exp.duration_minutes
                ? Math.max(1, Math.round(exp.duration_minutes / 60))
                : null;
              return (
                <Link key={exp.id} href={`/experiences/${exp.id}`} className="block">
                  <Card className="h-full overflow-hidden rounded-2xl border-2 border-border transition hover:border-orange-200 hover:shadow-lg">
                    <div className="relative aspect-[4/3] bg-muted">
                      {cover ? (
                        <Image
                          src={cover}
                          alt={exp.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <p className="line-clamp-2 font-semibold text-foreground">{exp.title}</p>
                      {exp.subtitle ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{exp.subtitle}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {loc ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" />
                            {loc}
                          </span>
                        ) : null}
                        {hours ? <span>{hours}h</span> : null}
                        <span className="font-medium text-foreground">
                          {formatPrice(exp.price_amount, exp.currency)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

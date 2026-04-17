"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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
  const [headline, setHeadline] = useState<string | null>(null);
  const [expertise, setExpertise] = useState<string | null>(null);
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

      const [{ data: expRows, error: expError }, { data: hostRow }] = await Promise.all([
        supabase
          .from("experiences")
          .select(
            "id,title,subtitle,description,price_amount,currency,duration_minutes,categories(name),experience_locations(city,country_region)",
          )
          .eq("host_user_id", hostId)
          .eq("status", "published")
          .order("created_at", { ascending: false }),
        supabase.from("host_profiles").select("headline,expertise").eq("user_id", hostId).maybeSingle(),
      ]);

      if (!mounted) return;

      if (expError) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const rows = (expRows ?? []) as unknown as ExperienceListRow[];
      if (rows.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setExperiences(rows);
      setHeadline(hostRow?.headline ?? null);
      setExpertise(hostRow?.expertise ?? null);

      const ids = rows.map((r) => r.id);
      const { data: mediaRows } = await supabase
        .from("experience_media")
        .select("experience_id,storage_path,sort_order")
        .in("experience_id", ids)
        .order("sort_order", { ascending: true });

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

  if (notFound || experiences.length === 0) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 pt-24 pb-16 sm:px-6">
          <h1 className="text-2xl font-semibold">Host not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This host has no published experiences yet, or the profile is unavailable.
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

  const displayTitle = headline?.trim() || experiences[0]?.title || "Host on Gozuru";

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
            Experiences
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
              <h1 className="text-2xl font-bold tracking-tight md:text-4xl">{displayTitle}</h1>
              {expertise ? (
                <p className="mt-2 max-w-3xl text-sm text-white/90 md:text-base">{expertise}</p>
              ) : null}
            </div>
          </div>
        </div>

        <h2 className="mt-10 text-xl font-semibold tracking-tight">Published experiences</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Experiences this host offers on Gozuru.
        </p>

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
      </main>
    </>
  );
}

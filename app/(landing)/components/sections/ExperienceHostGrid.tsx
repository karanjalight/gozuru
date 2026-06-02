"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { Section } from "./Section";
import { ExpertCard } from "./ExpertCard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Expert } from "../../lib/data";

type ExperienceRow = {
  id: string;
  host_user_id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  categories: { name: string } | { name: string }[] | null;
  experience_locations:
    | { city: string | null; country_region: string | null }
    | { city: string | null; country_region: string | null }[]
    | null;
};

type HostProfileRow = {
  user_id: string;
  headline: string | null;
  expertise: string | null;
  years_experience: number | null;
  career_highlight: string | null;
  highlight_story: string | null;
};

type ProfileRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  city: string | null;
  country_code: string | null;
  avatar_path: string | null;
};

type MediaRow = {
  experience_id: string;
  storage_path: string;
  sort_order: number;
  media_type: string;
};

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop";

function isSupportedImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return [
      "images.unsplash.com",
      "images.pexels.com",
      "omeztanuxcfpmnpenicd.supabase.co",
    ].includes(url.hostname);
  } catch {
    return false;
  }
}

function pickLocation(row: ExperienceRow): { city: string | null; country_region: string | null } | null {
  const loc = row.experience_locations;
  if (!loc) return null;
  if (Array.isArray(loc)) return loc[0] ?? null;
  return loc;
}

function pickCategoryName(row: ExperienceRow): string | undefined {
  const c = row.categories;
  if (!c) return undefined;
  if (Array.isArray(c)) return c[0]?.name;
  return c.name;
}

function locationLabel(row: ExperienceRow): string {
  const loc = pickLocation(row);
  if (!loc) return "Gozuru";
  if (loc.city && loc.country_region) return `${loc.city}, ${loc.country_region}`;
  return loc.city || loc.country_region || "Gozuru";
}

function mapToExpert(
  hostId: string,
  host: HostProfileRow | undefined,
  profile: ProfileRow | undefined,
  row: ExperienceRow | undefined,
  coverUrl: string,
): Expert {
  const yearsLabel =
    typeof host?.years_experience === "number" && host.years_experience > 0
      ? `${host.years_experience}+ yrs`
      : undefined;
  const categoryName = row ? pickCategoryName(row) : undefined;

  const firstName = profile?.first_name?.trim();
  const lastName = profile?.last_name?.trim();
  const fullName =
    firstName && lastName
      ? `${firstName} ${lastName}`
      : firstName || lastName || null;

  const name =
    fullName ||
    "Expert";

  const titleLine =
    host?.expertise?.trim()?.slice(0, 80) ||
    row?.subtitle?.trim() ||
    host?.headline?.trim()?.slice(0, 80) ||
    host?.career_highlight?.trim()?.slice(0, 80) ||
    (categoryName ? `${categoryName} expert` : "Expert");

  const shortBio =
    profile?.bio?.trim() ||
    host?.highlight_story?.trim() ||
    host?.expertise?.trim() ||
    row?.description?.trim()?.slice(0, 160) ||
    "Host-led experiences on Gozuru.";

  const locationStr =
    profile?.city?.trim() ||
    (row ? locationLabel(row) : null) ||
    "Global";

  const tags = categoryName
    ? [categoryName, yearsLabel ?? "Host", "Local"]
    : [yearsLabel ?? "Host", "Local", "Experiences"];

  return {
    id: hostId,
    name,
    title: titleLine,
    location: locationStr,
    image: coverUrl || PLACEHOLDER_IMAGE,
    rating: 5,
    reviewCount: 0,
    tags: tags.slice(0, 3),
    shortBio,
  };
}

export function ExperienceHostGrid() {
  const [items, setItems] = useState<Expert[]>([]);
  const [linkHrefs, setLinkHrefs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: hostRows, error: hostError } = await supabase
        .from("host_profiles")
        .select("user_id,headline,expertise,years_experience,career_highlight,highlight_story")
        .order("created_at", { ascending: false })
        .limit(6);

      if (!mounted) return;

      if (hostError || !hostRows?.length) {
        setItems([]);
        setLinkHrefs({});
        setLoading(false);
        return;
      }

      const profiles = hostRows as HostProfileRow[];
      const hostIds = profiles.map((h) => h.user_id);

      const { data: rows } = await supabase
        .from("experiences")
        .select(
          "id,host_user_id,title,subtitle,description,categories(name),experience_locations(city,country_region)",
        )
        .in("host_user_id", hostIds)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      const experienceIds = ((rows ?? []) as ExperienceRow[]).map((row) => row.id);
      const { data: mediaRows } =
        experienceIds.length > 0
          ? await supabase
              .from("experience_media")
              .select("experience_id,storage_path,sort_order,media_type")
              .in("experience_id", experienceIds)
              .order("sort_order", { ascending: true })
          : { data: [] as MediaRow[] };

      const { data: profileRows } = await supabase
        .from("profiles")
        .select("user_id,first_name,last_name,bio,city,country_code,avatar_path")
        .in("user_id", hostIds);

      if (!mounted) return;

      const mediaList = (mediaRows ?? []) as MediaRow[];
      const profileByHost: Record<string, ProfileRow> = {};
      const avatarByHost: Record<string, string> = {};
      for (const row of (profileRows ?? []) as ProfileRow[]) {
        profileByHost[row.user_id] = row;
        const path = row.avatar_path?.trim();
        if (!path) continue;
        if (path.startsWith("http://") || path.startsWith("https://")) {
          if (isSupportedImageUrl(path)) {
            avatarByHost[row.user_id] = path;
          }
          continue;
        }
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarByHost[row.user_id] = publicUrl;
      }

      const coverByExp: Record<string, string> = {};
      for (const m of mediaList) {
        if (m.media_type !== "image") continue;
        if (coverByExp[m.experience_id]) continue;
        const {
          data: { publicUrl },
        } = supabase.storage.from("experience-media").getPublicUrl(m.storage_path);
        coverByExp[m.experience_id] = publicUrl;
      }

      const latestExperienceByHost = new Map<string, ExperienceRow>();
      for (const row of (rows ?? []) as ExperienceRow[]) {
        if (latestExperienceByHost.has(row.host_user_id)) continue;
        latestExperienceByHost.set(row.host_user_id, row);
      }

      const hrefs: Record<string, string> = {};
      const nextExperts: Expert[] = profiles.map((host) => {
        const row = latestExperienceByHost.get(host.user_id);
        hrefs[host.user_id] = `/hosts/${host.user_id}`;
        const avatar = avatarByHost[host.user_id];
        const cover = row ? coverByExp[row.id] || PLACEHOLDER_IMAGE : PLACEHOLDER_IMAGE;
        const image = avatar || cover;
        const profile = profileByHost[host.user_id];
        return mapToExpert(host.user_id, host, profile, row, image);
      });

      setItems(nextExperts);
      setLinkHrefs(hrefs);
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Section id="experts" className="scroll-mt-20">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl [font-family:var(--font-heading)]">
            Meet our experts
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-muted-foreground">
            Meet real hosts who list experiences on Gozuru—then discover, book, and learn from
            people who live what they know.
          </p>
        </div>
        {loading ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[420px] animate-pulse rounded-2xl border border-border bg-muted"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
            <p className="text-sm font-medium text-foreground">No published host profiles yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              When hosts publish experiences, their profiles appear here. Explore the catalog or create your own listing.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/experiences"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "rounded-full bg-orange-500 text-white hover:bg-orange-600",
                )}
              >
                Browse experiences
              </Link>
              <Link
                href="/auth/signup"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "rounded-full bg-orange-500 text-white hover:bg-orange-600",
                )}
              >
                Become a host
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((expert, i) => (
              <ExpertCard
                key={expert.id}
                expert={expert}
                index={i}
                linkHref={linkHrefs[expert.id]}
              />
            ))}
          </div>
        )}
        <div className="mt-12 text-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <motion.a
              href="/experiences"
              className="inline-flex items-center justify-center rounded-full border-2 border-border bg-background px-8 py-3 text-sm font-medium text-foreground  transition-all duration-300 hover:scale-[1.03] hover:border-foreground/20 hover:shadow-md"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              Explore Experts
            </motion.a>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center rounded-full border-2 border-border bg-orange-500 px-8 py-3 text-sm font-medium text-white  transition-all duration-300 hover:scale-[1.03] hover:border-foreground/20 hover:shadow-md"

            >
              Become a host
            </Link>
          </div>
        </div>
      </motion.div>
    </Section>
  );
}

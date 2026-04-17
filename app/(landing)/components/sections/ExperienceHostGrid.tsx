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
  career_highlight: string | null;
  highlight_story: string | null;
};

type MediaRow = {
  experience_id: string;
  storage_path: string;
  sort_order: number;
  media_type: string;
};

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop";

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
  row: ExperienceRow,
  coverUrl: string,
  hostById: Map<string, HostProfileRow>,
): Expert {
  const host = hostById.get(row.host_user_id);
  const categoryName = pickCategoryName(row);
  const name =
    host?.headline?.trim() ||
    host?.career_highlight?.trim() ||
    row.title ||
    "Experience host";
  const titleLine =
    host?.expertise?.trim()?.slice(0, 80) ||
    row.subtitle ||
    row.title ||
    "Local experiences";
  const shortBio =
    host?.expertise?.trim() ||
    host?.highlight_story?.trim() ||
    row.description?.trim()?.slice(0, 160) ||
    "Host-led experiences on Gozuru.";
  const tags = categoryName ? [categoryName, "Host", "Local"] : ["Host", "Local", "Experiences"];

  return {
    id: row.host_user_id,
    name,
    title: titleLine,
    location: locationLabel(row),
    image: coverUrl || PLACEHOLDER_IMAGE,
    rating: 5,
    reviewCount: 0,
    tags: tags.slice(0, 3),
    shortBio,
    // stash count for optional future use — Expert type has no count; we encode in reviewCount as hack? No.
    // Keep Expert shape strict; omit count from card or add to shortBio
  };
}

export function ExperienceHostGrid() {
  const [items, setItems] = useState<Expert[]>([]);
  const [linkHrefs, setLinkHrefs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: rows, error } = await supabase
        .from("experiences")
        .select(
          "id,host_user_id,title,subtitle,description,categories(name),experience_locations(city,country_region)",
        )
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error || !rows?.length) {
        setItems([]);
        setLinkHrefs({});
        setLoading(false);
        return;
      }

      const list = rows as unknown as ExperienceRow[];
      const seenHost = new Set<string>();
      const featured: ExperienceRow[] = [];
      for (const row of list) {
        if (seenHost.has(row.host_user_id)) continue;
        seenHost.add(row.host_user_id);
        featured.push(row);
        if (featured.length >= 6) break;
      }

      const experienceIds = featured.map((r) => r.id);
      const hostIds = featured.map((r) => r.host_user_id);

      const [{ data: mediaRows }, { data: hostProfiles }] = await Promise.all([
        supabase
          .from("experience_media")
          .select("experience_id,storage_path,sort_order,media_type")
          .in("experience_id", experienceIds)
          .order("sort_order", { ascending: true }),
        supabase
          .from("host_profiles")
          .select("user_id,headline,expertise,career_highlight,highlight_story")
          .in("user_id", hostIds),
      ]);

      if (!mounted) return;

      const mediaList = (mediaRows ?? []) as MediaRow[];
      const coverByExp: Record<string, string> = {};
      for (const m of mediaList) {
        if (m.media_type !== "image") continue;
        if (coverByExp[m.experience_id]) continue;
        const {
          data: { publicUrl },
        } = supabase.storage.from("experience-media").getPublicUrl(m.storage_path);
        coverByExp[m.experience_id] = publicUrl;
      }

      const hostById = new Map<string, HostProfileRow>();
      for (const h of (hostProfiles ?? []) as HostProfileRow[]) {
        hostById.set(h.user_id, h);
      }

      const hrefs: Record<string, string> = {};
      const nextExperts: Expert[] = featured.map((row) => {
        hrefs[row.host_user_id] = `/hosts/${row.host_user_id}`;
        const cover = coverByExp[row.id] || PLACEHOLDER_IMAGE;
        return mapToExpert(row, cover, hostById);
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
            How Gozuru Works
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
                className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
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
          <motion.a
            href="/experiences"
            className="inline-flex items-center justify-center rounded-full border-2 border-border bg-background px-8 py-3 text-sm font-medium text-foreground shadow-sm transition-all duration-300 hover:scale-[1.03] hover:border-foreground/20 hover:shadow-md"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            Explore Experts
          </motion.a>
        </div>
      </motion.div>
    </Section>
  );
}

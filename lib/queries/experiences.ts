import {
  buildCoverByExperienceId,
  type ExperienceMediaItem,
  type ExperienceMediaRowInput,
} from "@/lib/experience-media";
import { supabase } from "@/lib/supabase/client";

export type ExperienceCategory = {
  name: string;
  slug: string;
};

export type ExperienceRow = {
  id: string;
  title: string;
  description: string | null;
  subtitle: string | null;
  duration_minutes: number | null;
  max_guests: number | null;
  price_amount: number | null;
  currency: string;
  meeting_point_name: string | null;
  created_at: string;
  categories: ExperienceCategory | ExperienceCategory[] | null;
};

export function pickExperienceCategory(
  categories: ExperienceRow["categories"],
): ExperienceCategory | null {
  if (!categories) return null;
  if (Array.isArray(categories)) return categories[0] ?? null;
  return categories;
}

type ExperienceLocationRow = {
  experience_id: string;
  city: string | null;
  country_region: string | null;
};

export const listImageTransform = {
  width: 720,
  height: 960,
  quality: 70,
} as const;

export const featuredImageTransform = {
  width: 720,
  height: 480,
  quality: 72,
} as const;

export type LandingExperiencesResult = {
  experiences: ExperienceRow[];
  coverByExperienceId: Record<string, ExperienceMediaItem>;
  locationByExperienceId: Record<string, string>;
};

export async function fetchLandingExperiences(limit: number, transform: { width: number; height: number; quality: number }) {
  const { data: rows, error } = await supabase
    .from("experiences")
    .select(
      "id,title,description,subtitle,duration_minutes,max_guests,price_amount,currency,meeting_point_name,created_at,categories(name,slug)",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const experienceRows = (rows ?? []) as ExperienceRow[];
  if (experienceRows.length === 0) {
    return {
      experiences: [],
      coverByExperienceId: {} as Record<string, ExperienceMediaItem>,
      locationByExperienceId: {} as Record<string, string>,
    };
  }

  const ids = experienceRows.map((row) => row.id);
  const [{ data: mediaRows }, { data: locationRows }] = await Promise.all([
    supabase
      .from("experience_media")
      .select("experience_id,storage_path,sort_order,media_type")
      .in("experience_id", ids)
      .order("sort_order", { ascending: true }),
    supabase
      .from("experience_locations")
      .select("experience_id,city,country_region")
      .in("experience_id", ids),
  ]);

  const coverByExperienceId = buildCoverByExperienceId(
    supabase,
    (mediaRows ?? []) as ExperienceMediaRowInput[],
    transform,
  );

  const locationByExperienceId: Record<string, string> = {};
  for (const location of (locationRows ?? []) as ExperienceLocationRow[]) {
    if (location.city && location.country_region) {
      locationByExperienceId[location.experience_id] = `${location.city}, ${location.country_region}`;
    } else if (location.city) {
      locationByExperienceId[location.experience_id] = location.city;
    } else if (location.country_region) {
      locationByExperienceId[location.experience_id] = location.country_region;
    }
  }

  return {
    experiences: experienceRows,
    coverByExperienceId,
    locationByExperienceId,
  };
}


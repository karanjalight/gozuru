import { supabase } from "@/lib/supabase/client";

export type ExperienceRow = {
  id: string;
  title: string;
  description: string | null;
  subtitle: string | null;
  duration_minutes: number | null;
  price_amount: number | null;
  currency: string;
  meeting_point_name: string | null;
  created_at: string;
};

type ExperienceMediaRow = {
  experience_id: string;
  storage_path: string;
  sort_order: number;
};

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

export async function fetchLandingExperiences(limit: number, transform: { width: number; height: number; quality: number }) {
  const { data: rows } = await supabase
    .from("experiences")
    .select("id,title,description,subtitle,duration_minutes,price_amount,currency,meeting_point_name,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  const experienceRows = (rows ?? []) as ExperienceRow[];
  if (experienceRows.length === 0) {
    return {
      experiences: [],
      coverByExperienceId: {} as Record<string, string>,
      locationByExperienceId: {} as Record<string, string>,
    };
  }

  const ids = experienceRows.map((row) => row.id);
  const [{ data: mediaRows }, { data: locationRows }] = await Promise.all([
    supabase
      .from("experience_media")
      .select("experience_id,storage_path,sort_order")
      .in("experience_id", ids)
      .order("sort_order", { ascending: true }),
    supabase
      .from("experience_locations")
      .select("experience_id,city,country_region")
      .in("experience_id", ids),
  ]);

  const coverByExperienceId: Record<string, string> = {};
  for (const mediaRow of (mediaRows ?? []) as ExperienceMediaRow[]) {
    if (coverByExperienceId[mediaRow.experience_id]) continue;
    const {
      data: { publicUrl },
    } = supabase.storage.from("experience-media").getPublicUrl(mediaRow.storage_path, { transform });
    coverByExperienceId[mediaRow.experience_id] = publicUrl;
  }

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


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

export type LandingExperiencesResult = {
  experiences: ExperienceRow[];
  coverByExperienceId: Record<string, string>;
  locationByExperienceId: Record<string, string>;
};

const LANDING_CACHE_TTL_MS = 1000 * 60;
const landingExperiencesCache = new Map<
  string,
  {
    limit: number;
    timestamp: number;
    result: LandingExperiencesResult;
  }
>();

function getTransformCacheKey(transform: { width: number; height: number; quality: number }) {
  return `${transform.width}x${transform.height}-q${transform.quality}`;
}

function subsetLandingResult(result: LandingExperiencesResult, limit: number): LandingExperiencesResult {
  const experiences = result.experiences.slice(0, limit);
  const ids = new Set(experiences.map((experience) => experience.id));

  const coverByExperienceId: Record<string, string> = {};
  const locationByExperienceId: Record<string, string> = {};

  for (const [experienceId, cover] of Object.entries(result.coverByExperienceId)) {
    if (ids.has(experienceId)) {
      coverByExperienceId[experienceId] = cover;
    }
  }

  for (const [experienceId, location] of Object.entries(result.locationByExperienceId)) {
    if (ids.has(experienceId)) {
      locationByExperienceId[experienceId] = location;
    }
  }

  return {
    experiences,
    coverByExperienceId,
    locationByExperienceId,
  };
}

export async function fetchLandingExperiences(limit: number, transform: { width: number; height: number; quality: number }) {
  const cacheKey = getTransformCacheKey(transform);
  const now = Date.now();
  const cached = landingExperiencesCache.get(cacheKey);
  if (cached && now - cached.timestamp < LANDING_CACHE_TTL_MS && cached.limit >= limit) {
    return subsetLandingResult(cached.result, limit);
  }

  const { data: rows } = await supabase
    .from("experiences")
    .select("id,title,description,subtitle,duration_minutes,price_amount,currency,meeting_point_name,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  const experienceRows = (rows ?? []) as ExperienceRow[];
  if (experienceRows.length === 0) {
    const emptyResult = {
      experiences: [],
      coverByExperienceId: {} as Record<string, string>,
      locationByExperienceId: {} as Record<string, string>,
    };
    landingExperiencesCache.set(cacheKey, {
      limit,
      timestamp: now,
      result: emptyResult,
    });
    return emptyResult;
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

  const result = {
    experiences: experienceRows,
    coverByExperienceId,
    locationByExperienceId,
  };

  landingExperiencesCache.set(cacheKey, {
    limit,
    timestamp: now,
    result,
  });

  return result;
}


import { createClient } from "@supabase/supabase-js";
import {
  buildCoverByExperienceId,
  type ExperienceMediaRowInput,
} from "@/lib/experience-media";
import type { ExperienceRow, LandingExperiencesResult } from "@/lib/queries/experiences";

type ExperienceLocationRow = {
  experience_id: string;
  city: string | null;
  country_region: string | null;
};

function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.",
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function fetchLandingExperiencesServer(
  limit: number,
  transform: { width: number; height: number; quality: number },
): Promise<LandingExperiencesResult> {
  const supabase = createSupabaseServerClient();

  const { data: rows, error } = await supabase
    .from("experiences")
    .select(
      "id,title,description,subtitle,duration_minutes,price_amount,currency,meeting_point_name,created_at,categories(name,slug)",
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
      coverByExperienceId: {},
      locationByExperienceId: {},
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

import { createClient } from "@supabase/supabase-js";
import {
  buildCoverByExperienceId,
  type ExperienceMediaItem,
  type ExperienceMediaRowInput,
  type ImageTransform,
} from "@/lib/experience-media";

export type UpcomingEventCardData = {
  id: string;
  title: string;
  location: string;
  category: string;
  description: string;
  maxAttendees: number;
  nextStartsAt: string;
  nextEndsAt: string;
  coverMedia?: ExperienceMediaItem;
};

type UpcomingEventRpcRow = {
  experience_id: string;
  title: string;
  description: string | null;
  subtitle: string | null;
  category_name: string | null;
  category_slug: string | null;
  meeting_point_name: string | null;
  max_guests: number | null;
  next_starts_at: string;
  next_ends_at: string;
  slot_capacity: number;
};

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

export async function fetchUpcomingEventsServer(
  limit: number,
  transform: ImageTransform,
): Promise<UpcomingEventCardData[]> {
  const supabase = createSupabaseServerClient();

  const { data: rows, error } = await supabase.rpc("get_public_upcoming_events", {
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  const eventRows = (rows ?? []) as UpcomingEventRpcRow[];
  if (eventRows.length === 0) return [];

  const ids = eventRows.map((row) => row.experience_id);

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

  return eventRows.map((row) => ({
    id: row.experience_id,
    title: row.title,
    location:
      locationByExperienceId[row.experience_id] ||
      row.meeting_point_name ||
      "Location shared after booking",
    category: row.category_name || "Experience",
    description: row.description?.trim() || row.subtitle?.trim() || "",
    maxAttendees: row.slot_capacity || row.max_guests || 1,
    nextStartsAt: row.next_starts_at,
    nextEndsAt: row.next_ends_at,
    coverMedia: coverByExperienceId[row.experience_id],
  }));
}

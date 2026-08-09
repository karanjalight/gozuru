import { createClient } from "@supabase/supabase-js";
import {
  buildCoverByExperienceId,
  type ExperienceMediaRowInput,
} from "@/lib/experience-media";
import {
  buildLandingExperts,
  expertImageTransform,
  type ExperienceRow,
  type HostProfileRow,
  type LandingExpertsResult,
  type MediaRow,
  type ProfileRow,
} from "@/lib/queries/experts";

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

export async function fetchLandingExpertsServer(
  limit = 48,
): Promise<LandingExpertsResult> {
  const supabase = createSupabaseServerClient();

  const { data: hostRows, error: hostError } = await supabase
    .from("host_profiles")
    .select(
      "user_id,headline,expertise,years_experience,career_highlight,highlight_story,verification_status",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (hostError || !hostRows?.length) {
    return { experts: [] };
  }

  const hosts = hostRows as HostProfileRow[];
  const hostIds = hosts.map((host) => host.user_id);

  const [{ data: experienceRows }, { data: profileRows }] = await Promise.all([
    supabase
      .from("experiences")
      .select(
        "id,host_user_id,title,subtitle,description,categories(name,slug),experience_locations(city,country_region)",
      )
      .in("host_user_id", hostIds)
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("user_id,email,first_name,last_name,bio,city,country_code,phone,avatar_path")
      .in("user_id", hostIds),
  ]);

  const publishedExperiences = (experienceRows ?? []) as ExperienceRow[];
  const publishedHostIds = new Set(publishedExperiences.map((row) => row.host_user_id));
  const publishedHosts = hosts.filter((host) => publishedHostIds.has(host.user_id));

  if (publishedHosts.length === 0) {
    return { experts: [] };
  }

  const experienceIds = publishedExperiences.map((row) => row.id);
  const { data: mediaRows } =
    experienceIds.length > 0
      ? await supabase
          .from("experience_media")
          .select("experience_id,storage_path,sort_order,media_type")
          .in("experience_id", experienceIds)
          .order("sort_order", { ascending: true })
      : { data: [] as MediaRow[] };

  const coverByExperienceId = buildCoverByExperienceId(
    supabase,
    (mediaRows ?? []) as ExperienceMediaRowInput[],
    expertImageTransform,
  );

  return buildLandingExperts({
    hostRows: publishedHosts,
    profileRows: ((profileRows ?? []) as ProfileRow[]).filter((row) =>
      publishedHostIds.has(row.user_id),
    ),
    experienceRows: publishedExperiences,
    mediaRows: (mediaRows ?? []) as MediaRow[],
    getAvatarUrl: (path) => supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl,
    getCoverByExperienceId: (ids) =>
      Object.fromEntries(
        ids
          .filter((id) => coverByExperienceId[id])
          .map((id) => [id, { url: coverByExperienceId[id].url }]),
      ),
  });
}

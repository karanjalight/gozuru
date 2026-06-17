import type { LocalExpert } from "@/app/(landing)/lib/agents";
import {
  buildCoverByExperienceId,
  type ExperienceMediaRowInput,
} from "@/lib/experience-media";

export type HostProfileRow = {
  user_id: string;
  headline: string | null;
  expertise: string | null;
  years_experience: number | null;
  career_highlight: string | null;
  highlight_story: string | null;
};

export type ProfileRow = {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  city: string | null;
  country_code: string | null;
  phone: string | null;
  avatar_path: string | null;
};

export type ExperienceRow = {
  id: string;
  host_user_id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
  experience_locations:
    | { city: string | null; country_region: string | null }
    | { city: string | null; country_region: string | null }[]
    | null;
};

export type MediaRow = {
  experience_id: string;
  storage_path: string;
  sort_order: number;
  media_type: string;
};

export type LandingExpertsResult = {
  experts: LocalExpert[];
};

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop";

export const expertImageTransform = {
  width: 720,
  height: 540,
  quality: 72,
} as const;

export function isSupportedImageUrl(value: string): boolean {
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
  const category = row.categories;
  if (!category) return undefined;
  if (Array.isArray(category)) return category[0]?.name;
  return category.name;
}

function experienceLocationLabel(row: ExperienceRow): string {
  const loc = pickLocation(row);
  if (!loc) return "Global";
  if (loc.city && loc.country_region) return `${loc.city}, ${loc.country_region}`;
  return loc.city || loc.country_region || "Global";
}

export function mapHostToLocalExpert(
  hostId: string,
  host: HostProfileRow | undefined,
  profile: ProfileRow | undefined,
  experience: ExperienceRow | undefined,
  image: string,
): LocalExpert {
  const categoryName = experience ? pickCategoryName(experience) : undefined;
  const firstName = profile?.first_name?.trim();
  const lastName = profile?.last_name?.trim();
  const fullName =
    firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || "Expert";

  const title =
    host?.expertise?.trim()?.slice(0, 80) ||
    experience?.subtitle?.trim() ||
    host?.headline?.trim()?.slice(0, 80) ||
    host?.career_highlight?.trim()?.slice(0, 80) ||
    (categoryName ? `${categoryName} expert` : "Local expert");

  const location =
    profile?.city?.trim() ||
    (experience ? experienceLocationLabel(experience) : null) ||
    "Global";

  const specialty = categoryName ? `${categoryName} · ${location}` : location;

  return {
    id: hostId,
    name: fullName,
    title,
    specialty,
    category: categoryName || "Experience",
    rating: 5,
    reviewCount: 0,
    phone: profile?.phone?.trim() || "",
    email: profile?.email?.trim() || "",
    image: image || PLACEHOLDER_IMAGE,
    profileHref: `/hosts/${hostId}`,
  };
}

export function buildCategoryFilters(experts: LocalExpert[]): string[] {
  const categories = new Set<string>();
  for (const expert of experts) {
    if (expert.category) categories.add(expert.category);
  }
  return ["All experts", ...Array.from(categories).sort()];
}

export type ExpertsQueryDeps = {
  hostRows: HostProfileRow[];
  profileRows: ProfileRow[];
  experienceRows: ExperienceRow[];
  mediaRows: MediaRow[];
  getAvatarUrl: (path: string) => string;
  getCoverByExperienceId: (experienceIds: string[]) => Record<string, { url: string }>;
};

export function buildLandingExperts({
  hostRows,
  profileRows,
  experienceRows,
  mediaRows,
  getAvatarUrl,
  getCoverByExperienceId,
}: ExpertsQueryDeps): LandingExpertsResult {
  const profileByHost = Object.fromEntries(profileRows.map((row) => [row.user_id, row]));

  const avatarByHost: Record<string, string> = {};
  for (const row of profileRows) {
    const path = row.avatar_path?.trim();
    if (!path) continue;
    if (path.startsWith("http://") || path.startsWith("https://")) {
      if (isSupportedImageUrl(path)) avatarByHost[row.user_id] = path;
      continue;
    }
    avatarByHost[row.user_id] = getAvatarUrl(path);
  }

  const experienceIds = experienceRows.map((row) => row.id);
  const coverByExp = getCoverByExperienceId(experienceIds);

  const latestExperienceByHost = new Map<string, ExperienceRow>();
  for (const row of experienceRows) {
    if (latestExperienceByHost.has(row.host_user_id)) continue;
    latestExperienceByHost.set(row.host_user_id, row);
  }

  const experts = hostRows.map((host) => {
    const experience = latestExperienceByHost.get(host.user_id);
    const avatar = avatarByHost[host.user_id];
    const coverUrl = experience ? coverByExp[experience.id]?.url : undefined;
    const image = avatar || coverUrl || PLACEHOLDER_IMAGE;
    const profile = profileByHost[host.user_id];
    return mapHostToLocalExpert(host.user_id, host, profile, experience, image);
  });

  return { experts };
}

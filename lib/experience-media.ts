import type { SupabaseClient } from "@supabase/supabase-js";

export type ExperienceMediaType = "image" | "video";

export type ExperienceMediaItem = {
  url: string;
  mediaType: ExperienceMediaType;
  alt?: string;
};

export type ExperienceMediaRowInput = {
  experience_id: string;
  storage_path: string;
  media_type?: string | null;
  sort_order?: number;
  alt_text?: string | null;
};

export type ImageTransform = {
  width: number;
  height: number;
  quality: number;
};

export function normalizeMediaType(value: string | null | undefined): ExperienceMediaType {
  return value === "video" ? "video" : "image";
}

export function getExperienceMediaPublicUrl(
  supabase: SupabaseClient,
  storagePath: string,
  mediaType: ExperienceMediaType,
  transform?: ImageTransform,
): string {
  if (mediaType === "video") {
    return supabase.storage.from("experience-media").getPublicUrl(storagePath).data.publicUrl;
  }
  return supabase.storage
    .from("experience-media")
    .getPublicUrl(storagePath, transform ? { transform } : undefined)
    .data.publicUrl;
}

export function buildCoverByExperienceId(
  supabase: SupabaseClient,
  rows: ExperienceMediaRowInput[],
  transform?: ImageTransform,
): Record<string, ExperienceMediaItem> {
  const result: Record<string, ExperienceMediaItem> = {};
  const sorted = [...rows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  for (const row of sorted) {
    if (result[row.experience_id]) continue;
    const mediaType = normalizeMediaType(row.media_type);
    result[row.experience_id] = {
      url: getExperienceMediaPublicUrl(supabase, row.storage_path, mediaType, transform),
      mediaType,
      alt: row.alt_text ?? undefined,
    };
  }

  return result;
}

export function mapExperienceMediaItems(
  supabase: SupabaseClient,
  rows: Array<{
    storage_path: string;
    media_type?: string | null;
    alt_text?: string | null;
    sort_order?: number;
  }>,
  transform?: ImageTransform,
): ExperienceMediaItem[] {
  const sorted = [...rows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return sorted.map((row) => {
    const mediaType = normalizeMediaType(row.media_type);
    return {
      url: getExperienceMediaPublicUrl(supabase, row.storage_path, mediaType, transform),
      mediaType,
      alt: row.alt_text ?? undefined,
    };
  });
}

export function mapExperienceGalleryMedia(
  supabase: SupabaseClient,
  rows: Array<{
    storage_path: string;
    media_type?: string | null;
    alt_text?: string | null;
    sort_order?: number;
  }>,
  heroTransform: ImageTransform,
  gridTransform: ImageTransform,
): Array<{
  url: string;
  previewUrl: string;
  mediaType: ExperienceMediaType;
  alt: string;
}> {
  const sorted = [...rows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return sorted.map((row) => {
    const mediaType = normalizeMediaType(row.media_type);
    const url = getExperienceMediaPublicUrl(supabase, row.storage_path, mediaType, heroTransform);
    const previewUrl =
      mediaType === "image"
        ? getExperienceMediaPublicUrl(supabase, row.storage_path, mediaType, gridTransform)
        : url;
    return {
      url,
      previewUrl,
      mediaType,
      alt: row.alt_text ?? "",
    };
  });
}

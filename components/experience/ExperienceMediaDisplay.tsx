"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import type { ExperienceMediaItem } from "@/lib/experience-media";
import { cn } from "@/lib/utils";

type ExperienceMediaDisplayProps = {
  media?: ExperienceMediaItem | null;
  alt: string;
  className?: string;
  mediaClassName?: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  unoptimized?: boolean;
  /** Muted autoplay for cards and list thumbnails */
  videoAutoplay?: boolean;
  /** Show native controls (detail galleries) */
  videoControls?: boolean;
  showVideoBadge?: boolean;
  emptyLabel?: string;
};

export function ExperienceMediaDisplay({
  media,
  alt,
  className,
  mediaClassName,
  fill = false,
  sizes,
  priority = false,
  unoptimized = true,
  videoAutoplay = true,
  videoControls = false,
  showVideoBadge = true,
  emptyLabel = "No media",
}: ExperienceMediaDisplayProps) {
  if (!media?.url) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-xs text-muted-foreground",
          fill && "absolute inset-0",
          className,
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  if (media.mediaType === "video") {
    return (
      <div className={cn("relative overflow-hidden bg-black", fill && "absolute inset-0", className)}>
        <video
          src={media.url}
          className={cn("size-full object-cover", fill ? "absolute inset-0 h-full w-full" : "h-full w-full", mediaClassName)}
          muted
          loop
          playsInline
          autoPlay={videoAutoplay}
          controls={videoControls}
          preload="metadata"
          aria-label={alt}
        />
        {showVideoBadge && !videoControls ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15">
            <span className="flex size-10 items-center justify-center rounded-full bg-white/90 shadow-sm">
              <Play className="ml-0.5 size-4 fill-orange-600 text-orange-600" />
            </span>
          </div>
        ) : null}
        <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
          Video
        </span>
      </div>
    );
  }

  if (fill) {
    return (
      <div className={cn("absolute inset-0 overflow-hidden", className)}>
        <Image
          src={media.url}
          alt={alt}
          fill
          unoptimized={unoptimized}
          className={cn("object-cover", mediaClassName)}
          sizes={sizes}
          priority={priority}
        />
      </div>
    );
  }

  return (
    <Image
      src={media.url}
      alt={alt}
      width={720}
      height={480}
      unoptimized={unoptimized}
      className={cn("h-full w-full object-cover", className, mediaClassName)}
      sizes={sizes}
      priority={priority}
    />
  );
}

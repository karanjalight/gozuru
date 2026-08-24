"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { ExperienceMediaDisplay } from "@/components/experience/ExperienceMediaDisplay";
import { cn } from "@/lib/utils";

export type ExperienceGalleryItem = {
  url: string;
  previewUrl: string;
  mediaType: "image" | "video";
  alt: string;
};

type ExperienceMediaCarouselProps = {
  items: ExperienceGalleryItem[];
  emptyLabel?: string;
  autoplayMs?: number;
};

const DEFAULT_AUTOPLAY_MS = 5000;

export function ExperienceMediaCarousel({
  items,
  emptyLabel = "No media uploaded",
  autoplayMs = DEFAULT_AUTOPLAY_MS,
}: ExperienceMediaCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const slideCount = items.length;

  const goTo = useCallback(
    (nextIndex: number) => {
      if (slideCount === 0) return;

      setActiveIndex((nextIndex + slideCount) % slideCount);
    },
    [slideCount],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [items]);

  useEffect(() => {
    if (slideCount <= 1 || isPaused) return;

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slideCount);
    }, autoplayMs);

    return () => window.clearInterval(timer);
  }, [autoplayMs, isPaused, slideCount]);

  /*
   * Empty state
   */
  if (slideCount === 0) {
    return (
      <section className="overflow-hidden rounded-2xl border bg-">
        <div className="flex min-h-[280px] items-center justify-center md:min-h-[420px]">
          <ExperienceMediaDisplay
            media={null}
            alt={emptyLabel}
            emptyLabel={emptyLabel}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className="space-y-3"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (
          !event.currentTarget.contains(
            event.relatedTarget as Node | null,
          )
        ) {
          setIsPaused(false);
        }
      }}
    >
      {/* ============================================================
          MAIN MEDIA
          ============================================================ */}
      <div className="group relative w-full overflow-hidden rounded-2xl bgmuted">
        {items.map((item, index) => {
          const isActive = index === activeIndex;

          return (
            <div
              key={`${item.url}-${index}`}
              className={cn(
                "transition-opacity duration-500",
                isActive
                  ? "relative z-10 opacity-100"
                  : "pointer-events-none absolute inset-0 z-0 opacity-0",
              )}
              aria-hidden={!isActive}
            >
              {isActive ? (
                <ExperienceMediaDisplay
                  key={`slide-${index}-${item.url}`}
                  media={{
                    url: item.url,
                    mediaType: item.mediaType,
                  }}
                  alt={item.alt}
                  className="h-auto max-h-[75vh] w-full object-contain"
                  sizes="100vw"
                  priority={index === 0}
                  videoAutoplay={item.mediaType === "video"}
                  videoControls={item.mediaType === "video"}
                  showVideoBadge={false}
                  emptyLabel={emptyLabel}
                />
              ) : null}
            </div>
          );
        })}

        {/* ============================================================
            PREVIOUS BUTTON
            ============================================================ */}
        {slideCount > 1 ? (
          <button
            type="button"
            aria-label="Previous media"
            onClick={() => goTo(activeIndex - 1)}
            className="
              absolute
              left-3
              top-1/2
              z-30
              flex
              size-10
              -translate-y-1/2
              items-center
              justify-center
              rounded-full
              bg-black/50
              text-white
              shadow-lg
              backdrop-blur-sm
              transition
              hover:bg-black/70
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-white
              md:left-4
              md:size-11
            "
          >
            <ChevronLeft className="size-5 md:size-6" />
          </button>
        ) : null}

        {/* ============================================================
            NEXT BUTTON
            ============================================================ */}
        {slideCount > 1 ? (
          <button
            type="button"
            aria-label="Next media"
            onClick={() => goTo(activeIndex + 1)}
            className="
              absolute
              right-3
              top-1/2
              z-30
              flex
              size-10
              -translate-y-1/2
              items-center
              justify-center
              rounded-full
              bg-black/50
              text-white
              shadow-lg
              backdrop-blur-sm
              transition
              hover:bg-black/70
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-white
              md:right-4
              md:size-11
            "
          >
            <ChevronRight className="size-5 md:size-6" />
          </button>
        ) : null}

        {/* ============================================================
            IMAGE COUNTER
            ============================================================ */}
        {slideCount > 1 ? (
          <div
            className="
              absolute
              bottom-3
              right-3
              z-30
              rounded-full
              bg-black/60
              px-3
              py-1.5
              text-xs
              font-semibold
              text-white
              shadow-sm
              backdrop-blur-sm
            "
          >
            {activeIndex + 1} / {slideCount}
          </div>
        ) : null}
      </div>

      {/* ==============================================================
          THUMBNAILS
          ============================================================== */}
      {slideCount > 1 ? (
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Experience media thumbnails"
        >
          {items.map((item, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={`thumb-${item.url}-${index}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Show ${item.mediaType} ${index + 1}`}
                onClick={() => goTo(index)}
                className={cn(
                  "relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition",
                  isActive
                    ? "border-orange-500 ring-2 ring-orange-500/30"
                    : "border-border opacity-75 hover:border-orange-300 hover:opacity-100",
                )}
              >
                {item.mediaType === "video" ? (
                  <>
                    <video
                      src={item.previewUrl}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                      aria-hidden="true"
                    />

                    <span
                      className="
                        pointer-events-none
                        absolute
                        inset-0
                        flex
                        items-center
                        justify-center
                        bg-black/25
                      "
                    >
                      <span
                        className="
                          flex
                          size-7
                          items-center
                          justify-center
                          rounded-full
                          bg-white/90
                          shadow-sm
                        "
                      >
                        <Play className="ml-0.5 size-3.5 fill-orange-600 text-orange-600" />
                      </span>
                    </span>
                  </>
                ) : (
                  <ExperienceMediaDisplay
                    media={{
                      url: item.previewUrl,
                      mediaType: "image",
                    }}
                    alt={item.alt}
                    fill
                    className="object-cover"
                    sizes="96px"
                    videoAutoplay={false}
                    showVideoBadge={false}
                  />
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
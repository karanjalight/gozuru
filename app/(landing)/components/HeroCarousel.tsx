"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  /** Optional image URL; otherwise uses gradient. */
  image?: string;
  /** CSS background (e.g. gradient) when no image. */
  background?: string;
};

const defaultSlides: HeroSlide[] = [
  {
    title: "Power to Empower",
    description:
      "Get smart, reliable solutions to cut costs and stay powered. Your journey starts here.",
    ctaLabel: "Get Started",
    ctaHref: "#",
    background:
      "linear-gradient(135deg, oklch(0.27 0.1 145 / 0.9) 0%, oklch(0.2 0.08 200 / 0.95) 100%)",
  },
  {
    title: "Built for You",
    description:
      "Simple, fast experiences. Explore vendors, schools, and resources in one place.",
    ctaLabel: "Learn more",
    ctaHref: "#about",
    background:
      "linear-gradient(135deg, oklch(0.25 0.08 260 / 0.92) 0%, oklch(0.2 0.06 220 / 0.95) 100%)",
  },
  {
    title: "Ready When You Are",
    description:
      "Start today. No complexity, no lock-in—just what you need to move forward.",
    ctaLabel: "Get Started →",
    ctaHref: "/sign-up",
    background:
      "linear-gradient(135deg, oklch(0.28 0.09 30 / 0.9) 0%, oklch(0.22 0.07 15 / 0.95) 100%)",
  },
];

const AUTOPLAY_MS = 6000;

export function HeroCarousel({
  slides = defaultSlides,
  autoplay = true,
}: {
  slides?: HeroSlide[];
  autoplay?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goTo = useCallback(
    (i: number) => {
      setIndex((prev) => {
        const next = i < 0 ? slides.length - 1 : i % slides.length;
        return next;
      });
    },
    [slides.length]
  );

  useEffect(() => {
    if (!autoplay || isPaused) return;
    const t = setInterval(() => goTo(index + 1), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [autoplay, isPaused, index, goTo]);

  return (
    <section
      className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {slides.map((slide, i) => (
        <div
          key={i}
          className={cn(
            "absolute inset-0 transition-opacity duration-500",
            i === index ? "z-10 opacity-100" : "z-0 opacity-0"
          )}
          style={{
            background: slide.image
              ? `linear-gradient(to bottom, oklch(0.1 0 0 / 0.75) 0%, oklch(0.08 0 0 / 0.9) 100%), url(${slide.image}) center/cover`
              : slide.background,
          }}
        >
          <div className="flex min-h-[calc(100vh-4rem)] flex-col justify-center px-4 py-24 sm:px-6 md:max-w-2xl md:pl-12 lg:pl-20">
            <div className="rounded-3xl bg-black/50 p-6 shadow-xl backdrop-blur-sm sm:p-8">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
                {slide.title}
              </h1>
              <p className="mt-4 max-w-xl text-lg text-white/90">
                {slide.description}
              </p>
              <div className="mt-8">
                <Link
                  href={slide.ctaHref}
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black shadow-md shadow-black/25 transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  {slide.ctaLabel}
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Arrows */}
      <button
        type="button"
        aria-label="Previous slide"
        onClick={() => goTo(index - 1)}
        className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition hover:bg-white/30"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Next slide"
        onClick={() => goTo(index + 1)}
        className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition hover:bg-white/30"
      >
        <ChevronRight className="size-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={cn(
              "rounded-full transition-all",
              i === index
                ? "h-2 w-8 bg-white"
                : "size-2 bg-white/50 hover:bg-white/70"
            )}
          />
        ))}
      </div>
    </section>
  );
}

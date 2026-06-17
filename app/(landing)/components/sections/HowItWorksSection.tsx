"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HOW_IT_WORKS_STEPS } from "@/app/(landing)/lib/how-it-works";
import { cn } from "@/lib/utils";
import { Section } from "./Section";

const AUTOPLAY_MS = 6000;

export function HowItWorksSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const step = HOW_IT_WORKS_STEPS[activeIndex];

  const goTo = useCallback((index: number) => {
    const total = HOW_IT_WORKS_STEPS.length;
    setActiveIndex(((index % total) + total) % total);
  }, []);

  useEffect(() => {
    if (isPaused) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % HOW_IT_WORKS_STEPS.length);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [activeIndex, isPaused]);

  return (
    <Section
      id="how-it-works"
      className="border-t border-gray-100 bg-orange-100"
      containerClassName="max-w-7xl"
    >
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsPaused(false);
          }
        }}
      >
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-16">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
          How Gozuru works
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base lg:pt-2">
          From hotel welcome visits to rooftop meetups and travel expos — discover,
          connect, and experience the world through people who know it best.
        </p>
      </div>

      <p className="mt-6 text-xs font-medium uppercase tracking-[0.16em] text-orange-700/80 dark:text-orange-300/80">
        Tap a step below or use the arrows — slides auto-advance
      </p>

      <div className="mt-8 grid gap-10 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-12">
        <div className="flex flex-col justify-between gap-8">
          <div className="min-h-[220px]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
              Step {activeIndex + 1} of {HOW_IT_WORKS_STEPS.length}
            </p>
            <h3
              key={step.id}
              className="mt-2 text-xl font-bold text-foreground transition-opacity duration-300 sm:text-2xl"
            >
              {step.title}
            </h3>
            <p
              key={`${step.id}-desc`}
              className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground transition-opacity duration-300 sm:text-base"
            >
              {step.description}
            </p>
            <Link
              href="/experiences"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Start exploring
            </Link>
          </div>

          <nav aria-label="How it works steps" className="space-y-2">
            {HOW_IT_WORKS_STEPS.map((item, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? "step" : undefined}
                  onClick={() => goTo(index)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                    isActive
                      ? "border-orange-500 bg-white shadow-sm dark:bg-background"
                      : "border-transparent bg-white/40 hover:border-orange-200 hover:bg-white/70 dark:bg-background/40 dark:hover:border-orange-500/30 dark:hover:bg-background/70",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                      isActive
                        ? "bg-orange-600 text-white"
                        : "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
                    )}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      "text-sm sm:text-base",
                      isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
                    )}
                  >
                    {item.navLabel}
                  </span>
                  {isActive ? (
                    <ChevronRight className="ml-auto size-4 shrink-0 text-orange-600 dark:text-orange-400" />
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {HOW_IT_WORKS_STEPS.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Go to ${item.navLabel}`}
                  onClick={() => goTo(index)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    index === activeIndex ? "w-8 bg-orange-600" : "w-2 bg-orange-300/80 hover:bg-orange-500/70",
                  )}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Previous step"
                onClick={() => goTo(activeIndex - 1)}
                className="flex size-9 items-center justify-center rounded-lg border border-foreground/20 bg-white text-foreground transition-colors hover:bg-foreground hover:text-background dark:bg-background"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Next step"
                onClick={() => goTo(activeIndex + 1)}
                className="flex size-9 items-center justify-center rounded-lg border border-foreground/20 bg-white text-foreground transition-colors hover:bg-foreground hover:text-background dark:bg-background"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-zinc-100 shadow-lg dark:bg-zinc-800">
          {HOW_IT_WORKS_STEPS.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "absolute inset-0 transition-opacity duration-700",
                index === activeIndex ? "z-10 opacity-100" : "z-0 opacity-0",
              )}
              aria-hidden={index !== activeIndex}
            >
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                priority={index === 0}
                className="object-cover"
              />
              {item.detailImage ? (
                <div className="absolute bottom-4 right-4 w-[38%] max-w-[200px] overflow-hidden rounded-xl border-2 border-white/90 bg-white shadow-xl sm:bottom-6 sm:right-6">
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={item.detailImage}
                      alt={`${item.navLabel} preview`}
                      fill
                      sizes="200px"
                      className="object-cover"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ))}

          <button
            type="button"
            aria-label="Previous step image"
            onClick={() => goTo(activeIndex - 1)}
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white opacity-0 backdrop-blur-sm transition hover:bg-black/60 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next step image"
            onClick={() => goTo(activeIndex + 1)}
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white opacity-0 backdrop-blur-sm transition hover:bg-black/60 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="absolute bottom-4 left-4 z-20 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {activeIndex + 1} / {HOW_IT_WORKS_STEPS.length}
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 h-1 bg-black/20">
            <div
              key={`${activeIndex}-${isPaused ? "paused" : "playing"}`}
              className={cn(
                "h-full bg-orange-500",
                !isPaused && "animate-[how-it-works-progress_6s_linear_forwards]",
                isPaused && "w-full opacity-40",
              )}
            />
          </div>
        </div>
      </div>
      </div>
    </Section>
  );
}

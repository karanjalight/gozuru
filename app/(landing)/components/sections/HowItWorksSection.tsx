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
      className="border-t border-orange-200/70 bg-orange-100 dark:border-border dark:bg-gradient-to-br dark:from-orange-300 dark:via-background dark:to-orange-300"
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

          <nav aria-label="How it works steps" className="divide-y divide-orange-200/60 dark:divide-border">
            {HOW_IT_WORKS_STEPS.map((item, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? "step" : undefined}
                  onClick={() => goTo(index)}
                  className="flex w-full items-center gap-4 py-3 text-left first:pt-0"
                >
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums transition-colors",
                      isActive ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground/50",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "text-sm transition-colors sm:text-base",
                      isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
                    )}
                  >
                    {item.navLabel}
                  </span>
                </button>
              );
            })}
          </nav>

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

        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
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
            </div>
          ))}
        </div>
      </div>
      </div>
    </Section>
  );
}

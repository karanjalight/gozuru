"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CUSTOMER_REVIEWS } from "@/app/(landing)/lib/customer-reviews";
import { cn } from "@/lib/utils";

const ROTATE_MS = 5000;

const orange = {
  solid: "#e40014",
  dark: "#157A3F",
  light: "#E8F6EE",
} as const;

function StarRating({ rating }: { rating: number }) {
  const filled = Math.round(rating);

  return (
    <div
      className="flex items-center gap-1"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            "size-4",
            index < filled
              ? "fill-yellow-500 text-yellow-500"
              : "fill-transparent text-[#D5DCE4] dark:text-zinc-700",
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(1);
  const count = CUSTOMER_REVIEWS.length;

  const getReview = useCallback(
    (offset: number) =>
      CUSTOMER_REVIEWS[(activeIndex + offset + count) % count],
    [activeIndex, count],
  );

  const activeReview = getReview(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((index) => (index + 1) % count);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [count]);

  const selectOffset = (offset: number) => {
    setActiveIndex((index) => (index + offset + count) % count);
  };

  return (
    <div className="relative overflow-hidden border-b border-gray-100 font-[family-name:var(--font-outfit)] lg:p-20 lg:pl-42">
      <div
        className="pointer-events-none absolute -left-2 top-1 size-[min(480px,82%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500"
        aria-hidden
      />

      <div className="relative px-8 py-10 sm:px-10 sm:py-12 lg:px-44 lg:py-14">
        <div className="mb-10 lg:mb-12">
          <div
            className="mb-3 h-[3px] w-11 rounded-full"
            style={{ backgroundColor: orange.solid }}
            aria-hidden
          />
          <h2 className="text-4xl font-bold tracking-tight text-[#1F2937] dark:text-foreground sm:text-[2.25rem]">
            Traveler stories
          </h2>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
            Real feedback from hotel visits, meetups, expert sessions, and expos
            on Gozuru.
          </p>
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14 xl:gap-20">
          <div className="relative mx-auto aspect-[3/4] w-full h-120 overflow-hidden rounded-[28px] shadow-lg lg:mx-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeReview.id}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0"
              >
                <Image
                  src={activeReview.avatar}
                  alt={activeReview.name}
                  fill
                  sizes="(min-width: 1024px) 320px, 80vw"
                  className="object-cover"
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeReview.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-3xl font-bold text-[#1F2937] dark:text-foreground">
                  {activeReview.name}
                </p>
                <p className="mt-4 max-w-xl text-[1.05rem] leading-[1.75] text-[#374151] dark:text-foreground sm:text-lg">
                  {activeReview.quote}
                </p>
                <div className="mt-6">
                  <StarRating rating={activeReview.rating} />
                </div>

                <div className="mt-8 flex items-center gap-3 lg:mt-10 lg:self-end">
                  <button
                    type="button"
                    onClick={() => selectOffset(-1)}
                    aria-label="Previous testimonial"
                    className="flex size-11 items-center justify-center rounded-full border border-[#D5DCE4] text-[#1F2937] transition hover:border-yellow-500 hover:text-yellow-500 dark:border-zinc-700 dark:text-foreground"
                  >
                    <ChevronLeft className="size-5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => selectOffset(1)}
                    aria-label="Next testimonial"
                    className="flex size-11 items-center bg-orane-600 justify-center rounded-full text-white transition hover:brightness-110"
                    style={{ backgroundColor: orange.solid }}
                  >
                    <ChevronRight className="size-5" aria-hidden />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

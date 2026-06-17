"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CUSTOMER_REVIEWS, type CustomerReview } from "@/app/(landing)/lib/customer-reviews";
import { cn } from "@/lib/utils";

const ROTATE_MS = 5000;

const orange = {
  solid: "#1A8F4A",
  dark: "#157A3F",
  light: "#E8F6EE",
} as const;

const ARC_POSITIONS = {
  prev: { top: "16%", left: "27%" },
  active: { top: "50%", left: "48%" },
  next: { top: "84%", left: "27%" },
} as const;

type Slot = keyof typeof ARC_POSITIONS;

function ReviewerItem({
  review,
  slot,
  onSelect,
}: {
  review: CustomerReview;
  slot: Slot;
  onSelect: () => void;
}) {
  const isActive = slot === "active";
  const position = ARC_POSITIONS[slot];

  return (
    <motion.button
      key={review.id}
      type="button"
      onClick={onSelect}
      initial={false}
      animate={{
        top: position.top,
        left: position.left,
        opacity: isActive ? 1 : 0.62,
        scale: isActive ? 1 : 0.94,
      }}
      transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      style={{ position: "absolute" }}
      className={cn(
        "flex my-3 -translate-y-1/2 items-center gap-3 text-left",
        isActive ? "z-10 cursor-default" : "z-0 cursor-pointer hover:opacity-90",
      )}
      aria-current={isActive ? "true" : undefined}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full ring-2 ring-white/80",
          isActive ? "size-[88px]" : "size-[96px]",
        )}
      >
        <Image
          src={review.avatar}
          alt={review.name}
          fill
          sizes="78px"
          className="object-cover bg-black"
        />
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "truncate text-[#2B2F33] transition-all dark:text-foreground",
            isActive ? "text-[1.05rem] font-bold leading-tight" : "text-sm font-medium",
          )}
        >
          {review.name}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-[#6B7280] dark:text-muted-foreground">
          <Star className="size-3 fill-[#1A8F4A] text-[#1A8F4A]" aria-hidden />
          <span>
            {review.rating} · {review.experience}
          </span>
        </p>
      </div>
    </motion.button>
  );
}

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(1);
  const count = CUSTOMER_REVIEWS.length;

  const getReview = useCallback(
    (offset: number) => CUSTOMER_REVIEWS[(activeIndex + offset + count) % count],
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
            Real feedback from hotel visits, meetups, expert sessions, and expos on Gozuru.
          </p>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-14 xl:gap-20">
          <div className="relative mx-auto h-[260px] w-full max-w-[320px] lg:mx-0 lg:h-[280px] lg:max-w-none">
            <svg
              className="pointer-events-none absolute inset-0 ml-10 h-full w-full text-[#C9D2DC]"
              viewBox="0 0 320 280"
              fill="none"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden
            >
              <path
                d="M 54 35 A 100 100 0 0 1 54 245"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
            </svg>

            <ReviewerItem
              review={getReview(-1)}
              slot="prev"
              onSelect={() => selectOffset(-1)}
            />
            <ReviewerItem
              review={getReview(0)}
              slot="active"
              onSelect={() => undefined}
            />
            <ReviewerItem
              review={getReview(1)}
              slot="next"
              onSelect={() => selectOffset(1)}
            />
          </div>

          <div className="flex min-h-[200px] flex-col justify-center lg:min-h-[240px] lg:pl-2">
            <span
              className="select-none text-[5.5rem] leading-none text-[#D5DCE4] dark:text-zinc-700 sm:text-[6.5rem]"
              aria-hidden
            >
              &ldquo;
            </span>

            <AnimatePresence mode="wait">
              <motion.blockquote
                key={activeReview.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="-mt-8 max-w-xl text-[1.05rem] leading-[1.75] text-[#374151] dark:text-foreground sm:text-lg"
              >
                <span className="float-left mr-2 mt-0.5 text-[3.25rem] font-semibold leading-none text-[#1F2937]">
                  {activeReview.quote.charAt(0)}
                </span>
                {activeReview.quote.slice(1)}
              </motion.blockquote>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

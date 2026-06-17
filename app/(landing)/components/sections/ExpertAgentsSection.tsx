"use client";

import Link from "next/link";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LocalExpert } from "@/app/(landing)/lib/agents";
import { AgentCard } from "./AgentCard";
import { Section } from "./Section";

export function ExpertAgentsSection({ experts }: { experts: LocalExpert[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;
    const amount = direction === "left" ? -300 : 300;
    container.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <Section
      id="experts"
      className="bg-white dark:bg-background"
      containerClassName="max-w-7xl"
    >
      <div className="flex items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
            Verified local experts
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Meet the people behind the experiences
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Hotel curators, culture guides, event hosts, and community builders —
            each expert is rated by travelers and backed by Gozuru.
          </p>
        </div>

        {experts.length > 0 ? (
          <div className="hidden shrink-0 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Previous experts"
              className="flex size-9 items-center justify-center rounded-lg border border-foreground text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Next experts"
              className="flex size-9 items-center justify-center rounded-lg border border-foreground text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      {experts.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">No experts yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            When hosts publish experiences, their profiles appear here.
          </p>
          <Link
            href="/hosts"
            className="mt-4 inline-flex text-sm font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400"
          >
            Become a host
          </Link>
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="mt-8 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-6 [&::-webkit-scrollbar]:hidden"
          >
            {experts.map((expert) => (
              <AgentCard key={expert.id} agent={expert} />
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <Link
              href="/experts"
              className="inline-flex items-center justify-center rounded-lg border border-foreground px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              View all experts
            </Link>
          </div>
        </>
      )}
    </Section>
  );
}

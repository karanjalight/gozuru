"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { LocalExpert } from "@/app/(landing)/lib/agents";
import { buildCategoryFilters } from "@/lib/queries/experts";
import { cn } from "@/lib/utils";
import { AgentCard } from "./AgentCard";
import { PropertyCTAButton } from "./PropertyCTAButton";

export function ExpertsGrid({ experts }: { experts: LocalExpert[] }) {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("query")?.trim().toLowerCase() ?? "";
  const categoryFilters = useMemo(() => buildCategoryFilters(experts), [experts]);
  const [activeFilter, setActiveFilter] = useState("All experts");

  const filteredExperts = useMemo(() => {
    return experts.filter((expert) => {
      if (searchQuery) {
        const haystack =
          `${expert.name} ${expert.title} ${expert.specialty} ${expert.category}`.toLowerCase();
        if (!haystack.includes(searchQuery)) return false;
      }
      if (activeFilter === "All experts") return true;
      return expert.category === activeFilter;
    });
  }, [activeFilter, experts, searchQuery]);

  return (
    <section
      id="experts"
      className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-foreground transition-colors lg:px-8 lg:py-14"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
              Verified local experts
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {searchQuery ? "Search results" : "All experts"}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {searchQuery
                ? `Showing experts matching "${searchParams.get("query")?.trim()}".`
                : "Hotel curators, culture guides, event hosts, and community builders — each expert is rated by travelers and backed by Gozuru."}
            </p>
          </div>
          <p className="shrink-0 text-sm font-medium text-muted-foreground">
            {filteredExperts.length} expert{filteredExperts.length === 1 ? "" : "s"}
          </p>
        </div>

        {categoryFilters.length > 1 ? (
          <div className="flex w-full flex-wrap gap-2">
            {categoryFilters.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-orange-600 text-white shadow-sm"
                      : "border border-border bg-card text-muted-foreground hover:border-orange-300 hover:text-orange-600 dark:hover:border-orange-500/40 dark:hover:text-orange-400",
                  )}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {filteredExperts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">No experts found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {experts.length === 0
              ? "When hosts publish experiences, their profiles appear here."
              : "Try another filter or search term."}
          </p>
          {experts.length === 0 ? (
            <Link
              href="/hosts"
              className="mt-4 inline-flex text-sm font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400"
            >
              Become a host
            </Link>
          ) : (
            <Link
              href="/experts"
              className="mt-4 inline-flex text-sm font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400"
            >
              View all experts
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-12">
          {filteredExperts.map((expert) => (
            <AgentCard key={expert.id} agent={expert} layout="grid" />
          ))}
        </div>
      )}

      <div className="mt-14 flex flex-col items-center justify-between gap-6 rounded-2xl border border-border bg-gradient-to-br from-orange-50/80 to-white px-6 py-8 text-center sm:flex-row sm:px-10 sm:text-left dark:from-orange-950/20 dark:to-background">
        <div>
          <p className="text-lg font-semibold text-foreground">Want to become an expert on Gozuru?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Share your knowledge, host meetups, and connect with curious travelers worldwide.
          </p>
        </div>
        <PropertyCTAButton href="/hosts" variant="outline">
          Become a host
        </PropertyCTAButton>
      </div>
    </section>
  );
}

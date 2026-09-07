"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Navbar } from "@/app/(landing)/components/Navbar";
import { type LandingExperiencesResult } from "@/lib/queries/experiences";

const HERO_BACKGROUND_IMAGE =
  "/slidezuru2.png"; 

export function ExperienceHero({ initialData }: { initialData: LandingExperiencesResult }) {
  const [searchValue, setSearchValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const { theme, resolvedTheme } = useTheme();
  const router = useRouter();

  const currentTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = currentTheme === "dark";
  const normalizedQuery = searchValue.trim().toLowerCase();

  const suggestions = useMemo(() => {
    const experiences = initialData.experiences;
    const locationByExperienceId = initialData.locationByExperienceId;
    if (!normalizedQuery) return [];

    return experiences
      .filter((exp) => {
        const location = locationByExperienceId[exp.id] || exp.meeting_point_name || "";
        const description = exp.description || "";
        return `${exp.title} ${location} ${description}`.toLowerCase().includes(normalizedQuery);
      })
      .slice(0, 6)
      .map((exp) => ({
        id: exp.id,
        title: exp.title,
        location: locationByExperienceId[exp.id] || exp.meeting_point_name || "Location shared after booking",
      }));
  }, [initialData.experiences, initialData.locationByExperienceId, normalizedQuery]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!searchContainerRef.current) return;
      if (!searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <section
      className={`relative flex min-h-[65vh] items-center justify-center overflow-hidden transition-colors ${
        isDark ? "bg-zinc-900 text-white" : "bg-slate-950 text-white"
      }`}
    >
      <Navbar />

      <div className="absolute inset-0 -z-0">
        <Image
          src={HERO_BACKGROUND_IMAGE}
          alt="People enjoying a Gozuru experience"
          fill
          priority
          className="pointer-events-none object-cover"
        />
        <div
          className={`absolute inset-0 bg-gradient-to-b transition-colors ${
            isDark
              ? "from-black/90 via-black/65 to-black/90"
              : "from-black/85 via-slate-950/50 to-black/85"
          }`}
        />
      </div>

      <div className="relative z-10 mx-auto flex lg:w-[1040px] flex-col items-center gap-8 px-4 pt-16 text-center md:items-start md:text-left">
        <div className="space-y-4">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl text-white">
            Explore unique experiences
          </h1>
          <p
            className={`max-w-xl text-balance text-sm sm:text-base leading-relaxed transition-colors ${
              isDark ? "text-zinc-100/90" : "text-zinc-100"
            }`}
          >
            Browse host-led experiences from verified local experts — book directly on Gozuru.
          </p>
        </div>

        <div ref={searchContainerRef} className="relative mt-4 w-full max-w-xl text-zinc-950 [color-scheme:light]">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!searchValue.trim()) return;
              router.push(`/experiences?query=${encodeURIComponent(searchValue.trim())}`);
              setShowSuggestions(false);
            }}
            className="flex w-full flex-col gap-2 sm:flex-row sm:items-stretch sm:rounded-full sm:border sm:border-zinc-200 sm:bg-white sm:px-3 sm:py-2 sm:shadow-lg sm:shadow-black/20 sm:outline-none sm:transition sm:focus-within:border-orange-400 sm:focus-within:ring-2 sm:focus-within:ring-orange-400/40 sm:hover:border-zinc-300"
          >
            <input
              value={searchValue}
              onChange={(event) => {
                setSearchValue(event.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="What are you curious about?"
              aria-label="Search experiences"
              className="min-w-0 w-full rounded-full border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-950 caret-orange-600 placeholder:text-zinc-500 shadow-sm outline-none focus-visible:outline-none sm:flex-[65] sm:border-0 sm:bg-transparent sm:py-2 sm:shadow-none"
            />
            <div className="hidden w-px shrink-0 self-stretch bg-zinc-200 sm:block" aria-hidden />
            <input
              defaultValue="Nairobi"
              placeholder="City"
              aria-label="City"
              className="hidden min-w-0 rounded-full border-0 bg-white px-3 py-2 text-sm font-medium text-zinc-950 caret-orange-600 placeholder:text-zinc-500 outline-none focus-visible:outline-none sm:block sm:flex-[35]"
            />
            <button
              type="submit"
              className="inline-flex w-full shrink-0 items-center justify-center rounded-full border border-orange-500/80 bg-orange-600 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-orange-700 active:scale-[0.97] sm:w-auto sm:py-2 sm:text-xs"
            >
              Explore
            </button>
          </form>

          {showSuggestions && normalizedQuery && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-950 shadow-xl">
              {suggestions.length === 0 ? (
                <p className="px-4 py-3 text-sm text-zinc-600">No matching experiences yet.</p>
              ) : (
                <ul className="py-1">
                  {suggestions.map((suggestion) => (
                    <li key={suggestion.id}>
                      <Link
                        href={`/experiences/${suggestion.id}`}
                        onClick={() => setShowSuggestions(false)}
                        className="block px-4 py-2.5 transition hover:bg-zinc-100"
                      >
                        <p className="text-sm font-semibold text-zinc-950">{suggestion.title}</p>
                        <p className="text-xs text-zinc-600">{suggestion.location}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

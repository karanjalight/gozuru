"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/app/(landing)/components/Navbar"
import {
  fetchLandingExperiences,
  listImageTransform,
  type LandingExperiencesResult,
} from "@/lib/queries/experiences";

const HERO_IMAGES = [
  "https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg",
  "https://images.pexels.com/photos/870711/pexels-photo-870711.jpeg",
  "https://images.pexels.com/photos/775031/pexels-photo-775031.jpeg",
  "https://images.pexels.com/photos/2961969/pexels-photo-2961969.jpeg",
  "https://images.pexels.com/photos/1398688/pexels-photo-1398688.jpeg",
];

export function LandingHero({ initialData }: { initialData?: LandingExperiencesResult }) {
  const [index, setIndex] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const { theme, resolvedTheme } = useTheme();
  const router = useRouter();

  const currentTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = currentTheme === "dark";
  const normalizedQuery = searchValue.trim().toLowerCase();

  const { data } = useQuery({
    queryKey: ["landing", "hero-search-experiences"],
    queryFn: () => fetchLandingExperiences(24, listImageTransform),
    staleTime: 1000 * 60 * 10,
    enabled: normalizedQuery.length >= 2,
    initialData,
  });

  const suggestions = useMemo(() => {
    const experiences = data?.experiences ?? [];
    const locationByExperienceId = data?.locationByExperienceId ?? {};
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
  }, [data?.experiences, data?.locationByExperienceId, normalizedQuery]);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((prev) => (prev + 1) % HERO_IMAGES.length),
      6000
    );
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!searchContainerRef.current) return;
      const target = event.target as Node;
      if (!searchContainerRef.current.contains(target)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <section
      className={`relative flex min-h-[75vh] items-center justify-center overflow-hidden transition-colors ${
        isDark ? "bg-zinc-900 text-white" : "bg-zinc-500 text-zinc-900"
      }`}
    >
      <Navbar />

      {/* background carousel sits behind navbar and content */}
      <div className="absolute inset-0 -z-0">
        {HERO_IMAGES.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={src}
              alt="People enjoying an experience together"
              fill
              priority={i === 0}
              className="pointer-events-none object-cover"
            />
          </div>
        ))}
        <div
          className={`absolute inset-0 bg-gradient-to-b transition-colors ${
            isDark
              ? "from-black/90 via-black/65 to-black/90"
              : "from-black/80 via-black/40 to-black/70"
          }`}
        />
      </div>

      <div className="relative z-10 mx-auto flex    lg:w-[1040px] flex-col items-center gap-8 px-4 pt-16 text-center md:items-start md:text-left">
        <div
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-medium backdrop-blur transition-colors ${
            isDark ? "bg-white/10 text-white" : "bg-zinc-900/5 text-zinc-200"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Trusted hosts in cities worldwide
        </div>

        <div className="space-y-4">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl text-white">
            Access People Who Know. Anywhere.
          </h1>
          <p
            className={`max-w-xl text-balance text-sm sm:text-base transition-colors ${
              isDark ? "text-zinc-100/90" : "text-zinc-100"
            }`}
          >
            Book time with local experts for real conversations and immersive
            experiences, in person or virtual.
          </p>
        </div>

        {/* primary search bar */}
        <div ref={searchContainerRef} className="relative mt-4 w-full max-w-xl">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!searchValue.trim()) return;
              router.push(`/experiences?query=${encodeURIComponent(searchValue.trim())}`);
              setShowSuggestions(false);
            }}
            className="flex w-full items-stretch gap-2 rounded-full border border-zinc-300/90 bg-white/95 px-3 py-2 text-left text-zinc-900 shadow-md shadow-black/25 outline-none transition hover:bg-white focus-within:ring-2 focus-within:ring-orange-400 dark:border-zinc-500/80 dark:bg-zinc-900/95 dark:text-zinc-100"
          >
            <input
              value={searchValue}
              onChange={(event) => {
                setSearchValue(event.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search experiences by topic, city, or keyword"
              aria-label="Search experiences"
              className="flex-1 rounded-full bg-transparent px-4 py-2 text-xs font-medium text-zinc-900 placeholder:text-zinc-600 outline-none sm:text-sm dark:text-zinc-100 dark:placeholder:text-zinc-300"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full border border-orange-500/80 bg-orange-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-orange-700 sm:text-sm"
            >
              Search
            </button>
          </form>

          {showSuggestions && normalizedQuery && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-900 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              {suggestions.length === 0 ? (
                <p className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                  No matching experiences yet.
                </p>
              ) : (
                <ul className="py-1">
                  {suggestions.map((suggestion) => (
                    <li key={suggestion.id}>
                      <Link
                        href={`/experiences/${suggestion.id}`}
                        onClick={() => setShowSuggestions(false)}
                        className="block px-4 py-2.5 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {suggestion.title}
                        </p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300">
                          {suggestion.location}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* dots indicator */}
        <div
          className={`mt-2 lg:ml-5 p-1 rounded-full flex gap-1.5 transition-colors ${
            isDark ? "bg-black/30" : "bg-zinc-900/5"
          }`}
        >
          {HERO_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Show slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-4 bg-white"
                  : "w-2 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      </div>

    </section>
  );
}

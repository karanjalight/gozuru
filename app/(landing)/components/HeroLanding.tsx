"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Navbar } from "@/app/(landing)/components/Navbar";
import {
  pickExperienceCategory,
  type LandingExperiencesResult,
} from "@/lib/queries/experiences";

const HERO_BACKGROUND_IMAGE =
  "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg";

export function LandingHero({ initialData }: { initialData: LandingExperiencesResult }) {
  const [searchValue, setSearchValue] = useState("");
  const [cityValue, setCityValue] = useState("Nairobi");
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

  const interestCategories = useMemo(() => {
    const seen = new Map<string, { name: string; slug: string }>();
    for (const exp of initialData.experiences) {
      const category = pickExperienceCategory(exp.categories);
      if (category && !seen.has(category.slug)) {
        seen.set(category.slug, category);
      }
      if (seen.size >= 4) break;
    }
    return Array.from(seen.values());
  }, [initialData.experiences]);

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

  function goToExperiences() {
    const params = new URLSearchParams();
    if (searchValue.trim()) params.set("query", searchValue.trim());
    if (cityValue.trim()) params.set("city", cityValue.trim());
    if (!params.toString()) return;
    router.push(`/experiences?${params.toString()}`);
    setShowSuggestions(false);
  }

  return (
    <section
      className={`relative flex min-h-[80vh] items-center justify-center overflow-hidden transition-colors ${
        isDark ? "bg-zinc-900 text-white" : "bg-slate-950 text-white"
      }`}
    >
      <Navbar />

      <div className="absolute inset-0 -z-0">
        <Image
          src={HERO_BACKGROUND_IMAGE}
          alt="Travelers enjoying a Gozuru experience together"
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

      <div className="relative z-10 mx-auto flex lg:w-[1040px] flex-col items-center gap-6 px-4 pt-20 text-center md:items-start md:text-left">
        <div
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium backdrop-blur transition-colors ${
            isDark
              ? "bg-white/10 text-white"
              : "bg-white/15 text-white ring-1 ring-white/20"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Nairobi · Real people, real conversations
        </div>

        <div className="space-y-4">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl text-white">
            Reward Your Curiosity with Gozuru
          </h1>
          <p
            className={`max-w-xl text-balance text-sm sm:text-base leading-relaxed transition-colors ${
              isDark ? "text-zinc-100/90" : "text-zinc-100"
            }`}
          >
            Real people, real conversations — not just sightseeing.
          </p>
        </div>

        <div ref={searchContainerRef} className="relative mt-2 w-full max-w-xl text-zinc-950 [color-scheme:light]">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              goToExperiences();
            }}
            className="flex w-full items-stretch gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-left shadow-lg shadow-black/20 outline-none transition focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-400/40 hover:border-zinc-300"
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
              className="min-w-0 flex-[65] rounded-full border-0 bg-white px-4 py-2 text-sm font-medium text-zinc-950 caret-orange-600 placeholder:text-zinc-500 outline-none focus-visible:outline-none [&:-webkit-autofill]:[-webkit-text-fill-color:rgb(9_9_11)] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#fff_inset]"
            />
            <div className="w-px shrink-0 self-stretch bg-zinc-200" aria-hidden />
            <input
              value={cityValue}
              onChange={(event) => setCityValue(event.target.value)}
              placeholder="City"
              aria-label="City"
              className="min-w-0 flex-[35] rounded-full border-0 bg-white px-3 py-2 text-sm font-medium text-zinc-950 caret-orange-600 placeholder:text-zinc-500 outline-none focus-visible:outline-none"
            />
            <button
              type="submit"
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-orange-500/80 bg-orange-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-orange-700 sm:text-sm"
            >
              Explore
            </button>
          </form>

          {showSuggestions && normalizedQuery && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-950 shadow-xl">
              {suggestions.length === 0 ? (
                <p className="px-4 py-3 text-sm text-zinc-600">
                  No matching experiences yet — try a city or topic.
                </p>
              ) : (
                <ul className="py-1">
                  {suggestions.map((suggestion) => (
                    <li key={suggestion.id}>
                      <Link
                        href={`/experiences/${suggestion.id}`}
                        onClick={() => setShowSuggestions(false)}
                        className="block px-4 py-2.5 transition hover:bg-zinc-100"
                      >
                        <p className="text-sm font-semibold text-zinc-950">
                          {suggestion.title}
                        </p>
                        <p className="text-xs text-zinc-600">
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

        {interestCategories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {interestCategories.map((category) => (
              <Link
                key={category.slug}
                href={`/experiences?category=${encodeURIComponent(category.slug)}`}
                className="rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:border-white/40 hover:bg-white/20"
              >
                {category.name}
              </Link>
            ))}
          </div>
        ) : null}

        <Link
          href="/hosts"
          className={`text-xs font-medium underline-offset-4 transition hover:underline ${
            isDark ? "text-white/70 hover:text-white" : "text-white/80 hover:text-white"
          }`}
        >
          Are you the expert? Start hosting →
        </Link>
      </div>
    </section>
  );
}

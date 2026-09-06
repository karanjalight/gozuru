"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { MapPin, Search } from "lucide-react";
import { Navbar } from "@/app/(landing)/components/Navbar";
import {
  pickExperienceCategory,
  type LandingExperiencesResult,
} from "@/lib/queries/experiences";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

// Hero background carousel images
const HERO_BACKGROUND_IMAGES = [
  "/slidezuru.png",
  "/slidezuru2.png",
  "/slidezuru3.png",
  "/slidezuru4.png",
  // "https://images.pexels.com/photos/36713426/pexels-photo-36713426.jpeg",
  // "https://images.pexels.com/photos/7148409/pexels-photo-7148409.jpeg",
  
];

export function LandingHero({
  initialData,
}: {
  initialData: LandingExperiencesResult;
}) {
  const [searchValue, setSearchValue] = useState("");
  const [cityValue, setCityValue] = useState("Nairobi");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Hero carousel state
  const [currentHeroImage, setCurrentHeroImage] = useState(0);

  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const { theme, resolvedTheme } = useTheme();
  const router = useRouter();

  const currentTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = currentTheme === "dark";
  const normalizedQuery = searchValue.trim().toLowerCase();

  // Automatically move to the next hero image every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroImage(
        (previous) => (previous + 1) % HERO_BACKGROUND_IMAGES.length,
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const suggestions = useMemo(() => {
    const experiences = initialData.experiences;
    const locationByExperienceId = initialData.locationByExperienceId;

    if (!normalizedQuery) return [];

    return experiences
      .filter((exp) => {
        const location =
          locationByExperienceId[exp.id] || exp.meeting_point_name || "";
        const description = exp.description || "";

        return `${exp.title} ${location} ${description}`
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .slice(0, 6)
      .map((exp) => ({
        id: exp.id,
        title: exp.title,
        location:
          locationByExperienceId[exp.id] ||
          exp.meeting_point_name ||
          "Location shared after booking",
      }));
  }, [
    initialData.experiences,
    initialData.locationByExperienceId,
    normalizedQuery,
  ]);

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

    if (searchValue.trim()) {
      params.set("query", searchValue.trim());
    }

    if (cityValue.trim()) {
      params.set("city", cityValue.trim());
    }

    if (!params.toString()) return;

    router.push(`/experiences?${params.toString()}`);
    setShowSuggestions(false);
  }

  return (
    <section
      className={`relative flex min-h-[80dvh] items-center justify-center overflow-hidden transition-colors ${
        isDark ? "bg-zinc-900 text-white" : "bg-slate-950 text-white"
      }`}
    >
      <Navbar />

      {/* ================================
          HERO BACKGROUND CAROUSEL
          ================================ */}
      <div className="absolute inset-0 -z-0 overflow-hidden">
        {HERO_BACKGROUND_IMAGES.map((image, index) => (
          <motion.div
            key={image}
            className="absolute inset-0"
            initial={{
              opacity: index === 0 ? 1 : 0,
              scale: 1.05,
            }}
            animate={{
              opacity: index === currentHeroImage ? 1 : 0,
              scale: index === currentHeroImage ? 1 : 1.05,
            }}
            transition={{
              opacity: {
                duration: 1.4,
                ease: "easeInOut",
              },
              scale: {
                duration: 6,
                ease: "easeOut",
              },
            }}
          >
            <Image
              src={image}
              alt=""
              fill
              priority={index === 0}
              sizes="100vw"
              className="pointer-events-none object-cover"
            />
          </motion.div>
        ))}

        {/* Dark overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-r transition-colors ${
            isDark
              ? "from-black/90 via-black/65 to-black/60"
              : "from-black/95 via-slate-950/50 to-black/65"
          }`}
        />
      </div>

      {/* ================================
          HERO CONTENT
          ================================ */}
      <div className="relative z-10 mx-auto flex lg:w-[1040px] flex-col items-center gap-6 px-4 pt-20 text-center md:items-start md:text-left">
        <motion.div
          initial="hidden"
          animate="show"
          custom={0}
          variants={fadeUp}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium backdrop-blur transition-colors ${
            isDark
              ? "bg-white/10 text-white"
              : "bg-white/15 text-white ring-1 ring-white/20"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Nairobi · Real people, real conversations
        </motion.div>

        <motion.div
          initial="hidden"
          animate="show"
          custom={0.08}
          variants={fadeUp}
          className="space-y-4"
        >
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
        </motion.div>

        {/* ================================
            SEARCH
            ================================ */}
        <motion.div
          ref={searchContainerRef}
          initial="hidden"
          animate="show"
          custom={0.16}
          variants={fadeUp}
          className="relative mt-2 w-full max-w-xl text-zinc-950 [color-scheme:light]"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              goToExperiences();
            }}
            className="flex w-full flex-col gap-2 sm:flex-row sm:items-stretch sm:rounded-full sm:border sm:border-zinc-200 sm:bg-white sm:px-3 sm:py-2 sm:shadow-lg sm:shadow-black/20 sm:outline-none sm:transition sm:focus-within:border-orange-400 sm:focus-within:ring-2 sm:focus-within:ring-orange-400/40 sm:hover:border-zinc-300"
          >
            <div className="relative min-w-0 rounded-full border border-zinc-200 bg-white shadow-sm sm:flex-[65] sm:rounded-none sm:border-0 sm:bg-transparent sm:shadow-none">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />

              <input
                value={searchValue}
                onChange={(event) => {
                  setSearchValue(event.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="What are you curious about?"
                aria-label="Search experiences"
                className="w-full rounded-full border-0 bg-white py-3 pl-10 pr-4 text-sm font-medium text-zinc-950 caret-orange-600 placeholder:text-zinc-500 outline-none focus-visible:outline-none sm:py-2 [&:-webkit-autofill]:[-webkit-text-fill-color:rgb(9_9_11)] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#fff_inset]"
              />
            </div>

            <div
              className="hidden w-px shrink-0 self-stretch bg-zinc-200 sm:block"
              aria-hidden
            />

            <div className="relative min-w-0 rounded-full border border-zinc-200 bg-white shadow-sm sm:flex-[35] sm:rounded-none sm:border-0 sm:bg-transparent sm:shadow-none">
              <MapPin
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />

              <input
                value={cityValue}
                onChange={(event) => setCityValue(event.target.value)}
                placeholder="City"
                aria-label="City"
                className="w-full rounded-full border-0 bg-white py-3 pl-9 pr-3 text-sm font-medium text-zinc-950 caret-orange-600 placeholder:text-zinc-500 outline-none focus-visible:outline-none sm:py-2"
              />
            </div>

            <button
              type="submit"
              className="inline-flex w-full shrink-0 items-center justify-center rounded-full border border-orange-500/80 bg-orange-600 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-orange-700 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 sm:w-auto sm:py-2 sm:text-xs"
            >
              Explore
            </button>
          </form>

          {/* ================================
              SEARCH SUGGESTIONS
              ================================ */}
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
        </motion.div>

        {/* ================================
            INTEREST CATEGORIES
            ================================ */}
        {interestCategories.length > 0 ? (
          <motion.div
            initial="hidden"
            animate="show"
            custom={0.24}
            variants={fadeUp}
            className="flex flex-wrap gap-2"
          >
            {interestCategories.map((category) => (
              <Link
                key={category.slug}
                href={`/experiences?category=${encodeURIComponent(
                  category.slug,
                )}`}
                className="rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:border-white/40 hover:bg-white/20 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                {category.name}
              </Link>
            ))}
          </motion.div>
        ) : null}

        {/* ================================
            HOST LINK
            ================================ */}
        <motion.div
          initial="hidden"
          animate="show"
          custom={0.32}
          variants={fadeUp}
        >
          <Link
            href="/hosts"
            className={`text-xs font-medium underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:rounded-sm ${
              isDark
                ? "text-white/70 hover:text-white"
                : "text-white/80 hover:text-white"
            }`}
          >
            Are you the expert? Start hosting →
          </Link>
        </motion.div>

        {/* ================================
            CAROUSEL INDICATORS
            ================================ */}
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 md:left-auto md:right-0 md:translate-x-0">
          {HERO_BACKGROUND_IMAGES.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentHeroImage(index)}
              aria-label={`Show hero image ${index + 1}`}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                index === currentHeroImage
                  ? "w-8 bg-white"
                  : "w-1.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

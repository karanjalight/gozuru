"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Navbar } from "@/app/(landing)/components/Navbar"

const HERO_IMAGES = [
  "https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg",
  "https://images.pexels.com/photos/870711/pexels-photo-870711.jpeg",
  "https://images.pexels.com/photos/775031/pexels-photo-775031.jpeg",
  "https://images.pexels.com/photos/2961969/pexels-photo-2961969.jpeg",
  "https://images.pexels.com/photos/1398688/pexels-photo-1398688.jpeg",
];

export function LandingHero() {
  const [index, setIndex] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, resolvedTheme } = useTheme();

  const currentTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = currentTheme === "dark";

  useEffect(() => {
    const id = setInterval(
      () => setIndex((prev) => (prev + 1) % HERO_IMAGES.length),
      6000
    );
    return () => clearInterval(id);
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
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="mt-4 flex w-full max-w-xl items-stretch gap-2 rounded-full border border-gray-400/80 bg-white/90 px-3 py-2 text-left text-orange-700 shadow-md shadow-black/20 outline-none ring-0 transition hover:bg-white hover:shadow-lg focus-visible:ring-2 focus-visible:ring-orange-400 dark:bg-zinc-900/90 dark:text-orange-200 dark:border-orange-300/60"
        >
          <span className="flex-1 rounded-full border border-gray-400/80 bg-transparent px-4 py-2 text-xs font-medium text-gray-800 dark:text-gray-100 sm:text-sm">
            Find experts by topic, industry, or location
          </span>
          <span className="inline-flex items-center justify-center rounded-full border border-orange-400/80 bg-orange-500 text-white px-4 py-2 text-xs font-semibold uppercase tracking-wide sm:text-sm">
            Explore Experts
          </span>
        </button>

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

      {/* search modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 text-zinc-900 shadow-2xl dark:bg-zinc-950 dark:text-zinc-50">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold sm:text-lg">
                Search experiences
              </h2>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  City
                </label>
                <input
                  type="text"
                  placeholder="Where do you want to go?"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-300 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-orange-400"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-300 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Guests
                  </label>
                  <input
                    type="number"
                    min={1}
                    defaultValue={2}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-300 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-orange-400"
                  />
                </div>
              </div>

              <button
                type="button"
                className="mt-2 w-full rounded-full bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-orange-700"
              >
                Search experiences
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Navbar } from "@/app/(landing)/components/Navbar";
import type { LocalExpert } from "@/app/(landing)/lib/agents";

const HERO_IMAGES = [
  "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg",
  "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg",
  "https://images.pexels.com/photos/1267696/pexels-photo-1267696.jpeg",
  "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg",
  "https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg",
];

export function HeroExperts({ experts }: { experts: LocalExpert[] }) {
  const [index, setIndex] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const { theme, resolvedTheme } = useTheme();
  const router = useRouter();

  const currentTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = currentTheme === "dark";
  const normalizedQuery = searchValue.trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    return experts
      .filter((expert) => {
        const haystack =
          `${expert.name} ${expert.title} ${expert.specialty} ${expert.category}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .slice(0, 6);
  }, [experts, normalizedQuery]);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((prev) => (prev + 1) % HERO_IMAGES.length),
      6000,
    );
    return () => clearInterval(id);
  }, []);

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
      className={`relative flex min-h-[55vh] items-center justify-center overflow-hidden transition-colors ${
        isDark ? "bg-zinc-900 text-white" : "bg-slate-950 text-white"
      }`}
    >
      <Navbar />

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
              alt="Gozuru local experts"
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
              : "from-black/85 via-slate-950/50 to-black/85"
          }`}
        />
      </div>

      <div className="relative z-10 mx-auto flex lg:w-[1040px] flex-col items-center gap-8 px-4 pt-16 text-center md:items-start md:text-left">
        <div
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium backdrop-blur transition-colors ${
            isDark
              ? "bg-white/10 text-white"
              : "bg-white/15 text-white ring-1 ring-white/20"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Verified local experts worldwide
        </div>

        <div className="space-y-4">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl text-white">
            Meet the experts behind Gozuru
          </h1>
          <p
            className={`max-w-xl text-balance text-sm sm:text-base leading-relaxed transition-colors ${
              isDark ? "text-zinc-100/90" : "text-zinc-100"
            }`}
          >
            Hotel curators, culture guides, event hosts, and community builders —
            find the right person for your next experience.
          </p>
        </div>

        <div ref={searchContainerRef} className="relative mt-4 w-full max-w-xl text-zinc-950 [color-scheme:light]">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!searchValue.trim()) return;
              router.push(`/experts?query=${encodeURIComponent(searchValue.trim())}`);
              setShowSuggestions(false);
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
              placeholder="Search by name, city, or specialty"
              aria-label="Search experts"
              className="flex-1 rounded-full border-0 bg-white px-4 py-2 text-sm font-medium text-zinc-950 caret-orange-600 placeholder:text-zinc-500 outline-none focus-visible:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full border border-orange-500/80 bg-orange-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-orange-700 sm:text-sm"
            >
              Search
            </button>
          </form>

          {showSuggestions && normalizedQuery && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-950 shadow-xl">
              {suggestions.length === 0 ? (
                <p className="px-4 py-3 text-sm text-zinc-600">No matching experts yet.</p>
              ) : (
                <ul className="py-1">
                  {suggestions.map((expert) => (
                    <li key={expert.id}>
                      <Link
                        href={expert.profileHref ?? `/hosts/${expert.id}`}
                        onClick={() => setShowSuggestions(false)}
                        className="block px-4 py-2.5 transition hover:bg-zinc-100"
                      >
                        <p className="text-sm font-semibold text-zinc-950">{expert.name}</p>
                        <p className="text-xs text-zinc-600">{expert.specialty}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div
          className={`mt-2 lg:ml-5 p-1 rounded-full flex gap-1.5 transition-colors ${
            isDark ? "bg-black/30" : "bg-black/35"
          }`}
        >
          {HERO_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Show slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-4 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

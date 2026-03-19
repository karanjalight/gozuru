"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Navbar } from "@/app/(landing)/components/Navbar";

const HERO_IMAGES = [
  "https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg",
  "https://images.pexels.com/photos/870711/pexels-photo-870711.jpeg",
  "https://images.pexels.com/photos/775031/pexels-photo-775031.jpeg",
  "https://images.pexels.com/photos/2961969/pexels-photo-2961969.jpeg",
  "https://images.pexels.com/photos/1398688/pexels-photo-1398688.jpeg",
];

export function HostsHero() {
  const [index, setIndex] = useState(0);
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
      className={`relative flex min-h-[45vh] items-center justify-center overflow-hidden transition-colors ${
        isDark ? "bg-zinc-900 text-white" : "bg-zinc-500 text-zinc-900"
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
              alt="Local expert hosting a traveler"
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
              : "from-black/85 via-black/45 to-black/75"
          }`}
        />
      </div>

      <div className="relative z-10 mx-auto flex lg:w-[1040px] flex-col items-center gap-7 px-4 pt-16 text-center md:items-start md:text-left">
         

        <div className="space-y-4">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl text-white">
             Earn as you guide.
          </h1>
          <p className="max-w-2xl text-balance text-sm sm:text-base text-white/90">
            Turn your craft, profession, and local insight into hosted sessions
            for curious travelers—art, architecture, nightlife, music, medical,
            manufacturing, research, tech, and more.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-black/25 transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
          >
            Sign up to host
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            See how it works
          </Link>
        </div>

        <div
          className={`mt-1 p-1 rounded-full flex gap-1.5 transition-colors ${
            isDark ? "bg-black/30" : "bg-black/30"
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


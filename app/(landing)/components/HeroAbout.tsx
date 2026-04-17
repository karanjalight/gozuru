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

export function AboutHero() {
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
          About Gozuru
        </div>

        <div className="space-y-4">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl text-white">
            How it works
          </h1>
          <p
            className={`max-w-xl text-balance text-sm sm:text-base transition-colors ${
              isDark ? "text-zinc-100/90" : "text-zinc-100"
            }`}
          > Share meals, stories, and memories in the cities you visit
            and the neighborhoods you love.
          </p>
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

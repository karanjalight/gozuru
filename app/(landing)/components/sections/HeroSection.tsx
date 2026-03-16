"use client";

import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Compass } from "lucide-react";
import { GlobeVisual } from "../GlobeVisual";
import { HeroCTA } from "./HeroCTA";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function HeroSection() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <section
      className={`relative min-h-[90vh] flex flex-col justify-center overflow-hidden lg:min-h-[88vh] ${
        isDark ? "bg-gradient-to-b from-black to-gray-950" : "bg-background"
      }`}
    >
      {/* Globe: same as 404 (world-cities), theme-aware */}
      <div className={`absolute inset-0 z-0 lg:left-[30%] ${isDark ? "bg-[#0a0a0f]" : "bg-background"}`}>
        <GlobeVisual variant="hero" className="inset-0" />
      </div>

      {/* Overlay: dark = left gradient; light = softer gradient so globe shows + readable text */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        aria-hidden
      >
        {isDark ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/85 to-transparent lg:via-[#0a0a0f]/70" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_30%_50%,rgba(0,0,0,0.4),transparent)] lg:bg-[radial-gradient(ellipse_80%_70%_at_25%_50%,rgba(0,0,0,0.5),transparent)]" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent lg:via-background/65" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_25%_50%,rgba(255,255,255,0.5),transparent)]" />
          </>
        )}
      </div>

      <div className="relative z-20 mx-auto w-full max-w-7xl px-4 pt-28 pb-24 sm:px-6 lg:px-8 lg:pt-32">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
          <motion.div
            className={`max-w-xl ${!isDark ? "[text-shadow:0_1px_3px_rgba(255,255,255,0.9),0_0_20px_rgba(255,255,255,0.4)]" : ""}`}
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div
              variants={item}
              className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm backdrop-blur-sm ${
                isDark
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-foreground/20 bg-foreground/5 text-foreground"
              }`}
            >
              <Compass className="size-4" aria-hidden />
              <span>The Airbnb of curious travelers</span>
            </motion.div>
            <motion.h1
              variants={item}
              className={`text-5xl font-bold tracking-tight sm:text-6xl ${
                isDark ? "text-white" : "text-foreground"
              }`}
            >
              Reward Your{" "}
              <span className="dark:bg-gradient-to-r dark:from-emerald-600 dark:to-teal-600 bg-clip-text bg-teal-600 text-transparent">
                Curiosity
              </span>
            </motion.h1>
            <motion.p
              variants={item}
              className={`mt-6 text-lg leading-relaxed sm:text-lg ${
                isDark ? "text-white/90" : "text-foreground/90"
              }`}
            >
              Connect with local experts. Discover hidden gems, stories, and
              knowledge — not just sights. Human connection, one experience at a
              time.
            </motion.p>
            <motion.div variants={item} className="mt-10">
              <HeroCTA />
            </motion.div>
          </motion.div>

          <div className="hidden lg:block lg:relative lg:min-h-[400px]" aria-hidden />
        </div>
      </div>
    </section>
  );
}

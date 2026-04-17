"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Compass, ArrowRight } from "lucide-react";
import { Section } from "./Section";

export function CTASection() {
  return (
    <Section>
      <motion.div
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 to-orange-900/90 px-6 py-16 text-center shadow-xl shadow-orange-500/20 sm:px-12 lg:px-20"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_120%,rgba(255,255,255,0.15),transparent)]" />
        <div className="relative">
          <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-white/20">
            <Compass className="size-7 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl [font-family:var(--font-heading)]">
            Start Exploring Differently
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">
            Discover people. Book experiences. Learn from those who live it.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-8 text-base font-semibold text-orange-500 shadow-lg transition hover:bg-white/95 hover:shadow-xl"
              >
                Become a Host
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="#experts"
                className="inline-flex h-12 items-center justify-center rounded-full border-2 border-white/50 px-8 text-base font-medium text-white transition hover:bg-white/15"
              >
                Explore Experts
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </Section>
  );
}

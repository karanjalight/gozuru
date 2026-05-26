"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Compass, ArrowRight } from "lucide-react";
import { Section } from "./Section";

const CTA_BACKGROUND_IMAGE =
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1600&h=900&fit=crop";
const CTA_FEATURE_IMAGE =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&h=1100&fit=crop";
const CTA_ACCENT_IMAGE =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=700&h=520&fit=crop";

export function CTASection() {
  return (
    <Section>
      <motion.div
        className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-8 shadow-2xl shadow-slate-950/40 ring-1 ring-white/10 sm:px-8 lg:px-10"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${CTA_BACKGROUND_IMAGE})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/95 via-slate-950/85 to-indigo-950/75" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.22),transparent_34%),radial-gradient(circle_at_85%_72%,rgba(129,140,248,0.24),transparent_32%)]" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-slate-950/45 to-transparent" />

        <div className="relative grid items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-12">
          <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
            <div className="inline-flex items-center gap-3 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md">
              <span className="flex size-9 items-center justify-center rounded-full bg-sky-400/15 text-white ring-1 ring-sky-200/30">
                <Compass className="size-5" />
              </span>
              Experiences led by real local experts
            </div>

            <h2 className="mt-7 text-4xl font-bold tracking-tight text-white sm:text-5xl [font-family:var(--font-heading)]">
              Start Exploring Differently
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/85 sm:text-xl">
              Discover people, book experiences, and learn from those who live
              the stories behind every place.
            </p>

            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row lg:items-start">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/sign-up"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-8 text-base font-semibold text-slate-950 shadow-xl shadow-black/20 transition hover:bg-slate-100"
                >
                  Become a Host
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="#experts"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/45 bg-white/10 px-8 text-base font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-white/20"
                >
                  Explore Experts
                </Link>
              </motion.div>
            </div>
          </div>

          <div className="relative hidden min-h-[360px] lg:block">
            <div
              aria-hidden
              className="absolute right-0 top-0 h-[330px] w-[68%] rounded-[2rem] bg-cover bg-center shadow-2xl ring-1 ring-white/20"
              style={{ backgroundImage: `url(${CTA_FEATURE_IMAGE})` }}
            />
            <div
              aria-hidden
              className="absolute bottom-0 left-4 h-48 w-[52%] rounded-[1.5rem] bg-cover bg-center shadow-2xl ring-1 ring-white/20"
              style={{ backgroundImage: `url(${CTA_ACCENT_IMAGE})` }}
            />
            <div className="absolute bottom-8 right-10 rounded-2xl bg-white/90 p-4 text-left shadow-2xl backdrop-blur-md">
              <p className="text-sm font-semibold text-slate-950">156+ experts</p>
              <p className="mt-1 max-w-[12rem] text-xs leading-5 text-slate-600">
                Conversations, field visits, and practical local knowledge.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </Section>
  );
}

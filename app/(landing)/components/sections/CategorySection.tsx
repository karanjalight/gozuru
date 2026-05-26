"use client";

import { motion } from "framer-motion";
import {
  BriefcaseBusiness,
  GraduationCap,
  Hotel,
  Palette,
  MapPin,
  Rocket,
  Sprout,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Section } from "./Section";
import { categories } from "../../lib/data";
import { cn } from "@/lib/utils";

const iconMap = {
  BriefcaseBusiness,
  GraduationCap,
  Hotel,
  Palette,
  Rocket,
  Sprout,
  MapPin,
};

export function CategorySection() {
  return (
    <Section id="categories" className="bg-muted/20 scroll-mt-20">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl [font-family:var(--font-heading)]">
            Explore by Interest
          </h2>
          <p className="mt-3 text-muted-foreground">
            Find experts and experiences that match what you care about.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat, i) => {
            const Icon =
              iconMap[cat.icon as keyof typeof iconMap] ?? MapPin;
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{ y: -6 }}
                className="h-full"
              >
                <Card
                  className={cn(
                    "group relative h-full min-h-[280px] cursor-pointer overflow-hidden rounded-3xl border-0 bg-slate-950 p-0 text-white shadow-lg ring-1 ring-black/5 transition-all duration-300",
                    "hover:shadow-2xl hover:shadow-orange-500/20"
                  )}
                >
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${cat.image})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/20" />
                  <div className="absolute inset-0 bg-orange-950/10" />

                  <CardContent className="relative flex min-h-[280px] flex-col justify-between p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm ring-1 ring-white/25 backdrop-blur-md">
                        <Icon className="size-6" />
                      </div>
                      <p className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white shadow-sm ring-1 ring-white/20 backdrop-blur-md">
                        {cat.expertCount} experts
                      </p>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold leading-tight text-white [font-family:var(--font-heading)]">
                        {cat.name}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/80">
                        {cat.description}
                      </p>
                      <div className="mt-5 inline-flex items-center gap-1 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-950/30 transition group-hover:bg-orange-400">
                        <span>Explore</span>
                        <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </Section>
  );
}

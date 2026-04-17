"use client";

import { motion } from "framer-motion";
import {
  Landmark,
  UtensilsCrossed,
  TreePine,
  Palette,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Section } from "./Section";
import { categories } from "../../lib/data";
import { cn } from "@/lib/utils";

const iconMap = {
  Landmark,
  UtensilsCrossed,
  TreePine,
  Palette,
  MapPin,
};

export function CategorySection() {
  return (
    <Section className="bg-muted/20">
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
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              >
                <Card
                  className={cn(
                    "group cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300",
                    "hover:shadow-md hover:border-primary/20 hover:bg-card"
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                      <Icon className="size-6" />
                    </div>
                    <h3 className="mt-3 font-semibold text-foreground [font-family:var(--font-heading)]">
                      {cat.name}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {cat.description}
                    </p>
                    <p className="mt-3 text-xs font-medium text-muted-foreground">
                      {cat.expertCount} experts
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-sm font-medium text-orange-500">
                      <span>Explore</span>
                      <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
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

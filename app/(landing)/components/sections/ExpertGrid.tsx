"use client";

import { motion } from "framer-motion";
import { Section } from "./Section";
import { ExpertCard } from "./ExpertCard";
import { experts } from "../../lib/data";

export function ExpertGrid() {
  return (
    <Section id="experts" className="scroll-mt-20">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl [font-family:var(--font-heading)]">
            Explore Experts
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-muted-foreground">
            Connect with local gurus who share their city, craft, and stories —
            not just tours.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {experts.map((expert, i) => (
            <ExpertCard key={expert.id} expert={expert} index={i} />
          ))}
        </div>
        <div className="mt-12 text-center">
          <motion.a
            href="#"
            className="inline-flex items-center justify-center rounded-full border-2 border-border bg-background px-8 py-3 text-sm font-medium text-foreground shadow-sm transition-all duration-300 hover:scale-[1.03] hover:border-foreground/20 hover:shadow-md"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            View all experts
          </motion.a>
        </div>
      </motion.div>
    </Section>
  );
}

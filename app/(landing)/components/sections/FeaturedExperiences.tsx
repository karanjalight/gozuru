"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Section } from "./Section";
import { experiences } from "../../lib/data";

export function FeaturedExperiences() {
  return (
    <Section id="experiences">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl [font-family:var(--font-heading)]">
              Popular Experiences
            </h2>
            <p className="mt-3 text-muted-foreground">
              Curated one-of-a-kind experiences with local experts.
            </p>
          </div>
          <Link
            href="#"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all experiences
          </Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {experiences.map((exp, i) => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -4 }}
            >
              <Link href={`/experiences/${exp.id}`}>
                <Card className="overflow-hidden rounded-2xl border-2 border-border shadow-md transition-all duration-300 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/10">
                  <div className="relative aspect-[3/2] overflow-hidden bg-muted">
                    <Image
                      src={exp.image}
                      alt={exp.title}
                      fill
                      className="object-cover transition duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-lg bg-background/90 px-3 py-2 backdrop-blur-sm">
                      <span className="font-semibold text-foreground">
                        {exp.price}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {exp.duration}
                      </span>
                    </div>
                  </div>
                  <CardContent className="p-5 sm:p-6">
                    <h3 className="text-lg font-semibold text-foreground [font-family:var(--font-heading)]">
                      {exp.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {exp.description}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {exp.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {exp.duration}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-primary">
                      with {exp.expertName}
                    </p>
                    <div className="mt-4 flex">
                      <span className="inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-md shadow-orange-500/30 transition hover:bg-orange-600">
                        View experience
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Section>
  );
}

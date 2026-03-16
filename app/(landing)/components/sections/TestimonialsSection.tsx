"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Section } from "./Section";
import { testimonials } from "../../lib/data";

export function TestimonialsSection() {
  return (
    <Section className="bg-muted/30">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl [font-family:var(--font-heading)]">
            What travelers say
          </h2>
          <p className="mt-3 text-muted-foreground">
            Real stories from people who chose curiosity.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Card className="h-full overflow-hidden rounded-2xl border-2 border-border bg-card shadow-md">
                <CardContent className="p-6 sm:p-8">
                  <Quote className="size-10 text-orange-500/20" />
                  <blockquote className="mt-4 text-foreground leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <div className="mt-6 flex items-center gap-3">
                    <Avatar className="size-12 rounded-xl border-2 border-border">
                      <AvatarImage src={t.avatar} alt={t.author} />
                      <AvatarFallback className="rounded-xl bg-orange-500/15 text-orange-500 font-medium">
                        {t.author.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">{t.author}</p>
                      <p className="text-sm text-muted-foreground">
                        {t.role} · {t.location}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Section>
  );
}

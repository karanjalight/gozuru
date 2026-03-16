"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, Star } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Expert } from "../../lib/data";
import { cn } from "@/lib/utils";

interface ExpertCardProps {
  expert: Expert;
  index?: number;
}

export function ExpertCard({ expert, index = 0 }: ExpertCardProps) {
  const initials = expert.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      whileHover={{ y: -6 }}
      className="h-full"
    >
      <Link href={`/experts/${expert.id}`} className="block h-full">
        <Card
          className={cn(
            "h-full overflow-hidden rounded-2xl border-2 border-border bg-card shadow-md transition-all duration-300",
            "hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10"
          )}
        >
          <CardHeader className="p-0">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
              <Image
                src={expert.image}
                alt={expert.name}
                fill
                className="object-cover transition duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-background/95 px-2.5 py-1 text-xs font-semibold text-foreground shadow backdrop-blur-sm">
                <Star className="size-3.5 fill-amber-500 text-amber-500" aria-hidden />
                {expert.rating}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Avatar className="size-12 shrink-0 rounded-xl border-2 border-border shadow-sm">
                <AvatarImage src={expert.image} alt={expert.name} />
                <AvatarFallback className="rounded-xl bg-primary/15 text-primary font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground text-lg [font-family:var(--font-heading)]">
                  {expert.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {expert.title}
                </p>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  <span>{expert.location}</span>
                </div>
              </div>
            </div>
            <p className="mt-4 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
              {expert.shortBio}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {expert.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="rounded-lg border border-border bg-secondary/80 px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
          <CardFooter className="border-t text-center bg-amber-600 border-border  px-5 py-4 sm:px-6">
            <span className="text-sm  text-white font-semibold text-center ">
              Book a meeting →
            </span>
          </CardFooter>
        </Card>
      </Link>
    </motion.div>
  );
}

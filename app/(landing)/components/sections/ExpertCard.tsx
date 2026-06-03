"use client";

import Link from "next/link";
import Image from "next/image";
import { ExperienceMediaDisplay } from "@/components/experience/ExperienceMediaDisplay";
import type { ExperienceMediaItem } from "@/lib/experience-media";
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
  /** When set, card links here (e.g. public host profile). Otherwise `/experts/:id`. */
  linkHref?: string;
  /** Experience cover when host has no avatar (supports video). */
  headerMedia?: ExperienceMediaItem;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop";

function getSafeImageSrc(src: string): string {
  try {
    const url = new URL(src);
    if (
      [
        "images.unsplash.com",
        "images.pexels.com",
        "omeztanuxcfpmnpenicd.supabase.co",
      ].includes(url.hostname)
    ) {
      return src;
    }
  } catch {
    if (src.startsWith("/")) return src;
  }

  return FALLBACK_IMAGE;
}

export function ExpertCard({ expert, index = 0, linkHref, headerMedia }: ExpertCardProps) {
  const imageSrc = getSafeImageSrc(expert.image);
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
      <Link href={linkHref ?? `/experts/${expert.id}`} className="block h-full">
        <Card
          className={cn(
            "h-full overflow-hidden  rounded-2xl border-2 border-border bg-card shadow-md transition-all duration-300",
            "hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10"
          )}
        >
          <CardHeader className="p-0 -mt-4 ">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
              {headerMedia ? (
                <ExperienceMediaDisplay
                  media={headerMedia}
                  alt={expert.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  videoAutoplay
                  showVideoBadge={false}
                />
              ) : (
                <Image
                  src={imageSrc}
                  alt={expert.name}
                  fill
                  unoptimized
                  className="object-cover object-center transition duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              )}
              <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-background/95 px-2.5 py-1 text-xs font-semibold text-foreground shadow backdrop-blur-sm">
                <Star className="size-3.5 fill-amber-500 text-amber-500" aria-hidden />
                {expert.rating}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Avatar className="size-12 shrink-0 rounded-xl border-2 border-border shadow-sm">
                <AvatarImage src={imageSrc} alt={expert.name} />
                <AvatarFallback className="rounded-xl bg-primary/15 text-primary font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground text-lg [font-family:var(--font-heading)]">
                  {expert.name}
                </h3>
                {/* <p className="text-sm text-muted-foreground line-clamp-1">
                  {expert.title}
                </p> */}
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  <span>{expert.location}</span>
                </div>
              </div>
            </div>
            <p className="mt-4 line-clamp-1 text-sm text-muted-foreground leading-relaxed">
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

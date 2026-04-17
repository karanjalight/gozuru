"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { Section } from "./Section";

type ExperienceRow = {
  id: string;
  title: string;
  description: string | null;
  subtitle: string | null;
  duration_minutes: number | null;
  price_amount: number | null;
  currency: string;
  meeting_point_name: string | null;
  created_at: string;
};

type ExperienceMediaRow = {
  experience_id: string;
  storage_path: string;
  sort_order: number;
};

type ExperienceLocationRow = {
  experience_id: string;
  city: string | null;
  country_region: string | null;
};

export function FeaturedExperiences() {
  const [experiences, setExperiences] = useState<ExperienceRow[]>([]);
  const [coverByExperienceId, setCoverByExperienceId] = useState<Record<string, string>>({});
  const [locationByExperienceId, setLocationByExperienceId] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;

    const loadExperiences = async () => {
      const { data: rows } = await supabase
        .from("experiences")
        .select("id,title,description,subtitle,duration_minutes,price_amount,currency,meeting_point_name,created_at")
        .order("created_at", { ascending: false })
        .limit(6);

      if (!mounted) return;
      const feedRows = (rows ?? []) as ExperienceRow[];
      setExperiences(feedRows);

      if (feedRows.length === 0) {
        setCoverByExperienceId({});
        setLocationByExperienceId({});
        return;
      }

      const experienceIds = feedRows.map((row) => row.id);

      const { data: mediaRows } = await supabase
        .from("experience_media")
        .select("experience_id,storage_path,sort_order")
        .in("experience_id", experienceIds)
        .order("sort_order", { ascending: true });

      if (mounted) {
        const coverMap: Record<string, string> = {};
        for (const mediaRow of (mediaRows ?? []) as ExperienceMediaRow[]) {
          if (coverMap[mediaRow.experience_id]) continue;
          const {
            data: { publicUrl },
          } = supabase.storage.from("experience-media").getPublicUrl(mediaRow.storage_path);
          coverMap[mediaRow.experience_id] = publicUrl;
        }
        setCoverByExperienceId(coverMap);
      }

      const { data: locationRows } = await supabase
        .from("experience_locations")
        .select("experience_id,city,country_region")
        .in("experience_id", experienceIds);

      if (mounted) {
        const nextLocationMap: Record<string, string> = {};
        for (const location of (locationRows ?? []) as ExperienceLocationRow[]) {
          if (location.city && location.country_region) {
            nextLocationMap[location.experience_id] = `${location.city}, ${location.country_region}`;
          } else if (location.city) {
            nextLocationMap[location.experience_id] = location.city;
          } else if (location.country_region) {
            nextLocationMap[location.experience_id] = location.country_region;
          }
        }
        setLocationByExperienceId(nextLocationMap);
      }
    };

    void loadExperiences();

    return () => {
      mounted = false;
    };
  }, []);

  const cards = useMemo(() => {
    return experiences.map((exp) => {
      const durationHours = exp.duration_minutes ? Math.max(1, Math.round(exp.duration_minutes / 60)) : null;
      const durationLabel = durationHours ? `${durationHours} hour${durationHours > 1 ? "s" : ""}` : "Flexible";
      const priceLabel =
        exp.price_amount && Number(exp.price_amount) > 0
          ? `${exp.currency} ${Number(exp.price_amount).toFixed(2)}`
          : "Price on request";
      const locationLabel =
        locationByExperienceId[exp.id] || exp.meeting_point_name || "Location shared after booking";
      const expertName = exp.subtitle?.split(" led by ").at(1)?.trim() || "Local Host";
      return {
        ...exp,
        durationLabel,
        priceLabel,
        locationLabel,
        expertName,
        image: coverByExperienceId[exp.id],
      };
    });
  }, [coverByExperienceId, experiences, locationByExperienceId]);

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
              Popular on Gozuru
            </h2>
            <p className="mt-3 text-muted-foreground">
              Real conversations and immersive experiences.
            </p>
          </div>
          <Link
            href="/experiences"
            className="text-sm font-medium text-primary hover:underline"
          >
            See More Experiences
          </Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((exp, i) => (
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
                    {exp.image ? (
                      <Image
                        src={exp.image}
                        alt={exp.title}
                        fill
                        className="object-cover transition duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                        No media uploaded
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-lg bg-background/90 px-3 py-2 backdrop-blur-sm">
                      <span className="font-semibold text-foreground">
                        {exp.priceLabel}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {exp.durationLabel}
                      </span>
                    </div>
                  </div>
                  <CardContent className="p-5 sm:p-6">
                    <h3 className="text-lg font-semibold text-foreground [font-family:var(--font-heading)]">
                      {exp.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {exp.description || "Discover this host-led experience."}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {exp.locationLabel}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {exp.durationLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-primary">
                      with {exp.expertName}
                    </p>
                    <div className="mt-4  flex">
                      <span className="inline-flex w-full items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold   tracking-wide text-white shadow-md shadow-orange-500/30 transition hover:bg-orange-600">
                        View Experience
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

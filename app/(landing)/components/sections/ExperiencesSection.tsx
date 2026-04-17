"use client";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type WhenFilter =
  | "all"
  | "tomorrow"
  | "this-week"
  | "dinners"
  | "cooking-classes"
  | "food-tours";

type ExperienceRow = {
  id: string;
  title: string;
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

export function ExperiencesGrid() {
  const [activeFilter, setActiveFilter] = useState<WhenFilter>("tomorrow");
  const [experiences, setExperiences] = useState<ExperienceRow[]>([]);
  const [coverByExperienceId, setCoverByExperienceId] = useState<Record<string, string>>({});
  const [locationByExperienceId, setLocationByExperienceId] = useState<Record<string, string>>({});
  const [currentTimestamp, setCurrentTimestamp] = useState(0);

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) {
        setCurrentTimestamp(Date.now());
      }
    });

    const loadExperiences = async () => {
      const { data: rows } = await supabase
        .from("experiences")
        .select("id,title,subtitle,duration_minutes,price_amount,currency,meeting_point_name,created_at")
        .order("created_at", { ascending: false })
        .limit(24);

      if (!mounted) return;
      const experienceRows = (rows ?? []) as ExperienceRow[];
      setExperiences(experienceRows);

      if (experienceRows.length === 0) {
        setCoverByExperienceId({});
        setLocationByExperienceId({});
        return;
      }

      const ids = experienceRows.map((row) => row.id);
      const { data: mediaRows } = await supabase
        .from("experience_media")
        .select("experience_id,storage_path,sort_order")
        .in("experience_id", ids)
        .order("sort_order", { ascending: true });

      if (mounted) {
        const nextCoverMap: Record<string, string> = {};
        for (const mediaRow of (mediaRows ?? []) as ExperienceMediaRow[]) {
          if (nextCoverMap[mediaRow.experience_id]) continue;
          const {
            data: { publicUrl },
          } = supabase.storage.from("experience-media").getPublicUrl(mediaRow.storage_path);
          nextCoverMap[mediaRow.experience_id] = publicUrl;
        }
        setCoverByExperienceId(nextCoverMap);
      }

      const { data: locationRows } = await supabase
        .from("experience_locations")
        .select("experience_id,city,country_region")
        .in("experience_id", ids);

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

  const normalizedExperiences = useMemo(
    () =>
      experiences.map((exp) => {
        const subtitle = exp.subtitle?.toLowerCase() ?? "";
        let type: WhenFilter = "food-tours";
        let tag = "Experience";
        if (subtitle.includes("dinner")) {
          type = "dinners";
          tag = "Dinner";
        } else if (subtitle.includes("cook")) {
          type = "cooking-classes";
          tag = "Cooking class";
        }

        const createdAt = new Date(exp.created_at).getTime();
        const twoDaysMs = 1000 * 60 * 60 * 24 * 2;
        const when: WhenFilter = currentTimestamp - createdAt <= twoDaysMs ? "tomorrow" : "this-week";
        const durationHours = exp.duration_minutes ? Math.max(1, Math.round(exp.duration_minutes / 60)) : null;
        const durationLabel = durationHours ? `${durationHours}h` : "Flexible";
        const price =
          exp.price_amount && Number(exp.price_amount) > 0
            ? `${exp.currency} ${Number(exp.price_amount).toFixed(2)}`
            : "Price on request";

        return {
          id: exp.id,
          title: exp.title,
          location:
            locationByExperienceId[exp.id] || exp.meeting_point_name || "Location shared after booking",
          tag,
          when,
          type,
          rating: 5.0,
          reviews: 0,
          price,
          durationLabel,
          image: coverByExperienceId[exp.id] || "",
        };
      }),
    [coverByExperienceId, currentTimestamp, experiences, locationByExperienceId],
  );

  const filteredExperiences = normalizedExperiences.filter((exp) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "tomorrow" || activeFilter === "this-week") {
      return exp.when === activeFilter;
    }
    return exp.type === activeFilter;
  });

  return (
    <section
      id="experiences"
      className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 lg:px-6 lg:py-14 text-zinc-900  transition-colors"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
              Trust at a glance
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-4xl">
              Real people. Real insight.
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Verified experts, instant booking, virtual or in-person, secure payments.
            </p>
          </div>
          <Link
            href="/experiences"
            className="inline-flex items-center text-sm font-semibold text-orange-500 hover:text-orange-600"
          >
            Browse all experiences
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-300">
          {[
            "Verified experts & guides",
            "Bookable instantly",
            "Virtual or in-person",
            "Secure payments",
          ].map((item) => (
            <span
              key={item}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {item}
            </span>
          ))}
        </div>

        <div className="flex w-full flex-wrap gap-6 text-sm text-zinc-500 dark:text-zinc-400">
          {(
            [
              { id: "all", label: "All" },
              { id: "tomorrow", label: "Latest" },
              { id: "this-week", label: "This week" },
              { id: "dinners", label: "Dinners" },
              { id: "cooking-classes", label: "Classes" },
              { id: "food-tours", label: "Tours" },
            ] as { id: WhenFilter; label: string }[]
          ).map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`pb-1 text-sm font-semibold transition-colors sm:text-md ${
                  isActive
                    ? "border-b-2 border-orange-500 text-orange-500"
                    : "border-b-2 border-transparent hover:text-orange-500"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredExperiences.map((exp) => (
          <article
            key={exp.id}
            className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm transition hover:-translate-y-1.5 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="relative h-80 w-full">
              {exp.image ? (
                <Image
                  src={exp.image}
                  alt={exp.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                  No media uploaded
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-3  left-3 right-3 flex items-end justify-between gap-3 text-xs text-white">
                <div className="space-y-1  w-full">
                  <span className="inline-flex items-center rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    {exp.tag}
                  </span>
                  <h3 className="line-clamp-2 text-sm font-semibold">
                    {exp.title}
                  </h3>
                  <p className="text-lg  uppercase  ">{exp.location}</p>

                  <div className="flex items-center justify-between gap-4 text-[15px] sm:text-md">
                    <div className="flex items-center gap-1 ">
                      <span className="text-[13px] text-amber-400">★</span>
                      <span className="font-semibold">{exp.rating.toFixed(1)}</span>
                      <span className="text-zinc-700">({exp.reviews.toLocaleString()})</span>
                    </div>
                    <div className="text-right text-zinc-700 dark:text-zinc-700">
                      <span className="text-sm font-semibold ">
                        {exp.price}
                      </span>
                      <span className="ml-1 text-[11px] text-black dark:text-zinc-400">
                        /guest
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link
                      href={`/experiences/${exp.id}`}
                      className="inline-flex w-full items-center justify-center rounded-full bg-zinc-900 px-4 py-4 text-[15px] font-semibold tracking-wide text-white shadow-sm transition hover:bg-zinc-800 dark:bg-orange-500 dark:hover:bg-orange-600"
                    >
                      View details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

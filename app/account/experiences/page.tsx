"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CircleCheckBig,
  Clock3,
  FileText,
  MapPin,
  PlusSquare,
  Sparkles,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type HostExperience = {
  id: string;
  title: string;
  status: string;
  subtitle: string | null;
  meeting_point_name: string | null;
  duration_minutes: number | null;
  price_amount: number | null;
  currency: string;
  max_guests: number;
  requirements: string[];
  created_at: string;
  categories: { name: string } | { name: string }[] | null;
};

type ExperienceMedia = {
  experience_id: string;
  storage_path: string;
};

export default function ExperiencesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [experiences, setExperiences] = useState<HostExperience[]>([]);
  const [coverByExperienceId, setCoverByExperienceId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const publishedCount = experiences.filter((exp) => exp.status === "published").length;
  const inReviewCount = experiences.filter((exp) => exp.status.includes("review")).length;

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => {
        setExperiences([]);
        setLoading(false);
      });
      return;
    }

    let mounted = true;

    const loadExperiences = async () => {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from("experiences")
        .select("id,title,status,subtitle,meeting_point_name,duration_minutes,price_amount,currency,max_guests,requirements,created_at,categories(name)")
        .eq("host_user_id", user.id)
        .order("created_at", { ascending: false });

      if (!mounted) return;
      if (queryError) {
        setError(queryError.message);
        setExperiences([]);
      } else {
        const rows = (data ?? []) as unknown as HostExperience[];
        setExperiences(rows);

        if (rows.length > 0) {
          const experienceIds = rows.map((row) => row.id);
          const { data: mediaRows } = await supabase
            .from("experience_media")
            .select("experience_id,storage_path,sort_order")
            .in("experience_id", experienceIds)
            .order("sort_order", { ascending: true });

          if (mounted && mediaRows) {
            const nextMap: Record<string, string> = {};
            for (const mediaRow of mediaRows as Array<ExperienceMedia & { sort_order: number }>) {
              if (nextMap[mediaRow.experience_id]) continue;
              const {
                data: { publicUrl },
              } = supabase.storage.from("experience-media").getPublicUrl(mediaRow.storage_path);
              nextMap[mediaRow.experience_id] = publicUrl;
            }
            setCoverByExperienceId(nextMap);
          }
        } else {
          setCoverByExperienceId({});
        }
      }
      setLoading(false);
    };

    void loadExperiences();

    return () => {
      mounted = false;
    };
  }, [user]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-700">
            <Sparkles className="size-3.5" />
            Host dashboard
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Experiences</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your live and draft experiences in one place.
          </p>
        </div>
        <Button
          type="button"
          className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
          onClick={() => router.push("/account/experiences/create")}
        >
          <PlusSquare className="mr-2 size-4" />
          Create experience
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Total experiences
          </p>
          <p className="mt-2 text-2xl font-bold">{experiences.length}</p>
        </Card>
        <Card className="rounded-2xl border-border bg-card p-4">
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <CircleCheckBig className="size-3.5" />
            Published
          </p>
          <p className="mt-2 text-2xl font-bold">{publishedCount}</p>
        </Card>
        <Card className="rounded-2xl border-border bg-card p-4">
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Clock3 className="size-3.5" />
            In review
          </p>
          <p className="mt-2 text-2xl font-bold">{inReviewCount}</p>
        </Card>
      </div>

      <div className="mt-8">
        {error ? (
          <Card className="rounded-2xl border-border bg-card p-6 text-sm text-red-500">
            Failed to load experiences: {error}
          </Card>
        ) : null}
        {loading ? (
          <Card className="rounded-2xl border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">Loading experiences...</p>
          </Card>
        ) : null}
        {!loading && experiences.length === 0 ? (
          <Card className="rounded-2xl border-border bg-card p-12 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-orange-50 text-orange-600">
              <FileText className="size-5 text-muted-foreground" />
            </div>

            <p className="mt-5 text-lg font-semibold text-foreground">No experiences yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start by creating your first premium experience for travelers.
            </p>

            <Button
              type="button"
              className="mt-6 rounded-full bg-orange-500 text-white hover:bg-orange-600"
              onClick={() => router.push("/account/experiences/create")}
            >
              <PlusSquare className="mr-2 size-4" />
              Create an experience
            </Button>
          </Card>
        ) : !loading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {experiences.map((exp) => (
              <Card
                key={exp.id}
                className="overflow-hidden rounded-2xl border-2 border-border bg-card shadow-sm transition hover:border-orange-200 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {coverByExperienceId[exp.id] ? (
                    <Image
                      src={coverByExperienceId[exp.id]}
                      alt={exp.title}
                      fill
                      className="object-cover transition duration-300 hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                      No media uploaded
                    </div>
                  )}
                  <div className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-[11px] font-semibold text-foreground backdrop-blur">
                    {exp.status.replaceAll("_", " ")}
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  <div>
                    <p className="line-clamp-1 text-lg font-semibold">{exp.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {exp.subtitle || "Awaiting full review details from your host setup."}
                    </p>
                  </div>

                  <div className="space-y-2 text-xs text-muted-foreground">
                    {exp.price_amount ? (
                      <p>
                        Price:{" "}
                        <span className="font-medium text-foreground">
                          {exp.currency} {Number(exp.price_amount).toFixed(2)}
                        </span>
                        {exp.duration_minutes && exp.duration_minutes > 0 ? (
                          <span>
                            {" "}
                            for {(exp.duration_minutes / 60).toLocaleString()}h
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                    {(Array.isArray(exp.categories)
                      ? exp.categories[0]?.name
                      : exp.categories?.name) ? (
                      <p>
                        Category:{" "}
                        <span className="font-medium text-foreground">
                          {Array.isArray(exp.categories)
                            ? exp.categories[0]?.name
                            : exp.categories?.name}
                        </span>
                      </p>
                    ) : null}
                    {exp.max_guests ? (
                      <p>
                        Audience: <span className="font-medium text-foreground">Max {exp.max_guests} guests</span>
                      </p>
                    ) : null}
                    {exp.requirements?.[0] ? (
                      <p>
                        <span className="font-medium text-foreground">{exp.requirements[0]}</span>
                      </p>
                    ) : null}
                    {exp.meeting_point_name ? (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="size-3.5" />
                        <span className="line-clamp-1">{exp.meeting_point_name}</span>
                      </p>
                    ) : null}
                    <p className="flex items-center gap-1.5">
                      <CalendarClock className="size-3.5" />
                      Created {new Date(exp.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={`/account/experiences/${exp.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "h-9 flex-1 rounded-full",
                      )}
                    >
                      View
                    </Link>
                    <Link
                      href={`/account/applied?experienceId=${exp.id}`}
                      className={cn(
                        buttonVariants({ variant: "default" }),
                        "h-9 flex-1 rounded-full bg-orange-500 text-white hover:bg-orange-600",
                      )}
                    >
                      Applied
                    </Link>
                  </div>
                  <Link
                    href={`/account/experiences/create?edit=${exp.id}`}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "h-9 w-full rounded-full",
                    )}
                  >
                    Edit
                  </Link>
                </div>
              </Card>
            ))}

          </div>
        ) : null}
      </div>
    </div>
  );
}


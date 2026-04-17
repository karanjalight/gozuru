"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ExperienceDetail = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  status: string;
  meeting_point_name: string | null;
  duration_minutes: number | null;
  price_amount: number | null;
  currency: string;
  max_guests: number;
  requirements: string[];
  created_at: string;
  categories: { name: string } | { name: string }[] | null;
};

export default function ExperienceDetailPage() {
  const router = useRouter();
  const params = useParams<{ experienceId: string }>();
  const { user } = useAuth();
  const [experience, setExperience] = useState<ExperienceDetail | null>(null);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !params?.experienceId) return;

    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);

      const { data, error: expError } = await supabase
        .from("experiences")
        .select("id,title,subtitle,description,status,meeting_point_name,duration_minutes,price_amount,currency,max_guests,requirements,created_at,categories(name)")
        .eq("id", params.experienceId)
        .eq("host_user_id", user.id)
        .maybeSingle();

      if (!mounted) return;
      if (expError) {
        setError(expError.message);
        setLoading(false);
        return;
      }
      if (!data) {
        setError("Experience not found.");
        setLoading(false);
        return;
      }

      setExperience(data as unknown as ExperienceDetail);

      const { data: mediaRows, error: mediaError } = await supabase
        .from("experience_media")
        .select("storage_path")
        .eq("experience_id", params.experienceId)
        .order("sort_order", { ascending: true });

      if (!mounted) return;
      if (mediaError) {
        setError(mediaError.message);
        setLoading(false);
        return;
      }

      const urls = (mediaRows ?? []).map((row) => {
        const {
          data: { publicUrl },
        } = supabase.storage.from("experience-media").getPublicUrl(row.storage_path as string);
        return publicUrl;
      });
      setMediaUrls(urls);
      setLoading(false);
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [params?.experienceId, user]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
        <Card className="rounded-2xl border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading experience...
        </Card>
      </div>
    );
  }

  if (error || !experience) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
        <Card className="rounded-2xl border-border bg-card p-10 text-center">
          <p className="text-sm text-red-500">{error ?? "Experience not found."}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 rounded-full"
            onClick={() => router.push("/account/experiences")}
          >
            Back to experiences
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <Link
        href="/account/experiences"
        className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
      >
        <ArrowLeft className="mr-2 size-4" />
        Back
      </Link>

      <Card className="mt-4 rounded-2xl border-border bg-card p-6">
        <p className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
          {experience.status.replaceAll("_", " ")}
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{experience.title}</h1>
        {experience.subtitle ? (
          <p className="mt-2 text-sm text-muted-foreground">{experience.subtitle}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {experience.price_amount ? (
            <span>
              Price: {experience.currency} {Number(experience.price_amount).toFixed(2)}
            </span>
          ) : null}
          {experience.duration_minutes ? (
            <span>Duration: {experience.duration_minutes / 60} hours</span>
          ) : null}
          {experience.max_guests ? (
            <span>Max guests: {experience.max_guests}</span>
          ) : null}
          {(Array.isArray(experience.categories)
            ? experience.categories[0]?.name
            : experience.categories?.name) ? (
            <span>
              Category:{" "}
              {Array.isArray(experience.categories)
                ? experience.categories[0]?.name
                : experience.categories?.name}
            </span>
          ) : null}
          {experience.meeting_point_name ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {experience.meeting_point_name}
            </span>
          ) : null}
          <span>Created {new Date(experience.created_at).toLocaleDateString()}</span>
        </div>

        {experience.description ? (
          <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-foreground">
            {experience.description}
          </p>
        ) : null}
        {experience.requirements?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {experience.requirements.map((requirement) => (
              <span
                key={requirement}
                className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-foreground"
              >
                {requirement}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link
            href={`/account/experiences/create?edit=${experience.id}`}
            className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
          >
            Edit
          </Link>
          <Link
            href={`/account/applied?experienceId=${experience.id}`}
            className={cn(
              buttonVariants({ variant: "default" }),
              "rounded-full bg-orange-500 text-white hover:bg-orange-600",
            )}
          >
            Applied
          </Link>
        </div>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mediaUrls.length === 0 ? (
          <Card className="rounded-2xl border-border bg-card p-6 text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
            No media has been uploaded for this experience yet.
          </Card>
        ) : (
          mediaUrls.map((url, index) => (
            <div key={`${url}-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-muted">
              <Image
                src={url}
                alt={`${experience.title} media ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarDays, Clock3, MapPin, ShieldCheck, Star, Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "../../components/Navbar";

type ExperienceDetailRow = {
  id: string;
  host_user_id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  meeting_point_name: string | null;
  duration_minutes: number | null;
  max_guests: number | null;
  min_age: number | null;
  price_amount: number | null;
  currency: string;
  includes: string[] | null;
  requirements: string[] | null;
  cancellation_policy: string | null;
};

type ExperienceLocationRow = {
  city: string | null;
  country_region: string | null;
  street_address: string | null;
};

type ExperienceMediaRow = {
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
};

type ExperienceAvailabilityRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  price_amount: number | null;
  currency: string | null;
};

type ReviewRow = {
  id: string;
  reviewer_user_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
};

type HostProfileRow = {
  headline: string | null;
  expertise: string | null;
  highlight_story: string | null;
};

type ProfileRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_path: string | null;
};

type ReviewerCardView = {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  name: string;
  avatarUrl: string | null;
};

function formatMoney(amount: number | null, currency: string) {
  if (!amount || amount <= 0) return "Price on request";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDayTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ExperienceDetailPage() {
  const params = useParams<{ experienceId: string }>();
  const experienceId = params?.experienceId;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [experience, setExperience] = useState<ExperienceDetailRow | null>(null);
  const [location, setLocation] = useState<ExperienceLocationRow | null>(null);
  const [images, setImages] = useState<{ url: string; alt: string }[]>([]);
  const [availability, setAvailability] = useState<ExperienceAvailabilityRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [hostProfile, setHostProfile] = useState<HostProfileRow | null>(null);
  const [hostUser, setHostUser] = useState<ProfileRow | null>(null);
  const [reviewerProfiles, setReviewerProfiles] = useState<Record<string, ProfileRow>>({});
  const [reviewerFallbackImages, setReviewerFallbackImages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!experienceId) return;
    let mounted = true;

    const loadDetail = async () => {
      setLoading(true);
      setNotFound(false);

      const { data: expData } = await supabase
        .from("experiences")
        .select(
          "id,host_user_id,title,subtitle,description,meeting_point_name,duration_minutes,max_guests,min_age,price_amount,currency,includes,requirements,cancellation_policy",
        )
        .eq("id", experienceId)
        .single();

      if (!mounted) return;

      if (!expData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const experienceRow = expData as ExperienceDetailRow;
      setExperience(experienceRow);

      const [{ data: locationData }, { data: mediaRows }, { data: slots }, { data: reviewRows }, { data: hostData }, { data: hostUserData }] =
        await Promise.all([
          supabase
            .from("experience_locations")
            .select("city,country_region,street_address")
            .eq("experience_id", experienceId)
            .maybeSingle(),
          supabase
            .from("experience_media")
            .select("storage_path,alt_text,sort_order")
            .eq("experience_id", experienceId)
            .order("sort_order", { ascending: true }),
          supabase
            .from("experience_availability")
            .select("id,starts_at,ends_at,capacity,price_amount,currency")
            .eq("experience_id", experienceId)
            .eq("is_cancelled", false)
            .gte("starts_at", new Date().toISOString())
            .order("starts_at", { ascending: true })
            .limit(6),
          supabase
            .from("reviews")
            .select("id,reviewer_user_id,rating,review_text,created_at")
            .eq("experience_id", experienceId)
            .order("created_at", { ascending: false })
            .limit(6),
          supabase
            .from("host_profiles")
            .select("headline,expertise,highlight_story")
            .eq("user_id", experienceRow.host_user_id)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("user_id,first_name,last_name,avatar_path")
            .eq("user_id", experienceRow.host_user_id)
            .maybeSingle(),
        ]);

      if (!mounted) return;

      setLocation((locationData as ExperienceLocationRow | null) ?? null);
      setAvailability((slots ?? []) as ExperienceAvailabilityRow[]);
      const nextReviews = (reviewRows ?? []) as ReviewRow[];
      setReviews(nextReviews);
      setHostProfile((hostData as HostProfileRow | null) ?? null);
      setHostUser((hostUserData as ProfileRow | null) ?? null);

      const mappedImages = ((mediaRows ?? []) as ExperienceMediaRow[]).map((media) => {
        const {
          data: { publicUrl },
        } = supabase.storage.from("experience-media").getPublicUrl(media.storage_path);
        return {
          url: publicUrl,
          alt: media.alt_text || experienceRow.title,
        };
      });
      setImages(mappedImages);

      const reviewerIds = [...new Set(nextReviews.map((item) => item.reviewer_user_id))];
      if (reviewerIds.length > 0) {
        const { data: reviewerRows } = await supabase
          .from("profiles")
          .select("user_id,first_name,last_name,avatar_path")
          .in("user_id", reviewerIds);

        if (!mounted) return;

        const reviewerMap: Record<string, ProfileRow> = {};
        for (const profile of (reviewerRows ?? []) as ProfileRow[]) {
          reviewerMap[profile.user_id] = profile;
        }
        setReviewerProfiles(reviewerMap);

        const missingAvatarIds = reviewerIds.filter((id) => !reviewerMap[id]?.avatar_path);
        if (missingAvatarIds.length > 0) {
          const { data: reviewerHostedExperiences } = await supabase
            .from("experiences")
            .select("id,host_user_id")
            .in("host_user_id", missingAvatarIds)
            .order("created_at", { ascending: false });

          if (!mounted) return;

          const hostedRows = (reviewerHostedExperiences ?? []) as { id: string; host_user_id: string }[];
          const hostedExperienceIds = hostedRows.map((row) => row.id);

          if (hostedExperienceIds.length > 0) {
            const { data: fallbackMediaRows } = await supabase
              .from("experience_media")
              .select("experience_id,storage_path,sort_order")
              .in("experience_id", hostedExperienceIds)
              .order("sort_order", { ascending: true });

            if (!mounted) return;

            const experienceToHost: Record<string, string> = {};
            for (const row of hostedRows) {
              experienceToHost[row.id] = row.host_user_id;
            }

            const fallbackByUserId: Record<string, string> = {};
            for (const media of (fallbackMediaRows ?? []) as {
              experience_id: string;
              storage_path: string;
              sort_order: number;
            }[]) {
              const hostId = experienceToHost[media.experience_id];
              if (!hostId || fallbackByUserId[hostId]) continue;
              const {
                data: { publicUrl },
              } = supabase.storage.from("experience-media").getPublicUrl(media.storage_path);
              fallbackByUserId[hostId] = publicUrl;
            }
            setReviewerFallbackImages(fallbackByUserId);
          } else {
            setReviewerFallbackImages({});
          }
        } else {
          setReviewerFallbackImages({});
        }
      } else {
        setReviewerProfiles({});
        setReviewerFallbackImages({});
      }

      setLoading(false);
    };

    void loadDetail();

    return () => {
      mounted = false;
    };
  }, [experienceId]);

  const ratingSummary = useMemo(() => {
    if (!reviews.length) return { average: null, count: 0 };
    const total = reviews.reduce((acc, review) => acc + review.rating, 0);
    return {
      average: total / reviews.length,
      count: reviews.length,
    };
  }, [reviews]);

  const locationLabel = useMemo(() => {
    if (!location) return experience?.meeting_point_name || "Location shared after booking";
    if (location.city && location.country_region) return `${location.city}, ${location.country_region}`;
    return location.city || location.country_region || experience?.meeting_point_name || "Location shared after booking";
  }, [experience?.meeting_point_name, location]);

  const hostName = useMemo(() => {
    if (!hostUser) return "Local Host";
    const full = `${hostUser.first_name ?? ""} ${hostUser.last_name ?? ""}`.trim();
    return full || "Local Host";
  }, [hostUser]);

  const hostAvatarUrl = useMemo(() => {
    if (hostUser?.avatar_path) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(hostUser.avatar_path);
      return publicUrl;
    }
    return images[0]?.url || null;
  }, [hostUser, images]);

  const reviewerCards = useMemo<ReviewerCardView[]>(() => {
    return reviews.map((review) => {
      const profile = reviewerProfiles[review.reviewer_user_id];
      const profileName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "Traveler";
      let avatarUrl: string | null = null;

      if (profile?.avatar_path) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(profile.avatar_path);
        avatarUrl = publicUrl;
      } else if (reviewerFallbackImages[review.reviewer_user_id]) {
        avatarUrl = reviewerFallbackImages[review.reviewer_user_id];
      }

      return {
        id: review.id,
        rating: review.rating,
        review_text: review.review_text,
        created_at: review.created_at,
        name: profileName,
        avatarUrl,
      };
    });
  }, [reviewerFallbackImages, reviewerProfiles, reviews]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-16 pt-24 sm:px-6">
          <p className="text-sm text-muted-foreground">Loading experience...</p>
        </main>
      </>
    );
  }

  if (notFound || !experience) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-16 pt-24 sm:px-6">
          <h1 className="text-2xl font-semibold">Experience not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This experience may have been removed or is no longer available.
          </p>
          <Link
            href="/experiences"
            className={cn(
              buttonVariants({ variant: "default" }),
              "mt-6 rounded-full bg-orange-500 text-white hover:bg-orange-600",
            )}
          >
            Back to experiences
          </Link>
        </main>
      </>
    );
  }

  const durationHours = experience.duration_minutes ? Math.max(1, Math.round(experience.duration_minutes / 60)) : null;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 pt-24 sm:px-6 lg:py-12 lg:pt-24">
        <div className="mb-6">
          <Link href="/experiences" className="text-sm font-medium text-orange-500 hover:text-orange-600">
            Back to experiences
          </Link>
        </div>

        <section className="rounded-2xl border bg-gradient-to-br from-orange-50/60 via-background to-background p-6 sm:p-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{experience.title}</h1>
          {experience.subtitle ? <p className="mt-3 max-w-3xl text-muted-foreground">{experience.subtitle}</p> : null}
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" />
              {locationLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-4" />
              {durationHours ? `${durationHours} hour${durationHours > 1 ? "s" : ""}` : "Flexible duration"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" />
              Up to {experience.max_guests ?? 1} guests
            </span>
            {ratingSummary.average ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <Star className="size-4 fill-orange-400 text-orange-400" />
                {ratingSummary.average.toFixed(1)} ({ratingSummary.count} reviews)
              </span>
            ) : null}
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
        {(images.length ? images : [{ url: "", alt: experience.title }]).slice(0, 4).map((image, index) => (
          <div
            key={`${image.url}-${index}`}
            className={`relative overflow-hidden rounded-2xl bg-muted ${index === 0 ? "md:col-span-2 md:h-[420px] h-64" : "h-52 md:h-64"}`}
          >
            {image.url ? (
              <Image src={image.url} alt={image.alt} fill className="object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                No media uploaded yet
              </div>
            )}
          </div>
        ))}
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>What you will do</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
              <p>{experience.description || "A host-led experience with local insights, stories, and practical guidance."}</p>
              <p>
                This experience is designed to feel personal and immersive, with enough space for questions and
                interaction throughout.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>What is included</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {(experience.includes?.length ? experience.includes : ["Guided local experience", "Host support during the session"]).map(
                (item) => (
                  <div key={item} className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 size-4 text-orange-500" />
                    <span>{item}</span>
                  </div>
                ),
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Guest requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{experience.min_age ? `Minimum age: ${experience.min_age}+` : "Suitable for most guests."}</p>
              {(experience.requirements?.length
                ? experience.requirements
                : ["Comfortable walking shoes", "Phone for communication and directions"]).map((item) => (
                <p key={item}>- {item}</p>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviewerCards.length ? (
                reviewerCards.map((review) => (
                  <div key={review.id} className="rounded-xl border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="relative size-9 overflow-hidden rounded-full border bg-muted">
                          {review.avatarUrl ? (
                            <Image src={review.avatarUrl} alt={review.name} fill className="object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                              {review.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{review.name}</p>
                          <p className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                        <Star className="size-3.5 fill-orange-400 text-orange-400" />
                        {review.rating.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {review.review_text || "Great host and a memorable experience."}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No reviews yet. Be the first traveler to book and leave feedback.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="rounded-2xl border-orange-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{formatMoney(experience.price_amount, experience.currency)}</CardTitle>
              <p className="text-xs text-muted-foreground">per guest</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full rounded-full bg-orange-500 hover:bg-orange-600">Show dates</Button>
              <p className="text-xs text-muted-foreground">
                {experience.cancellation_policy || "Free cancellation up to 24 hours before start time."}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Upcoming availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {availability.length ? (
                availability.map((slot) => (
                  <div key={slot.id} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 font-medium">
                      <CalendarDays className="size-4 text-orange-500" />
                      {formatDayTime(slot.starts_at)}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ends {formatDayTime(slot.ends_at)} • {slot.capacity} spots
                    </p>
                    <p className="mt-1 text-xs font-medium text-foreground">
                      {formatMoney(slot.price_amount ?? experience.price_amount, slot.currency ?? experience.currency)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">New dates will be announced soon.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">About the host</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="relative size-12 overflow-hidden rounded-full border bg-muted">
                  {hostAvatarUrl ? (
                    <Image src={hostAvatarUrl} alt={hostName} fill className="object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-semibold text-muted-foreground">
                      {hostName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <Link
                    href={`/hosts/${experience.host_user_id}`}
                    className="font-medium text-foreground hover:text-orange-600 hover:underline"
                  >
                    {hostName}
                  </Link>
                  <p className="text-xs text-muted-foreground">{hostProfile?.headline || "Local host on Gozuru"}</p>
                </div>
              </div>
              <p>
                <Link href={`/hosts/${experience.host_user_id}`} className="text-sm font-medium text-orange-500 hover:text-orange-600">
                  View host profile
                </Link>
              </p>
              {hostProfile?.expertise ? <p>{hostProfile.expertise}</p> : null}
              <p>{hostProfile?.highlight_story || "Passionate about sharing authentic local knowledge and stories."}</p>
            </CardContent>
          </Card>
        </aside>
        </section>
      </main>
    </>
  );
}

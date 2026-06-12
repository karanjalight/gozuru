"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExperienceMediaCarousel } from "@/components/experience/ExperienceMediaCarousel";
import {
  ExperienceBookingOrderSummary,
  ExperienceBookingRoot,
  ExperienceBookingSlots,
} from "@/components/experience/ExperienceBookingPanel";
import { mapExperienceGalleryMedia } from "@/lib/experience-media";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Clock3, MapPin, ShieldCheck, Star, Users } from "lucide-react";
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
  media_type: string | null;
};

type ExperienceAvailabilityRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  price_amount: number | null;
  currency: string | null;
  meeting_place_name: string | null;
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

const DETAIL_HERO_WIDTH = 1400;
const DETAIL_HERO_HEIGHT = 900;
const DETAIL_GRID_WIDTH = 900;
const DETAIL_GRID_HEIGHT = 700;

export default function ExperienceDetailPage() {
  const params = useParams<{ experienceId: string }>();
  const experienceId = params?.experienceId;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [experience, setExperience] = useState<ExperienceDetailRow | null>(null);
  const [location, setLocation] = useState<ExperienceLocationRow | null>(null);
  const [galleryMedia, setGalleryMedia] = useState<
    Array<{
      url: string;
      previewUrl: string;
      mediaType: "image" | "video";
      alt: string;
    }>
  >([]);
  const [availability, setAvailability] = useState<ExperienceAvailabilityRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [hostProfile, setHostProfile] = useState<HostProfileRow | null>(null);
  const [hostUser, setHostUser] = useState<ProfileRow | null>(null);
  const [reviewerProfiles, setReviewerProfiles] = useState<Record<string, ProfileRow>>({});
  const [reviewerFallbackImages, setReviewerFallbackImages] = useState<Record<string, string>>({});
  const [confirmedGuestsBySlotId, setConfirmedGuestsBySlotId] = useState<Record<string, number>>({});
  const [bookingMode, setBookingMode] = useState(false);

  useEffect(() => {
    if (bookingMode) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [bookingMode]);

  const refreshAvailability = useCallback(async () => {
    if (!experienceId) return;

    try {
      const rpcResult = await supabase.rpc("get_public_upcoming_slots", {
        p_experience_id: experienceId,
        p_limit: 24,
      });
      if (rpcResult.error) throw new Error(rpcResult.error.message);

      const nextAvailability = (rpcResult.data ?? []) as ExperienceAvailabilityRow[];
      setAvailability(nextAvailability);

      const slotIds = nextAvailability.map((slot) => slot.id);
      if (slotIds.length === 0) {
        setConfirmedGuestsBySlotId({});
        return;
      }

      const { data: bookingRows } = await supabase
        .from("bookings")
        .select("availability_id,guests_count,status")
        .in("availability_id", slotIds)
        .in("status", ["requested", "confirmed", "completed", "no_show"]);

      const nextCounts: Record<string, number> = {};
      for (const row of (bookingRows ?? []) as Array<{
        availability_id: string | null;
        guests_count: number;
      }>) {
        if (!row.availability_id) continue;
        nextCounts[row.availability_id] = (nextCounts[row.availability_id] ?? 0) + (row.guests_count ?? 0);
      }
      setConfirmedGuestsBySlotId(nextCounts);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? `Unable to refresh availability: ${error.message}`
          : "Unable to refresh availability.",
      );
    }
  }, [experienceId]);

  useEffect(() => {
    if (!experienceId) return;
    let mounted = true;

    const loadUpcomingAvailability = async () => {
      const rpcResult = await supabase.rpc("get_public_upcoming_slots", {
        p_experience_id: experienceId,
        p_limit: 24,
      });
      if (rpcResult.error) {
        throw new Error(rpcResult.error.message);
      }
      return (rpcResult.data ?? []) as ExperienceAvailabilityRow[];
    };

    const loadDetail = async () => {
      setLoading(true);
      setNotFound(false);
      setLoadError(null);

      try {
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

        const [
          { data: locationData },
          { data: mediaRows },
          slots,
          { data: reviewRows },
          { data: hostData },
          { data: hostUserData },
        ] =
          await Promise.all([
            supabase
              .from("experience_locations")
              .select("city,country_region,street_address")
              .eq("experience_id", experienceId)
              .maybeSingle(),
            supabase
              .from("experience_media")
              .select("storage_path,alt_text,sort_order,media_type")
              .eq("experience_id", experienceId)
              .order("sort_order", { ascending: true }),
            loadUpcomingAvailability(),
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
      const nextAvailability = slots ?? [];
      setAvailability(nextAvailability);
      const nextReviews = (reviewRows ?? []) as ReviewRow[];
      setReviews(nextReviews);
      setHostProfile((hostData as HostProfileRow | null) ?? null);
      setHostUser((hostUserData as ProfileRow | null) ?? null);

      setGalleryMedia(
        mapExperienceGalleryMedia(
          supabase,
          (mediaRows ?? []) as ExperienceMediaRow[],
          { width: DETAIL_HERO_WIDTH, height: DETAIL_HERO_HEIGHT, quality: 74 },
          { width: DETAIL_GRID_WIDTH, height: DETAIL_GRID_HEIGHT, quality: 70 },
        ).map((item) => ({
          ...item,
          alt: item.alt || experienceRow.title,
        })),
      );

      const slotIds = nextAvailability.map((slot) => slot.id);
      if (slotIds.length > 0) {
        const { data: bookingRows } = await supabase
          .from("bookings")
          .select("availability_id,guests_count,status")
          .in("availability_id", slotIds)
          .in("status", ["requested", "confirmed", "completed", "no_show"]);
        if (mounted && bookingRows) {
          const nextCounts: Record<string, number> = {};
          for (const row of bookingRows as Array<{ availability_id: string | null; guests_count: number }>) {
            if (!row.availability_id) continue;
            nextCounts[row.availability_id] = (nextCounts[row.availability_id] ?? 0) + (row.guests_count ?? 0);
          }
          setConfirmedGuestsBySlotId(nextCounts);
        }
      } else {
        setConfirmedGuestsBySlotId({});
      }

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
      } catch (error) {
        if (!mounted) return;
        setAvailability([]);
        setLoading(false);
        setLoadError(
          error instanceof Error
            ? `Unable to load upcoming availability right now: ${error.message}`
            : "Unable to load upcoming availability right now.",
        );
      }
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
    return galleryMedia[0]?.previewUrl || galleryMedia[0]?.url || null;
  }, [hostUser, galleryMedia]);

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

  const bookingExperience = {
    id: experience.id,
    host_user_id: experience.host_user_id,
    title: experience.title,
    price_amount: experience.price_amount,
    currency: experience.currency,
    max_guests: experience.max_guests,
    cancellation_policy: experience.cancellation_policy,
  };

  return (
    <>
      <Navbar />
      <main
        className={cn(
          "mx-auto max-w-7xl px-4 py-10 pt-24 sm:px-6 lg:py-12 lg:pt-24",
          bookingMode && "pb-28",
        )}
      >
        <div className="mb-6">
          <Link href="/experiences" className="text-sm font-medium text-orange-500 hover:text-orange-600">
            Back to experiences
          </Link>
        </div>

        <section className="overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50/80 via-background to-background shadow-sm">
          <div className="px-6 py-5 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                {!bookingMode ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Experience</p>
                ) : null}
                <h1 className={cn("text-3xl font-bold tracking-tight sm:text-4xl", !bookingMode && "mt-2")}>
                  {experience.title}
                </h1>
                {!bookingMode && experience.subtitle ? (
                  <p className="mt-3 max-w-3xl text-base text-muted-foreground">{experience.subtitle}</p>
                ) : null}
              </div>
              {bookingMode ? (
                <Button
                  type="button"
                  onClick={() => setBookingMode(false)}
                  className="shrink-0 rounded-full border-2 border-zinc-900 bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Experience details
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => setBookingMode(true)}
                  className="shrink-0 rounded-full border-2 border-orange-700 bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-900/25 hover:bg-orange-700 dark:border-orange-500 dark:bg-orange-500 dark:hover:bg-orange-400"
                >
                  Book Now
                </Button>
              )}
            </div>
          </div>
          {!bookingMode ? (
            <div className="flex flex-wrap items-center gap-3 border-t border-orange-100/80 px-6 py-4 sm:px-8">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4 text-orange-500" />
                {locationLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-sm text-muted-foreground">
                <Clock3 className="size-4 text-orange-500" />
                {durationHours ? `${durationHours} hour${durationHours > 1 ? "s" : ""}` : "Flexible duration"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-sm text-muted-foreground">
                <Users className="size-4 text-orange-500" />
                Up to {experience.max_guests ?? 1} guests
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-500/10 px-3 py-1.5 text-sm font-semibold text-orange-700 dark:text-orange-300">
                {formatMoney(experience.price_amount, experience.currency)} / guest
              </span>
              {ratingSummary.average ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-sm font-medium text-foreground">
                  <Star className="size-4 fill-orange-400 text-orange-400" />
                  {ratingSummary.average.toFixed(1)} ({ratingSummary.count} reviews)
                </span>
              ) : null}
            </div>
          ) : null}
        </section>

        {!bookingMode ? (
          <div className="mt-8">
            <ExperienceMediaCarousel items={galleryMedia} emptyLabel={experience.title} />
          </div>
        ) : null}

        <ExperienceBookingRoot
          experience={bookingExperience}
          availability={availability}
          confirmedGuestsBySlotId={confirmedGuestsBySlotId}
          bookingMode={bookingMode}
          onCheckoutComplete={() => {
            void refreshAvailability();
          }}
        >
          {bookingMode ? (
            <section id="book-slots" className="mt-8 scroll-mt-28 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
              {loadError ? (
                <p className="lg:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                  {loadError}
                </p>
              ) : null}
              <ExperienceBookingSlots />
              <aside>
                <ExperienceBookingOrderSummary />
              </aside>
            </section>
          ) : (
            <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
              <div className="space-y-6">
                {loadError ? (
                  <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                    {loadError}
                  </p>
                ) : null}

          <Card className="rounded-3xl border-border/70 shadow-sm">
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

          <Card className="rounded-3xl border-border/70 shadow-sm">
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

          <Card className="rounded-3xl border-border/70 shadow-sm">
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

          <Card className="rounded-3xl border-border/70 shadow-sm">
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
                            <Image src={review.avatarUrl} alt={review.name} fill unoptimized className="object-cover" />
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

              <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
                <Card className="overflow-hidden rounded-3xl border-border/70 shadow-sm">
                  <CardHeader className="border-b border-border/70 pb-4">
                    <CardTitle className="text-base">Your expert</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 p-5">
                    <div className="flex flex-col items-center text-center">
                      <div className="relative size-20 overflow-hidden rounded-full border-2 border-orange-200 bg-muted dark:border-orange-500/30">
                        {hostAvatarUrl ? (
                          <Image src={hostAvatarUrl} alt={hostName} fill unoptimized className="object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-muted-foreground">
                            {hostName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="mt-4 text-lg font-semibold text-foreground">{hostName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {hostProfile?.headline || "Local expert on Gozuru"}
                      </p>
                    </div>

                    {hostProfile?.expertise ? (
                      <p className="text-center text-sm leading-6 text-muted-foreground">{hostProfile.expertise}</p>
                    ) : null}

                    <p className="text-center text-sm leading-6 text-muted-foreground">
                      {hostProfile?.highlight_story || "Passionate about sharing authentic local knowledge and stories."}
                    </p>

                    <Link
                      href={`/hosts/${experience.host_user_id}`}
                      className={cn(
                        buttonVariants({ variant: "default" }),
                        "inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-orange-700 bg-orange-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-900/20 hover:bg-orange-700 dark:border-orange-500 dark:bg-orange-500 dark:hover:bg-orange-400",
                      )}
                    >
                      View expert profile
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </CardContent>
                </Card>
              </aside>
            </section>
          )}
        </ExperienceBookingRoot>
      </main>
    </>
  );
}

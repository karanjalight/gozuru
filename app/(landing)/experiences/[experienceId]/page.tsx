"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExperienceMediaCarousel } from "@/components/experience/ExperienceMediaCarousel";
import {
  ExperienceBookingPurchasePanel,
  ExperienceBookingRoot,
} from "@/components/experience/ExperienceBookingPanel";
import { mapExperienceGalleryMedia } from "@/lib/experience-media";
import { useParams } from "next/navigation";
import { ArrowUpRight, Clock3, MapPin, ShieldCheck, Star, Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
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
  const durationLabel = durationHours ? `${durationHours} hour${durationHours > 1 ? "s" : ""}` : "Flexible duration";
  const maxGuestsLabel = `Up to ${experience.max_guests ?? 1} guest${(experience.max_guests ?? 1) === 1 ? "" : "s"}`;
  const priceLabel = `${formatMoney(experience.price_amount, experience.currency)} / guest`;
  const shortDescription =
    experience.subtitle ||
    (experience.description
      ? experience.description.slice(0, 180) + (experience.description.length > 180 ? "…" : "")
      : null);

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
      <main className="mx-auto max-w-7xl px-4 py-10 pt-24 pb-28 sm:px-6 lg:py-12 lg:pb-12 lg:pt-24">
        <div className="mb-6">
          <Link href="/experiences" className="text-sm font-medium text-orange-500 hover:text-orange-600">
            Back to experiences
          </Link>
        </div>

        <ExperienceBookingRoot
          experience={bookingExperience}
          availability={availability}
          confirmedGuestsBySlotId={confirmedGuestsBySlotId}
          onCheckoutComplete={() => {
            void refreshAvailability();
          }}
        >
          {loadError ? (
            <p className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              {loadError}
            </p>
          ) : null}

          <section className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,420px)] lg:items-start">
            <div className="min-w-0">
              <ExperienceMediaCarousel items={galleryMedia} emptyLabel={experience.title} />
            </div>

            <aside id="book-experience" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
              <ExperienceBookingPurchasePanel
                title={experience.title}
                subtitle={experience.subtitle}
                priceLabel={priceLabel}
                ratingAverage={ratingSummary.average}
                ratingCount={ratingSummary.count}
                shortDescription={shortDescription}
                locationLabel={locationLabel}
                durationLabel={durationLabel}
                maxGuestsLabel={maxGuestsLabel}
              />
            </aside>
          </section>

          <section className="mt-16 space-y-8 border-t border-border pt-12">
            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>About this experience</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
                <p>{experience.description || "A host-led experience with local insights, stories, and practical guidance."}</p>
                <p>
                  This experience is designed to feel personal and immersive, with enough space for questions and
                  interaction throughout.
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-8 md:grid-cols-2">
              <Card className="rounded-2xl border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>What is included</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {(experience.includes?.length ? experience.includes : ["Guided local experience", "Host support during the session"]).map(
                    (item) => (
                      <div key={item} className="flex items-start gap-2">
                        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-orange-500" />
                        <span>{item}</span>
                      </div>
                    ),
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/70 shadow-sm">
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
            </div>

            <div className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-5 text-sm dark:bg-muted/10 sm:grid-cols-3">
              <div>
                <p className="font-semibold text-foreground">Location</p>
                <p className="mt-1 inline-flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4 shrink-0 text-orange-500" />
                  {locationLabel}
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Duration</p>
                <p className="mt-1 inline-flex items-center gap-2 text-muted-foreground">
                  <Clock3 className="size-4 shrink-0 text-orange-500" />
                  {durationLabel}
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Group size</p>
                <p className="mt-1 inline-flex items-center gap-2 text-muted-foreground">
                  <Users className="size-4 shrink-0 text-orange-500" />
                  {maxGuestsLabel}
                </p>
              </div>
            </div>

            <Card className="rounded-2xl border-border/70 shadow-sm">
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

            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
              <div className="grid md:grid-cols-[minmax(240px,34%)_1fr]">
                <div className="relative aspect-[4/5] min-h-[280px] bg-muted md:aspect-auto md:min-h-[360px]">
                  {hostAvatarUrl ? (
                    <Image
                      src={hostAvatarUrl}
                      alt={hostName}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 100vw, 380px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-950/40 dark:to-background">
                      <span className="text-5xl font-semibold text-orange-400/80">{hostName.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent md:hidden" />
                  <div className="absolute inset-x-0 bottom-0 p-5 md:hidden">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">Your expert</p>
                    <p className="mt-1 text-xl font-bold text-white">{hostName}</p>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-8 p-6 sm:p-8 lg:p-10">
                  <div className="space-y-4">
                    <div className="hidden md:block">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
                        Your expert
                      </p>
                      <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{hostName}</h3>
                      <p className="mt-2 text-base text-muted-foreground">
                        {hostProfile?.headline || "Local expert on Gozuru"}
                      </p>
                    </div>

                    {hostProfile?.expertise ? (
                      <p className="text-sm leading-7 text-foreground md:text-base">{hostProfile.expertise}</p>
                    ) : null}

                    <p className="text-sm leading-7 text-muted-foreground md:text-base">
                      {hostProfile?.highlight_story || "Passionate about sharing authentic local knowledge and stories."}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Link
                      href={`/hosts/${experience.host_user_id}`}
                      className={cn(
                        buttonVariants({ variant: "default" }),
                        "inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-orange-500 px-6 text-sm font-semibold text-background hover:opacity-90 sm:flex-1",
                      )}
                    >
                      View expert profile
                      <ArrowUpRight className="size-4" />
                    </Link>
                    <a
                      href="#book-experience"
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "inline-flex h-12 items-center justify-center rounded-lg border-border px-6 text-sm font-semibold sm:flex-1",
                      )}
                    >
                      Check availability
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ExperienceBookingRoot>
      </main>
    </>
  );
}

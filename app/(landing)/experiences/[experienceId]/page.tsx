"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Clock3, MapPin, ShieldCheck, Star, Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/AuthProvider";
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

declare global {
  interface Window {
    PaystackPop?: {
      setup: (config: {
        access_code?: string;
        key?: string;
        email?: string;
        amount?: number;
        currency?: string;
        ref?: string;
        callback?: (response: { reference: string }) => void;
        onClose?: () => void;
      }) => { openIframe: () => void };
    };
  }
}

const DETAIL_HERO_WIDTH = 1400;
const DETAIL_HERO_HEIGHT = 900;
const DETAIL_GRID_WIDTH = 900;
const DETAIL_GRID_HEIGHT = 700;
const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ experienceId: string }>();
  const experienceId = params?.experienceId;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [experience, setExperience] = useState<ExperienceDetailRow | null>(null);
  const [location, setLocation] = useState<ExperienceLocationRow | null>(null);
  const [images, setImages] = useState<{ heroUrl: string; gridUrl: string; alt: string }[]>([]);
  const [availability, setAvailability] = useState<ExperienceAvailabilityRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [hostProfile, setHostProfile] = useState<HostProfileRow | null>(null);
  const [hostUser, setHostUser] = useState<ProfileRow | null>(null);
  const [reviewerProfiles, setReviewerProfiles] = useState<Record<string, ProfileRow>>({});
  const [reviewerFallbackImages, setReviewerFallbackImages] = useState<Record<string, string>>({});
  const [guestsCount, setGuestsCount] = useState(1);
  const [guestNote, setGuestNote] = useState("");
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [bookingSubmittingSlotId, setBookingSubmittingSlotId] = useState<string | null>(null);
  const [confirmedGuestsBySlotId, setConfirmedGuestsBySlotId] = useState<Record<string, number>>({});
  const [paymentPromptSlot, setPaymentPromptSlot] = useState<ExperienceAvailabilityRow | null>(null);
  const [verifyingReference, setVerifyingReference] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || window.PaystackPop) return;
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!experienceId) return;
    let mounted = true;

    const loadUpcomingAvailability = async () => {
      const rpcResult = await supabase.rpc("get_public_upcoming_slots", {
        p_experience_id: experienceId,
        p_limit: 6,
      });
      if (rpcResult.error) {
        throw new Error(rpcResult.error.message);
      }
      return (rpcResult.data ?? []) as ExperienceAvailabilityRow[];
    };

    const loadDetail = async () => {
      setLoading(true);
      setNotFound(false);
      setBookingError(null);

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
              .select("storage_path,alt_text,sort_order")
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

      const mappedImages = ((mediaRows ?? []) as ExperienceMediaRow[]).map((media) => {
        const {
          data: { publicUrl: heroUrl },
        } = supabase.storage.from("experience-media").getPublicUrl(media.storage_path, {
          transform: {
            width: DETAIL_HERO_WIDTH,
            height: DETAIL_HERO_HEIGHT,
            quality: 74,
          },
        });
        const {
          data: { publicUrl: gridUrl },
        } = supabase.storage.from("experience-media").getPublicUrl(media.storage_path, {
          transform: {
            width: DETAIL_GRID_WIDTH,
            height: DETAIL_GRID_HEIGHT,
            quality: 70,
          },
        });
        return {
          heroUrl,
          gridUrl,
          alt: media.alt_text || experienceRow.title,
        };
      });
      setImages(mappedImages);

      const slotIds = nextAvailability.map((slot) => slot.id);
      if (slotIds.length > 0) {
        const { data: bookingRows } = await supabase
          .from("bookings")
          .select("availability_id,guests_count,status")
          .in("availability_id", slotIds)
          .in("status", ["confirmed", "completed", "no_show"]);
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
        setBookingError(
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
    return images[0]?.gridUrl || null;
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

  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    if (!reference || !user || verifyingReference === reference) return;

    let cancelled = false;
    const verifyAndCreateBooking = async () => {
      setVerifyingReference(reference);
      setBookingError(null);
      setBookingMessage("Verifying payment and creating your application...");
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          throw new Error("Please log in again to complete payment verification.");
        }

        const response = await fetch("/api/paystack/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reference }),
        });
        const payload = (await response.json()) as { error?: string; alreadyExists?: boolean };

        if (!response.ok) {
          throw new Error(payload.error || "Payment verification failed.");
        }
        if (cancelled) return;

        setBookingMessage(
          payload.alreadyExists
            ? "Payment verified. You already have an application for this slot."
            : "Payment verified. Your application has been created.",
        );
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete("reference");
        nextUrl.searchParams.delete("trxref");
        nextUrl.searchParams.delete("paystack");
        window.history.replaceState({}, "", nextUrl.toString());
      } catch (error) {
        if (cancelled) return;
        setBookingError(error instanceof Error ? error.message : "Failed to verify payment.");
      }
    };

    void verifyAndCreateBooking();

    return () => {
      cancelled = true;
    };
  }, [searchParams, user, verifyingReference]);

  async function beginPaystackCheckout(slot: ExperienceAvailabilityRow) {
    if (!experience) return;
    const normalizedEmail = user?.email?.trim().toLowerCase() ?? "";
    if (!normalizedEmail) {
      setBookingError("Please log in with a valid email before checkout.");
      return;
    }
    if (!emailPattern.test(normalizedEmail)) {
      setBookingError("Your account email format is invalid for Paystack. Update your email and try again.");
      return;
    }
    if (!paystackPublicKey) {
      setBookingError("Paystack public key is missing. Set NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.");
      return;
    }
    setBookingSubmittingSlotId(slot.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error("Your session expired. Please log in again.");
      }

      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          experienceId: experience.id,
          availabilityId: slot.id,
          guestsCount,
          guestNote: guestNote.trim() || null,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        authorizationUrl?: string;
        accessCode?: string | null;
        reference?: string;
        amountMinor?: number;
        currency?: string;
      };
      if (!response.ok || !payload.reference) {
        throw new Error(payload.error || "Unable to start Paystack checkout.");
      }
      if (!payload.accessCode) {
        throw new Error("Paystack checkout token missing. Please try again.");
      }
      if (!payload.amountMinor || payload.amountMinor <= 0) {
        throw new Error("Checkout amount is missing for this availability.");
      }

      if (!window.PaystackPop) {
        throw new Error("Paystack modal failed to load. Please refresh and try again.");
      }

      setGuestNote("");
      const handlePaystackCallback = (paystackResponse: { reference: string }) => {
        void (async () => {
          try {
            setBookingMessage("Verifying payment and creating your application...");
            setBookingError(null);
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            if (!token) {
              throw new Error("Please log in again to complete payment verification.");
            }

            const verifyResponse = await fetch("/api/paystack/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ reference: paystackResponse.reference }),
            });
            const verifyPayload = (await verifyResponse.json()) as { error?: string; alreadyExists?: boolean };
            if (!verifyResponse.ok) {
              throw new Error(verifyPayload.error || "Payment verification failed.");
            }
            setBookingMessage(
              verifyPayload.alreadyExists
                ? "Payment verified. You already have an application for this slot."
                : "Payment verified. Your application has been created.",
            );
          } catch (error) {
            setBookingError(error instanceof Error ? error.message : "Failed to verify payment.");
          }
        })();
      };

      const handler = window.PaystackPop.setup({
        key: paystackPublicKey,
        email: normalizedEmail,
        amount: payload.amountMinor,
        currency: payload.currency ?? "KES",
        ref: payload.reference,
        access_code: payload.accessCode,
        callback: handlePaystackCallback,
        onClose: () => {
          setBookingMessage((prev) => prev ?? "Payment window closed before confirmation.");
        },
      });
      handler.openIframe();
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : "Failed to start payment.");
    }
    setBookingSubmittingSlotId(null);
  }

  function handleRequestBooking(slot: ExperienceAvailabilityRow) {
    if (!experience) return;
    setBookingError(null);
    setBookingMessage(null);

    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (user.id === experience.host_user_id) {
      setBookingError("You cannot book your own experience.");
      return;
    }

    const remainingSpots = slot.capacity - (confirmedGuestsBySlotId[slot.id] ?? 0);
    if (remainingSpots <= 0) {
      setBookingError("This slot is fully booked.");
      return;
    }

    if (!Number.isFinite(guestsCount) || guestsCount < 1) {
      setBookingError("Please select at least 1 guest.");
      return;
    }

    if (guestsCount > remainingSpots) {
      setBookingError(`Only ${remainingSpots} spot(s) remaining for this slot.`);
      return;
    }

    setPaymentPromptSlot(slot);
  }

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
        {(images.length ? images : [{ heroUrl: "", gridUrl: "", alt: experience.title }]).slice(0, 4).map((image, index) => (
          <div
            key={`${image.heroUrl}-${index}`}
            className={`relative overflow-hidden rounded-2xl bg-muted ${index === 0 ? "md:col-span-2 md:h-[420px] h-64" : "h-52 md:h-64"}`}
          >
            {image.heroUrl ? (
              <Image
                src={index === 0 ? image.heroUrl : image.gridUrl}
                alt={image.alt}
                fill
                unoptimized
                className="object-cover"
                priority={index === 0}
                loading={index === 0 ? "eager" : "lazy"}
                quality={index === 0 ? 74 : 70}
                sizes={
                  index === 0
                    ? "(max-width: 768px) 100vw, (max-width: 1280px) 100vw, 1400px"
                    : "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 900px"
                }
              />
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

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="rounded-2xl border-orange-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{formatMoney(experience.price_amount, experience.currency)}</CardTitle>
              <p className="text-xs text-muted-foreground">per guest</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Guests</label>
                <input
                  type="number"
                  min={1}
                  max={experience.max_guests ?? 20}
                  value={guestsCount}
                  onChange={(event) => {
                    const next = Number.parseInt(event.target.value, 10);
                    setGuestsCount(Number.isFinite(next) ? next : 1);
                  }}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Note to host (optional)</label>
                <textarea
                  value={guestNote}
                  onChange={(event) => setGuestNote(event.target.value)}
                  className="min-h-[84px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Any preferences or questions?"
                />
              </div>
              {bookingError ? <p className="text-xs text-red-500">{bookingError}</p> : null}
              {bookingMessage ? <p className="text-xs text-emerald-700">{bookingMessage}</p> : null}
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
                    {slot.meeting_place_name ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Meeting place: {slot.meeting_place_name}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs font-medium text-foreground">
                      {formatMoney(slot.price_amount ?? experience.price_amount, slot.currency ?? experience.currency)}
                    </p>
                    <Button
                      type="button"
                      className="mt-3 h-8 w-full rounded-full bg-orange-500 text-xs text-white hover:bg-orange-600"
                      onClick={() => handleRequestBooking(slot)}
                      disabled={bookingSubmittingSlotId === slot.id}
                    >
                      {bookingSubmittingSlotId === slot.id ? "Sending request..." : "Request booking"}
                    </Button>
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
                    <Image src={hostAvatarUrl} alt={hostName} fill unoptimized className="object-cover" />
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
      {paymentPromptSlot ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-background p-5 shadow-xl">
            <h3 className="text-lg font-semibold">Pay first to confirm</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              To confirm this application, complete payment first in the secure Paystack modal.
            </p>
            <p className="mt-3 text-sm font-medium text-foreground">
              Estimated total:{" "}
              {formatMoney(
                (paymentPromptSlot.price_amount ?? experience.price_amount ?? 0) * guestsCount,
                paymentPromptSlot.currency ?? experience.currency,
              )}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setPaymentPromptSlot(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
                disabled={bookingSubmittingSlotId === paymentPromptSlot.id}
                onClick={async () => {
                  const currentSlot = paymentPromptSlot;
                  setPaymentPromptSlot(null);
                  await beginPaystackCheckout(currentSlot);
                }}
              >
                {bookingSubmittingSlotId === paymentPromptSlot.id ? "Redirecting..." : "Continue to Paystack"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

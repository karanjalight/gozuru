"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Edit, Info, MapPin, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";

type Choice = {
  id: string;
  label: string;
};

type UploadedMediaPreview = {
  file?: File;
  storagePath?: string;
  previewUrl: string;
  mediaType: "image" | "video";
};

export default function CreateExperiencePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const editExperienceId = searchParams.get("edit");
  const isEditing = Boolean(editExperienceId);

  const [stepIndex, setStepIndex] = useState(0);
  const objectUrlsRef = useRef<string[]>([]);

  // Step 1: categories
  const primaryCategories: Choice[] = useMemo(
    () => [
      { id: "history-culture", label: "History & Culture" },
      { id: "food-drink", label: "Food & Drink" },
      { id: "nature-outdoors", label: "Nature & Outdoors" },
      { id: "art-design", label: "Art & Design" },
      { id: "fitness-wellness", label: "Fitness & Wellness" },
    ],
    [],
  );
  const experienceDescriptors: Choice[] = useMemo(
    () => [
      { id: "outdoor-experiences", label: "Outdoor experiences" },
      { id: "water-sports", label: "Water sports" },
      { id: "flying-experiences", label: "Flying experiences" },
      { id: "animal-experiences", label: "Animal experiences" },
    ],
    [],
  );
  const [primaryCategoryId, setPrimaryCategoryId] = useState<string>("");
  const [descriptorId, setDescriptorId] = useState<string>("");

  // Step 2: about you
  const [yearsExperience, setYearsExperience] = useState("");
  const [experienceTitle, setExperienceTitle] = useState("");
  const [expertise, setExpertise] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [durationHours, setDurationHours] = useState("1");
  const [currency, setCurrency] = useState("USD");
  const [audienceType, setAudienceType] = useState<
    "group" | "female_only" | "male_only" | "private"
  >("group");
  const [maxGuests, setMaxGuests] = useState("5");

  // Step 3: recognition
  const [careerHighlight, setCareerHighlight] = useState("");
  const [highlightShare, setHighlightShare] = useState("");

  // Step 4: name
  const [firstName, setFirstName] = useState("");

  // Step 5: profile picture
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);

  // Step 6: phone + online profiles
  const [phoneNumber, setPhoneNumber] = useState("");
  const [onlineProfiles, setOnlineProfiles] = useState<string[]>([""]);

  // Step 7: address
  const [countryRegion, setCountryRegion] = useState("United States");
  const [streetAddress, setStreetAddress] = useState("");
  const [aptSuite, setAptSuite] = useState("");
  const [city, setCity] = useState("");
  const [stateTerritory, setStateTerritory] = useState("");
  const [zipPostalCode, setZipPostalCode] = useState("");
  const [locationName, setLocationName] = useState("");

  // Step 8: photos
  const [media, setMedia] = useState<UploadedMediaPreview[]>([]);
  const photosInputRef = useRef<HTMLInputElement | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExistingData, setLoadingExistingData] = useState(false);

  const stepMeta = useMemo(
    () => [
      { title: "Start", subtitle: "Create an experience" },
      { title: "Experience", subtitle: "What will you offer guests?" },
      { title: "About you", subtitle: "Tell us more about you" },
      { title: "Recognition", subtitle: "Optional highlights" },
      { title: "Your name", subtitle: "How should we address you?" },
      { title: "Profile picture", subtitle: "Gozuru photo guidelines" },
      { title: "Contact", subtitle: "Phone and online profiles" },
      { title: "Meeting place", subtitle: "Where should guests meet you?" },
      { title: "Photos", subtitle: "Show your expertise" },
    ],
    [],
  );

  const currentStep = stepMeta[stepIndex];
  const isLast = stepIndex === stepMeta.length - 1;
  const parseNumericInput = (value: string): number => {
    const sanitized = value.replace(/[^\d.]/g, "");
    return Number.parseFloat(sanitized);
  };
  const durationHoursNumber = Number.parseInt(durationHours, 10);
  const hourlyRateNumber = parseNumericInput(hourlyRate);
  const estimatedPerHeadPrice =
    Number.isFinite(durationHoursNumber) &&
    durationHoursNumber > 0 &&
    Number.isFinite(hourlyRateNumber) &&
    hourlyRateNumber > 0
      ? durationHoursNumber * hourlyRateNumber
      : 0;
  const maxGuestsNumber = Number.parseInt(maxGuests.replace(/[^\d]/g, ""), 10);
  const estimatedHostEarnings =
    estimatedPerHeadPrice > 0 &&
    Number.isFinite(maxGuestsNumber) &&
    maxGuestsNumber > 0
      ? estimatedPerHeadPrice * maxGuestsNumber
      : 0;

  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function goNext() {
    setStepIndex((i) => Math.min(stepMeta.length - 1, i + 1));
  }

  function getDescriptorLabel(): string | undefined {
    return experienceDescriptors.find((c) => c.id === descriptorId)?.label;
  }

  function getFileExtension(filename: string): string {
    const fromName = filename.split(".").pop()?.toLowerCase();
    return fromName && fromName.length <= 5 ? fromName : "jpg";
  }

  function getMediaType(file: File): "image" | "video" | null {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    return null;
  }

  function getAudienceFromRequirements(requirements: string[] | null | undefined) {
    const source = requirements ?? [];
    if (source.some((req) => req.toLowerCase().includes("female"))) return "female_only";
    if (source.some((req) => req.toLowerCase().includes("male only"))) return "male_only";
    if (source.some((req) => req.toLowerCase().includes("private"))) return "private";
    return "group";
  }

  function removeMediaItem(index: number) {
    setMedia((prev) => {
      const item = prev[index];
      if (!item) return prev;
      if (item.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  async function onFinish() {
    if (!user) {
      setSubmitError("You must be logged in to create an experience.");
      return;
    }

    if (!primaryCategoryId || !descriptorId) {
      setSubmitError("Please select both a category and experience type.");
      return;
    }

    if (!experienceTitle.trim() || experienceTitle.trim().length < 5) {
      setSubmitError("Please provide a title with at least 5 characters.");
      return;
    }

    if (!Number.isFinite(hourlyRateNumber) || hourlyRateNumber <= 0) {
      setSubmitError("Please provide a valid hourly price.");
      return;
    }

    if (!Number.isFinite(durationHoursNumber) || durationHoursNumber < 1) {
      setSubmitError("Please provide a valid duration in hours.");
      return;
    }

    if (!Number.isFinite(maxGuestsNumber) || maxGuestsNumber < 1 || maxGuestsNumber > 50) {
      setSubmitError("Maximum group size must be between 1 and 50.");
      return;
    }

    if (!expertise.trim() || expertise.trim().length < 30) {
      setSubmitError("Please add at least 30 characters in your expertise section.");
      return;
    }

    if (!firstName.trim()) {
      setSubmitError("Please add your first name.");
      return;
    }

    if (!phoneNumber.trim()) {
      setSubmitError("Please add your phone number.");
      return;
    }

    if (!streetAddress.trim() || !city.trim() || !stateTerritory.trim() || !zipPostalCode.trim()) {
      setSubmitError("Please complete your meeting location details.");
      return;
    }

    if (media.length === 0) {
      setSubmitError("Please upload at least one photo or video.");
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    try {
      const categoryQuery = await supabase
        .from("categories")
        .select("id")
        .eq("slug", primaryCategoryId)
        .maybeSingle();

      if (categoryQuery.error) throw new Error(categoryQuery.error.message);
      if (!categoryQuery.data?.id) {
        throw new Error("Selected category does not exist in database.");
      }

      const cleanedProfiles = onlineProfiles
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      const { error: profileError } = await supabase.from("profiles").update({
        first_name: firstName.trim(),
        phone: phoneNumber.trim(),
      }).eq("user_id", user.id);
      if (profileError) throw new Error(profileError.message);

      const yearsNumber = Number.parseInt(yearsExperience, 10);
      const { error: hostProfileError } = await supabase.from("host_profiles").upsert({
        user_id: user.id,
        headline: experienceTitle.trim() || null,
        expertise: expertise.trim() || null,
        years_experience: Number.isFinite(yearsNumber) ? yearsNumber : null,
        career_highlight: careerHighlight.trim() || null,
        highlight_story: highlightShare.trim() || null,
      });
      if (hostProfileError) throw new Error(hostProfileError.message);

      await supabase.from("host_social_links").delete().eq("host_user_id", user.id);
      if (cleanedProfiles.length > 0) {
        const { error: socialLinksError } = await supabase.from("host_social_links").insert(
          cleanedProfiles.map((url) => ({
            host_user_id: user.id,
            url,
          })),
        );
        if (socialLinksError) throw new Error(socialLinksError.message);
      }

      const descriptor = getDescriptorLabel();
      const subtitle = descriptor ? `${descriptor} led by ${firstName.trim()}` : null;
      const audienceRequirementMap: Record<
        "group" | "female_only" | "male_only" | "private",
        string
      > = {
        group: "Audience: Group",
        female_only: "Audience: Female only",
        male_only: "Audience: Male only",
        private: "Audience: Private group",
      };
      const experiencePayload = {
        host_user_id: user.id,
        title: experienceTitle.trim(),
        subtitle,
        description: expertise.trim(),
        category_id: categoryQuery.data.id,
        status: "submitted",
        meeting_point_name: locationName.trim() || null,
        duration_minutes: durationHoursNumber * 60,
        price_amount: estimatedPerHeadPrice,
        currency,
        max_guests: maxGuestsNumber,
        requirements: [
          audienceRequirementMap[audienceType],
          `Max group size: ${maxGuestsNumber}`,
          `Rate: ${currency} ${hourlyRateNumber.toFixed(2)} per hour`,
        ],
      };

      let experienceId = editExperienceId ?? "";
      if (isEditing && editExperienceId) {
        const { error: updateExperienceError } = await supabase
          .from("experiences")
          .update(experiencePayload)
          .eq("id", editExperienceId)
          .eq("host_user_id", user.id);
        if (updateExperienceError) throw new Error(updateExperienceError.message);
      } else {
        const { data: createdExperience, error: createExperienceError } = await supabase
          .from("experiences")
          .insert(experiencePayload)
          .select("id")
          .single();
        if (createExperienceError) throw new Error(createExperienceError.message);
        experienceId = createdExperience.id as string;
      }

      const { error: locationError } = await supabase
        .from("experience_locations")
        .upsert(
          {
            experience_id: experienceId,
            country_region: countryRegion.trim() || null,
            street_address: streetAddress.trim() || null,
            apt_suite: aptSuite.trim() || null,
            city: city.trim() || null,
            state_territory: stateTerritory.trim() || null,
            postal_code: zipPostalCode.trim() || null,
          },
          {
            onConflict: "experience_id",
          },
        );
      if (locationError) throw new Error(locationError.message);

      if (profilePhotoFile) {
        const profilePath = `${user.id}/avatar.${getFileExtension(profilePhotoFile.name)}`;
        const { error: avatarUploadError } = await supabase.storage
          .from("avatars")
          .upload(profilePath, profilePhotoFile, { upsert: true });
        if (avatarUploadError) throw new Error(avatarUploadError.message);

        const { error: avatarProfileError } = await supabase
          .from("profiles")
          .update({ avatar_path: profilePath })
          .eq("user_id", user.id);
        if (avatarProfileError) throw new Error(avatarProfileError.message);
      }

      const mediaRows: Array<{
        experience_id: string;
        storage_path: string;
        media_type: "image" | "video";
        sort_order: number;
      }> = [];

      for (let i = 0; i < media.length; i += 1) {
        const item = media[i];
        let storagePath = item.storagePath ?? "";
        if (item.file) {
          storagePath = `${user.id}/${experienceId}/${Date.now()}-${i}.${getFileExtension(item.file.name)}`;
          const { error: mediaUploadError } = await supabase.storage
            .from("experience-media")
            .upload(storagePath, item.file);
          if (mediaUploadError) throw new Error(mediaUploadError.message);
        }
        if (!storagePath) continue;

        mediaRows.push({
          experience_id: experienceId,
          storage_path: storagePath,
          media_type: item.mediaType,
          sort_order: i,
        });
      }

      if (isEditing && editExperienceId) {
        const { error: deleteExistingMediaError } = await supabase
          .from("experience_media")
          .delete()
          .eq("experience_id", editExperienceId);
        if (deleteExistingMediaError) throw new Error(deleteExistingMediaError.message);
      }

      const { error: mediaInsertError } = await supabase.from("experience_media").insert(mediaRows);
      if (mediaInsertError) throw new Error(mediaInsertError.message);

      if (isEditing && editExperienceId) {
        const { error: deleteTagMapError } = await supabase
          .from("experience_tag_map")
          .delete()
          .eq("experience_id", editExperienceId);
        if (deleteTagMapError) throw new Error(deleteTagMapError.message);
      }

      if (descriptor) {
        const { data: tag, error: tagError } = await supabase
          .from("experience_tags")
          .select("id")
          .eq("slug", descriptorId)
          .maybeSingle();
        if (tagError) throw new Error(tagError.message);
        if (tag?.id) {
          const { error: mapError } = await supabase.from("experience_tag_map").insert({
            experience_id: experienceId,
            tag_id: tag.id,
          });
          if (mapError) throw new Error(mapError.message);
        }
      }

      router.push("/account/experiences");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to create experience.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!user || !editExperienceId) return;

    let mounted = true;
    const loadExistingExperience = async () => {
      setLoadingExistingData(true);
      setSubmitError(null);

      const { data: experience, error: experienceError } = await supabase
        .from("experiences")
        .select("id,title,description,category_id,meeting_point_name,duration_minutes,price_amount,currency,max_guests,requirements")
        .eq("id", editExperienceId)
        .eq("host_user_id", user.id)
        .maybeSingle();
      if (!mounted) return;
      if (experienceError || !experience) {
        setSubmitError(experienceError?.message ?? "Experience not found.");
        setLoadingExistingData(false);
        return;
      }

      const { data: categoriesData } = await supabase.from("categories").select("id,slug");
      const categorySlug = categoriesData?.find((row) => row.id === experience.category_id)?.slug ?? "";

      const { data: tagMapRows } = await supabase
        .from("experience_tag_map")
        .select("tag_id")
        .eq("experience_id", editExperienceId)
        .limit(1);
      let descriptorSlug = "";
      if (tagMapRows?.[0]?.tag_id) {
        const { data: tagData } = await supabase
          .from("experience_tags")
          .select("slug")
          .eq("id", tagMapRows[0].tag_id)
          .maybeSingle();
        descriptorSlug = tagData?.slug ?? "";
      }

      const { data: hostProfile } = await supabase
        .from("host_profiles")
        .select("years_experience,career_highlight,highlight_story")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name,phone,avatar_path")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: locationData } = await supabase
        .from("experience_locations")
        .select("country_region,street_address,apt_suite,city,state_territory,postal_code")
        .eq("experience_id", editExperienceId)
        .maybeSingle();

      const { data: linksData } = await supabase
        .from("host_social_links")
        .select("url")
        .eq("host_user_id", user.id);

      const { data: mediaData } = await supabase
        .from("experience_media")
        .select("storage_path,media_type")
        .eq("experience_id", editExperienceId)
        .order("sort_order", { ascending: true });

      if (!mounted) return;

      setPrimaryCategoryId(categorySlug);
      setDescriptorId(descriptorSlug);
      setExperienceTitle(experience.title ?? "");
      setExpertise(experience.description ?? "");
      setDurationHours(
        experience.duration_minutes ? String(Math.max(1, Math.round(experience.duration_minutes / 60))) : "1",
      );
      setHourlyRate(
        experience.price_amount && experience.duration_minutes
          ? String(Number(experience.price_amount) / Math.max(1, experience.duration_minutes / 60))
          : "",
      );
      setCurrency(experience.currency ?? "USD");
      setMaxGuests(String(experience.max_guests ?? 5));
      setAudienceType(getAudienceFromRequirements(experience.requirements) as typeof audienceType);
      setLocationName(experience.meeting_point_name ?? "");

      setYearsExperience(hostProfile?.years_experience ? String(hostProfile.years_experience) : "");
      setCareerHighlight(hostProfile?.career_highlight ?? "");
      setHighlightShare(hostProfile?.highlight_story ?? "");

      setFirstName(profileData?.first_name ?? "");
      setPhoneNumber(profileData?.phone ?? "");
      if (profileData?.avatar_path) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(profileData.avatar_path);
        setProfilePhotoUrl(publicUrl);
      }

      setCountryRegion(locationData?.country_region ?? "United States");
      setStreetAddress(locationData?.street_address ?? "");
      setAptSuite(locationData?.apt_suite ?? "");
      setCity(locationData?.city ?? "");
      setStateTerritory(locationData?.state_territory ?? "");
      setZipPostalCode(locationData?.postal_code ?? "");

      setOnlineProfiles(linksData && linksData.length > 0 ? linksData.map((link) => link.url) : [""]);
      setMedia(
        (mediaData ?? []).map((item) => {
          const {
            data: { publicUrl },
          } = supabase.storage.from("experience-media").getPublicUrl(item.storage_path);
          return {
            storagePath: item.storage_path,
            previewUrl: publicUrl,
            mediaType: item.media_type as "image" | "video",
          };
        }),
      );

      setStepIndex(1);
      setLoadingExistingData(false);
    };

    void loadExistingExperience();

    return () => {
      mounted = false;
    };
  }, [editExperienceId, user]);

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    // Avoid memory leaks when we create object URLs from uploads.
    return () => {
      for (const url of objectUrls) URL.revokeObjectURL(url);
    };
  }, []);

  return (
    <div className="text-foreground">
      <div className="mx-auto w-full max-w-4xl px-4 py-10 lg:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {currentStep.title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {currentStep.subtitle}
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-3 py-1">
                Step {stepIndex + 1} / {stepMeta.length}
              </span>
            </div>
          </div>

          {/* Stepper */}
          <div className="mt-6 flex items-center justify-between gap-2 overflow-x-auto pb-3">
            {stepMeta.map((s, idx) => {
              const active = idx === stepIndex;
              const done = idx < stepIndex;
              return (
                <div
                  key={s.title}
                  className="flex min-w-[120px] items-center gap-2"
                >
                  <div
                    className={`flex size-9 items-center justify-center rounded-full border text-xs font-semibold ${
                      active
                        ? "border-orange-500 bg-orange-500 text-white"
                        : done
                          ? "border-orange-500 bg-orange-500/10 text-orange-500"
                          : "border-input bg-background text-muted-foreground"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="hidden md:block">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {s.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6">
            {stepIndex === 0 ? (
              <div className="text-center">
                <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full border border-orange-200 bg-orange-50">
                  <div className="text-orange-600 font-black">G</div>
                </div>

                <h2 className="text-3xl font-bold tracking-tight">
                  {isEditing ? "Edit your experience on Gozuru" : "Create an Experience on Gozuru"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {isEditing
                    ? "Update your experience details, pricing, audience and media."
                    : "Work with our experts to propose an experience to travelers on Gozuru."}
                </p>

                <div className="mx-auto mt-8 max-w-xl text-left">
                  <ol className="space-y-4">
                    <li className="flex gap-4">
                      <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        1
                      </div>
                      <p className="text-sm text-foreground">
                        You&apos;ll tell us about yourself, where you&apos;ll offer your experience, and set up the itinerary.
                      </p>
                    </li>
                    <li className="flex gap-4">
                      <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        2
                      </div>
                      <p className="text-sm text-foreground">
                        Gozuru will review your submission to ensure it meets our standards and requirements.
                      </p>
                    </li>
                    <li className="flex gap-4">
                      <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        3
                      </div>
                      <p className="text-sm text-foreground">
                        Once approved, you will add availability to begin hosting.
                      </p>
                    </li>
                  </ol>
                </div>

                <div className="mt-10 flex justify-center">
                  <Button
                    type="button"
                    className="h-11 rounded-full bg-orange-500 px-8 text-white hover:bg-orange-600"
                    onClick={goNext}
                  >
                    {isEditing ? "Continue editing" : "Get started"}
                    <ChevronRight className="ml-2 size-4" />
                  </Button>
                </div>
              </div>
            ) : null}

            {stepIndex === 1 ? (
              <Card className="rounded-2xl border-border bg-card p-6">
                <h2 className="text-xl font-semibold tracking-tight">
                  What experience will you offer guests?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick a category and a style for your experience.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {primaryCategories.map((c) => {
                    const selected = c.id === primaryCategoryId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`rounded-xl border p-4 text-left transition ${
                          selected
                            ? "border-orange-500 bg-orange-50"
                            : "border-input bg-background hover:bg-muted/60"
                        }`}
                        onClick={() => setPrimaryCategoryId(c.id)}
                      >
                        <p className="text-sm font-semibold">{c.label}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8">
                  <h3 className="text-sm font-semibold">How would you best describe it?</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {experienceDescriptors.map((c) => {
                      const selected = c.id === descriptorId;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={`rounded-xl border p-4 text-left transition ${
                            selected
                              ? "border-orange-500 bg-orange-50"
                              : "border-input bg-background hover:bg-muted/60"
                          }`}
                          onClick={() => setDescriptorId(c.id)}
                        >
                          <p className="text-sm font-semibold">{c.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ) : null}

            {stepIndex === 2 ? (
              <Card className="rounded-2xl border-border bg-card p-6">
                <h2 className="text-xl font-semibold tracking-tight">About you</h2>

                <div className="mt-6 space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      How many years of experience do you have?
                    </label>
                    <Input
                      className="h-10 rounded-xl bg-background"
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(e.target.value)}
                      placeholder="Enter the number of years"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Give yourself a title
                    </label>
                    <Input
                      className="h-10 rounded-xl bg-background"
                      value={experienceTitle}
                      onChange={(e) => setExperienceTitle(e.target.value)}
                      placeholder="e.g. Pasta master & city explorer"
                      maxLength={50}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Share your expertise
                    </label>
                    <textarea
                      className="min-h-[140px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={expertise}
                      onChange={(e) => setExpertise(e.target.value)}
                      placeholder="Tell travelers what makes your experience special."
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground">
                      {expertise.length}/500
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div>
                        <h3 className="text-sm font-semibold">Pricing and duration</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Set a base hourly rate and choose experience duration.
                        </p>

                        <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground">
                              Currency
                            </label>
                            <select
                              value={currency}
                              onChange={(e) => setCurrency(e.target.value)}
                              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                            >
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                              <option value="CAD">CAD</option>
                              <option value="KSH">KSH</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground">
                              Price per hour
                            </label>
                            <Input
                              type="number"
                              min="1"
                              step="0.01"
                              className="h-10 rounded-xl bg-background"
                              value={hourlyRate}
                              onChange={(e) => setHourlyRate(e.target.value)}
                              placeholder="50"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground">
                              Duration (hours)
                            </label>
                            <Input
                              type="number"
                              min="1"
                              max="24"
                              step="1"
                              className="h-10 rounded-xl bg-background"
                              value={durationHours}
                              onChange={(e) => setDurationHours(e.target.value)}
                              placeholder="3"
                            />
                          </div>
                        </div>

                        <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm">
                          <span className="text-muted-foreground">Per head total: </span>
                          <span className="font-semibold text-foreground">
                            {currency} {estimatedPerHeadPrice > 0 ? estimatedPerHeadPrice.toFixed(2) : "0.00"}
                          </span>
                        </div>

                        <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
                          <span className="text-muted-foreground">Estimated host earnings (full group): </span>
                          <span className="font-semibold text-foreground">
                            {currency} {estimatedHostEarnings > 0 ? estimatedHostEarnings.toFixed(2) : "0.00"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Calculation: ({currency}{" "}
                          {Number.isFinite(hourlyRateNumber) ? hourlyRateNumber.toFixed(2) : "0.00"} per hour
                          × {Number.isFinite(durationHoursNumber) ? durationHoursNumber : 0}h) ×{" "}
                          {Number.isFinite(maxGuestsNumber) ? maxGuestsNumber : 0} guests
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold">Audience setup</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Define who this experience is for and maximum group size.
                        </p>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          {[
                            { id: "group", label: "A group (mixed)" },
                            { id: "female_only", label: "Only females" },
                            { id: "male_only", label: "Only males" },
                            { id: "private", label: "Private group booking" },
                          ].map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() =>
                                setAudienceType(
                                  option.id as "group" | "female_only" | "male_only" | "private",
                                )
                              }
                              className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                                audienceType === option.id
                                  ? "border-orange-500 bg-orange-50"
                                  : "border-input bg-background hover:bg-muted/60"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>

                        <div className="mt-4 space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground">
                            Maximum group size
                          </label>
                          <Input
                            type="number"
                            min="1"
                            max="50"
                            step="1"
                            className="h-10 rounded-xl bg-background"
                            value={maxGuests}
                            onChange={(e) => setMaxGuests(e.target.value.replace(/[^\d]/g, ""))}
                            placeholder="5"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ) : null}

            {stepIndex === 3 ? (
              <Card className="rounded-2xl border-border bg-card p-6">
                <h2 className="text-xl font-semibold tracking-tight">
                  Recognition (optional)
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  If you have any awards, please share details below.
                </p>

                <div className="mt-6 space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Add a career highlight
                    </label>
                    <Input
                      className="h-10 rounded-xl bg-background"
                      value={careerHighlight}
                      onChange={(e) => setCareerHighlight(e.target.value)}
                      placeholder="e.g. Best local chef 2024"
                      maxLength={50}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Share about this highlight
                    </label>
                    <textarea
                      className="min-h-[110px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={highlightShare}
                      onChange={(e) => setHighlightShare(e.target.value)}
                      placeholder="What did you achieve and why it matters?"
                      maxLength={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      {highlightShare.length}/100
                    </p>
                  </div>
                </div>
              </Card>
            ) : null}

            {stepIndex === 4 ? (
              <Card className="rounded-2xl border-border bg-card p-6">
                <h2 className="text-xl font-semibold tracking-tight">Your name</h2>
                <div className="mt-6 space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    First name
                  </label>
                  <Input
                    className="h-10 rounded-xl bg-background"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Kevin"
                    maxLength={50}
                  />
                </div>
              </Card>
            ) : null}

            {stepIndex === 5 ? (
              <Card className="rounded-2xl border-border bg-card p-6">
                <h2 className="text-xl font-semibold tracking-tight">
                  Gozuru profile picture
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Guidelines for your photo:
                </p>

                <ul className="mt-4 space-y-2 text-sm text-foreground">
                  <li className="flex gap-3">
                    <span className="text-muted-foreground">•</span>
                    <span>Show your face and smile</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-muted-foreground">•</span>
                    <span>Look directly at the camera</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-muted-foreground">•</span>
                    <span>Use a clean, uncluttered background</span>
                  </li>
                </ul>

                <div className="mt-6 flex items-center gap-4">
                  <div className="relative size-14 overflow-hidden rounded-full border border-input bg-muted">
                    {profilePhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profilePhotoUrl}
                        alt="Profile preview"
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center text-sm text-muted-foreground">
                        {firstName.trim() ? firstName.trim().slice(0, 1).toUpperCase() : "G"}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {profilePhotoUrl ? "Photo ready" : "Upload a photo"}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 rounded-full"
                      onClick={() => profilePhotoInputRef.current?.click()}
                    >
                      <Edit className="mr-2 size-4" />
                      Edit
                    </Button>
                    <input
                      ref={profilePhotoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith("image/")) {
                          setSubmitError("Profile photo must be an image.");
                          return;
                        }
                        const url = URL.createObjectURL(file);
                        if (profilePhotoUrl) URL.revokeObjectURL(profilePhotoUrl);
                        objectUrlsRef.current.push(url);
                        setProfilePhotoUrl(url);
                        setProfilePhotoFile(file);
                      }}
                    />
                  </div>
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                  Photo will be reviewed and updated on your Gozuru profile after approval. Additional photo requirements may apply.
                </p>
              </Card>
            ) : null}

            {stepIndex === 6 ? (
              <Card className="rounded-2xl border-border bg-card p-6">
                <h2 className="text-xl font-semibold tracking-tight">
                  Phone number
                </h2>

                <div className="mt-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Your phone number is essential for guests to contact you after booking
                    </label>
                    <Input
                      type="tel"
                      className="h-10 rounded-xl bg-background"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. +1 555 0123"
                    />
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <Info className="mt-0.5 size-4 text-amber-700" />
                      <p className="text-sm text-amber-900">
                        Make sure your phone number is up-to-date.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Add your online profiles</h3>
                    <p className="text-xs text-muted-foreground">
                      Share as many links as you can. Helps Gozuru review your listing.
                    </p>

                    <div className="space-y-3">
                      {onlineProfiles.map((p, idx) => (
                        <Input
                          key={`${idx}`}
                          className="h-10 rounded-xl bg-background"
                          value={p}
                          onChange={(e) => {
                            const next = [...onlineProfiles];
                            next[idx] = e.target.value;
                            setOnlineProfiles(next);
                          }}
                          placeholder="https://example.com"
                        />
                      ))}
                    </div>

                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 rounded-full"
                        onClick={() => setOnlineProfiles((prev) => [...prev, ""])}
                      >
                        + Add another profile
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ) : null}

            {stepIndex === 7 ? (
              <Card className="rounded-2xl border-border bg-card p-6">
                <h2 className="text-xl font-semibold tracking-tight">
                  Where should guests meet you?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Confirm your address (mock form for now).
                </p>

                <div className="mt-6 space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Country/region
                    </label>
                    <select
                      value={countryRegion}
                      onChange={(e) => setCountryRegion(e.target.value)}
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option>United States</option>
                      <option>Canada</option>
                      <option>United Kingdom</option>
                      <option>Germany</option>
                      <option>France</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Street address
                    </label>
                    <Input
                      className="h-10 rounded-xl bg-background"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="123 Main St"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Apt, suite, etc. (if applicable)
                    </label>
                    <Input
                      className="h-10 rounded-xl bg-background"
                      value={aptSuite}
                      onChange={(e) => setAptSuite(e.target.value)}
                      placeholder="Apt 4B"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground">
                        City
                      </label>
                      <Input
                        className="h-10 rounded-xl bg-background"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Chicago"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground">
                        State / territory
                      </label>
                      <Input
                        className="h-10 rounded-xl bg-background"
                        value={stateTerritory}
                        onChange={(e) => setStateTerritory(e.target.value)}
                        placeholder="Illinois"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      ZIP / Postal code
                    </label>
                    <Input
                      className="h-10 rounded-xl bg-background"
                      value={zipPostalCode}
                      onChange={(e) => setZipPostalCode(e.target.value)}
                      placeholder="60601"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Location name
                    </label>
                    <Input
                      className="h-10 rounded-xl bg-background"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="Meet at the main entrance"
                    />
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-input bg-muted/30 p-4 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 size-4" />
                    <p>
                      This is a mock address form for now; no validation or geocoding is performed.
                    </p>
                  </div>
                </div>
              </Card>
            ) : null}

            {stepIndex === 8 ? (
              <Card className="rounded-2xl border-border bg-card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      Add photos that showcase your expertise
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add up to 6 media files (images or videos).
                    </p>
                  </div>

                  <div className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {media.length} / 6 added
                  </div>
                </div>

                <div className="mt-6">
                  <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, idx) => {
                      const item = media[idx];
                      return (
                        <div
                          key={idx}
                          className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted"
                        >
                          {item ? (
                            item.mediaType === "image" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.previewUrl}
                                alt={`Experience media ${idx + 1}`}
                                className="absolute inset-0 size-full object-cover"
                              />
                            ) : (
                              <video
                                src={item.previewUrl}
                                className="absolute inset-0 size-full object-cover"
                                muted
                              />
                            )
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                              Media
                            </div>
                          )}
                          {item ? (
                            <button
                              type="button"
                              onClick={() => removeMediaItem(idx)}
                              className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75"
                              aria-label={`Remove media ${idx + 1}`}
                            >
                              <X className="size-3.5" />
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex items-center justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => photosInputRef.current?.click()}
                      disabled={media.length >= 6}
                    >
                      <Upload className="mr-2 size-4" />
                      Add media
                    </Button>
                    <input
                      ref={photosInputRef}
                      type="file"
                      accept="image/*,video/mp4,video/quicktime"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files ? Array.from(e.target.files) : [];
                        if (files.length === 0) return;
                        const remaining = 6 - media.length;
                        const toAdd = files.slice(0, remaining);
                        const toAddWithPreview = toAdd.flatMap((file) => {
                          const mediaType = getMediaType(file);
                          if (!mediaType) return [];
                          const previewUrl = URL.createObjectURL(file);
                          objectUrlsRef.current.push(previewUrl);
                          return [
                            {
                              file,
                              previewUrl,
                              mediaType,
                            } satisfies UploadedMediaPreview,
                          ];
                        });
                        setMedia((prev) => [...prev, ...toAddWithPreview].slice(0, 6));
                      }}
                    />
                  </div>
                </div>
              </Card>
            ) : null}
          </div>

          {/* Bottom actions */}
          {stepIndex === 0 ? null : (
          <div className="mt-8 flex items-center justify-between gap-3 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={stepIndex === 0}
              onClick={goBack}
            >
              <ChevronLeft className="mr-2 size-4" />
              Back
            </Button>

            {isLast ? (
              <Button
                type="button"
                className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
                onClick={onFinish}
                disabled={submitting || loadingExistingData}
              >
                {submitting
                  ? isEditing
                    ? "Saving changes..."
                    : "Submitting..."
                  : isEditing
                    ? "Save changes"
                    : "Submit for review"}
                <ChevronRight className="ml-2 size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
                onClick={goNext}
              >
                Continue
                <ChevronRight className="ml-2 size-4" />
              </Button>
            )}
          </div>
          )}
          {loadingExistingData ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading experience data...</p>
          ) : null}
          {submitError ? (
            <p className="mt-3 text-sm text-red-500">{submitError}</p>
          ) : null}
      </div>
    </div>
  );
}


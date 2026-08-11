"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ImageIcon, Play, Plus, Upload, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
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

type AvailabilityDraftSlot = {
  localId: string;
  id?: string;
  startsAt: string;
  endsAt: string;
  capacity: string;
  priceAmount: string;
  currency: string;
  meetingPlaceName: string;
  isCancelled: boolean;
};

type CalendarView = "day" | "week" | "month" | "year";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_MEDIA_FILE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ACCEPTED_VIDEO_MIME_TYPES = new Set(["video/mp4", "video/quicktime"]);
const PHOTO_FILE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
const VIDEO_FILE_ACCEPT = "video/mp4,video/quicktime,.mp4,.mov";
function toLocalInputValue(date: Date): string {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getNextHourLocalInputValue(): string {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return toLocalInputValue(date);
}

function getTwoHoursFromNowLocalInputValue(): string {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 2);
  return toLocalInputValue(date);
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfWeek(date: Date): Date {
  const next = startOfDay(date);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function monthLabel(date: Date): string {
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function slugifyLabel(label: string): string {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || `custom-${Date.now()}`;
}

export default function CreateExperiencePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const editExperienceId = searchParams.get("edit");
  const isEditing = Boolean(editExperienceId);

  const [stepIndex, setStepIndex] = useState(0);
  const [draftExperienceId, setDraftExperienceId] = useState<string | null>(editExperienceId);
  const objectUrlsRef = useRef<string[]>([]);

  // Step 1: categories
  const primaryCategories: Choice[] = useMemo(
    () => [
      { id: "history-culture", label: "History & Culture" },
      { id: "food-drink", label: "Food & Drink" },
      { id: "nature-outdoors", label: "Nature & Outdoors" },
      { id: "art-design", label: "Art & Design" },
      { id: "fitness-wellness", label: "Fitness & Wellness" },
      { id: "business-career", label: "Business & Career" },
      { id: "technology-ai", label: "Technology & AI" },
      { id: "education-training", label: "Education & Training" },
      { id: "health-medical", label: "Health & Medical" },
      { id: "finance-investing", label: "Finance & Investing" },
      { id: "legal-compliance", label: "Legal & Compliance" },
      { id: "engineering-trades", label: "Engineering & Trades" },
      { id: "media-marketing", label: "Media & Marketing" },
      { id: "agriculture-sustainability", label: "Agriculture & Sustainability" },
    ],
    [],
  );
  const experienceDescriptors: Choice[] = useMemo(
    () => [
      { id: "outdoor-experiences", label: "Outdoor experiences" },
      { id: "water-sports", label: "Water sports" },
      { id: "flying-experiences", label: "Flying experiences" },
      { id: "animal-experiences", label: "Animal experiences" },
      { id: "workshop", label: "Hands-on workshop" },
      { id: "mentorship", label: "Mentorship session" },
      { id: "consultation", label: "Professional consultation" },
      { id: "masterclass", label: "Masterclass" },
      { id: "site-tour", label: "Site/operations tour" },
      { id: "strategy-session", label: "Strategy session" },
      { id: "coaching", label: "Coaching" },
      { id: "certification-prep", label: "Certification prep" },
    ],
    [],
  );
  const [customPrimaryCategories, setCustomPrimaryCategories] = useState<Choice[]>([]);
  const [customExperienceDescriptors, setCustomExperienceDescriptors] = useState<Choice[]>([]);
  const [primaryCategoryIds, setPrimaryCategoryIds] = useState<string[]>([]);
  const [descriptorIds, setDescriptorIds] = useState<string[]>([]);

  const allPrimaryCategories = useMemo(
    () => [...primaryCategories, ...customPrimaryCategories],
    [primaryCategories, customPrimaryCategories],
  );
  const allExperienceDescriptors = useMemo(
    () => [...experienceDescriptors, ...customExperienceDescriptors],
    [experienceDescriptors, customExperienceDescriptors],
  );

  // Step 2: about you
  const [yearsExperience, setYearsExperience] = useState("");
  const [experienceTitle, setExperienceTitle] = useState("");
  const [expertise, setExpertise] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [durationHours, setDurationHours] = useState("1");
  const [currency, setCurrency] = useState("KES");
  const [audienceType, setAudienceType] = useState<
    "group" | "female_only" | "male_only" | "private"
  >("group");
  const [maxGuests, setMaxGuests] = useState("5");

  // Step 3: photos & videos
  const [media, setMedia] = useState<UploadedMediaPreview[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const photosInputRef = useRef<HTMLInputElement | null>(null);
  const videosInputRef = useRef<HTMLInputElement | null>(null);
  // Step 4: availability
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilityDraftSlot[]>([]);
  const [slotStartsAt, setSlotStartsAt] = useState(getNextHourLocalInputValue);
  const [slotEndsAt, setSlotEndsAt] = useState(getTwoHoursFromNowLocalInputValue);
  const [slotCapacity, setSlotCapacity] = useState("1");
  const [slotPrice, setSlotPrice] = useState("");
  const [slotCurrency, setSlotCurrency] = useState("KES");
  const [slotMeetingPlaceMode, setSlotMeetingPlaceMode] = useState<"existing" | "new">("existing");
  const [slotMeetingPlace, setSlotMeetingPlace] = useState("");
  const [newMeetingPlace, setNewMeetingPlace] = useState("");
  const [knownMeetingPlaces, setKnownMeetingPlaces] = useState<string[]>([]);
  const [editingLocalSlotId, setEditingLocalSlotId] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  const [calendarCursor, setCalendarCursor] = useState(new Date());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExistingData, setLoadingExistingData] = useState(false);

  const stepMeta = useMemo(
    () => [
      { title: "Start", subtitle: "Create an experience" },
      { title: "Experience", subtitle: "What will you offer guests?" },
      { title: "Media", subtitle: "Photos and videos of your experience" },
      { title: "Availability", subtitle: "Set your dates and time slots" },
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
  const standardPriceNumber = parseNumericInput(hourlyRate);
  const maxGuestsNumber = Number.parseInt(maxGuests.replace(/[^\d]/g, ""), 10);
  const estimatedHostEarnings =
    standardPriceNumber > 0 &&
    Number.isFinite(maxGuestsNumber) &&
    maxGuestsNumber > 0
      ? standardPriceNumber * maxGuestsNumber
      : 0;
  const activeAvailabilitySlots = useMemo(
    () => availabilitySlots.filter((slot) => !slot.isCancelled),
    [availabilitySlots],
  );
  const availableMeetingPlaces = useMemo(() => {
    const draftPlaces = availabilitySlots
      .map((slot) => slot.meetingPlaceName.trim())
      .filter((name) => name.length > 0);
    return Array.from(new Set([...knownMeetingPlaces, ...draftPlaces])).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [availabilitySlots, knownMeetingPlaces]);
  const activeSlotsForCalendar = useMemo(
    () =>
      activeAvailabilitySlots
        .map((slot) => ({
          ...slot,
          startsDate: new Date(slot.startsAt),
          endsDate: new Date(slot.endsAt),
        }))
        .filter((slot) => Number.isFinite(slot.startsDate.getTime()) && Number.isFinite(slot.endsDate.getTime()))
        .sort((a, b) => a.startsDate.getTime() - b.startsDate.getTime()),
    [activeAvailabilitySlots],
  );
  const selectedDayStart = startOfDay(calendarCursor);
  const selectedWeekStart = startOfWeek(calendarCursor);
  const selectedMonthStart = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
  const selectedMonthGridStart = startOfWeek(selectedMonthStart);
  const selectedYear = calendarCursor.getFullYear();
  const weekEnd = new Date(selectedWeekStart);
  weekEnd.setDate(selectedWeekStart.getDate() + 6);
  const weekRangeLabel = `${selectedWeekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;

  const daySlots = activeSlotsForCalendar.filter(
    (slot) => slot.startsDate <= endOfDay(selectedDayStart) && slot.endsDate >= selectedDayStart,
  );
  const weekDays = Array.from({ length: 7 }, (_, idx) => {
    const date = new Date(selectedWeekStart);
    date.setDate(selectedWeekStart.getDate() + idx);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    const slots = activeSlotsForCalendar.filter(
      (slot) => slot.startsDate <= dayEnd && slot.endsDate >= dayStart,
    );
    return { date, slots };
  });
  const weekRowBlocks = Array.from({ length: 12 }, (_, idx) => {
    const blockStartHour = idx * 2;
    const endHour = blockStartHour + 2;
    const formatHour = (hour: number) => {
      const normalized = hour % 24;
      const suffix = normalized >= 12 ? "PM" : "AM";
      const display = normalized % 12 === 0 ? 12 : normalized % 12;
      return `${display}${suffix}`;
    };
    return {
      index: idx,
      label: `${formatHour(blockStartHour)} - ${formatHour(endHour)}`,
      startHour: blockStartHour,
      endHour,
    };
  });
  const weekGrid = weekRowBlocks.map((row) => {
    const columns = weekDays.map((day) => {
      const rowStart = startOfDay(day.date);
      rowStart.setHours(row.startHour, 0, 0, 0);
      const rowEnd = startOfDay(day.date);
      rowEnd.setHours(row.endHour, 0, 0, 0);
      const slots = day.slots.filter((slot) => slot.startsDate < rowEnd && slot.endsDate > rowStart);
      return { date: day.date, slots };
    });
    return { ...row, columns };
  });

  const monthGridDays = Array.from({ length: 42 }, (_, idx) => {
    const date = new Date(selectedMonthGridStart);
    date.setDate(selectedMonthGridStart.getDate() + idx);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    const slots = activeSlotsForCalendar.filter((slot) => slot.startsDate <= dayEnd && slot.endsDate >= dayStart);
    return { date, slotsCount: slots.length, slots };
  });
  const yearMonths = Array.from({ length: 12 }, (_, monthIndex) => {
    const monthStart = new Date(selectedYear, monthIndex, 1);
    const monthEnd = new Date(selectedYear, monthIndex + 1, 0, 23, 59, 59, 999);
    const slots = activeSlotsForCalendar.filter((slot) => slot.startsDate <= monthEnd && slot.endsDate >= monthStart);
    const miniGridStart = startOfWeek(monthStart);
    const miniDays = Array.from({ length: 35 }, (_, idx) => {
      const date = new Date(miniGridStart);
      date.setDate(miniGridStart.getDate() + idx);
      const inMonth = date.getMonth() === monthStart.getMonth();
      const count = slots.filter((slot) => startOfDay(slot.startsDate).getTime() === startOfDay(date).getTime()).length;
      return { date, inMonth, count };
    });
    return { monthStart, slotsCount: slots.length, slots, miniDays };
  });

  async function persistDraftExperience(options?: { strict?: boolean }): Promise<string> {
    const strict = options?.strict ?? false;
    if (!user) throw new Error("You must be logged in to create an experience.");

    const { error: ensureHostProfileError } = await supabase
      .from("host_profiles")
      .upsert(
        {
          user_id: user.id,
        },
        {
          onConflict: "user_id",
          ignoreDuplicates: true,
        },
      );
    if (ensureHostProfileError) {
      throw new Error(`Failed to initialize host profile: ${ensureHostProfileError.message}`);
    }

    if (primaryCategoryIds.length === 0 || descriptorIds.length === 0) {
      throw new Error("Please select at least one category and one experience type.");
    }
    if (!experienceTitle.trim() || experienceTitle.trim().length < 5) {
      throw new Error("Please provide a title with at least 5 characters.");
    }
    if (strict && (!Number.isFinite(standardPriceNumber) || standardPriceNumber <= 0)) {
      throw new Error("Please provide a valid standard price.");
    }
    if (strict && (!Number.isFinite(durationHoursNumber) || durationHoursNumber < 1)) {
      throw new Error("Please provide a valid duration in hours.");
    }
    if (!Number.isFinite(maxGuestsNumber) || maxGuestsNumber < 1 || maxGuestsNumber > 50) {
      throw new Error("Maximum group size must be between 1 and 50.");
    }
    if (!expertise.trim() || expertise.trim().length < 10) {
      throw new Error("Please add at least 10 characters in your expertise section.");
    }

    const primaryCategorySlug = primaryCategoryIds[0];
    const categoryQuery = await supabase
      .from("categories")
      .select("id")
      .eq("slug", primaryCategorySlug)
      .maybeSingle();
    if (categoryQuery.error) throw new Error(categoryQuery.error.message);

    let categoryId = categoryQuery.data?.id as string | undefined;
    const primaryCategoryLabel = getPrimaryCategoryLabel(primaryCategorySlug) ?? primaryCategorySlug;
    if (!categoryId) {
      const { data: createdCategory, error: createCategoryError } = await supabase
        .from("categories")
        .insert({
          slug: primaryCategorySlug,
          name: primaryCategoryLabel,
        })
        .select("id")
        .single();
      if (!createCategoryError && createdCategory?.id) {
        categoryId = createdCategory.id as string;
      }
    }

    const descriptorLabels = getDescriptorLabels();
    const subtitle =
      descriptorLabels.length > 0 ? `${descriptorLabels.join(", ")} on Gozuru` : null;
    const resolvedDurationMinutes =
      Number.isFinite(durationHoursNumber) && durationHoursNumber > 0
        ? durationHoursNumber * 60
        : null;
    const resolvedPriceAmount =
      Number.isFinite(standardPriceNumber) && standardPriceNumber > 0
        ? standardPriceNumber
        : null;
    const audienceRequirementMap: Record<"group" | "female_only" | "male_only" | "private", string> = {
      group: "Audience: Group",
      female_only: "Audience: Female only",
      male_only: "Audience: Male only",
      private: "Audience: Private group",
    };
    const additionalCategoryLabels = primaryCategoryIds
      .slice(1)
      .map((id) => getPrimaryCategoryLabel(id))
      .filter((label): label is string => Boolean(label));
    const baseRequirements = [
      audienceRequirementMap[audienceType],
      `Max group size: ${maxGuestsNumber}`,
      `Standard price: ${currency} ${resolvedPriceAmount ? resolvedPriceAmount.toFixed(2) : "TBD"} per guest`,
      `Typical duration: ${resolvedDurationMinutes ? `${Math.round(resolvedDurationMinutes / 60)}` : "TBD"} hour(s)`,
    ];
    if (!categoryId) {
      baseRequirements.unshift(`Primary category: ${primaryCategoryLabel}`);
    }
    if (additionalCategoryLabels.length > 0) {
      baseRequirements.push(`Additional categories: ${additionalCategoryLabels.join(", ")}`);
    }

    const baseExperiencePayload = {
      host_user_id: user.id,
      title: experienceTitle.trim(),
      subtitle,
      description: expertise.trim(),
      category_id: categoryId,
      meeting_point_name: null,
      duration_minutes: resolvedDurationMinutes,
      price_amount: resolvedPriceAmount,
      currency,
      max_guests: maxGuestsNumber,
      requirements: baseRequirements,
    };

    const targetExperienceId = draftExperienceId ?? editExperienceId;
    if (targetExperienceId) {
      const { error: updateExperienceError } = await supabase
        .from("experiences")
        .update(baseExperiencePayload)
        .eq("id", targetExperienceId)
        .eq("host_user_id", user.id);
      if (updateExperienceError) throw new Error(updateExperienceError.message);
      setDraftExperienceId(targetExperienceId);
      return targetExperienceId;
    }

    const { data: createdExperience, error: createExperienceError } = await supabase
      .from("experiences")
      .insert({
        ...baseExperiencePayload,
        status: "draft",
      })
      .select("id")
      .single();
    if (createExperienceError) throw new Error(createExperienceError.message);
    const createdId = createdExperience.id as string;
    setDraftExperienceId(createdId);
    return createdId;
  }

  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  async function goNext() {
    if (stepIndex === 1) {
      if (primaryCategoryIds.length === 0 || descriptorIds.length === 0) {
        setSubmitError("Please select at least one category and one experience type.");
        return;
      }
      if (!experienceTitle.trim() || experienceTitle.trim().length < 5) {
        setSubmitError("Please provide a title with at least 5 characters.");
        return;
      }
      if (!expertise.trim() || expertise.trim().length < 10) {
        setSubmitError("Please add at least 10 characters in your expertise section.");
        return;
      }
      if (!Number.isFinite(maxGuestsNumber) || maxGuestsNumber < 1 || maxGuestsNumber > 50) {
        setSubmitError("Maximum group size must be between 1 and 50.");
        return;
      }
      try {
        setSubmitError(null);
        await persistDraftExperience({ strict: false });
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Failed to save draft.");
        return;
      }
    }
    setStepIndex((i) => Math.min(stepMeta.length - 1, i + 1));
  }

  function moveCalendarCursor(direction: "prev" | "next") {
    const delta = direction === "next" ? 1 : -1;
    setCalendarCursor((prev) => {
      const next = new Date(prev);
      if (calendarView === "day") {
        next.setDate(next.getDate() + delta);
      } else if (calendarView === "week") {
        next.setDate(next.getDate() + delta * 7);
      } else if (calendarView === "month") {
        next.setMonth(next.getMonth() + delta);
      } else {
        next.setFullYear(next.getFullYear() + delta);
      }
      return next;
    });
  }

  function getDescriptorLabel(id: string): string | undefined {
    return allExperienceDescriptors.find((c) => c.id === id)?.label;
  }

  function getDescriptorLabels(): string[] {
    return descriptorIds
      .map((id) => getDescriptorLabel(id))
      .filter((label): label is string => Boolean(label));
  }

  function getPrimaryCategoryLabel(id: string): string | undefined {
    return allPrimaryCategories.find((c) => c.id === id)?.label;
  }

  function addCustomPrimaryCategory(label: string): Choice | null {
    const trimmed = label.trim();
    if (!trimmed) return null;
    const id = slugifyLabel(trimmed);
    const existing = allPrimaryCategories.find((item) => item.id === id || item.label.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (!primaryCategoryIds.includes(existing.id)) {
        setPrimaryCategoryIds((prev) => [...prev, existing.id]);
      }
      return existing;
    }
    const created = { id, label: trimmed };
    setCustomPrimaryCategories((prev) => [...prev, created]);
    return created;
  }

  function addCustomDescriptor(label: string): Choice | null {
    const trimmed = label.trim();
    if (!trimmed) return null;
    const id = slugifyLabel(trimmed);
    const existing = allExperienceDescriptors.find(
      (item) => item.id === id || item.label.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) {
      if (!descriptorIds.includes(existing.id)) {
        setDescriptorIds((prev) => [...prev, existing.id]);
      }
      return existing;
    }
    const created = { id, label: trimmed };
    setCustomExperienceDescriptors((prev) => [...prev, created]);
    return created;
  }

  function getFileExtension(filename: string): string {
    const fromName = filename.split(".").pop()?.toLowerCase();
    return fromName && fromName.length <= 5 ? fromName : "jpg";
  }

  function getMediaType(file: File): "image" | "video" | null {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension && ["jpg", "jpeg", "png", "webp"].includes(extension)) return "image";
    if (extension && ["mp4", "mov"].includes(extension)) return "video";
    return null;
  }

  function isAllowedMediaMime(file: File, mediaType: "image" | "video"): boolean {
    if (mediaType === "image") {
      return !file.type || ACCEPTED_IMAGE_MIME_TYPES.has(file.type);
    }
    return !file.type || ACCEPTED_VIDEO_MIME_TYPES.has(file.type);
  }

  function addMediaFiles(files: File[], preferredType?: "image" | "video") {
    if (files.length === 0) return;

    const errors: string[] = [];
    const nextItems: UploadedMediaPreview[] = [];
    const remaining = Math.max(0, 6 - media.length);

    for (const file of files.slice(0, remaining)) {
      const mediaType = getMediaType(file);
      if (!mediaType) {
        errors.push(`${file.name} is not a supported format.`);
        continue;
      }
      if (preferredType && mediaType !== preferredType) {
        errors.push(
          `${file.name} must be a ${preferredType === "video" ? "video (MP4 or MOV)" : "photo (JPG, PNG, or WebP)"}.`,
        );
        continue;
      }
      if (!isAllowedMediaMime(file, mediaType)) {
        errors.push(
          `${file.name} must be ${mediaType === "video" ? "MP4 or MOV" : "JPG, PNG, or WebP"}.`,
        );
        continue;
      }
      if (file.size > MAX_MEDIA_FILE_BYTES) {
        errors.push(`${file.name} exceeds the 15MB limit.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.push(previewUrl);
      nextItems.push({ file, previewUrl, mediaType });
    }

    if (files.length > remaining) {
      errors.push(`Only ${remaining} more file${remaining === 1 ? "" : "s"} can be added (6 max).`);
    }

    if (nextItems.length > 0) {
      setMedia((prev) => [...prev, ...nextItems].slice(0, 6));
      setMediaError(null);
    }
    if (errors.length > 0) {
      setMediaError(errors[0]);
    }
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

  function resetAvailabilityForm() {
    setSlotStartsAt(getNextHourLocalInputValue());
    setSlotEndsAt(getTwoHoursFromNowLocalInputValue());
    setSlotCapacity("1");
    setSlotPrice("");
    setSlotCurrency(currency || "KES");
    if (availableMeetingPlaces.length > 0) {
      setSlotMeetingPlaceMode("existing");
      setSlotMeetingPlace(availableMeetingPlaces[0]);
      setNewMeetingPlace("");
    } else {
      setSlotMeetingPlaceMode("new");
      setSlotMeetingPlace("");
      setNewMeetingPlace("");
    }
    setEditingLocalSlotId(null);
  }

  function addOrUpdateAvailabilitySlot() {
    const starts = new Date(slotStartsAt);
    const ends = new Date(slotEndsAt);
    const cap = Number.parseInt(slotCapacity, 10);
    const price = slotPrice.trim() ? Number.parseFloat(slotPrice) : 0;
    const meetingPlaceName =
      slotMeetingPlaceMode === "existing" ? slotMeetingPlace.trim() : newMeetingPlace.trim();

    if (!Number.isFinite(starts.getTime()) || !Number.isFinite(ends.getTime())) {
      setSubmitError("Please set a valid start and end for availability.");
      return;
    }
    if (ends <= starts) {
      setSubmitError("Availability end time must be after start time.");
      return;
    }
    if (!Number.isFinite(cap) || cap <= 0) {
      setSubmitError("Availability capacity must be greater than zero.");
      return;
    }
    if (slotPrice.trim() && (!Number.isFinite(price) || price < 0)) {
      setSubmitError("Availability price override must be zero or higher.");
      return;
    }
    if (!meetingPlaceName) {
      setSubmitError("Please select or create a meeting place for this slot.");
      return;
    }

    const collides = availabilitySlots.some((slot) => {
      if (slot.isCancelled) return false;
      if (editingLocalSlotId && slot.localId === editingLocalSlotId) return false;
      const existingStart = new Date(slot.startsAt);
      const existingEnd = new Date(slot.endsAt);
      if (!Number.isFinite(existingStart.getTime()) || !Number.isFinite(existingEnd.getTime())) {
        return false;
      }
      return starts < existingEnd && ends > existingStart;
    });
    if (collides) {
      setSubmitError("This slot overlaps another slot in your draft schedule.");
      return;
    }

    setSubmitError(null);
    if (editingLocalSlotId) {
      setAvailabilitySlots((prev) =>
        prev.map((slot) =>
          slot.localId === editingLocalSlotId
            ? {
              ...slot,
              startsAt: slotStartsAt,
              endsAt: slotEndsAt,
              capacity: String(cap),
              priceAmount: slotPrice.trim(),
              currency: slotCurrency,
              meetingPlaceName,
            }
            : slot,
        ),
      );
      if (slotMeetingPlaceMode === "new") {
        setKnownMeetingPlaces((prev) => Array.from(new Set([...prev, meetingPlaceName])));
      }
      resetAvailabilityForm();
      return;
    }

    setAvailabilitySlots((prev) => [
      ...prev,
      {
        localId: `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        startsAt: slotStartsAt,
        endsAt: slotEndsAt,
        capacity: String(cap),
        priceAmount: slotPrice.trim(),
        currency: slotCurrency,
        meetingPlaceName,
        isCancelled: false,
      },
    ]);
    if (slotMeetingPlaceMode === "new") {
      setKnownMeetingPlaces((prev) => Array.from(new Set([...prev, meetingPlaceName])));
    }
    resetAvailabilityForm();
  }

  function beginEditAvailabilitySlot(localId: string) {
    const slot = availabilitySlots.find((item) => item.localId === localId);
    if (!slot) return;
    setEditingLocalSlotId(slot.localId);
    setSlotStartsAt(slot.startsAt);
    setSlotEndsAt(slot.endsAt);
    setSlotCapacity(slot.capacity);
    setSlotPrice(slot.priceAmount);
    setSlotCurrency(slot.currency);
    const exists = availableMeetingPlaces.includes(slot.meetingPlaceName);
    if (exists) {
      setSlotMeetingPlaceMode("existing");
      setSlotMeetingPlace(slot.meetingPlaceName);
      setNewMeetingPlace("");
    } else {
      setSlotMeetingPlaceMode("new");
      setSlotMeetingPlace("");
      setNewMeetingPlace(slot.meetingPlaceName);
    }
  }

  function removeAvailabilitySlot(localId: string) {
    setAvailabilitySlots((prev) =>
      prev
        .map((slot) => (slot.localId === localId ? { ...slot, isCancelled: true } : slot)),
    );
    if (editingLocalSlotId === localId) {
      resetAvailabilityForm();
    }
  }

  async function onFinish() {
    if (!user) {
      setSubmitError("You must be logged in to create an experience.");
      return;
    }

    if (primaryCategoryIds.length === 0 || descriptorIds.length === 0) {
      setSubmitError("Please select at least one category and one experience type.");
      return;
    }

    if (!experienceTitle.trim() || experienceTitle.trim().length < 5) {
      setSubmitError("Please provide a title with at least 5 characters.");
      return;
    }

    if (!Number.isFinite(standardPriceNumber) || standardPriceNumber <= 0) {
      setSubmitError("Please provide a valid standard price.");
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

    if (!expertise.trim() || expertise.trim().length < 10) {
      setSubmitError("Please add at least 10 characters in your expertise section.");
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    try {
      const experienceId = await persistDraftExperience({ strict: true });

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

      if (mediaRows.length > 0) {
        const { error: mediaInsertError } = await supabase.from("experience_media").insert(mediaRows);
        if (mediaInsertError) throw new Error(mediaInsertError.message);
      }

      if (isEditing && editExperienceId) {
        const { error: deleteTagMapError } = await supabase
          .from("experience_tag_map")
          .delete()
          .eq("experience_id", editExperienceId);
        if (deleteTagMapError) throw new Error(deleteTagMapError.message);
      }

      const tagMapRows: Array<{ experience_id: string; tag_id: string }> = [];
      for (const descriptorSlug of descriptorIds) {
        const { data: tag, error: tagError } = await supabase
          .from("experience_tags")
          .select("id")
          .eq("slug", descriptorSlug)
          .maybeSingle();
        if (tagError) throw new Error(tagError.message);
        const tagId = tag?.id as string | undefined;
        if (tagId) {
          tagMapRows.push({ experience_id: experienceId, tag_id: tagId });
        }
      }
      if (tagMapRows.length > 0) {
        const { error: mapError } = await supabase.from("experience_tag_map").insert(tagMapRows);
        if (mapError) throw new Error(mapError.message);
      }

      const normalizedSlots = availabilitySlots
        .filter((slot) => !slot.isCancelled)
        .map((slot) => ({
          ...slot,
          startsAtIso: new Date(slot.startsAt).toISOString(),
          endsAtIso: new Date(slot.endsAt).toISOString(),
          capacityNumber: Number.parseInt(slot.capacity, 10),
          priceNumber: slot.priceAmount.trim() ? Number.parseFloat(slot.priceAmount) : null,
          meetingPlaceName: slot.meetingPlaceName.trim(),
        }));

      for (const slot of normalizedSlots) {
        if (!Number.isFinite(new Date(slot.startsAtIso).getTime()) || !Number.isFinite(new Date(slot.endsAtIso).getTime())) {
          throw new Error("One or more availability slots has invalid date/time.");
        }
        if (new Date(slot.endsAtIso) <= new Date(slot.startsAtIso)) {
          throw new Error("One or more availability slots has an invalid range.");
        }
        if (!Number.isFinite(slot.capacityNumber) || slot.capacityNumber <= 0) {
          throw new Error("One or more availability slots has an invalid capacity.");
        }
        if (slot.priceNumber !== null && (!Number.isFinite(slot.priceNumber) || slot.priceNumber < 0)) {
          throw new Error("One or more availability slots has an invalid price.");
        }
        if (!slot.meetingPlaceName) {
          throw new Error("Each availability slot must include a meeting place.");
        }
      }

      const slotPayload = normalizedSlots.map((slot) => ({
        id: slot.id ?? null,
        starts_at: slot.startsAtIso,
        ends_at: slot.endsAtIso,
        capacity: slot.capacityNumber,
        price_amount: slot.priceNumber,
        currency: slot.currency || currency,
        meeting_place_name: slot.meetingPlaceName,
      }));
      const { error: syncSlotsError } = await supabase.rpc("sync_host_experience_slots", {
        p_experience_id: experienceId,
        p_slots: slotPayload,
      });
      if (syncSlotsError) throw new Error(syncSlotsError.message);

      const { error: publishError } = await supabase
        .from("experiences")
        .update({ status: "published" })
        .eq("id", experienceId)
        .eq("host_user_id", user.id);
      if (publishError) throw new Error(publishError.message);

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
        .select("id,title,subtitle,description,category_id,meeting_point_name,duration_minutes,price_amount,currency,max_guests,requirements")
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
        .eq("experience_id", editExperienceId);
      const loadedDescriptorSlugs: string[] = [];
      if (tagMapRows && tagMapRows.length > 0) {
        const tagIds = tagMapRows.map((row) => row.tag_id);
        const { data: tagData } = await supabase
          .from("experience_tags")
          .select("slug")
          .in("id", tagIds);
        for (const row of tagData ?? []) {
          if (row.slug) loadedDescriptorSlugs.push(row.slug);
        }
      }

      const { data: hostProfile } = await supabase
        .from("host_profiles")
        .select("years_experience")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: mediaData } = await supabase
        .from("experience_media")
        .select("storage_path,media_type")
        .eq("experience_id", editExperienceId)
        .order("sort_order", { ascending: true });

      let availabilityData:
        | Array<{
            id: string;
            starts_at: string;
            ends_at: string;
            capacity: number;
            price_amount: number | null;
            currency: string | null;
            meeting_place_name?: string | null;
            is_cancelled: boolean;
          }>
        | null = null;
      const availabilityWithMeeting = await supabase
        .from("experience_availability")
        .select("id,starts_at,ends_at,capacity,price_amount,currency,meeting_place_name,is_cancelled")
        .eq("experience_id", editExperienceId)
        .order("starts_at", { ascending: true });
      if (availabilityWithMeeting.error?.code === "42703") {
        const fallbackAvailability = await supabase
          .from("experience_availability")
          .select("id,starts_at,ends_at,capacity,price_amount,currency,is_cancelled")
          .eq("experience_id", editExperienceId)
          .order("starts_at", { ascending: true });
        availabilityData = (fallbackAvailability.data as typeof availabilityData) ?? [];
      } else {
        availabilityData = (availabilityWithMeeting.data as typeof availabilityData) ?? [];
      }

      if (!mounted) return;

      const loadedCategoryIds = categorySlug ? [categorySlug] : [];
      const loadedCustomCategories: Choice[] = [];
      const storedPrimaryCategory =
        (experience.requirements ?? [])
          .find((req: string) => req.startsWith("Primary category:"))
          ?.replace("Primary category:", "")
          .trim() ?? "";
      if (!categorySlug && storedPrimaryCategory) {
        const match = primaryCategories.find(
          (item) => item.label.toLowerCase() === storedPrimaryCategory.toLowerCase(),
        );
        if (match) {
          loadedCategoryIds.push(match.id);
        } else {
          const customId = slugifyLabel(storedPrimaryCategory);
          loadedCustomCategories.push({ id: customId, label: storedPrimaryCategory });
          loadedCategoryIds.push(customId);
        }
      }
      const additionalCategories =
        (experience.requirements ?? [])
          .find((req: string) => req.startsWith("Additional categories:"))
          ?.replace("Additional categories:", "")
          .split(",")
          .map((label: string) => label.trim())
          .filter(Boolean) ?? [];
      for (const label of additionalCategories) {
        const match = primaryCategories.find(
          (item) => item.label.toLowerCase() === label.toLowerCase(),
        );
        if (match && !loadedCategoryIds.includes(match.id)) {
          loadedCategoryIds.push(match.id);
          continue;
        }
        const customId = slugifyLabel(label);
        if (!loadedCategoryIds.includes(customId)) {
          loadedCustomCategories.push({ id: customId, label });
          loadedCategoryIds.push(customId);
        }
      }

      const loadedDescriptorIds = [...loadedDescriptorSlugs];
      const loadedCustomDescriptors: Choice[] = [];
      if (experience.subtitle) {
        const subtitleLabels = experience.subtitle
          .replace(/\s+on Gozuru$/i, "")
          .split(",")
          .map((label: string) => label.trim())
          .filter(Boolean);
        for (const label of subtitleLabels) {
          const match = experienceDescriptors.find(
            (item) => item.label.toLowerCase() === label.toLowerCase(),
          );
          if (match && !loadedDescriptorIds.includes(match.id)) {
            loadedDescriptorIds.push(match.id);
            continue;
          }
          const customId = slugifyLabel(label);
          if (!loadedDescriptorIds.includes(customId)) {
            loadedCustomDescriptors.push({ id: customId, label });
            loadedDescriptorIds.push(customId);
          }
        }
      }

      setCustomPrimaryCategories(loadedCustomCategories);
      setCustomExperienceDescriptors(loadedCustomDescriptors);
      setPrimaryCategoryIds(loadedCategoryIds);
      setDescriptorIds(loadedDescriptorIds);
      setExperienceTitle(experience.title ?? "");
      setExpertise(experience.description ?? "");
      setDurationHours(
        experience.duration_minutes ? String(Math.max(1, Math.round(experience.duration_minutes / 60))) : "1",
      );
      setHourlyRate(
        experience.price_amount ? String(Number(experience.price_amount)) : "",
      );
      setCurrency(experience.currency ?? "KES");
      setMaxGuests(String(experience.max_guests ?? 5));
      setAudienceType(getAudienceFromRequirements(experience.requirements) as typeof audienceType);

      setYearsExperience(hostProfile?.years_experience ? String(hostProfile.years_experience) : "");
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
      setAvailabilitySlots(
        (availabilityData ?? []).map((slot) => ({
          localId: `existing-${slot.id}`,
          id: String(slot.id),
          startsAt: toLocalInputValue(new Date(String(slot.starts_at))),
          endsAt: toLocalInputValue(new Date(String(slot.ends_at))),
          capacity: String(slot.capacity ?? 1),
          priceAmount: slot.price_amount !== null && slot.price_amount !== undefined
            ? String(slot.price_amount)
            : "",
          currency: String(slot.currency ?? experience.currency ?? "KES"),
          meetingPlaceName: String(slot.meeting_place_name ?? ""),
          isCancelled: Boolean(slot.is_cancelled),
        })),
      );
      setKnownMeetingPlaces(
        Array.from(
          new Set(
            (availabilityData ?? [])
              .map((slot) => String(slot.meeting_place_name ?? "").trim())
              .filter((name) => name.length > 0),
          ),
        ).sort((a, b) => a.localeCompare(b)),
      );
      const initialPlaces = Array.from(
        new Set(
          (availabilityData ?? [])
            .map((slot) => String(slot.meeting_place_name ?? "").trim())
            .filter((name) => name.length > 0),
        ),
      ).sort((a, b) => a.localeCompare(b));
      if (initialPlaces.length > 0) {
        setSlotMeetingPlaceMode("existing");
        setSlotMeetingPlace(initialPlaces[0]);
        setNewMeetingPlace("");
      } else {
        setSlotMeetingPlaceMode("new");
        setSlotMeetingPlace("");
      }
      setSlotCurrency(experience.currency ?? "KES");

      setStepIndex(1);
      setLoadingExistingData(false);
    };

    void loadExistingExperience();

    return () => {
      mounted = false;
    };
  }, [editExperienceId, user]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const loadMeetingPlaces = async () => {
      const { data: hostExperiences, error: hostExperiencesError } = await supabase
        .from("experiences")
        .select("id")
        .eq("host_user_id", user.id);
      if (!mounted || hostExperiencesError) return;

      const ids = (hostExperiences ?? []).map((row) => row.id as string);
      if (ids.length === 0) {
        if (mounted) {
          setKnownMeetingPlaces([]);
          setSlotMeetingPlaceMode("new");
        }
        return;
      }

      const slotsWithMeeting = await supabase
        .from("experience_availability")
        .select("meeting_place_name")
        .in("experience_id", ids)
        .not("meeting_place_name", "is", null);
      if (!mounted) return;

      const places =
        slotsWithMeeting.error?.code === "42703"
          ? []
          : Array.from(
              new Set(
                (slotsWithMeeting.data ?? [])
                  .map((row) => String(row.meeting_place_name ?? "").trim())
                  .filter((name) => name.length > 0),
              ),
            ).sort((a, b) => a.localeCompare(b));
      setKnownMeetingPlaces(places);
      if (places.length > 0) {
        setSlotMeetingPlaceMode("existing");
        setSlotMeetingPlace((prev) => prev || places[0]);
      } else {
        setSlotMeetingPlaceMode("new");
      }
    };

    void loadMeetingPlaces();
    return () => {
      mounted = false;
    };
  }, [user]);

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
            <h1 className="text-2xl font-bold tracking-tight">{currentStep.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{currentStep.subtitle}</p>
          </div>

          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <span className="rounded-full bg-muted px-3 py-1">
              Step {stepIndex + 1} / {stepMeta.length}
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-2 overflow-x-auto pb-3">
          {stepMeta.map((s, idx) => {
            const active = idx === stepIndex;
            const done = idx < stepIndex;
            return (
              <div key={s.title} className="flex min-w-[120px] items-center gap-2">
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
                  <p className="text-[11px] font-medium text-muted-foreground">{s.title}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          {stepIndex === 0 ? (
            <div className="text-center">
              <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full border border-orange-200 bg-orange-50">
                <div className="font-black text-orange-600">G</div>
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
                      You&apos;ll tell us about yourself, where you&apos;ll offer your experience, and
                      set up the itinerary.
                    </p>
                  </li>
                  <li className="flex gap-4">
                    <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      2
                    </div>
                    <p className="text-sm text-foreground">
                      Gozuru will review your submission to ensure it meets our standards and
                      requirements.
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
                Choose categories and experience types, then tell guests about you and your offering.
              </p>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <MultiSelect
                    label="Primary categories"
                    hint="Select all areas that fit your experience."
                    placeholder="Select categories"
                    options={allPrimaryCategories}
                    selectedIds={primaryCategoryIds}
                    onChange={setPrimaryCategoryIds}
                    onAddOption={addCustomPrimaryCategory}
                    addOptionLabel="Add a category"
                  />
                  <MultiSelect
                    label="Experience types"
                    hint="How would you best describe what guests will do?"
                    placeholder="Select experience types"
                    options={allExperienceDescriptors}
                    selectedIds={descriptorIds}
                    onChange={setDescriptorIds}
                    onAddOption={addCustomDescriptor}
                    addOptionLabel="Add an experience type"
                  />
                </div>

              <div className="my-8 h-px bg-border" />

              <h3 className="text-lg font-semibold tracking-tight">About you</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Help travelers understand your background and who this experience is for.
              </p>

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
                              ? "border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-500/15 dark:text-orange-200"
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
            </Card>
          ) : null}

          {stepIndex === 2 ? (
            <Card className="rounded-2xl border-border bg-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Add photos and videos</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Showcase your experience with up to 6 files. Photos: JPG, PNG, or WebP. Videos: MP4
                    or MOV (max 15MB each).
                  </p>
                </div>
                <div className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {media.length} / 6
                </div>
              </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border bg-muted/30 px-2.5 py-1">
                    {media.filter((item) => item.mediaType === "image").length} photo
                    {media.filter((item) => item.mediaType === "image").length === 1 ? "" : "s"}
                  </span>
                  <span className="rounded-full border border-border bg-muted/30 px-2.5 py-1">
                    {media.filter((item) => item.mediaType === "video").length} video
                    {media.filter((item) => item.mediaType === "video").length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-6">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                                alt={`Experience photo ${idx + 1}`}
                                className="absolute inset-0 size-full object-cover"
                              />
                            ) : (
                              <>
                                <video
                                  src={item.previewUrl}
                                  className="absolute inset-0 size-full object-cover"
                                  muted
                                  playsInline
                                  preload="metadata"
                                />
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                                  <span className="flex size-10 items-center justify-center rounded-full bg-white/90 shadow-sm">
                                    <Play className="ml-0.5 size-4 fill-orange-600 text-orange-600" />
                                  </span>
                                </div>
                              </>
                            )
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
                              <Upload className="size-4 opacity-50" />
                              <span>Empty slot</span>
                            </div>
                          )}
                          {item ? (
                            <>
                              <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                                {item.mediaType === "video" ? "Video" : "Photo"}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeMediaItem(idx)}
                                className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75"
                                aria-label={`Remove ${item.mediaType} ${idx + 1}`}
                              >
                                <X className="size-3.5" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-full sm:w-auto"
                      onClick={() => {
                        setMediaError(null);
                        photosInputRef.current?.click();
                      }}
                      disabled={media.length >= 6}
                    >
                      <ImageIcon className="mr-2 size-4" />
                      Add photos
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-full border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/20 sm:w-auto"
                      onClick={() => {
                        setMediaError(null);
                        videosInputRef.current?.click();
                      }}
                      disabled={media.length >= 6}
                    >
                      <Video className="mr-2 size-4" />
                      Add videos
                    </Button>
                    <input
                      ref={photosInputRef}
                      type="file"
                      accept={PHOTO_FILE_ACCEPT}
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files ? Array.from(e.target.files) : [];
                        addMediaFiles(files, "image");
                        e.target.value = "";
                      }}
                    />
                    <input
                      ref={videosInputRef}
                      type="file"
                      accept={VIDEO_FILE_ACCEPT}
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files ? Array.from(e.target.files) : [];
                        addMediaFiles(files, "video");
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>
              {mediaError ? (
                <p className="mt-3 text-center text-sm text-red-500">{mediaError}</p>
              ) : null}
            </Card>
          ) : null}

          {stepIndex === 3 ? (
            <Card className="rounded-2xl border-border bg-card p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Set your availability</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add premium booking slots. Guests can only request times you publish.
                  </p>
                </div>
                <div className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
                  {activeAvailabilitySlots.length} active slot
                  {activeAvailabilitySlots.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-border bg-muted/20 p-4">
                <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-500/20 dark:bg-orange-500/5">
                    <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-200">Standard experience pricing</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Set default duration and price used by slots unless overridden.
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">Standard price per guest</label>
                        <Input
                          type="number"
                          min="1"
                          step="0.01"
                          className="h-10 rounded-xl bg-background"
                          value={hourlyRate}
                          onChange={(e) => setHourlyRate(e.target.value)}
                          placeholder="120"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">Default duration (hours)</label>
                        <Input
                          type="number"
                          min="1"
                          max="24"
                          step="1"
                          className="h-10 rounded-xl bg-background"
                          value={durationHours}
                          onChange={(e) => setDurationHours(e.target.value)}
                          placeholder="2"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">Currency</label>
                        <div className="flex h-10 w-full items-center rounded-xl border border-input bg-muted/30 px-3 text-sm text-foreground">
                          {currency}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Gozuru currently prices all listings in Kenyan Shillings.
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Estimated full-group value: {currency}{" "}
                      {estimatedHostEarnings > 0 ? estimatedHostEarnings.toFixed(2) : "0.00"}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground">Start date & time</label>
                      <Input
                        type="datetime-local"
                        className="h-10 rounded-xl bg-background"
                        value={slotStartsAt}
                        onChange={(e) => setSlotStartsAt(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground">End date & time</label>
                      <Input
                        type="datetime-local"
                        className="h-10 rounded-xl bg-background"
                        value={slotEndsAt}
                        onChange={(e) => setSlotEndsAt(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground">Capacity</label>
                      <Input
                        type="number"
                        min="1"
                        className="h-10 rounded-xl bg-background"
                        value={slotCapacity}
                        onChange={(e) => setSlotCapacity(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-[1fr_120px] gap-3">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Price override (optional)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-10 rounded-xl bg-background"
                          value={slotPrice}
                          onChange={(e) => setSlotPrice(e.target.value)}
                          placeholder="Uses experience default"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">Currency</label>
                        <div className="flex h-10 w-full items-center rounded-xl border border-input bg-muted/30 px-3 text-sm text-foreground">
                          {slotCurrency}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-muted-foreground">Meeting place</label>
                        <div className="inline-flex rounded-full border border-border bg-muted/40 p-1">
                          <button
                            type="button"
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${slotMeetingPlaceMode === "existing" ? "bg-background text-foreground" : "text-muted-foreground"}`}
                            onClick={() => setSlotMeetingPlaceMode("existing")}
                            disabled={availableMeetingPlaces.length === 0}
                          >
                            Choose existing
                          </button>
                          <button
                            type="button"
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${slotMeetingPlaceMode === "new" ? "bg-background text-foreground" : "text-muted-foreground"}`}
                            onClick={() => setSlotMeetingPlaceMode("new")}
                          >
                            Add new
                          </button>
                        </div>
                      </div>
                      {slotMeetingPlaceMode === "existing" && availableMeetingPlaces.length > 0 ? (
                        <select
                          value={slotMeetingPlace}
                          onChange={(e) => setSlotMeetingPlace(e.target.value)}
                          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          {availableMeetingPlaces.map((place) => (
                            <option key={place} value={place}>
                              {place}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          className="h-10 rounded-xl bg-background"
                          value={newMeetingPlace}
                          onChange={(e) => setNewMeetingPlace(e.target.value)}
                          placeholder="e.g. City Mall main entrance"
                        />
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      type="button"
                      className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
                      onClick={addOrUpdateAvailabilitySlot}
                    >
                      <Plus className="mr-2 size-4" />
                      {editingLocalSlotId ? "Update slot" : "Add slot"}
                    </Button>
                    {editingLocalSlotId ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={resetAvailabilityForm}
                      >
                        Cancel edit
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {calendarView === "week"
                          ? `Week ${weekRangeLabel}`
                          : calendarView === "month"
                            ? monthLabel(calendarCursor)
                            : calendarView === "year"
                              ? String(selectedYear)
                              : calendarCursor.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {calendarView === "week"
                          ? "Scheduled appointments - full day in 2-hour rows."
                          : calendarView === "month"
                            ? "Month overview - scheduled appointments."
                            : calendarView === "year"
                              ? "Year overview - scheduled appointments."
                              : "Daily view of scheduled appointments."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => moveCalendarCursor("prev")}>
                        <ChevronLeft className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setCalendarCursor(new Date())}
                      >
                        Today
                      </Button>
                      <div className="inline-flex rounded-full border border-border bg-muted/40 p-1">
                        {(["day", "week", "month", "year"] as CalendarView[]).map((view) => (
                          <button
                            key={view}
                            type="button"
                            onClick={() => setCalendarView(view)}
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize transition ${
                              calendarView === view
                                ? "bg-black text-white shadow-sm"
                                : "text-muted-foreground hover:bg-background"
                            }`}
                          >
                            {view}
                          </button>
                        ))}
                      </div>
                      <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => moveCalendarCursor("next")}>
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4">
                    {calendarView === "day" ? (
                      <div className="rounded-2xl border">
                        <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-3">
                          <p className="text-sm font-semibold">
                            {calendarCursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                          </p>
                          <p className="text-xs text-muted-foreground">{daySlots.length} slot(s)</p>
                        </div>
                        <div className="max-h-[360px] space-y-2 overflow-y-auto p-4">
                          {daySlots.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No availability on this day.</p>
                          ) : (
                            daySlots.map((slot) => (
                              <div key={slot.localId} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                                <p className="text-sm font-semibold text-foreground">
                                  {slot.startsDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - {slot.endsDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Capacity {slot.capacity} • {slot.currency}{" "}
                                  {slot.priceAmount ? Number(slot.priceAmount).toFixed(2) : "Default"}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}

                    {calendarView === "week" ? (
                      <div className="overflow-auto rounded-2xl border">
                        <div className="grid min-w-[880px] grid-cols-[120px_repeat(7,minmax(100px,1fr))]">
                          <div className="border-b border-r bg-muted/20 p-3 text-xs font-semibold text-muted-foreground">
                            Time
                          </div>
                          {weekDays.map((day) => (
                            <div key={day.date.toISOString()} className="border-b border-r bg-muted/20 p-3 text-center">
                              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                                {day.date.toLocaleDateString(undefined, { weekday: "short" })}
                              </p>
                              <p className="text-sm font-semibold">{day.date.getDate()}</p>
                            </div>
                          ))}
                          {weekGrid.map((row) => (
                            <Fragment key={row.index}>
                              <div className="border-b border-r bg-muted/10 p-3 text-[11px] text-muted-foreground">
                                {row.label}
                              </div>
                              {row.columns.map((column) => (
                                <div key={`${column.date.toISOString()}-${row.index}`} className="min-h-16 border-b border-r p-1.5">
                                  <div className="space-y-1">
                                    {column.slots.slice(0, 2).map((slot) => (
                                      <div key={`${slot.localId}-${row.index}`} className="rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-900">
                                        {slot.startsDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </Fragment>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {calendarView === "month" ? (
                      <div className="rounded-2xl border">
                        <div className="grid grid-cols-7 border-b bg-muted/20">
                          {WEEK_DAYS.map((label) => (
                            <p key={label} className="p-2 text-center text-[11px] font-semibold uppercase text-muted-foreground">
                              {label}
                            </p>
                          ))}
                        </div>
                        <div className="grid grid-cols-7">
                          {monthGridDays.map((day) => {
                            const inMonth = day.date.getMonth() === calendarCursor.getMonth();
                            return (
                              <div key={day.date.toISOString()} className={`min-h-[96px] border-b border-r p-2 ${inMonth ? "bg-background" : "bg-muted/25 text-muted-foreground"}`}>
                                <p className="text-xs font-semibold">{day.date.getDate()}</p>
                                <div className="mt-1 space-y-1">
                                  {day.slots.slice(0, 2).map((slot) => (
                                    <div key={slot.localId} className="rounded-md bg-emerald-100 px-2 py-1 text-[10px] text-emerald-900">
                                      {slot.startsDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                    </div>
                                  ))}
                                  {day.slotsCount > 2 ? (
                                    <p className="text-[10px] text-muted-foreground">+{day.slotsCount - 2} more</p>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {calendarView === "year" ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {yearMonths.map((month) => (
                          <div key={month.monthStart.toISOString()} className="rounded-xl border p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-sm font-semibold">
                                {month.monthStart.toLocaleDateString(undefined, { month: "long" })}
                              </p>
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                {month.slotsCount} slots
                              </span>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center">
                              {month.miniDays.map((day) => (
                                <div key={day.date.toISOString()} className={`rounded px-1 py-1 text-[10px] ${day.inMonth ? "text-foreground" : "text-muted-foreground/60"}`}>
                                  <span className={day.count > 0 ? "font-semibold text-emerald-700" : ""}>{day.date.getDate()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-semibold">Configured slots</h3>
                  {availabilitySlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No slots added yet.</p>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {availabilitySlots.map((slot) => (
                        <div
                          key={slot.localId}
                          className="min-w-[320px] shrink-0 rounded-xl border border-border bg-background p-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {new Date(slot.startsAt).toLocaleString()} - {new Date(slot.endsAt).toLocaleString()}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Place: {slot.meetingPlaceName || "N/A"} •{" "}
                              Capacity {slot.capacity} • {slot.currency}{" "}
                              {slot.priceAmount ? Number(slot.priceAmount).toFixed(2) : "Default"}{" "}
                              {slot.isCancelled ? "• Cancelled" : ""}
                            </p>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-full"
                              onClick={() => beginEditAvailabilitySlot(slot.localId)}
                              disabled={slot.isCancelled}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-full"
                              onClick={() => removeAvailabilitySlot(slot.localId)}
                              disabled={slot.isCancelled}
                            >
                              <X className="mr-1 size-3.5" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
            </Card>
          ) : null}
        </div>

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
        {submitError ? <p className="mt-3 text-sm text-red-500">{submitError}</p> : null}
      </div>
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarPlus, MapPin, Trash2 } from "lucide-react";
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

type AvailabilitySlot = {
  id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  price_amount: number | null;
  currency: string | null;
  is_cancelled: boolean;
};

function toDateTimeLocalValue(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultStartValue(): string {
  const nextHour = new Date();
  nextHour.setSeconds(0, 0);
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  return toDateTimeLocalValue(nextHour);
}

function defaultEndValue(): string {
  const end = new Date();
  end.setSeconds(0, 0);
  end.setHours(end.getHours() + 2, 0, 0, 0);
  return toDateTimeLocalValue(end);
}

function formatSlotDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ExperienceDetailPage() {
  const router = useRouter();
  const params = useParams<{ experienceId: string }>();
  const { user } = useAuth();
  const [experience, setExperience] = useState<ExperienceDetail | null>(null);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [slotSuccess, setSlotSuccess] = useState<string | null>(null);
  const [slotStart, setSlotStart] = useState(defaultStartValue);
  const [slotEnd, setSlotEnd] = useState(defaultEndValue);
  const [slotCapacity, setSlotCapacity] = useState("1");
  const [slotPrice, setSlotPrice] = useState("");
  const [slotCurrency, setSlotCurrency] = useState("USD");
  const [creatingSlot, setCreatingSlot] = useState(false);
  const [cancellingSlotId, setCancellingSlotId] = useState<string | null>(null);

  async function loadSlots(experienceId: string) {
    setSlotsLoading(true);
    const { data, error: slotsError } = await supabase
      .from("experience_availability")
      .select("id,starts_at,ends_at,capacity,price_amount,currency,is_cancelled")
      .eq("experience_id", experienceId)
      .order("starts_at", { ascending: true });

    if (slotsError) {
      setSlotError(slotsError.message);
      setSlots([]);
    } else {
      setSlots((data ?? []) as AvailabilitySlot[]);
    }
    setSlotsLoading(false);
  }

  async function createSlot() {
    if (!experience) return;
    setSlotError(null);
    setSlotSuccess(null);

    const startsAt = new Date(slotStart);
    const endsAt = new Date(slotEnd);
    const capacityNum = Number.parseInt(slotCapacity, 10);
    const parsedPrice = slotPrice.trim() ? Number.parseFloat(slotPrice) : null;

    if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime())) {
      setSlotError("Please provide valid start and end date/time.");
      return;
    }

    if (endsAt <= startsAt) {
      setSlotError("End time must be after start time.");
      return;
    }

    if (!Number.isFinite(capacityNum) || capacityNum <= 0) {
      setSlotError("Capacity must be greater than zero.");
      return;
    }

    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      setSlotError("Price must be a positive number.");
      return;
    }

    setCreatingSlot(true);
    const { error: rpcError } = await supabase.rpc("create_host_availability_slot", {
      p_experience_id: experience.id,
      p_starts_at: startsAt.toISOString(),
      p_ends_at: endsAt.toISOString(),
      p_capacity: capacityNum,
      p_price_amount: parsedPrice,
      p_currency: slotCurrency,
    });

    if (rpcError) {
      setSlotError(rpcError.message);
    } else {
      setSlotSuccess("Slot created.");
      setSlotStart(defaultStartValue());
      setSlotEnd(defaultEndValue());
      setSlotCapacity("1");
      setSlotPrice("");
      await loadSlots(experience.id);
    }
    setCreatingSlot(false);
  }

  async function cancelSlot(slotId: string) {
    if (!experience) return;
    setSlotError(null);
    setSlotSuccess(null);
    setCancellingSlotId(slotId);
    const { error: cancelError } = await supabase
      .from("experience_availability")
      .update({ is_cancelled: true })
      .eq("id", slotId)
      .eq("experience_id", experience.id);

    if (cancelError) {
      setSlotError(cancelError.message);
    } else {
      setSlotSuccess("Slot cancelled.");
      await loadSlots(experience.id);
    }
    setCancellingSlotId(null);
  }

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
      await loadSlots(params.experienceId);
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

      <Card className="mt-8 rounded-2xl border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Availability slots</h2>
            <p className="text-sm text-muted-foreground">
              Add slots guests can request. Overlapping host slots are blocked automatically.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Start</span>
            <input
              type="datetime-local"
              value={slotStart}
              onChange={(event) => setSlotStart(event.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">End</span>
            <input
              type="datetime-local"
              value={slotEnd}
              onChange={(event) => setSlotEnd(event.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Capacity</span>
            <input
              type="number"
              min={1}
              value={slotCapacity}
              onChange={(event) => setSlotCapacity(event.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
            />
          </label>
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Price override (optional)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={slotPrice}
                onChange={(event) => setSlotPrice(event.target.value)}
                placeholder="Use default"
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Currency</span>
              <select
                value={slotCurrency}
                onChange={(event) => setSlotCurrency(event.target.value)}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="KES">KES</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            type="button"
            className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
            disabled={creatingSlot}
            onClick={createSlot}
          >
            <CalendarPlus className="mr-2 size-4" />
            {creatingSlot ? "Creating..." : "Add slot"}
          </Button>
        </div>

        {slotError ? <p className="mt-3 text-sm text-red-500">{slotError}</p> : null}
        {slotSuccess ? <p className="mt-3 text-sm text-emerald-600">{slotSuccess}</p> : null}

        <div className="mt-6 space-y-3">
          {slotsLoading ? (
            <p className="text-sm text-muted-foreground">Loading slots...</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No slots yet. Add your first date/time window above.
            </p>
          ) : (
            slots.map((slot) => (
              <div key={slot.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
                <div className="text-sm">
                  <p className="font-medium text-foreground">
                    {formatSlotDate(slot.starts_at)} - {formatSlotDate(slot.ends_at)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Capacity {slot.capacity}
                    {slot.price_amount !== null
                      ? ` • ${slot.currency ?? experience.currency} ${Number(slot.price_amount).toFixed(2)}`
                      : " • Uses experience default price"}
                    {slot.is_cancelled ? " • Cancelled" : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={slot.is_cancelled || cancellingSlotId === slot.id}
                  onClick={() => cancelSlot(slot.id)}
                  className="rounded-full"
                >
                  <Trash2 className="mr-2 size-4" />
                  {cancellingSlotId === slot.id ? "Cancelling..." : "Cancel slot"}
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

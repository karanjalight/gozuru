"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CalendarDays, MapPin, Minus, Plus, Repeat, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AvailabilityDraftSlot } from "./types";
import { WEEKDAY_FULL_LABELS, WEEKDAY_LABELS } from "./types";
import {
  collectMeetingPlaces,
  computeEndFromStartAndDuration,
  generateRepeatDates,
  getNextHourLocalInputValue,
  makeLocalSlotId,
  parseNumericInput,
  slotsOverlap,
} from "./slotUtils";

type AddSlotFormProps = {
  hourlyRate: string;
  durationHours: string;
  currency: string;
  maxGuestsNumber: number;
  slots: AvailabilityDraftSlot[];
  suggestedMeetingPlaces: string[];
  editingLocalId: string | null;
  onAddSlots: (newSlots: AvailabilityDraftSlot[]) => void;
  onUpdateSlot: (localId: string, patch: Partial<AvailabilityDraftSlot>) => void;
  onCancelEdit: () => void;
};

function SectionHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
        {icon}
      </span>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
    </div>
  );
}

function PeopleStepper({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-input bg-background px-2 py-1">
      <button
        type="button"
        className="flex size-8 items-center justify-center rounded-full text-foreground hover:bg-muted disabled:opacity-40"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Decrease number of people"
      >
        <Minus className="size-4" />
      </button>
      <span className="w-10 text-center text-base font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        className="flex size-8 items-center justify-center rounded-full text-foreground hover:bg-muted"
        onClick={() => onChange(value + 1)}
        aria-label="Increase number of people"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function AddSlotForm({
  hourlyRate,
  durationHours,
  currency,
  maxGuestsNumber,
  slots,
  suggestedMeetingPlaces,
  editingLocalId,
  onAddSlots,
  onUpdateSlot,
  onCancelEdit,
}: AddSlotFormProps) {
  const formRef = useRef<HTMLDivElement | null>(null);
  const initialMaxGuestsRef = useRef(maxGuestsNumber);
  const capacityTouchedRef = useRef(false);
  const meetingPlaceHydratedRef = useRef(false);
  const lastSyncedAnchorWeekdayRef = useRef<number | null>(null);

  const durationHoursNumber = Number.parseInt(durationHours, 10) || 1;
  const standardPriceNumber = parseNumericInput(hourlyRate);
  const meetingPlaces = useMemo(
    () =>
      Array.from(new Set([...suggestedMeetingPlaces, ...collectMeetingPlaces(slots)])).sort((a, b) =>
        a.localeCompare(b),
      ),
    [slots, suggestedMeetingPlaces],
  );

  const [startsAt, setStartsAt] = useState(getNextHourLocalInputValue);
  const [endOverrideEnabled, setEndOverrideEnabled] = useState(false);
  const [manualEndsAt, setManualEndsAt] = useState(() =>
    computeEndFromStartAndDuration(getNextHourLocalInputValue(), durationHoursNumber),
  );
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([]);
  const [repeatWeeksCount, setRepeatWeeksCount] = useState(4);
  const [capacity, setCapacity] = useState(String(maxGuestsNumber > 0 ? maxGuestsNumber : 1));
  const [priceOverrideEnabled, setPriceOverrideEnabled] = useState(false);
  const [priceOverrideAmount, setPriceOverrideAmount] = useState("");
  const [meetingPlaceMode, setMeetingPlaceMode] = useState<"existing" | "new">(
    meetingPlaces.length > 0 ? "existing" : "new",
  );
  const [meetingPlaceValue, setMeetingPlaceValue] = useState(meetingPlaces[0] ?? "");
  const [newMeetingPlaceValue, setNewMeetingPlaceValue] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);

  useEffect(() => {
    if (meetingPlaceHydratedRef.current) return;
    if (meetingPlaces.length === 0) return;
    meetingPlaceHydratedRef.current = true;
    setMeetingPlaceMode("existing");
    setMeetingPlaceValue(meetingPlaces[0]);
  }, [meetingPlaces]);

  useEffect(() => {
    if (capacityTouchedRef.current) return;
    if (editingLocalId) return;
    if (maxGuestsNumber === initialMaxGuestsRef.current) return;
    setCapacity(String(maxGuestsNumber > 0 ? maxGuestsNumber : 1));
  }, [maxGuestsNumber, editingLocalId]);

  useEffect(() => {
    if (!editingLocalId) return;
    const slot = slots.find((item) => item.localId === editingLocalId);
    if (!slot) return;

    setStartsAt(slot.startsAt);
    const slotDurationMs = new Date(slot.endsAt).getTime() - new Date(slot.startsAt).getTime();
    const standardDurationMs = durationHoursNumber * 60 * 60 * 1000;
    if (Math.abs(slotDurationMs - standardDurationMs) > 60_000) {
      setEndOverrideEnabled(true);
      setManualEndsAt(slot.endsAt);
    } else {
      setEndOverrideEnabled(false);
    }
    setRepeatEnabled(false);
    setCapacity(slot.capacity);
    capacityTouchedRef.current = true;
    if (slot.priceAmount.trim()) {
      setPriceOverrideEnabled(true);
      setPriceOverrideAmount(slot.priceAmount);
    } else {
      setPriceOverrideEnabled(false);
      setPriceOverrideAmount("");
    }
    const exists = meetingPlaces.includes(slot.meetingPlaceName);
    if (exists) {
      setMeetingPlaceMode("existing");
      setMeetingPlaceValue(slot.meetingPlaceName);
      setNewMeetingPlaceValue("");
    } else {
      setMeetingPlaceMode("new");
      setMeetingPlaceValue("");
      setNewMeetingPlaceValue(slot.meetingPlaceName);
    }
    setFormError(null);
    setFormNotice(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resync only when the edit target changes, not on every slots/meetingPlaces update (would clobber in-progress edits)
  }, [editingLocalId]);

  const computedEndsAt = computeEndFromStartAndDuration(startsAt, durationHoursNumber);
  const effectiveEndsAt = endOverrideEnabled ? manualEndsAt : computedEndsAt;
  const capacityNumber = Number.parseInt(capacity, 10) || 0;
  const effectivePricePerPerson =
    priceOverrideEnabled && priceOverrideAmount.trim() ? Number.parseFloat(priceOverrideAmount) : standardPriceNumber;
  const totalValue =
    Number.isFinite(effectivePricePerPerson) && effectivePricePerPerson > 0 && capacityNumber > 0
      ? effectivePricePerPerson * capacityNumber
      : 0;
  const anchorWeekday = new Date(startsAt).getDay();
  const repeatBlocked = !editingLocalId && repeatEnabled && repeatWeekdays.length === 0;
  const submitLabel = editingLocalId
    ? "Update slot"
    : repeatEnabled
      ? repeatWeekdays.length > 0
        ? `Add up to ${repeatWeekdays.length * repeatWeeksCount} slots`
        : "Choose a day to repeat on"
      : "Add slot";

  useEffect(() => {
    if (!repeatEnabled) {
      lastSyncedAnchorWeekdayRef.current = anchorWeekday;
      return;
    }
    if (lastSyncedAnchorWeekdayRef.current === anchorWeekday) return;
    lastSyncedAnchorWeekdayRef.current = anchorWeekday;
    setRepeatWeekdays((prev) =>
      prev.includes(anchorWeekday) ? prev : [...prev, anchorWeekday].sort((a, b) => a - b),
    );
  }, [anchorWeekday, repeatEnabled]);

  function resetForm() {
    const nextStart = getNextHourLocalInputValue();
    setStartsAt(nextStart);
    setEndOverrideEnabled(false);
    setManualEndsAt(computeEndFromStartAndDuration(nextStart, durationHoursNumber));
    setRepeatEnabled(false);
    setRepeatWeekdays([]);
    setRepeatWeeksCount(4);
    setCapacity(String(maxGuestsNumber > 0 ? maxGuestsNumber : 1));
    capacityTouchedRef.current = false;
    setPriceOverrideEnabled(false);
    setPriceOverrideAmount("");
    setFormError(null);
  }

  function toggleWeekday(day: number) {
    setRepeatWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }

  function handleRepeatToggle(next: boolean) {
    setRepeatEnabled(next);
    if (next && repeatWeekdays.length === 0) {
      setRepeatWeekdays([anchorWeekday]);
    }
  }

  function handleSubmit() {
    setFormError(null);
    setFormNotice(null);

    if (!Number.isFinite(capacityNumber) || capacityNumber <= 0) {
      setFormError("Number of people must be greater than zero.");
      return;
    }
    const meetingPlaceName =
      meetingPlaceMode === "existing" ? meetingPlaceValue.trim() : newMeetingPlaceValue.trim();
    if (!meetingPlaceName) {
      setFormError("Please select or add a meeting place.");
      return;
    }
    const priceAmount = priceOverrideEnabled ? priceOverrideAmount.trim() : "";
    if (priceOverrideEnabled && priceAmount) {
      const price = Number.parseFloat(priceAmount);
      if (!Number.isFinite(price) || price < 0) {
        setFormError("Custom price must be zero or higher.");
        return;
      }
    }

    const startDate = new Date(startsAt);
    const endDate = new Date(effectiveEndsAt);
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
      setFormError("Please choose a valid start date and time.");
      return;
    }
    if (endDate <= startDate) {
      setFormError("End time must be after the start time.");
      return;
    }
    if (!editingLocalId && startDate.getTime() < Date.now()) {
      setFormError("Start time must be in the future.");
      return;
    }

    const others = slots.filter((slot) => !slot.isCancelled && slot.localId !== editingLocalId);

    if (editingLocalId) {
      const conflict = others.some((slot) =>
        slotsOverlap(startDate, endDate, new Date(slot.startsAt), new Date(slot.endsAt)),
      );
      if (conflict) {
        setFormError("This slot overlaps another slot in your schedule.");
        return;
      }
      onUpdateSlot(editingLocalId, {
        startsAt,
        endsAt: effectiveEndsAt,
        capacity: String(capacityNumber),
        priceAmount,
        currency,
        meetingPlaceName,
      });
      resetForm();
      onCancelEdit();
      return;
    }

    if (!repeatEnabled) {
      const conflict = others.some((slot) =>
        slotsOverlap(startDate, endDate, new Date(slot.startsAt), new Date(slot.endsAt)),
      );
      if (conflict) {
        setFormError("This slot overlaps another slot in your schedule.");
        return;
      }
      onAddSlots([
        {
          localId: makeLocalSlotId(),
          startsAt,
          endsAt: effectiveEndsAt,
          capacity: String(capacityNumber),
          priceAmount,
          currency,
          meetingPlaceName,
          isCancelled: false,
        },
      ]);
      resetForm();
      return;
    }

    if (repeatWeekdays.length === 0) {
      setFormError("Choose at least one day to repeat on.");
      return;
    }
    const occurrences = generateRepeatDates(startsAt, effectiveEndsAt, repeatWeekdays, repeatWeeksCount);
    const accepted: AvailabilityDraftSlot[] = [];
    let skippedCount = 0;
    for (const occurrence of occurrences) {
      const occStart = new Date(occurrence.startsAt);
      const occEnd = new Date(occurrence.endsAt);
      const conflictsExisting = others.some((slot) =>
        slotsOverlap(occStart, occEnd, new Date(slot.startsAt), new Date(slot.endsAt)),
      );
      const conflictsAccepted = accepted.some((slot) =>
        slotsOverlap(occStart, occEnd, new Date(slot.startsAt), new Date(slot.endsAt)),
      );
      if (conflictsExisting || conflictsAccepted) {
        skippedCount += 1;
        continue;
      }
      accepted.push({
        localId: makeLocalSlotId(),
        startsAt: occurrence.startsAt,
        endsAt: occurrence.endsAt,
        capacity: String(capacityNumber),
        priceAmount,
        currency,
        meetingPlaceName,
        isCancelled: false,
      });
    }
    if (accepted.length === 0) {
      setFormError("All repeated slots overlap your existing schedule.");
      return;
    }
    onAddSlots(accepted);
    if (skippedCount > 0) {
      setFormNotice(
        `Added ${accepted.length} slot${accepted.length === 1 ? "" : "s"} — skipped ${skippedCount} that overlapped your existing schedule.`,
      );
    }
    resetForm();
  }

  return (
    <div ref={formRef} className="mt-6 rounded-2xl border border-border bg-muted/20 p-5">
      <h3 className="text-base font-semibold text-foreground">
        {editingLocalId ? "Edit this slot" : "Add a time slot"}
      </h3>

      <div className="mt-5 space-y-5">
        <div className="space-y-3">
          <SectionHeader icon={<CalendarDays className="size-3.5" />} title="When" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Starts</label>
              <Input
                type="datetime-local"
                className="h-11 rounded-xl bg-background"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Ends</label>
              {endOverrideEnabled ? (
                <Input
                  type="datetime-local"
                  className="h-11 rounded-xl bg-background"
                  value={manualEndsAt}
                  onChange={(e) => setManualEndsAt(e.target.value)}
                />
              ) : (
                <div className="flex h-11 w-full items-center rounded-xl border border-input bg-muted/30 px-3 text-sm text-foreground">
                  {new Date(computedEndsAt).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-orange-600 hover:underline"
            onClick={() => {
              if (!endOverrideEnabled) setManualEndsAt(computedEndsAt);
              setEndOverrideEnabled((prev) => !prev);
            }}
          >
            {endOverrideEnabled ? "Use the standard duration instead" : "Set a different length for this slot"}
          </button>
        </div>

        {!editingLocalId ? (
          <div className="space-y-3 border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <SectionHeader icon={<Repeat className="size-3.5" />} title="Repeat" />
              <button
                type="button"
                role="switch"
                aria-checked={repeatEnabled}
                onClick={() => handleRepeatToggle(!repeatEnabled)}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  repeatEnabled ? "bg-orange-500" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                    repeatEnabled ? "translate-x-5" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>
            {repeatEnabled ? (
              <div className="space-y-3 rounded-xl bg-background/60 p-3">
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_LABELS.map((label, index) => (
                    <button
                      key={`${label}-${index}`}
                      type="button"
                      title={WEEKDAY_FULL_LABELS[index]}
                      onClick={() => toggleWeekday(index)}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full border text-xs font-semibold",
                        repeatWeekdays.includes(index)
                          ? "border-orange-500 bg-orange-500 text-white"
                          : "border-input text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-muted-foreground">For</label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    className="h-9 w-20 rounded-xl bg-background"
                    value={repeatWeeksCount}
                    onChange={(e) =>
                      setRepeatWeeksCount(Math.min(12, Math.max(1, Number.parseInt(e.target.value, 10) || 1)))
                    }
                  />
                  <span className="text-xs text-muted-foreground">week{repeatWeeksCount === 1 ? "" : "s"}</span>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-3 border-t border-border pt-5">
          <SectionHeader icon={<Users className="size-3.5" />} title="Number of people" />
          <PeopleStepper
            value={capacityNumber || 1}
            onChange={(next) => {
              capacityTouchedRef.current = true;
              setCapacity(String(next));
            }}
          />
        </div>

        <div className="space-y-3 border-t border-border pt-5">
          <SectionHeader icon={<Wallet className="size-3.5" />} title="Price" />
          {!priceOverrideEnabled ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-background/60 p-3">
              <p className="text-sm text-foreground">
                Standard price:{" "}
                <span className="font-semibold">
                  {currency} {standardPriceNumber > 0 ? standardPriceNumber.toFixed(2) : "0.00"}
                </span>{" "}
                / person
              </p>
              <button
                type="button"
                className="text-xs font-semibold text-orange-600 hover:underline"
                onClick={() => {
                  setPriceOverrideAmount(standardPriceNumber > 0 ? String(standardPriceNumber) : "");
                  setPriceOverrideEnabled(true);
                }}
              >
                Customize price for this slot
              </button>
            </div>
          ) : (
            <div className="space-y-2 rounded-xl bg-background/60 p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-10 items-center rounded-xl border border-input bg-background px-3 text-sm text-muted-foreground">
                  {currency}
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-10 rounded-xl bg-background"
                  value={priceOverrideAmount}
                  onChange={(e) => setPriceOverrideAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-orange-600 hover:underline"
                onClick={() => {
                  setPriceOverrideEnabled(false);
                  setPriceOverrideAmount("");
                }}
              >
                Use the standard price instead
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {capacityNumber || 0} people × {currency}{" "}
            {effectivePricePerPerson > 0 ? effectivePricePerPerson.toFixed(2) : "0.00"} ={" "}
            <span className="font-semibold text-foreground">
              {currency} {totalValue.toFixed(2)}
            </span>{" "}
            if this slot fully books
          </p>
        </div>

        <div className="space-y-3 border-t border-border pt-5">
          <div className="flex items-center justify-between gap-2">
            <SectionHeader icon={<MapPin className="size-3.5" />} title="Meeting place" />
            <div className="inline-flex rounded-full border border-border bg-muted/40 p-1">
              <button
                type="button"
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  meetingPlaceMode === "existing" ? "bg-background text-foreground" : "text-muted-foreground",
                )}
                onClick={() => setMeetingPlaceMode("existing")}
                disabled={meetingPlaces.length === 0}
              >
                Choose existing
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  meetingPlaceMode === "new" ? "bg-background text-foreground" : "text-muted-foreground",
                )}
                onClick={() => setMeetingPlaceMode("new")}
              >
                Add new
              </button>
            </div>
          </div>
          {meetingPlaceMode === "existing" && meetingPlaces.length > 0 ? (
            <select
              value={meetingPlaceValue}
              onChange={(e) => setMeetingPlaceValue(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {meetingPlaces.map((place) => (
                <option key={place} value={place}>
                  {place}
                </option>
              ))}
            </select>
          ) : (
            <Input
              className="h-11 rounded-xl bg-background"
              value={newMeetingPlaceValue}
              onChange={(e) => setNewMeetingPlaceValue(e.target.value)}
              placeholder="e.g. City Mall main entrance"
            />
          )}
        </div>
      </div>

      {formError ? <p className="mt-4 text-sm text-red-500">{formError}</p> : null}
      {formNotice ? <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">{formNotice}</p> : null}

      <div className="mt-5 flex items-center gap-2">
        <Button
          type="button"
          className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
          onClick={handleSubmit}
          disabled={repeatBlocked}
        >
          <Plus className="mr-2 size-4" />
          {submitLabel}
        </Button>
        {editingLocalId ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => {
              resetForm();
              onCancelEdit();
            }}
          >
            Cancel edit
          </Button>
        ) : null}
      </div>
    </div>
  );
}

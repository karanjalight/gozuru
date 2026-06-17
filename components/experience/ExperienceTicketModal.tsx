"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Minus,
  Plus,
  Ticket,
  X,
} from "lucide-react";
import type { ExperienceBookingSlot } from "@/components/experience/ExperienceBookingPanel";
import {
  formatCheckoutMoney,
  formatSlotDate,
  formatSlotTime,
} from "@/lib/booking/checkout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TicketModalContext = {
  experience: { title: string; price_amount: number | null; currency: string };
  slotsByDate: Array<{ dateLabel: string; slots: ExperienceBookingSlot[] }>;
  getCartTicketsForSlot: (slotId: string) => number;
  getRemainingSpots: (slot: ExperienceBookingSlot) => number;
  getDraftTickets: (slotId: string) => number;
  setDraftTickets: (slotId: string, next: number, slot: ExperienceBookingSlot) => void;
  handleAddToCart: (slot: ExperienceBookingSlot) => void;
  setBookingError: (value: string | null) => void;
};

type ExperienceTicketModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  priceLabel: string;
  durationLabel: string;
  booking: TicketModalContext;
};

type WizardStep = 1 | 2 | 3;

const STEP_LABELS = ["Select date", "Select time", "Tickets"] as const;

function formatDateCard(iso: string) {
  const date = new Date(iso);
  return {
    weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
    day: date.getDate(),
    month: date.toLocaleDateString(undefined, { month: "short" }),
    key: date.toDateString(),
  };
}

function getUnitPrice(slot: ExperienceBookingSlot, experience: TicketModalContext["experience"]) {
  return slot.price_amount ?? experience.price_amount ?? 0;
}

export function ExperienceTicketModal({
  open,
  onOpenChange,
  title,
  priceLabel,
  durationLabel,
  booking,
}: ExperienceTicketModalProps) {
  const {
    experience,
    slotsByDate,
    getCartTicketsForSlot,
    getRemainingSpots,
    getDraftTickets,
    setDraftTickets,
    handleAddToCart,
    setBookingError,
  } = booking;

  const [step, setStep] = useState<WizardStep>(1);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dateOptions = useMemo(() => {
    return slotsByDate.map((group) => {
      const card = formatDateCard(group.slots[0].starts_at);
      const availableCount = group.slots.filter(
        (slot) => getRemainingSpots(slot) > 0 || getCartTicketsForSlot(slot.id) > 0,
      ).length;

      return {
        ...card,
        dateLabel: group.dateLabel,
        slots: group.slots,
        availableCount,
        soldOut: availableCount === 0,
      };
    });
  }, [getCartTicketsForSlot, getRemainingSpots, slotsByDate]);

  const selectedDateGroup = useMemo(
    () => dateOptions.find((option) => option.key === selectedDateKey) ?? null,
    [dateOptions, selectedDateKey],
  );

  const selectedSlot =
    selectedDateGroup?.slots.find((slot) => slot.id === selectedSlotId) ?? null;

  const selectedRemaining = selectedSlot ? getRemainingSpots(selectedSlot) : 0;
  const ticketCount = selectedSlot ? getDraftTickets(selectedSlot.id) : 1;
  const unitPrice = selectedSlot ? getUnitPrice(selectedSlot, experience) : experience.price_amount ?? 0;
  const lineTotal = unitPrice * ticketCount;
  const currency = selectedSlot?.currency ?? experience.currency;

  useEffect(() => {
    if (!open) return;

    setStep(1);
    setBookingError(null);

    const firstAvailable =
      dateOptions.find((option) => !option.soldOut) ?? dateOptions[0] ?? null;

    if (!firstAvailable) {
      setSelectedDateKey(null);
      setSelectedSlotId(null);
      return;
    }

    setSelectedDateKey(firstAvailable.key);

    const firstSlot =
      firstAvailable.slots.find(
        (slot) => getRemainingSpots(slot) > 0 || getCartTicketsForSlot(slot.id) > 0,
      ) ?? firstAvailable.slots[0] ?? null;

    setSelectedSlotId(firstSlot?.id ?? null);
  }, [dateOptions, getCartTicketsForSlot, getRemainingSpots, open, setBookingError]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onOpenChange, open]);

  if (!open || !mounted) return null;

  function handleDateSelect(key: string, soldOut: boolean) {
    if (soldOut) return;
    setSelectedDateKey(key);
    const group = dateOptions.find((option) => option.key === key);
    const firstSlot =
      group?.slots.find(
        (slot) => getRemainingSpots(slot) > 0 || getCartTicketsForSlot(slot.id) > 0,
      ) ?? group?.slots[0] ?? null;
    setSelectedSlotId(firstSlot?.id ?? null);
    setStep(2);
  }

  function handleTimeSelect(slot: ExperienceBookingSlot) {
    const remaining = getRemainingSpots(slot);
    const inCart = getCartTicketsForSlot(slot.id);
    if (remaining <= 0 && inCart === 0) return;
    setSelectedSlotId(slot.id);
    setStep(3);
  }

  function handleAddTickets() {
    if (!selectedSlot) {
      setBookingError("Select a time slot to continue.");
      return;
    }
    setDraftTickets(selectedSlot.id, ticketCount, selectedSlot);
    handleAddToCart(selectedSlot);
    onOpenChange(false);
  }

  function goBack() {
    setStep((current) => (current > 1 ? ((current - 1) as WizardStep) : current));
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close ticket booking"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-modal-title"
        className="relative z-[101] flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-2xl sm:rounded-3xl"
      >
        <div className="bg-zinc-950 px-5 pb-5 pt-6 text-white sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-400">
                Book tickets
              </p>
              <h2 id="ticket-modal-title" className="mt-1 truncate text-xl font-bold sm:text-2xl">
                {title}
              </h2>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-300">
                <span>{priceLabel}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="size-3.5" />
                  {durationLabel}
                </span>
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-white/15 p-2 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {STEP_LABELS.map((label, index) => {
              const stepNumber = (index + 1) as WizardStep;
              const isActive = step === stepNumber;
              const isComplete = step > stepNumber;

              return (
                <div key={label} className="flex flex-col items-center gap-2 text-center">
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full border text-xs font-bold transition-colors",
                      isComplete && "border-orange-500 bg-orange-500 text-white",
                      isActive && "border-white bg-white text-zinc-950",
                      !isActive && !isComplete && "border-white/20 text-zinc-400",
                    )}
                  >
                    {isComplete ? <Check className="size-4" /> : stepNumber}
                  </div>
                  <p
                    className={cn(
                      "text-[11px] font-medium uppercase tracking-wide",
                      isActive ? "text-white" : "text-zinc-500",
                    )}
                  >
                    {label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
          {dateOptions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
              <CalendarDays className="mx-auto size-8 text-muted-foreground/70" />
              <p className="mt-3 text-sm font-medium text-foreground">No upcoming showtimes</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Check back when new dates are published.
              </p>
            </div>
          ) : null}

          {step === 1 && dateOptions.length > 0 ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Choose your date</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick a day — like selecting a cinema screening date.
                </p>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {dateOptions.map((option) => {
                  const isSelected = selectedDateKey === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      disabled={option.soldOut}
                      onClick={() => handleDateSelect(option.key, option.soldOut)}
                      className={cn(
                        "flex min-w-[5.5rem] shrink-0 flex-col items-center rounded-2xl border px-4 py-4 transition-all",
                        option.soldOut && "cursor-not-allowed opacity-40",
                        isSelected
                          ? "border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                          : "border-border bg-card text-foreground hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-950/20",
                      )}
                    >
                      <span className="text-xs font-medium uppercase tracking-wide opacity-80">
                        {option.weekday}
                      </span>
                      <span className="mt-1 text-2xl font-bold tabular-nums">{option.day}</span>
                      <span className="text-xs font-medium uppercase tracking-wide opacity-80">
                        {option.month}
                      </span>
                      <span className="mt-2 text-[10px] font-medium">
                        {option.soldOut
                          ? "Sold out"
                          : `${option.availableCount} showtime${option.availableCount === 1 ? "" : "s"}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 2 && selectedDateGroup ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Choose your showtime</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatSlotDate(selectedDateGroup.slots[0].starts_at)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {selectedDateGroup.slots.map((slot) => {
                  const remaining = getRemainingSpots(slot);
                  const inCart = getCartTicketsForSlot(slot.id);
                  const soldOut = remaining <= 0 && inCart === 0;
                  const isSelected = selectedSlotId === slot.id;
                  const fillingFast = !soldOut && remaining <= Math.max(2, Math.floor(slot.capacity * 0.2));

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={soldOut}
                      onClick={() => handleTimeSelect(slot)}
                      className={cn(
                        "rounded-2xl border px-4 py-4 text-left transition-all",
                        soldOut && "cursor-not-allowed opacity-45",
                        isSelected
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                          : "border-border bg-card hover:border-orange-300 hover:shadow-sm dark:hover:border-orange-500/40",
                      )}
                    >
                      <p className="text-lg font-bold tabular-nums">{formatSlotTime(slot.starts_at)}</p>
                      <p
                        className={cn(
                          "mt-1 text-xs",
                          isSelected ? "text-white/75 dark:text-zinc-600" : "text-muted-foreground",
                        )}
                      >
                        {soldOut
                          ? "Sold out"
                          : fillingFast
                            ? `Only ${remaining} left`
                            : `${remaining} seats left`}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 3 && selectedSlot ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-muted/20 p-4 dark:bg-muted/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Your selection
                </p>
                <p className="mt-2 text-base font-semibold text-foreground">
                  {formatSlotDate(selectedSlot.starts_at)}
                </p>
                <p className="text-sm text-muted-foreground">{formatSlotTime(selectedSlot.starts_at)}</p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-foreground">How many tickets?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedRemaining} seat{selectedRemaining === 1 ? "" : "s"} remaining for this showtime.
                </p>

                <div className="mt-5 flex items-center justify-center gap-6">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-12 rounded-full"
                    aria-label="Decrease tickets"
                    onClick={() => setDraftTickets(selectedSlot.id, ticketCount - 1, selectedSlot)}
                    disabled={ticketCount <= 1}
                  >
                    <Minus className="size-5" />
                  </Button>
                  <div className="text-center">
                    <p className="text-4xl font-bold tabular-nums text-foreground">{ticketCount}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">Tickets</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-12 rounded-full"
                    aria-label="Increase tickets"
                    onClick={() => setDraftTickets(selectedSlot.id, ticketCount + 1, selectedSlot)}
                    disabled={ticketCount >= selectedRemaining}
                  >
                    <Plus className="size-5" />
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ticket price</span>
                  <span className="font-medium text-foreground">
                    {formatCheckoutMoney(unitPrice, currency)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-medium text-foreground">{ticketCount}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="font-semibold text-foreground">Subtotal</span>
                  <span className="text-lg font-bold text-foreground">
                    {formatCheckoutMoney(lineTotal, currency)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-border bg-card px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            {step > 1 ? (
              <Button type="button" variant="outline" className="h-12 rounded-xl px-4" onClick={goBack}>
                <ChevronLeft className="mr-1 size-4" />
                Back
              </Button>
            ) : null}

            {step === 1 ? (
              <Button
                type="button"
                className="h-12 flex-1 rounded-xl bg-zinc-900 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                disabled={!selectedDateKey || selectedDateGroup?.soldOut}
                onClick={() => setStep(2)}
              >
                Continue
                <ChevronRight className="ml-1 size-4" />
              </Button>
            ) : null}

            {step === 2 ? (
              <Button
                type="button"
                className="h-12 flex-1 rounded-xl bg-zinc-900 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                disabled={!selectedSlotId}
                onClick={() => setStep(3)}
              >
                Continue
                <ChevronRight className="ml-1 size-4" />
              </Button>
            ) : null}

            {step === 3 ? (
              <Button
                type="button"
                className="h-12 flex-1 rounded-xl bg-orange-600 text-sm font-semibold text-white hover:bg-orange-700"
                onClick={handleAddTickets}
              >
                <Ticket className="mr-2 size-4" />
                Add to cart · {formatCheckoutMoney(lineTotal, currency)}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

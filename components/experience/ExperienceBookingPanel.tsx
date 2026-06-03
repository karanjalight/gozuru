"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Ticket,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ExperienceBookingExperience = {
  id: string;
  host_user_id: string;
  title: string;
  price_amount: number | null;
  currency: string;
  max_guests: number | null;
  cancellation_policy: string | null;
};

export type ExperienceBookingSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  price_amount: number | null;
  currency: string | null;
  meeting_place_name: string | null;
};

type CartLine = {
  slotId: string;
  tickets: number;
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

const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatMoney(amount: number | null | undefined, currency: string) {
  if (!amount || amount <= 0) return "Price on request";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatSlotDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getUnitPrice(slot: ExperienceBookingSlot, experience: ExperienceBookingExperience) {
  return slot.price_amount ?? experience.price_amount ?? 0;
}

type ExperienceBookingPanelProps = {
  experience: ExperienceBookingExperience;
  availability: ExperienceBookingSlot[];
  confirmedGuestsBySlotId: Record<string, number>;
};

export function ExperienceBookingPanel({
  experience,
  availability,
  confirmedGuestsBySlotId,
}: ExperienceBookingPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [cart, setCart] = useState<CartLine[]>([]);
  const [ticketDraft, setTicketDraft] = useState<Record<string, number>>({});
  const [guestNote, setGuestNote] = useState("");
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [verifyingReference, setVerifyingReference] = useState<string | null>(null);

  const slotById = useMemo(() => {
    const map = new Map<string, ExperienceBookingSlot>();
    for (const slot of availability) {
      map.set(slot.id, slot);
    }
    return map;
  }, [availability]);

  const slotsByDate = useMemo(() => {
    const groups = new Map<string, ExperienceBookingSlot[]>();
    for (const slot of availability) {
      const key = new Date(slot.starts_at).toDateString();
      const existing = groups.get(key) ?? [];
      existing.push(slot);
      groups.set(key, existing);
    }
    return Array.from(groups.entries()).map(([, slots]) => ({
      dateLabel: formatSlotDate(slots[0].starts_at),
      slots: slots.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    }));
  }, [availability]);

  const getCartTicketsForSlot = (slotId: string) =>
    cart.find((line) => line.slotId === slotId)?.tickets ?? 0;

  const getRemainingSpots = (slot: ExperienceBookingSlot) => {
    const confirmed = confirmedGuestsBySlotId[slot.id] ?? 0;
    const reservedInCart = getCartTicketsForSlot(slot.id);
    return Math.max(0, slot.capacity - confirmed - reservedInCart);
  };

  const getDraftTickets = (slotId: string) => ticketDraft[slotId] ?? 1;

  const setDraftTickets = (slotId: string, next: number, slot: ExperienceBookingSlot) => {
    const maxSelectable = Math.min(
      getRemainingSpots(slot) + getCartTicketsForSlot(slotId),
      experience.max_guests ?? slot.capacity,
    );
    const clamped = Math.max(1, Math.min(maxSelectable || 1, next));
    setTicketDraft((prev) => ({ ...prev, [slotId]: clamped }));
  };

  const cartLines = useMemo(() => {
    return cart
      .map((line) => {
        const slot = slotById.get(line.slotId);
        if (!slot) return null;
        const unitPrice = getUnitPrice(slot, experience);
        return {
          ...line,
          slot,
          unitPrice,
          subtotal: unitPrice * line.tickets,
          currency: slot.currency ?? experience.currency,
        };
      })
      .filter((line): line is NonNullable<typeof line> => line !== null);
  }, [cart, experience, slotById]);

  const cartTotal = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.subtotal, 0),
    [cartLines],
  );

  const cartTicketCount = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.tickets, 0),
    [cartLines],
  );

  const cartCurrency = cartLines[0]?.currency ?? experience.currency;

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
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    if (!reference || !user || verifyingReference === reference) return;

    let cancelled = false;
    const verifyPayment = async () => {
      setVerifyingReference(reference);
      setBookingError(null);
      setBookingMessage("Verifying payment and confirming your bookings...");
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error("Please log in again to complete payment verification.");

        const response = await fetch("/api/paystack/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reference }),
        });
        const payload = (await response.json()) as {
          error?: string;
          bookedCount?: number;
        };

        if (!response.ok) throw new Error(payload.error || "Payment verification failed.");
        if (cancelled) return;

        setCart([]);
        setGuestNote("");
        setBookingMessage(
          payload.bookedCount && payload.bookedCount > 1
            ? `Payment verified. ${payload.bookedCount} bookings confirmed.`
            : "Payment verified. Your booking is confirmed.",
        );

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete("reference");
        nextUrl.searchParams.delete("trxref");
        nextUrl.searchParams.delete("paystack");
        window.history.replaceState({}, "", nextUrl.toString());
      } catch (error) {
        if (!cancelled) {
          setBookingError(error instanceof Error ? error.message : "Failed to verify payment.");
        }
      }
    };

    void verifyPayment();
    return () => {
      cancelled = true;
    };
  }, [searchParams, user, verifyingReference]);

  function addToCart(slot: ExperienceBookingSlot) {
    setBookingError(null);
    const draft = getDraftTickets(slot.id);
    const remaining = getRemainingSpots(slot);

    if (remaining <= 0) {
      setBookingError("No spots left for this time slot.");
      return;
    }
    if (draft > remaining) {
      setBookingError(`Only ${remaining} ticket${remaining === 1 ? "" : "s"} available for this slot.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((line) => line.slotId === slot.id);
      if (existing) {
        return prev.map((line) =>
          line.slotId === slot.id ? { ...line, tickets: line.tickets + draft } : line,
        );
      }
      return [...prev, { slotId: slot.id, tickets: draft }];
    });
    setTicketDraft((prev) => ({ ...prev, [slot.id]: 1 }));
    setBookingMessage("Added to your booking cart.");
  }

  function updateCartLineTickets(slotId: string, tickets: number) {
    const slot = slotById.get(slotId);
    if (!slot) return;

    const confirmed = confirmedGuestsBySlotId[slotId] ?? 0;
    const maxAllowed = slot.capacity - confirmed;

    if (tickets <= 0) {
      setCart((prev) => prev.filter((line) => line.slotId !== slotId));
      return;
    }
    if (tickets > maxAllowed) {
      setBookingError(`Only ${maxAllowed} ticket${maxAllowed === 1 ? "" : "s"} available for this slot.`);
      return;
    }

    setCart((prev) =>
      prev.map((line) => (line.slotId === slotId ? { ...line, tickets } : line)),
    );
  }

  function removeFromCart(slotId: string) {
    setCart((prev) => prev.filter((line) => line.slotId !== slotId));
  }

  function validateCheckout(): string | null {
    if (!user) return "login";
    if (user.id === experience.host_user_id) return "You cannot book your own experience.";
    if (cart.length === 0) return "Add at least one time slot to your cart.";
    return null;
  }

  function handleCheckoutClick() {
    setBookingError(null);
    setBookingMessage(null);
    const validation = validateCheckout();
    if (validation === "login") {
      router.push("/auth/login");
      return;
    }
    if (validation) {
      setBookingError(validation);
      return;
    }
    setCheckoutOpen(true);
  }

  async function beginPaystackCheckout() {
    const validation = validateCheckout();
    if (validation) {
      setBookingError(validation === "login" ? "Please log in to continue." : validation);
      return;
    }

    const normalizedEmail = user?.email?.trim().toLowerCase() ?? "";
    if (!emailPattern.test(normalizedEmail)) {
      setBookingError("Your account email format is invalid for Paystack.");
      return;
    }
    if (!paystackPublicKey) {
      setBookingError("Paystack public key is missing.");
      return;
    }

    setCheckingOut(true);
    setBookingError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Your session expired. Please log in again.");

      const items = cart.map((line) => ({
        availabilityId: line.slotId,
        guestsCount: line.tickets,
      }));

      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          experienceId: experience.id,
          items,
          guestNote: guestNote.trim() || null,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        accessCode?: string | null;
        reference?: string;
        amountMinor?: number;
        currency?: string;
      };

      if (!response.ok || !payload.reference || !payload.accessCode) {
        throw new Error(payload.error || "Unable to start Paystack checkout.");
      }
      if (!payload.amountMinor || payload.amountMinor <= 0) {
        throw new Error("Checkout amount is missing.");
      }
      if (!window.PaystackPop) {
        throw new Error("Paystack modal failed to load. Please refresh and try again.");
      }

      setCheckoutOpen(false);

      const handler = window.PaystackPop.setup({
        key: paystackPublicKey,
        email: normalizedEmail,
        amount: payload.amountMinor,
        currency: payload.currency ?? "KES",
        ref: payload.reference,
        access_code: payload.accessCode,
        callback: (paystackResponse) => {
          void (async () => {
            try {
              setBookingMessage("Verifying payment and confirming your bookings...");
              setBookingError(null);
              const { data: sessionData } = await supabase.auth.getSession();
              const token = sessionData.session?.access_token;
              if (!token) throw new Error("Please log in again.");

              const verifyResponse = await fetch("/api/paystack/verify", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ reference: paystackResponse.reference }),
              });
              const verifyPayload = (await verifyResponse.json()) as {
                error?: string;
                bookedCount?: number;
              };
              if (!verifyResponse.ok) {
                throw new Error(verifyPayload.error || "Payment verification failed.");
              }

              setCart([]);
              setGuestNote("");
              setBookingMessage(
                verifyPayload.bookedCount && verifyPayload.bookedCount > 1
                  ? `Payment verified. ${verifyPayload.bookedCount} bookings confirmed.`
                  : "Payment verified. Your booking is confirmed.",
              );
            } catch (error) {
              setBookingError(error instanceof Error ? error.message : "Failed to verify payment.");
            }
          })();
        },
        onClose: () => {
          setBookingMessage((prev) => prev ?? "Payment window closed before confirmation.");
        },
      });
      handler.openIframe();
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : "Failed to start payment.");
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <>
      <div className="space-y-5">
        <Card className="overflow-hidden rounded-3xl border border-border bg-transparent py-0 shadow-none ring-0">
          <CardHeader className="border-b border-border/70 pb-4">
            <div className="flex items-start  pt-4 justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                  <CalendarDays className="size-5 text-orange-500 dark:text-orange-400" />
                  Choose your slots
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick a time, set tickets per slot, and add to your cart.
                </p>
              </div>
              <Badge
                variant="outline"
                className="shrink-0 rounded-full border-border px-3 py-1 text-foreground"
              >
                {formatMoney(experience.price_amount, experience.currency)} / guest
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-4 sm:p-5">
            {availability.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border   px-4 py-10 text-center">
                <CalendarDays className="mx-auto size-8 text-muted-foreground/70" />
                <p className="mt-3 text-sm font-medium text-foreground">No upcoming slots yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Check back soon — the host will publish new dates.
                </p>
              </div>
            ) : (
              slotsByDate.map((group) => (
                <div key={group.dateLabel} className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {group.dateLabel}
                  </p>
                  <div className="space-y-3">
                    {group.slots.map((slot) => {
                      const remaining = getRemainingSpots(slot);
                      const inCart = getCartTicketsForSlot(slot.id);
                      const draft = getDraftTickets(slot.id);
                      const soldOut = remaining <= 0 && inCart === 0;
                      const unitPrice = getUnitPrice(slot, experience);
                      const currency = slot.currency ?? experience.currency;

                      return (
                        <div
                          key={slot.id}
                          className={cn(
                            "rounded-2xl border p-4 transition-all",
                            soldOut
                              ? "border-border opacity-60"
                              : inCart > 0
                                ? "border-orange-400/70 dark:border-orange-500/50"
                                : "border-border hover:border-orange-400/50 dark:hover:border-orange-500/40",
                          )}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <p className="text-base font-semibold text-foreground">
                                {formatSlotTime(slot.starts_at)} – {formatSlotTime(slot.ends_at)}
                              </p>
                              {slot.meeting_place_name ? (
                                <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="size-3.5 shrink-0" />
                                  {slot.meeting_place_name}
                                </p>
                              ) : null}
                              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                                {formatMoney(unitPrice, currency)} per ticket
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full border-border bg-transparent",
                                soldOut && "text-muted-foreground",
                                !soldOut && remaining <= 2 && "border-amber-400/60 text-amber-700 dark:text-amber-300",
                              )}
                            >
                              {soldOut ? "Sold out" : `${remaining} left`}
                            </Badge>
                          </div>

                          {!soldOut ? (
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Tickets
                                </span>
                                <div className="inline-flex items-center rounded-full border border-border bg-transparent p-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="rounded-full"
                                    aria-label="Decrease tickets"
                                    onClick={() => setDraftTickets(slot.id, draft - 1, slot)}
                                    disabled={draft <= 1}
                                  >
                                    <Minus className="size-4" />
                                  </Button>
                                  <span className="min-w-8 text-center text-sm font-semibold tabular-nums">
                                    {draft}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="rounded-full"
                                    aria-label="Increase tickets"
                                    onClick={() => setDraftTickets(slot.id, draft + 1, slot)}
                                    disabled={draft >= remaining}
                                  >
                                    <Plus className="size-4" />
                                  </Button>
                                </div>
                              </div>
                              <Button
                                type="button"
                                className="rounded-full bg-orange-500 px-5 text-white shadow-sm shadow-orange-500/20 hover:bg-orange-600 dark:shadow-orange-950/30"
                                onClick={() => addToCart(slot)}
                              >
                                Add to cart
                              </Button>
                            </div>
                          ) : null}

                          {inCart > 0 ? (
                            <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400">
                              <Ticket className="size-3.5" />
                              {inCart} ticket{inCart === 1 ? "" : "s"} in cart
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card
          className={cn(
            "overflow-hidden rounded-3xl border shadow-lg transition-all",
            cart.length > 0
              ? "border-orange-200/70 bg-card shadow-orange-500/10 dark:border-orange-500/25 dark:bg-card dark:shadow-orange-950/15"
              : "border-dashed border-border bg-muted/20 dark:bg-muted/10",
          )}
        >
          <CardHeader className="border-b border-border/70 bg-muted/20 pb-4 dark:bg-muted/10">
            <CardTitle className="flex items-center justify-between gap-3 text-lg text-foreground">
              <span className="inline-flex items-center gap-2">
                <ShoppingBag className="size-5 text-orange-500 dark:text-orange-400" />
                Booking cart
              </span>
              {cart.length > 0 ? (
                <Badge className="rounded-full border border-orange-200/70 bg-orange-500 px-2.5 py-0.5 text-white hover:bg-orange-500 dark:border-orange-400/30">
                  {cartTicketCount} ticket{cartTicketCount === 1 ? "" : "s"}
                </Badge>
              ) : null}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 p-4 sm:p-5">
            {cartLines.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center dark:bg-muted/15">
                <ShoppingBag className="mx-auto size-7 text-muted-foreground/70" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Your cart is empty. Add one or more time slots above.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {cartLines.map((line) => (
                    <div
                      key={line.slotId}
                      className="rounded-2xl border border-border bg-muted/30 p-4 dark:border-border dark:bg-muted/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-snug text-foreground">
                            {formatSlotDate(line.slot.starts_at)}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock3 className="size-3.5 shrink-0 text-orange-500 dark:text-orange-400" />
                            {formatSlotTime(line.slot.starts_at)} – {formatSlotTime(line.slot.ends_at)}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="Remove slot from cart"
                          onClick={() => removeFromCart(line.slotId)}
                          className="shrink-0 rounded-full border border-transparent p-1.5 text-muted-foreground transition hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4 border-t border-border/60 pt-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Tickets
                          </span>
                          <div className="inline-flex items-center rounded-full border border-border bg-card p-1 shadow-sm">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="rounded-full text-foreground"
                              aria-label="Remove one ticket"
                              onClick={() => updateCartLineTickets(line.slotId, line.tickets - 1)}
                            >
                              <Minus className="size-4" />
                            </Button>
                            <span className="min-w-8 text-center text-sm font-semibold tabular-nums text-foreground">
                              {line.tickets}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="rounded-full text-foreground"
                              aria-label="Add one ticket"
                              onClick={() => updateCartLineTickets(line.slotId, line.tickets + 1)}
                              disabled={
                                line.tickets >=
                                line.slot.capacity - (confirmedGuestsBySlotId[line.slotId] ?? 0)
                              }
                            >
                              <Plus className="size-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold tabular-nums text-foreground">
                            {formatMoney(line.subtotal, line.currency)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatMoney(line.unitPrice, line.currency)} each
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-orange-200/70 bg-gradient-to-br from-orange-50 to-orange-100/40 px-4 py-4 dark:border-orange-500/25 dark:from-orange-950/40 dark:to-orange-900/20">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Estimated total</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {cartLines.length} slot{cartLines.length === 1 ? "" : "s"} · {cartTicketCount} ticket
                        {cartTicketCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-orange-700 ">
                      {formatMoney(cartTotal, cartCurrency)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="guest-note"
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Note to host (optional)
                  </label>
                  <textarea
                    id="guest-note"
                    value={guestNote}
                    onChange={(event) => setGuestNote(event.target.value)}
                    className="min-h-[88px] w-full rounded-2xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus-visible:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-400/25 dark:bg-background"
                    placeholder="Share preferences, questions, or group details..."
                  />
                </div>

                <Button
                  type="button"
                  className="h-11 w-full rounded-full bg-orange-500 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 dark:shadow-orange-950/30"
                  onClick={handleCheckoutClick}
                  disabled={checkingOut}
                >
                  {checkingOut ? "Preparing checkout..." : "Proceed to secure payment"}
                </Button>
              </>
            )}

            {bookingError ? (
              <p className="rounded-xl border border-red-200/80 bg-red-50 px-3 py-2.5 text-xs leading-relaxed text-red-700  ">
                {bookingError}
              </p>
            ) : null}
            {bookingMessage ? (
              <p className="rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2.5 text-xs leading-relaxed text-emerald-800  ">
                {bookingMessage}
              </p>
            ) : null}

            <p className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground dark:bg-muted/10">
              {experience.cancellation_policy || "Free cancellation up to 24 hours before start time."}
            </p>
          </CardContent>
        </Card>
      </div>

      {checkoutOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl sm:p-6">
            <h3 className="text-lg font-semibold text-foreground">Confirm your booking</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You&apos;ll complete one secure Paystack payment for everything in your cart.
            </p>

            <div className="mt-4 max-h-52 space-y-2 overflow-y-auto rounded-2xl border border-border bg-muted/25 p-3 dark:bg-muted/15">
              {cartLines.map((line) => (
                <div
                  key={line.slotId}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">{formatSlotDate(line.slot.starts_at)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSlotTime(line.slot.starts_at)} · {line.tickets} ticket
                      {line.tickets === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums text-foreground">
                    {formatMoney(line.subtotal, line.currency)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-orange-200/70 bg-gradient-to-r from-orange-50 to-orange-100/40 px-4 py-3 dark:border-orange-500/25 dark:from-orange-950/40 dark:to-orange-900/20">
              <span className="text-sm font-medium text-muted-foreground">Total due now</span>
              <span className="text-lg font-bold tabular-nums text-orange-700 dark:text-orange-300">
                {formatMoney(cartTotal, cartCurrency)}
              </span>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setCheckoutOpen(false)}
                disabled={checkingOut}
              >
                Back
              </Button>
              <Button
                type="button"
                className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
                onClick={() => void beginPaystackCheckout()}
                disabled={checkingOut}
              >
                {checkingOut ? "Opening Paystack..." : "Pay with Paystack"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

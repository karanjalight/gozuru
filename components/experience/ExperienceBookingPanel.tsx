"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Lock,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Ticket,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import {
  formatCheckoutMoney,
  formatSlotDate,
  formatSlotTime,
  toCheckoutItems,
} from "@/lib/booking/checkout";
import { useExperienceCart } from "@/lib/booking/useExperienceCart";
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

type ExperienceBookingRootProps = {
  experience: ExperienceBookingExperience;
  availability: ExperienceBookingSlot[];
  confirmedGuestsBySlotId: Record<string, number>;
  onCheckoutComplete?: () => void;
  bookingMode?: boolean;
  children: ReactNode;
};

type OrderSuccess = {
  bookedCount: number;
  ticketCount: number;
  reference: string;
};

type BookingContextValue = {
  experience: ExperienceBookingExperience;
  availability: ExperienceBookingSlot[];
  confirmedGuestsBySlotId: Record<string, number>;
  hydrated: boolean;
  cart: ReturnType<typeof useExperienceCart>["cart"];
  slotsByDate: Array<{ dateLabel: string; slots: ExperienceBookingSlot[] }>;
  cartLines: Array<{
    slotId: string;
    tickets: number;
    slot: ExperienceBookingSlot;
    unitPrice: number;
    subtotal: number;
    currency: string;
  }>;
  cartTotal: number;
  cartTicketCount: number;
  cartCurrency: string;
  guestNote: string;
  setGuestNote: (value: string) => void;
  bookingError: string | null;
  setBookingError: (value: string | null) => void;
  bookingMessage: string | null;
  checkingOut: boolean;
  orderSuccess: OrderSuccess | null;
  setOrderSuccess: (value: OrderSuccess | null) => void;
  getCartTicketsForSlot: (slotId: string) => number;
  getRemainingSpots: (slot: ExperienceBookingSlot) => number;
  getDraftTickets: (slotId: string) => number;
  setDraftTickets: (slotId: string, next: number, slot: ExperienceBookingSlot) => void;
  handleAddToCart: (slot: ExperienceBookingSlot) => void;
  updateCartLineTickets: (slotId: string, tickets: number) => { ok: true } | { ok: false; error: string };
  removeFromCart: (slotId: string) => void;
  handleCheckoutClick: () => void;
  bookingMode: boolean;
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

const BookingContext = createContext<BookingContextValue | null>(null);

function useBookingContext() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("Booking components must be used within ExperienceBookingRoot.");
  }
  return context;
}

function getUnitPrice(slot: ExperienceBookingSlot, experience: ExperienceBookingExperience) {
  return slot.price_amount ?? experience.price_amount ?? 0;
}

export function ExperienceBookingRoot({
  experience,
  availability,
  confirmedGuestsBySlotId,
  onCheckoutComplete,
  bookingMode = false,
  children,
}: ExperienceBookingRootProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const cartApi = useExperienceCart(experience, availability, confirmedGuestsBySlotId);

  const [guestNote, setGuestNote] = useState("");
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [verifyingReference, setVerifyingReference] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<OrderSuccess | null>(null);

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

  const cartLines = useMemo(() => {
    return cartApi.cart
      .map((line) => {
        const slot = cartApi.slotById.get(line.slotId);
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
  }, [cartApi.cart, cartApi.slotById, experience]);

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

  async function finalizePayment(reference: string, ticketCount: number) {
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
      reference?: string;
    };

    if (!response.ok) throw new Error(payload.error || "Payment verification failed.");

    cartApi.clearCart();
    setGuestNote("");
    setCheckoutOpen(false);
    setOrderSuccess({
      bookedCount: payload.bookedCount ?? cartLines.length,
      ticketCount,
      reference: payload.reference ?? reference,
    });
    onCheckoutComplete?.();

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("reference");
    nextUrl.searchParams.delete("trxref");
    nextUrl.searchParams.delete("paystack");
    window.history.replaceState({}, "", nextUrl.toString());
  }

  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    if (!reference || !user || verifyingReference === reference) return;

    let cancelled = false;
    const verifyPayment = async () => {
      setVerifyingReference(reference);
      setBookingError(null);
      setBookingMessage("Verifying payment and confirming your order...");
      try {
        if (!cancelled) {
          await finalizePayment(reference, cartTicketCount || 1);
        }
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

  function handleAddToCart(slot: ExperienceBookingSlot) {
    setBookingError(null);
    const result = cartApi.addToCart(slot.id);
    if (!result.ok) {
      setBookingError(result.error);
      return;
    }
    setBookingMessage("Added to cart.");
  }

  function validateCheckout(): string | null {
    if (!user) return "login";
    if (user.id === experience.host_user_id) return "You cannot book your own experience.";
    if (cartApi.cart.length === 0) return "Add at least one time slot to your cart.";
    return null;
  }

  function handleCheckoutClick() {
    setBookingError(null);
    setBookingMessage(null);
    const validation = validateCheckout();
    if (validation === "login") {
      router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
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

      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          experienceId: experience.id,
          items: toCheckoutItems(cartApi.cart),
          guestNote: guestNote.trim() || null,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        accessCode?: string | null;
        reference?: string;
        amountMinor?: number;
        currency?: string;
        ticketCount?: number;
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

      const ticketCount = payload.ticketCount ?? cartTicketCount;

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
              setBookingMessage("Verifying payment and confirming your order...");
              setBookingError(null);
              await finalizePayment(paystackResponse.reference, ticketCount);
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

  const contextValue: BookingContextValue = {
    experience,
    availability,
    confirmedGuestsBySlotId,
    hydrated: cartApi.hydrated,
    cart: cartApi.cart,
    slotsByDate,
    cartLines,
    cartTotal,
    cartTicketCount,
    cartCurrency,
    guestNote,
    setGuestNote,
    bookingError,
    setBookingError,
    bookingMessage,
    checkingOut,
    orderSuccess,
    setOrderSuccess,
    getCartTicketsForSlot: cartApi.getCartTicketsForSlot,
    getRemainingSpots: cartApi.getRemainingSpots,
    getDraftTickets: cartApi.getDraftTickets,
    setDraftTickets: cartApi.setDraftTickets,
    handleAddToCart,
    updateCartLineTickets: cartApi.updateCartLineTickets,
    removeFromCart: cartApi.removeFromCart,
    handleCheckoutClick,
    bookingMode,
  };

  if (!cartApi.hydrated) {
    return (
      <div className="rounded-3xl border border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
        Loading booking options...
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <Card className="overflow-hidden rounded-3xl border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-background shadow-lg dark:border-emerald-900/40 dark:from-emerald-950/30">
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="size-7" />
            </div>
            <h3 className="mt-4 text-2xl font-semibold text-foreground">Order confirmed</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Your payment was successful. {orderSuccess.bookedCount} booking
              {orderSuccess.bookedCount === 1 ? "" : "s"} for {orderSuccess.ticketCount} ticket
              {orderSuccess.ticketCount === 1 ? "" : "s"} {orderSuccess.bookedCount === 1 ? "is" : "are"} confirmed.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Reference: {orderSuccess.reference}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              type="button"
              className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
              onClick={() => setOrderSuccess(null)}
            >
              Book more slots
            </Button>
            <Link
              href="/account/applied?view=sent"
              className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
            >
              View my bookings
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <BookingContext.Provider value={contextValue}>
      {children}
      <ExperienceBookingOverlays
        checkoutOpen={checkoutOpen}
        setCheckoutOpen={setCheckoutOpen}
        checkingOut={checkingOut}
        beginPaystackCheckout={beginPaystackCheckout}
      />
    </BookingContext.Provider>
  );
}

export function ExperienceBookingSlots() {
  const {
    experience,
    availability,
    slotsByDate,
    getCartTicketsForSlot,
    getRemainingSpots,
    getDraftTickets,
    setDraftTickets,
    handleAddToCart,
  } = useBookingContext();

  return (
    <Card className="overflow-hidden rounded-3xl border border-border bg-card py-0 shadow-sm">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex items-start justify-between gap-3 pt-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg text-foreground">
              <CalendarDays className="size-5 text-orange-500 dark:text-orange-400" />
              Select tickets
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose one or more time slots, set ticket quantities, and add them to your cart.
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 rounded-full border-border px-3 py-1 text-foreground">
            {formatCheckoutMoney(experience.price_amount, experience.currency)} / guest
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-4 sm:p-5">
        {availability.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
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
                            ? "border-orange-400/70 bg-orange-50/30 dark:border-orange-500/50 dark:bg-orange-950/10"
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
                            {formatCheckoutMoney(unitPrice, currency)} per ticket
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
                              Qty
                            </span>
                            <div className="inline-flex items-center rounded-full border border-border bg-background p-1">
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
                            className="rounded-full bg-orange-500 px-5 text-white shadow-sm shadow-orange-500/20 hover:bg-orange-600"
                            onClick={() => handleAddToCart(slot)}
                          >
                            Add to cart
                          </Button>
                        </div>
                      ) : null}

                      {inCart > 0 ? (
                        <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400">
                          <Ticket className="size-3.5" />
                          {inCart} in cart · {formatCheckoutMoney(unitPrice * inCart, currency)}
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
  );
}

export function ExperienceBookingOrderSummary({ className }: { className?: string }) {
  const {
    experience,
    cart,
    cartLines,
    cartTotal,
    cartTicketCount,
    cartCurrency,
    guestNote,
    setGuestNote,
    bookingError,
    setBookingError,
    bookingMessage,
    checkingOut,
    confirmedGuestsBySlotId,
    updateCartLineTickets,
    removeFromCart,
    handleCheckoutClick,
  } = useBookingContext();

  return (
    <div className={cn("space-y-4 lg:sticky lg:top-28 lg:self-start", className)}>
      <Card
        className={cn(
          "overflow-hidden rounded-3xl border shadow-lg transition-all",
          cart.length > 0
            ? "border-orange-200/70 bg-card shadow-orange-500/10 dark:border-orange-500/25 dark:shadow-orange-950/15"
            : "border-dashed border-border bg-muted/20 dark:bg-muted/10",
        )}
      >
        <CardHeader className="border-b border-border/70 bg-muted/20 pb-4 dark:bg-muted/10">
          <CardTitle className="flex items-center justify-between gap-3 text-lg text-foreground">
            <span className="inline-flex items-center gap-2">
              <ShoppingBag className="size-5 text-orange-500 dark:text-orange-400" />
              Order summary
            </span>
            {cart.length > 0 ? (
              <Badge className="rounded-full border border-orange-200/70 bg-orange-500 px-2.5 py-0.5 text-white hover:bg-orange-500">
                {cartTicketCount} ticket{cartTicketCount === 1 ? "" : "s"}
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-5">
          {cartLines.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center dark:bg-muted/15">
              <ShoppingBag className="mx-auto size-7 text-muted-foreground/70" />
              <p className="mt-3 text-sm font-medium text-foreground">Your cart is empty</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add tickets from multiple slots, then checkout once.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {cartLines.map((line) => (
                  <div
                    key={line.slotId}
                    className="rounded-2xl border border-border bg-muted/30 p-4 dark:bg-muted/20"
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
                          Qty
                        </span>
                        <div className="inline-flex items-center rounded-full border border-border bg-card p-1 shadow-sm">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-full"
                            aria-label="Remove one ticket"
                            onClick={() => {
                              const result = updateCartLineTickets(line.slotId, line.tickets - 1);
                              if (!result.ok) setBookingError(result.error);
                            }}
                          >
                            <Minus className="size-4" />
                          </Button>
                          <span className="min-w-8 text-center text-sm font-semibold tabular-nums">
                            {line.tickets}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-full"
                            aria-label="Add one ticket"
                            onClick={() => {
                              const result = updateCartLineTickets(line.slotId, line.tickets + 1);
                              if (!result.ok) setBookingError(result.error);
                            }}
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
                          {formatCheckoutMoney(line.subtotal, line.currency)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatCheckoutMoney(line.unitPrice, line.currency)} each
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm dark:bg-muted/10">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Subtotal ({cartTicketCount} ticket{cartTicketCount === 1 ? "" : "s"})</span>
                  <span className="font-medium text-foreground">
                    {formatCheckoutMoney(cartTotal, cartCurrency)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-2">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-xl font-bold tabular-nums text-orange-700 dark:text-orange-300">
                    {formatCheckoutMoney(cartTotal, cartCurrency)}
                  </span>
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
                className="h-11 w-full rounded-full bg-orange-500 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600"
                onClick={handleCheckoutClick}
                disabled={checkingOut}
              >
                {checkingOut ? "Preparing checkout..." : "Checkout"}
              </Button>
            </>
          )}

          {bookingError ? (
            <p className="rounded-xl border border-red-200/80 bg-red-50 px-3 py-2.5 text-xs leading-relaxed text-red-700">
              {bookingError}
            </p>
          ) : null}
          {bookingMessage ? (
            <p className="rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2.5 text-xs leading-relaxed text-emerald-800">
              {bookingMessage}
            </p>
          ) : null}

          <p className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground dark:bg-muted/10">
            {experience.cancellation_policy || "Free cancellation up to 24 hours before start time."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ExperienceBookingOverlays({
  checkoutOpen,
  setCheckoutOpen,
  checkingOut,
  beginPaystackCheckout,
}: {
  checkoutOpen: boolean;
  setCheckoutOpen: (open: boolean) => void;
  checkingOut: boolean;
  beginPaystackCheckout: () => Promise<void>;
}) {
  const { cart, cartLines, cartTotal, cartTicketCount, cartCurrency, handleCheckoutClick, bookingMode } =
    useBookingContext();

  return (
    <>
      {cart.length > 0 && bookingMode ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-4 shadow-2xl backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {cartTicketCount} ticket{cartTicketCount === 1 ? "" : "s"} · {cartLines.length} slot
                {cartLines.length === 1 ? "" : "s"}
              </p>
              <p className="text-lg font-bold tabular-nums text-orange-700 dark:text-orange-300">
                {formatCheckoutMoney(cartTotal, cartCurrency)}
              </p>
            </div>
            <Button
              type="button"
              className="rounded-full bg-orange-500 px-6 text-white hover:bg-orange-600"
              onClick={handleCheckoutClick}
            >
              Checkout
            </Button>
          </div>
        </div>
      ) : null}

      {checkoutOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Review your order</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  One secure payment covers every slot in your cart.
                </p>
              </div>
              <Badge variant="outline" className="rounded-full">
                {cartTicketCount} ticket{cartTicketCount === 1 ? "" : "s"}
              </Badge>
            </div>

            <div className="mt-4 max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-border bg-muted/25 p-3 dark:bg-muted/15">
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
                    {formatCheckoutMoney(line.subtotal, line.currency)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 rounded-2xl border border-orange-200/70 bg-gradient-to-r from-orange-50 to-orange-100/40 px-4 py-3 dark:border-orange-500/25 dark:from-orange-950/40 dark:to-orange-900/20">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCheckoutMoney(cartTotal, cartCurrency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Total due now</span>
                <span className="text-lg font-bold tabular-nums text-orange-700 dark:text-orange-300">
                  {formatCheckoutMoney(cartTotal, cartCurrency)}
                </span>
              </div>
            </div>

            <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="size-3.5" />
              Secure checkout powered by Paystack
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setCheckoutOpen(false)}
                disabled={checkingOut}
              >
                Back to cart
              </Button>
              <Button
                type="button"
                className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
                onClick={() => void beginPaystackCheckout()}
                disabled={checkingOut}
              >
                {checkingOut ? "Opening Paystack..." : "Pay now"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** @deprecated Use ExperienceBookingRoot + Slots + OrderSummary instead */
export function ExperienceBookingPanel(
  props: Omit<ExperienceBookingRootProps, "children">,
) {
  return (
    <ExperienceBookingRoot {...props}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)] xl:items-start">
        <ExperienceBookingSlots />
        <ExperienceBookingOrderSummary />
      </div>
    </ExperienceBookingRoot>
  );
}

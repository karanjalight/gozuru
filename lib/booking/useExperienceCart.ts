"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  readStoredCart,
  writeStoredCart,
  type CartLineInput,
} from "@/lib/booking/checkout";

export type ExperienceCartSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  price_amount: number | null;
  currency: string | null;
  meeting_place_name: string | null;
};

type ExperienceLike = {
  id: string;
  max_guests: number | null;
};

export function useExperienceCart(
  experience: ExperienceLike,
  availability: ExperienceCartSlot[],
  confirmedGuestsBySlotId: Record<string, number>,
) {
  const [cart, setCart] = useState<CartLineInput[]>([]);
  const [ticketDraft, setTicketDraft] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);

  const slotById = useMemo(() => {
    const map = new Map<string, ExperienceCartSlot>();
    for (const slot of availability) {
      map.set(slot.id, slot);
    }
    return map;
  }, [availability]);

  const validSlotIds = useMemo(() => new Set(availability.map((slot) => slot.id)), [availability]);

  useEffect(() => {
    const stored = readStoredCart(experience.id).filter((line) => validSlotIds.has(line.slotId));
    setCart(stored);
    setHydrated(true);
  }, [experience.id, validSlotIds]);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredCart(experience.id, cart);
  }, [cart, experience.id, hydrated]);

  const getCartTicketsForSlot = useCallback(
    (slotId: string) => cart.find((line) => line.slotId === slotId)?.tickets ?? 0,
    [cart],
  );

  const getRemainingSpots = useCallback(
    (slot: ExperienceCartSlot) => {
      const confirmed = confirmedGuestsBySlotId[slot.id] ?? 0;
      const reservedInCart = getCartTicketsForSlot(slot.id);
      return Math.max(0, slot.capacity - confirmed - reservedInCart);
    },
    [confirmedGuestsBySlotId, getCartTicketsForSlot],
  );

  const getDraftTickets = useCallback(
    (slotId: string) => ticketDraft[slotId] ?? 1,
    [ticketDraft],
  );

  const setDraftTickets = useCallback(
    (slotId: string, next: number, slot: ExperienceCartSlot) => {
      const maxSelectable = Math.min(
        getRemainingSpots(slot) + getCartTicketsForSlot(slotId),
        experience.max_guests ?? slot.capacity,
      );
      const clamped = Math.max(1, Math.min(maxSelectable || 1, next));
      setTicketDraft((prev) => ({ ...prev, [slotId]: clamped }));
    },
    [experience.max_guests, getCartTicketsForSlot, getRemainingSpots],
  );

  const addToCart = useCallback(
    (slotId: string) => {
      const slot = slotById.get(slotId);
      if (!slot) return { ok: false as const, error: "Slot not found." };

      const draft = getDraftTickets(slotId);
      const remaining = getRemainingSpots(slot);

      if (remaining <= 0) {
        return { ok: false as const, error: "No spots left for this time slot." };
      }
      if (draft > remaining) {
        return {
          ok: false as const,
          error: `Only ${remaining} ticket${remaining === 1 ? "" : "s"} available for this slot.`,
        };
      }

      setCart((prev) => {
        const existing = prev.find((line) => line.slotId === slotId);
        if (existing) {
          return prev.map((line) =>
            line.slotId === slotId ? { ...line, tickets: line.tickets + draft } : line,
          );
        }
        return [...prev, { slotId, tickets: draft }];
      });
      setTicketDraft((prev) => ({ ...prev, [slotId]: 1 }));
      return { ok: true as const };
    },
    [getDraftTickets, getRemainingSpots, slotById],
  );

  const updateCartLineTickets = useCallback(
    (slotId: string, tickets: number) => {
      const slot = slotById.get(slotId);
      if (!slot) return { ok: false as const, error: "Slot not found." };

      const confirmed = confirmedGuestsBySlotId[slotId] ?? 0;
      const maxAllowed = slot.capacity - confirmed;

      if (tickets <= 0) {
        setCart((prev) => prev.filter((line) => line.slotId !== slotId));
        return { ok: true as const };
      }
      if (tickets > maxAllowed) {
        return {
          ok: false as const,
          error: `Only ${maxAllowed} ticket${maxAllowed === 1 ? "" : "s"} available for this slot.`,
        };
      }

      setCart((prev) =>
        prev.map((line) => (line.slotId === slotId ? { ...line, tickets } : line)),
      );
      return { ok: true as const };
    },
    [confirmedGuestsBySlotId, slotById],
  );

  const removeFromCart = useCallback((slotId: string) => {
    setCart((prev) => prev.filter((line) => line.slotId !== slotId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setTicketDraft({});
  }, []);

  return {
    cart,
    ticketDraft,
    hydrated,
    getCartTicketsForSlot,
    getRemainingSpots,
    getDraftTickets,
    setDraftTickets,
    addToCart,
    updateCartLineTickets,
    removeFromCart,
    clearCart,
    slotById,
  };
}

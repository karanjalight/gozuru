export type CartLineInput = {
  slotId: string;
  tickets: number;
};

export type CheckoutCartItem = {
  availabilityId: string;
  guestsCount: number;
};

const PAYSTACK_SUPPORTED = new Set(["USD", "KES", "NGN", "GHS", "ZAR"]);

export function cartStorageKey(experienceId: string) {
  return `gozuru:experience-cart:${experienceId}`;
}

export function readStoredCart(experienceId: string): CartLineInput[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(cartStorageKey(experienceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLineInput[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (line) =>
        typeof line.slotId === "string" &&
        Number.isFinite(line.tickets) &&
        line.tickets > 0,
    );
  } catch {
    return [];
  }
}

export function writeStoredCart(experienceId: string, cart: CartLineInput[]) {
  if (typeof window === "undefined") return;
  if (cart.length === 0) {
    window.localStorage.removeItem(cartStorageKey(experienceId));
    return;
  }
  window.localStorage.setItem(cartStorageKey(experienceId), JSON.stringify(cart));
}

export function toCheckoutItems(cart: CartLineInput[]): CheckoutCartItem[] {
  return cart.map((line) => ({
    availabilityId: line.slotId,
    guestsCount: line.tickets,
  }));
}

export function resolvePaystackCurrency(currency: string) {
  const normalized = currency.toUpperCase();
  return PAYSTACK_SUPPORTED.has(normalized) ? normalized : "USD";
}

export function formatCheckoutMoney(
  amount: number | null | undefined,
  currency: string,
  options?: { maximumFractionDigits?: number },
) {
  if (!amount || amount <= 0) return "Price on request";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  }).format(amount);
}

export function formatSlotDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function formatSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

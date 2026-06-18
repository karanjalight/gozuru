import { formatCheckoutMoney } from "@/lib/booking/checkout";
import { parseMoneyAmount } from "@/lib/currency";
import { supabase } from "@/lib/supabase/client";

export type AccountPaymentRow = {
  id: string;
  experienceTitle: string;
  amount: string;
  status: string;
  statusLabel: string;
  dateLabel: string;
  direction: "outgoing" | "incoming";
  sortAt: number;
};

type PaymentRecord = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  payer_user_id: string;
  payee_user_id: string;
  bookings:
    | {
        experiences: { title: string } | { title: string }[] | null;
      }
    | {
        experiences: { title: string } | { title: string }[] | null;
      }[]
    | null;
};

type CheckoutSessionRecord = {
  id: string;
  amount_minor: number;
  currency: string;
  status: string;
  created_at: string;
  experiences: { title: string } | { title: string }[] | null;
};

function readExperienceTitle(
  experiences: { title: string } | { title: string }[] | null | undefined,
): string {
  if (!experiences) return "Experience booking";
  if (Array.isArray(experiences)) {
    return experiences[0]?.title ?? "Experience booking";
  }
  return experiences.title ?? "Experience booking";
}

function readBookingExperienceTitle(bookings: PaymentRecord["bookings"]): string {
  if (!bookings) return "Experience booking";
  const booking = Array.isArray(bookings) ? bookings[0] : bookings;
  return readExperienceTitle(booking?.experiences);
}

function formatPaymentStatus(status: string): string {
  switch (status) {
    case "succeeded":
      return "Paid";
    case "pending":
      return "Pending";
    case "failed":
      return "Failed";
    case "refunded":
      return "Refunded";
    case "partially_refunded":
      return "Partially refunded";
    default:
      return status.replaceAll("_", " ");
  }
}

function formatDateLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function getPaymentStatusClassName(status: string): string {
  const normalized = status.toLowerCase();

  if (normalized === "succeeded" || normalized === "paid") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
  if (normalized === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
  }
  if (normalized === "failed") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300";
}

export async function fetchAccountPayments(userId: string): Promise<AccountPaymentRow[]> {
  const [paymentsResponse, sessionsResponse] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, amount, currency, status, paid_at, created_at, payer_user_id, payee_user_id, bookings ( experiences ( title ) )",
      )
      .or(`payer_user_id.eq.${userId},payee_user_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("checkout_sessions")
      .select("id, amount_minor, currency, status, created_at, experiences ( title )")
      .eq("guest_user_id", userId)
      .in("status", ["pending", "failed"])
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (paymentsResponse.error) {
    throw new Error(paymentsResponse.error.message);
  }
  if (sessionsResponse.error) {
    throw new Error(sessionsResponse.error.message);
  }

  const rows: AccountPaymentRow[] = [];

  for (const payment of (paymentsResponse.data ?? []) as PaymentRecord[]) {
    const timestamp = payment.paid_at ?? payment.created_at;
    rows.push({
      id: payment.id,
      experienceTitle: readBookingExperienceTitle(payment.bookings),
      amount: formatCheckoutMoney(parseMoneyAmount(payment.amount), payment.currency),
      status: payment.status,
      statusLabel: formatPaymentStatus(payment.status),
      dateLabel: formatDateLabel(timestamp),
      direction: payment.payer_user_id === userId ? "outgoing" : "incoming",
      sortAt: new Date(timestamp).getTime(),
    });
  }

  for (const session of (sessionsResponse.data ?? []) as CheckoutSessionRecord[]) {
    const timestamp = session.created_at;
    rows.push({
      id: `session_${session.id}`,
      experienceTitle: readExperienceTitle(session.experiences),
      amount: formatCheckoutMoney(session.amount_minor / 100, session.currency),
      status: session.status,
      statusLabel: session.status === "pending" ? "Payment pending" : "Payment failed",
      dateLabel: formatDateLabel(timestamp),
      direction: "outgoing",
      sortAt: new Date(timestamp).getTime(),
    });
  }

  return rows.sort((a, b) => b.sortAt - a.sortAt);
}

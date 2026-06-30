// Formatting + status-tone helpers shared across admin pages.

export function formatMoney(amount: number | null | undefined): string {
  const n = Number(amount) || 0;
  return `Ksh ${n.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

export function formatCompactMoney(amount: number | null | undefined): string {
  const n = Number(amount) || 0;
  if (Math.abs(n) >= 1000) {
    return `Ksh ${(n / 1000).toLocaleString("en-KE", { maximumFractionDigits: 1 })}k`;
  }
  return `Ksh ${n.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

export function formatNumber(n: number | null | undefined): string {
  return Number(n ?? 0).toLocaleString("en-KE");
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "—";
  const diff = Date.now() - d;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export function computeDelta(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

type Tone = "success" | "warning" | "info" | "danger" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400",
  info: "bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400",
  danger: "bg-red-500/10 text-red-600 ring-red-500/20 dark:text-red-400",
  neutral: "bg-muted text-muted-foreground ring-border",
};

const STATUS_TONE: Record<string, Tone> = {
  // success
  published: "success",
  approved: "success",
  succeeded: "success",
  paid: "success",
  confirmed: "success",
  completed: "success",
  // warning / in-progress
  pending: "warning",
  submitted: "warning",
  in_review: "warning",
  processing: "warning",
  requested: "warning",
  // neutral
  draft: "neutral",
  not_started: "neutral",
  unpublished: "neutral",
  archived: "neutral",
  cancelled: "neutral",
  cancelled_by_guest: "neutral",
  cancelled_by_host: "neutral",
  // danger
  rejected: "danger",
  failed: "danger",
  refunded: "danger",
  partially_refunded: "danger",
  no_show: "danger",
};

export function statusToneClass(status: string): string {
  const tone = STATUS_TONE[status?.toLowerCase()] ?? "neutral";
  return TONE_CLASS[tone];
}

export function humanizeStatus(status: string): string {
  return (status ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

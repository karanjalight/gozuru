"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { humanizeStatus, statusToneClass } from "@/components/admin/ui/format";

/** Debounce a fast-changing value (e.g. a search box) for query keys. */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const ACCENTS = {
  orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
} as const;

export type StatAccent = keyof typeof ACCENTS;

export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  hint,
  accent = "orange",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: number | null;
  hint?: string;
  accent?: StatAccent;
}) {
  const hasDelta = delta !== null && delta !== undefined;
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 ring-1 ring-foreground/[0.03] transition hover:ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <span className={cn("flex size-10 items-center justify-center rounded-xl", ACCENTS[accent])}>
          <Icon className="size-5" />
        </span>
        {hasDelta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
              positive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400",
            )}
          >
            {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(delta as number)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      {hint && <p className="mt-2 text-xs text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card ring-1 ring-foreground/[0.03]",
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            {title && <h3 className="truncate text-sm font-semibold">{title}</h3>}
            {description && (
              <p className="truncate text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={cn("flex-1", bodyClassName ?? "p-5")}>{children}</div>
    </section>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        statusToneClass(status),
      )}
    >
      {humanizeStatus(status)}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <p className="mt-4 text-sm font-semibold">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20"
      />
    </div>
  );
}

export function FilterChips({
  options,
  value,
  onChange,
}: {
  options: { value: string | null; label: string }[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition",
              active
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3 text-sm text-muted-foreground">
      <span className="tabular-nums">
        {start}–{end} of {total.toLocaleString("en-KE")}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => onPage(page - 1)}
          className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="px-2 text-xs tabular-nums">
          {page + 1} / {pageCount}
        </span>
        <button
          type="button"
          disabled={page >= pageCount - 1}
          onClick={() => onPage(page + 1)}
          className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-border/50">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-5 py-4">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className={cn(
                "h-4 animate-pulse rounded bg-muted",
                c === 0 ? "w-40" : "w-24",
                c === cols - 1 && "ml-auto",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Avatar({ name, src }: { name?: string | null; src?: string | null }) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name ?? ""} className="size-9 rounded-full object-cover" />;
  }
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-sm font-bold text-orange-600">
      {initial}
    </span>
  );
}

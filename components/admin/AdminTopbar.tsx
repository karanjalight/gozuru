"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Bell,
  BadgeCheck,
  Compass,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
} from "lucide-react";
import { getAdminPageMeta } from "@/components/admin/nav";
import { useAdminOverview } from "@/lib/admin/api";
import { cn } from "@/lib/utils";

export function AdminTopbar({
  onOpenMobile,
  onToggleCollapse,
  collapsed,
}: {
  onOpenMobile: () => void;
  onToggleCollapse: () => void;
  collapsed: boolean;
}) {
  const pathname = usePathname() ?? "/admin";
  const meta = getAdminPageMeta(pathname);
  const { setTheme, resolvedTheme } = useTheme();
  const { data: overview } = useAdminOverview();
  const [mounted, setMounted] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme === "dark";

  const hostsPending = overview?.kpis.hostsPending ?? 0;
  const expPending = overview?.kpis.experiencesPending ?? 0;
  const totalPending = hostsPending + expPending;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onOpenMobile}
        className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      <button
        type="button"
        onClick={onToggleCollapse}
        className="hidden size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground lg:inline-flex"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold leading-tight">{meta.title}</h1>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">{meta.description}</p>
      </div>

      <div className="relative hidden items-center md:flex">
        <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search Gozuru…"
          className="h-9 w-56 rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20"
        />
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setNotifOpen((v) => !v)}
          className="relative inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
          {totalPending > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2 items-center justify-center">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-orange-500" />
            </span>
          )}
        </button>

        {notifOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
            <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-xl ring-1 ring-foreground/5">
              <div className="border-b border-border/70 px-4 py-3">
                <p className="text-sm font-semibold">Pending actions</p>
                <p className="text-xs text-muted-foreground">{totalPending} item(s) need attention</p>
              </div>
              <div className="divide-y divide-border/60">
                <NotifRow
                  href="/admin/hosts"
                  icon={<BadgeCheck className="size-4" />}
                  title="Host verifications"
                  count={hostsPending}
                  onClick={() => setNotifOpen(false)}
                />
                <NotifRow
                  href="/admin/experiences"
                  icon={<Compass className="size-4" />}
                  title="Experiences to moderate"
                  count={expPending}
                  onClick={() => setNotifOpen(false)}
                />
              </div>
              {totalPending === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  You&apos;re all caught up 🎉
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
        aria-label="Toggle theme"
      >
        {mounted && isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </button>
    </header>
  );
}

function NotifRow({
  href,
  icon,
  title,
  count,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition hover:bg-muted/60",
        count === 0 && "opacity-60",
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
        {icon}
      </span>
      <span className="flex-1 text-sm font-medium">{title}</span>
      <span
        className={cn(
          "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold",
          count > 0 ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </Link>
  );
}

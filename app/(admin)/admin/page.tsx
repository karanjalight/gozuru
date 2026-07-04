"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarCheck,
  Compass,
  CreditCard,
  Inbox,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAdminOverview } from "@/lib/admin/api";
import {
  Avatar,
  EmptyState,
  SectionCard,
  StatCard,
  StatusBadge,
} from "@/components/admin/ui/primitives";
import {
  computeDelta,
  formatMoney,
  formatNumber,
  formatRelative,
} from "@/components/admin/ui/format";
import { RevenueAreaChart, StatusBarChart, StatusDonut } from "@/components/admin/charts";
import type { AdminOverview } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

export default function AdminOverviewPage() {
  const { data, isLoading, error } = useAdminOverview();
  const [metric, setMetric] = useState<"revenue" | "bookings">("revenue");

  if (error) {
    return (
      <SectionCard title="Couldn't load dashboard data">
        <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          If this persists, apply the latest database migration
          (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">20260629_021_admin_dashboard.sql</code>)
          which creates the <code className="rounded bg-muted px-1.5 py-0.5 text-xs">admin_*</code> functions.
        </p>
      </SectionCard>
    );
  }

  const k = data?.kpis;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {isLoading || !k ? (
          Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              icon={TrendingUp}
              accent="orange"
              label="Total revenue"
              value={formatMoney(k.revenueTotal)}
              delta={computeDelta(k.revenue30, k.revenuePrev)}
              hint={`${formatMoney(k.revenue30)} last 30 days`}
            />
            <StatCard
              icon={CalendarCheck}
              accent="emerald"
              label="Bookings"
              value={formatNumber(k.bookingsTotal)}
              delta={computeDelta(k.bookings30, k.bookingsPrev)}
              hint={`${formatNumber(k.bookings30)} last 30 days`}
            />
            <StatCard
              icon={Users}
              accent="sky"
              label="Users"
              value={formatNumber(k.usersTotal)}
              delta={computeDelta(k.users30, k.usersPrev)}
              hint={`${formatNumber(k.users30)} new last 30 days`}
            />
            <StatCard
              icon={BadgeCheck}
              accent="violet"
              label="Hosts"
              value={formatNumber(k.hostsTotal)}
              hint={`${formatNumber(k.hostsPending)} pending verification`}
            />
            <StatCard
              icon={Compass}
              accent="amber"
              label="Published experiences"
              value={formatNumber(k.experiencesPublished)}
              hint={`${formatNumber(k.experiencesPending)} awaiting review`}
            />
            <StatCard
              icon={Star}
              accent="rose"
              label="Avg rating"
              value={`${Number(k.avgRating).toFixed(1)} / 5`}
              hint={`${formatNumber(k.reviewsTotal)} reviews`}
            />
          </>
        )}
      </div>

      {/* Revenue + bookings status */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title={metric === "revenue" ? "Revenue — last 30 days" : "Bookings — last 30 days"}
          description="Daily totals from succeeded payments and new bookings"
          action={
            <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-medium">
              {(["revenue", "bookings"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetric(m)}
                  className={cn(
                    "rounded-md px-2.5 py-1 capitalize transition",
                    metric === m
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          }
          bodyClassName="p-5"
        >
          <div className="h-72 w-full">
            {!isLoading && data && data.revenueSeries.length > 0 ? (
              <RevenueAreaChart data={data.revenueSeries} metric={metric} />
            ) : (
              <ChartPlaceholder loading={isLoading} />
            )}
          </div>
        </SectionCard>

        <SectionCard title="Bookings by status" description="All-time distribution">
          {!isLoading && data && data.bookingsByStatus.length > 0 ? (
            <StatusDonut data={data.bookingsByStatus} />
          ) : (
            <ChartPlaceholder loading={isLoading} compact />
          )}
        </SectionCard>
      </div>

      {/* Experiences by status + recent bookings */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Experiences by status" description="Listing pipeline">
          <div className="h-64 w-full">
            {!isLoading && data && data.experiencesByStatus.length > 0 ? (
              <StatusBarChart data={data.experiencesByStatus} />
            ) : (
              <ChartPlaceholder loading={isLoading} compact />
            )}
          </div>
        </SectionCard>

        <SectionCard
          className="lg:col-span-2"
          title="Recent bookings"
          description="Latest reservations across Gozuru"
          action={
            <Link href="/admin/bookings" className="text-xs font-medium text-orange-600 hover:underline">
              View all
            </Link>
          }
          bodyClassName="p-0"
        >
          <RecentBookings data={data} loading={isLoading} />
        </SectionCard>
      </div>

      {/* Top experiences + queues */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Top experiences"
          description="Ranked by bookings and revenue"
          bodyClassName="p-0"
        >
          <TopExperiences data={data} loading={isLoading} />
        </SectionCard>

        <div className="space-y-6">
          <PendingActions data={data} loading={isLoading} />
          <RecentSignups data={data} loading={isLoading} />
        </div>
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      <div className="size-10 animate-pulse rounded-xl bg-muted" />
      <div className="mt-4 h-7 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-20 animate-pulse rounded bg-muted" />
    </div>
  );
}

function ChartPlaceholder({ loading, compact }: { loading?: boolean; compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center text-sm text-muted-foreground",
        compact ? "h-44" : "h-full",
      )}
    >
      {loading ? (
        <div className="size-full animate-pulse rounded-xl bg-muted/60" />
      ) : (
        "No data yet"
      )}
    </div>
  );
}

function RecentBookings({ data, loading }: { data?: AdminOverview; loading?: boolean }) {
  if (loading) return <ListSkeleton rows={5} />;
  const rows = data?.recentBookings ?? [];
  if (rows.length === 0) {
    return <EmptyState icon={CalendarCheck} title="No bookings yet" description="Reservations will appear here." />;
  }
  return (
    <ul className="divide-y divide-border/50">
      {rows.map((b) => (
        <li key={b.id} className="flex items-center gap-3 px-5 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{b.experience_title ?? "Experience"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {b.guest_name ?? "Guest"} · {formatRelative(b.booked_at)}
            </p>
          </div>
          <span className="text-sm font-semibold tabular-nums">{formatMoney(b.total_amount)}</span>
          <StatusBadge status={b.status} />
        </li>
      ))}
    </ul>
  );
}

function TopExperiences({ data, loading }: { data?: AdminOverview; loading?: boolean }) {
  if (loading) return <ListSkeleton rows={5} />;
  const rows = data?.topExperiences ?? [];
  if (rows.length === 0) {
    return <EmptyState icon={Compass} title="No experiences yet" description="Top performers will be ranked here." />;
  }
  return (
    <ul className="divide-y divide-border/50">
      {rows.map((e, i) => (
        <li key={e.id} className="flex items-center gap-3 px-5 py-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{e.title}</p>
            <p className="text-xs text-muted-foreground">{formatNumber(e.bookings)} bookings</p>
          </div>
          <span className="text-sm font-semibold tabular-nums">{formatMoney(e.revenue)}</span>
          <StatusBadge status={e.status} />
        </li>
      ))}
    </ul>
  );
}

function PendingActions({ data, loading }: { data?: AdminOverview; loading?: boolean }) {
  const hosts = data?.pendingHosts ?? [];
  const exps = data?.pendingExperiences ?? [];
  const empty = !loading && hosts.length === 0 && exps.length === 0;

  return (
    <SectionCard title="Needs attention" description="Verification & moderation queue" bodyClassName="p-0">
      {loading ? (
        <ListSkeleton rows={3} />
      ) : empty ? (
        <EmptyState icon={Inbox} title="All caught up" description="No pending items right now." />
      ) : (
        <div className="divide-y divide-border/50">
          {hosts.map((h) => (
            <Link
              key={h.user_id}
              href="/admin/hosts"
              className="flex items-center gap-3 px-5 py-3 transition hover:bg-muted/40"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                <BadgeCheck className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{h.name ?? "Host"}</p>
                <p className="truncate text-xs text-muted-foreground">Host awaiting verification</p>
              </div>
              <span className="text-xs text-muted-foreground">{formatRelative(h.created_at)}</span>
            </Link>
          ))}
          {exps.map((e) => (
            <Link
              key={e.id}
              href="/admin/experiences"
              className="flex items-center gap-3 px-5 py-3 transition hover:bg-muted/40"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Compass className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {e.host_name ?? "Host"} · awaiting review
                </p>
              </div>
              <StatusBadge status={e.status} />
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function RecentSignups({ data, loading }: { data?: AdminOverview; loading?: boolean }) {
  return (
    <SectionCard title="Recent signups" description="Newest members" bodyClassName="p-0">
      {loading ? (
        <ListSkeleton rows={4} />
      ) : (data?.recentSignups ?? []).length === 0 ? (
        <EmptyState icon={Users} title="No members yet" />
      ) : (
        <ul className="divide-y divide-border/50">
          {(data?.recentSignups ?? []).map((u) => (
            <li key={u.user_id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={u.name ?? u.email} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.name ?? u.email}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.city ? `${u.city} · ` : ""}
                  {formatRelative(u.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border/50">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3.5">
          <div className="size-8 animate-pulse rounded-lg bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-40 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

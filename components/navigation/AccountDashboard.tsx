"use client";

import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useRouter, usePathname } from "next/navigation";
import { Coins, FileText, LogOut, Moon, Sun, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { loadMockExperiences, type MockExperience } from "@/lib/mock-experiences";

type PaymentRow = {
  id: string;
  experienceTitle: string;
  amount: string;
  status: "Paid" | "Pending";
  dateLabel: string;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateLabel(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function getAppliedStatus(index: number): string {
  if (index % 3 === 0) return "Approved";
  if (index % 3 === 1) return "In review";
  return "Submitted";
}

export function AccountDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();

  const [appliedExperiences, setAppliedExperiences] = useState<
    MockExperience[]
  >([]);

  useEffect(() => {
    const nextApplied = user
      ? loadMockExperiences().filter((e) => e.hostEmail === user.email)
      : [];
    queueMicrotask(() => {
      setAppliedExperiences(nextApplied);
    });
  }, [user]);

  const payments = useMemo<PaymentRow[]>(() => {
    const rows: PaymentRow[] = [];
    const limited = appliedExperiences.slice(0, 4);
    limited.forEach((exp, idx) => {
      const amount = 45 + idx * 65;
      rows.push({
        id: `pay_${exp.id}`,
        experienceTitle: exp.title,
        amount: formatCurrency(amount),
        status: idx % 2 === 0 ? "Paid" : "Pending",
        dateLabel: formatDateLabel(exp.createdAt + 1000 * 60 * 60 * 24 * (idx + 2)),
      });
    });
    return rows;
  }, [appliedExperiences]);

  const topLinks = useMemo(
    () => [
      { href: "/account/experiences", label: "Experiences" },
      { href: "/account/experiences/create", label: "Create" },
    ],
    [],
  );

  const isDark = resolvedTheme === "dark";

  const onToggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  if (loading) {
    return (
      <aside className="border-b border-border bg-background p-4 lg:border-b-0 lg:border-r">
        <div className="animate-pulse text-xs text-muted-foreground">
          Loading your dashboard...
        </div>
      </aside>
    );
  }

  if (!user) return null;

  return (
    <aside className="border-b border-border bg-background lg:border-b-0 lg:border-r lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
      <div className="mx-auto max-w-7xl p-4 lg:px-5 lg:py-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-muted/60"
          >
            <span className="rounded-full bg-orange-500 px-2 py-1 text-sm font-semibold text-white">
              Go
            </span>
            <span className="text-sm font-semibold tracking-tight">Zuru</span>
          </Link>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {topLinks.map((l) => {
            const active = pathname === l.href || pathname?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2 text-center text-sm font-semibold transition-colors",
                  active
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-border bg-muted/20 text-zinc-800 dark:text-zinc-200 hover:bg-muted/40",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 space-y-4">
          <Card className="rounded-2xl border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Applied experiences</h2>
            </div>

            <div className="mt-3">
              <div className="max-h-56 overflow-auto">
                <table className="w-full border-separate border-spacing-y-1">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold text-muted-foreground">
                      <th className="pb-2 pr-2">Experience</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appliedExperiences.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="py-4 text-center text-xs text-muted-foreground">
                          No applied experiences yet
                        </td>
                      </tr>
                    ) : (
                      appliedExperiences.slice(0, 6).map((exp, idx) => (
                        <tr key={exp.id} className="text-sm">
                          <td className="pr-2">
                            <span className="block max-w-[240px] truncate font-medium">
                              {exp.title}
                            </span>
                          </td>
                          <td>
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                idx % 3 === 0
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : idx % 3 === 1
                                    ? "border-amber-200 bg-amber-50 text-amber-800"
                                    : "border-slate-200 bg-slate-50 text-slate-700",
                              )}
                            >
                              {getAppliedStatus(idx)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Coins className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Payments</h2>
            </div>

            <div className="mt-3">
              <div className="max-h-44 overflow-auto">
                <table className="w-full border-separate border-spacing-y-1">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold text-muted-foreground">
                      <th className="pb-2 pr-2">Amount</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="py-4 text-center text-xs text-muted-foreground">
                          No payments yet
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="text-sm">
                          <td className="pr-2">
                            <span className="block font-semibold">
                              {p.amount}
                            </span>
                            <span className="block text-[11px] text-muted-foreground">
                              {p.dateLabel}
                            </span>
                          </td>
                          <td>
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                p.status === "Paid"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-amber-200 bg-amber-50 text-amber-800",
                              )}
                            >
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <UserRound className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">
                  Profile
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-foreground">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => router.push("/account/experiences")}
              >
                View profile
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => {
                  logout();
                  router.push("/auth/login");
                }}
              >
                <LogOut className="mr-2 size-4" />
                Log out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}


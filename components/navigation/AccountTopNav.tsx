"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { LogOut, Menu, Moon, Sun, X, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";

const primaryNavLinks = [
  { href: "/account/experiences", label: "Explore" },
  { href: "/account/experiences/create", label: "Host" },
  { href: "/account/calendar", label: "Calendar" },
  { href: "/account/applied", label: "Applied" },
  { href: "/account/payments", label: "Payments" },
];

const secondaryNavLinks = [
  { href: "/account/profile", label: "Profile" },
] as const;

export function AccountTopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const isDark = resolvedTheme === "dark";

  const onLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const onToggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const topLinks = useMemo(
    () => [...primaryNavLinks, ...secondaryNavLinks],
    [],
  );

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-muted/60"
        >
          <span className="rounded-full bg-orange-500 px-2 py-1 text-sm font-semibold text-white">
            Go
          </span>
          <span className="text-sm font-semibold tracking-tight">Zuru</span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex" aria-label="Account navigation">
          {topLinks.map((l, index) => {
            const active =
              pathname === l.href || pathname?.startsWith(l.href + "/");
            const startsSecondary = index === primaryNavLinks.length;
            return (
              <div key={l.href} className="flex items-center">
                {startsSecondary ? (
                  <span
                    className="mx-1 h-5 w-px bg-border"
                    aria-hidden="true"
                  />
                ) : null}
                <Link
                  href={l.href}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-orange-50 text-orange-700"
                      : "text-black hover:bg-muted/50 dark:text-zinc-500",
                  )}
                >
                  {l.label}
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="hidden rounded-full md:inline-flex"
            onClick={onToggleTheme}
            aria-label="Toggle light/dark mode"
            disabled={!mounted}
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>

          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              <div className="flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1.5">
                <UserRound className="size-4 text-muted-foreground" />
                <span className="max-w-[180px] truncate text-xs font-semibold">
                  {user.email}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={onLogout}
              >
                <LogOut className="mr-2 size-4" />
                Log out
              </Button>
            </div>
          ) : null}

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-border bg-background md:hidden">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1.5">
                  <UserRound className="size-4 text-muted-foreground" />
                  <span className="text-xs font-semibold">{user?.email}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={onToggleTheme}
                  aria-label="Toggle light/dark mode"
                  disabled={!mounted}
                >
                  {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </Button>
              </div>

              {topLinks.map((l) => {
                const active =
                  pathname === l.href || pathname?.startsWith(l.href + "/");
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                      active
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-border bg-muted/20 text-zinc-800 dark:text-zinc-200",
                    )}
                  >
                    {l.label}
                  </Link>
                );
              })}

              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={onLogout}
              >
                <LogOut className="mr-2 size-4" />
                Log out
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}


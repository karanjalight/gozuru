"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Menu, X, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";

export function AccountNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);

  const items = useMemo(
    () => [
      { href: "/account/experiences", label: "Experiences" },
      { href: "/account/experiences/create", label: "Create" },
    ],
    [],
  );

  const onLogout = () => {
    logout();
    router.push("/auth/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
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

        <nav className="hidden items-center gap-6 md:flex" aria-label="Account navigation">
          {items.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-orange-600",
                  active
                    ? "text-orange-600"
                    : "text-zinc-700 dark:text-zinc-200",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="hidden items-center gap-3 md:flex">
              <div className="flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1.5">
                <UserRound className="size-4 text-muted-foreground" />
                <span className="max-w-[180px] truncate text-xs font-medium text-foreground">
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
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-border bg-background md:hidden">
          <div className="mx-auto max-w-7xl px-4 py-3 lg:px-6">
            <div className="flex flex-col gap-3">
              {items.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                      active
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-border bg-muted/20 text-zinc-800 dark:text-zinc-200",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {user ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={onLogout}
                >
                  <LogOut className="mr-2 size-4" />
                  Log out
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}


"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useAuth } from "@/components/auth/AuthProvider";
import { ADMIN_NAV } from "@/components/admin/nav";
import { useAdminOverview } from "@/lib/admin/api";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminSidebar({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data: overview } = useAdminOverview();

  const pendingByHref: Record<string, number> = {
    "/admin/hosts": overview?.kpis.hostsPending ?? 0,
    "/admin/experiences": overview?.kpis.experiencesPending ?? 0,
  };

  const onLogout = () => {
    logout();
    router.push("/auth/login");
  };

  return (
    <div className="flex h-full flex-col bg-card text-card-foreground">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-2 border-b border-border/70 px-4",
          collapsed && "justify-center px-0",
        )}
      >
        <Link href="/admin" className="flex items-center gap-2" onClick={onNavigate}>
          {collapsed ? (
            <span className="flex size-9 items-center justify-center rounded-xl bg-orange-500 text-white">
              <ShieldCheck className="size-5" />
            </span>
          ) : (
            <>
              <BrandLogo size="sm" />
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-600">
                <ShieldCheck className="size-3" /> Admin
              </span>
            </>
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {ADMIN_NAV.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {group.label}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const pending = pendingByHref[item.href] ?? 0;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        collapsed && "justify-center px-0",
                        active
                          ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-orange-500" />
                      )}
                      <Icon className="size-[18px] shrink-0" />
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {!collapsed && pending > 0 && (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-white">
                          {pending}
                        </span>
                      )}
                      {collapsed && pending > 0 && (
                        <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-orange-500" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border/70 p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl px-2 py-2",
            collapsed && "justify-center px-0",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-sm font-bold text-orange-600">
            {(user?.metadata.firstName?.[0] ?? user?.email?.[0] ?? "A").toUpperCase()}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {`${user?.metadata.firstName ?? ""} ${user?.metadata.lastName ?? ""}`.trim() ||
                  "Administrator"}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={onLogout}
              aria-label="Sign out"
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-destructive"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            type="button"
            onClick={onLogout}
            aria-label="Sign out"
            className="mt-1 inline-flex w-full items-center justify-center rounded-lg py-2 text-muted-foreground transition hover:bg-muted hover:text-destructive"
          >
            <LogOut className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

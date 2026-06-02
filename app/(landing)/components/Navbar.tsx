"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/BrandLogo";

const NAV_LINKS = [
  { href: "/", label: "Home", isActive: (path: string) => path === "/" },
  {
    href: "/experiences",
    label: "Experiences",
    isActive: (path: string) =>
      path === "/experiences" || path.startsWith("/experiences/"),
  },
  {
    href: "/about",
    label: "How it works",
    isActive: (path: string) => path === "/about" || path.startsWith("/about/"),
  },
  {
    href: "/hosts",
    label: "Become a host",
    isActive: (path: string) => path === "/hosts" || path.startsWith("/hosts/"),
  },
  {
    href: "/contact",
    label: "Contact",
    isActive: (path: string) => path === "/contact",
  },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { user, loading, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMobile = () => setMobileOpen(false);
  const isHome = pathname === "/";
  const isTransparent = isHome && !scrolled;
  const isDarkMode = (theme === "system" ? resolvedTheme : theme) === "dark";
  const userInitial = user?.email?.trim().charAt(0).toUpperCase() || "U";

  const navLinkClass = (active: boolean) =>
    cn(
      "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
      isTransparent
        ? active
          ? "bg-white text-slate-950 shadow-sm"
          : "text-white/90 hover:bg-white/15 hover:text-white"
        : isDarkMode
          ? active
            ? "bg-white text-slate-950 shadow-sm"
            : "text-slate-200 hover:bg-white/10 hover:text-white"
          : active
            ? "bg-slate-950 text-white shadow-sm"
            : "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
    );

  const iconButtonClass = cn(
    "inline-flex size-10 items-center justify-center rounded-full border transition-colors",
    isTransparent
      ? "border-white/25 bg-slate-950/35 text-white shadow-sm backdrop-blur-md hover:bg-white/15"
      : isDarkMode
        ? "border-white/10 bg-white/10 text-white shadow-sm hover:bg-white/15"
        : "border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-100",
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openLandingAuthModal = (mode: "login" | "signup") => {
    window.dispatchEvent(
      new CustomEvent("gozuru-auth-modal-open", {
        detail: { mode },
      }),
    );
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
        isTransparent
          ? "border-white/10 bg-slate-950/25 text-white shadow-lg shadow-black/10 backdrop-blur-md"
          : isDarkMode
            ? "border-white/10 bg-slate-950/95 text-white shadow-lg shadow-black/20 backdrop-blur-md"
            : "border-slate-200/80 bg-white/95 text-slate-950 shadow-sm backdrop-blur-md"
      )}
    >
      <nav className="mx-auto flex h-[4.75rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex shrink-0 items-center rounded-xl py-1 pr-2 transition-transform hover:scale-[1.02]"
          aria-label="Gozuru home"
        >
          <BrandLogo
            size="2xl"
            priority
            className={cn(
              "drop-shadow-sm",
              (isTransparent || isDarkMode) && "brightness-0 invert",
            )}
          />
        </Link>

        <div className="hidden flex-1 items-center justify-center lg:flex">
          <div
            className={cn(
              "flex items-center gap-1 rounded-full p-1",
              isTransparent
                ? "bg-slate-950/35 shadow-sm ring-1 ring-white/15 backdrop-blur-md"
                : isDarkMode
                  ? "bg-white/10 ring-1 ring-white/10"
                  : "bg-slate-100 ring-1 ring-slate-200",
            )}
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={navLinkClass(link.isActive(pathname ?? ""))}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {mounted ? (
            <button
              type="button"
              aria-label="Toggle theme"
              onClick={() => setTheme(isDarkMode ? "light" : "dark")}
              className={cn(iconButtonClass, "hidden sm:inline-flex")}
            >
              {isDarkMode ? (
                <Sun className="size-[1.125rem]" />
              ) : (
                <Moon className="size-[1.125rem]" />
              )}
            </button>
          ) : null}

          {!loading && !user ? (
            <div className="hidden items-center gap-2 lg:flex">
              <Link
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  openLandingAuthModal("login");
                }}
                className={cn(
                  "rounded-full px-5 py-2.5 text-sm font-semibold transition-colors inline-flex items-center justify-center",
                  isTransparent
                    ? "border border-white/35 bg-slate-950/30 text-white shadow-sm backdrop-blur-md hover:bg-white/15"
                    : isDarkMode
                      ? "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                      : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100",
                )}
              >
                Log in
              </Link>
              <Link
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  openLandingAuthModal("signup");
                }}
                className={cn(
                  "rounded-full px-5 py-2.5 text-sm font-semibold shadow-md transition inline-flex items-center justify-center",
                  isTransparent
                    ? "bg-white text-slate-950 shadow-black/20 hover:bg-slate-100"
                    : isDarkMode
                      ? "bg-white text-slate-950 shadow-black/20 hover:bg-slate-100"
                      : "bg-slate-950 text-white shadow-slate-950/20 hover:bg-slate-800",
                )}
              >
                Sign up
              </Link>
            </div>
          ) : null}

          {!loading && user ? (
            <div className="relative hidden lg:block" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="inline-flex rounded-full"
                aria-label="Open profile menu"
              >
                <Avatar
                  size="sm"
                  className={cn(
                    "ring-1",
                    isDarkMode ? "ring-white/20" : "ring-slate-300/80",
                  )}
                >
                  <AvatarFallback
                    className={cn(
                      "font-semibold",
                      isDarkMode
                        ? "bg-white/10 text-white"
                        : "bg-slate-100 text-slate-800",
                    )}
                  >
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
              </button>
              {profileMenuOpen ? (
                <div className="absolute right-0 mt-3 w-44 rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-xl ring-1 ring-border/80 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                  <Link
                    href="/account/profile"
                    className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted/70 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-muted/70 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      logout();
                    }}
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className={cn(iconButtonClass, "lg:hidden")}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* mobile slide-over menu */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-72 max-w-[80%] transform border-l border-slate-200 bg-white p-5 text-sm text-slate-950 shadow-xl transition-transform duration-300 backdrop-blur-sm dark:border-white/10 dark:bg-slate-950 dark:text-white ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        } lg:hidden`}
      >
        <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4 dark:border-white/10">
          <BrandLogo size="2xl" />
          <button
            type="button"
            onClick={closeMobile}
            className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-950 hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            aria-label="Close navigation menu"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="space-y-1 text-slate-950 dark:text-white" aria-label="Mobile navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                link.isActive(pathname ?? "")
                  ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                  : "hover:bg-slate-100 dark:hover:bg-white/10",
              )}
              onClick={closeMobile}
            >
              {link.label}
            </Link>
          ))}

          {!loading && !user ? (
            <div
              className="mt-6 space-y-3 border-t border-border pt-4"
            >
              <Link
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  closeMobile();
                  openLandingAuthModal("login");
                }}
              className="block w-full rounded-full border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-100 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
              >
                Log in
              </Link>
              <Link
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  closeMobile();
                  openLandingAuthModal("signup");
                }}
                className="block w-full rounded-full bg-slate-950 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                Sign up
              </Link>
            </div>
          ) : null}

          {!loading && user ? (
            <div className="mt-6 space-y-2 border-t border-border pt-4">
              <Link
                href="/account/profile"
                onClick={closeMobile}
                className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted/70"
              >
                Profile
              </Link>
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted/70"
                onClick={() => {
                  closeMobile();
                  logout();
                }}
              >
                Logout
              </button>
            </div>
          ) : null}
        </nav>
      </div>

    </header>
  );
}


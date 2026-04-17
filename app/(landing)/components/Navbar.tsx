"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobile = () => setMobileOpen(false);
  const isHome = pathname === "/";
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
        isHome && !scrolled
          ? "border-transparent bg-transparent text-white"
          : "bg-white/95 text-zinc-900 border-zinc-200/80 dark:bg-black/25 dark:text-zinc-50 dark:border-zinc-800/80",
        scrolled && "backdrop-blur-md shadow-sm"
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 text-sm sm:text-[15px] md:text-md lg:px-6">
        <Link href="/" className="flex items-center gap-1">
          <span className="rounded-full bg-orange-500 px-2 py-1 text-md  text-white">
            Go
          </span>
          <span className="text-md  font-semibold tracking-tight">Zuru</span>
        </Link>

        <div className="flex items-center gap-3 font-medium">
          {/* desktop links */}
          <div className="hidden items-center gap-6 lg:flex">
          <Link href="/" className="hover:text-orange-500">
              Home
            </Link>
            <Link href="/experiences" className="hover:text-orange-500">
              Experiences
            </Link>
            <Link href="/about" className="hover:text-orange-500">
              How it works
            </Link>
            <Link href="/hosts" className="hover:text-orange-500">
              Become a host
            </Link>
          </div>

          {/* theme toggle (always visible) */}
          {/* <ThemeToggle /> */}

          {mounted && (
            <button
              type="button"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={cn(
                "rounded-full p-2 mx-2 transition-colors border",
                isHome && !scrolled
                  ? "border-white/60 bg-white/5 text-white hover:bg-white/10"
                  : cn(
                      "border-zinc-300/70 bg-white/80 text-zinc-800 hover:bg-zinc-100",
                      "dark:border-zinc-700/80 dark:bg-zinc-900/80 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    )
              )}
            >
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </button>
          )}

          {/* desktop auth buttons */}
          <Link
            href="/auth/login"
            className="hidden rounded-full border border-orange-400 bg-white px-6 py-2 text-sm text-orange-600 shadow-sm transition hover:border-orange-500 hover:text-orange-500 dark:bg-black/40 dark:text-orange-300 dark:border-orange-700 lg:inline-block"
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="hidden rounded-full bg-orange-500 px-6 py-2 text-sm text-white shadow-sm transition hover:bg-orange-600 lg:inline-block"
          >
            Sign up
          </Link>

          {/* mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-sm lg:hidden transition-colors",
              isHome && !scrolled
                ? "border-white/60 bg-black/40 text-white hover:bg-black/60"
                : "border-zinc-200 bg-white/80 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            )}
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
        className={`fixed inset-y-0 right-0 z-50 w-72 max-w-[80%] transform border-l p-5 text-sm shadow-xl transition-transform duration-300 backdrop-blur-sm bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50 ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        } lg:hidden`}
      >
        <div className="mb-6 flex items-center justify-between bg-">
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2 py-1 text-base font-semibold bg-orange-500 text-white dark:bg-orange-400 dark:text-zinc-900">
              Go
            </span>
            <span className="text-base font-semibold tracking-tight ">
              Zuru
            </span>
          </div>
          <button
            type="button"
            onClick={closeMobile}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-zinc-700 hover:bg-zinc-100 border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close navigation menu"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav
          className="space-y-2 text-zinc-800 dark:text-zinc-100"
        >
          <Link
            href="#experiences"
            className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            onClick={closeMobile}
          >
            Experiences
          </Link>
          <Link
            href="/how-it-works"
            className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            onClick={closeMobile}
          >
            How it works
          </Link>
          <Link
            href="#hosts"
            className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            onClick={closeMobile}
          >
            Become a host
          </Link>

          <div
            className="mt-6 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700"
          >
            <button
              className="w-full rounded-full border border-orange-300 px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-orange-400 hover:text-orange-500 dark:border-zinc-600 dark:text-orange-100 dark:hover:border-orange-400 dark:hover:text-orange-300"
            >
              Log in
            </button>
            <button className="w-full rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-400">
              Sign up
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}


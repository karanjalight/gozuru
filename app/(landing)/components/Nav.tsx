"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "#experts", label: "Experts" },
  { href: "#experiences", label: "Experiences" },
  { href: "#pricing", label: "Pricing" },
  { href: "#resources", label: "Resources" },
  { href: "#contact", label: "Contact" },
];

export function Nav() {
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  const isTransparent = !scrolled;
  const isHome = pathname === "/";
  const isDark = mounted && resolvedTheme === "dark";
  // At top on home: light mode = dark text so nav is visible on light hero; dark mode = white text
  const navLightAtTop = isTransparent && isHome && !isDark;
  const navDarkAtTop = isTransparent && isHome && isDark;

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        navDarkAtTop &&
          "border-b border-white/10 bg-transparent text-white",
        navLightAtTop &&
          "border-b border-foreground/15 bg-background/60 text-foreground backdrop-blur-sm",
        !(isTransparent && isHome) &&
          "border-b border-border bg-background/80 text-foreground backdrop-blur-md"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-lg font-semibold tracking-tight"
          aria-label="Gozuru home"
        >
          <span
            className={cn(
              navDarkAtTop ? "text-white" : "text-primary"
            )}
          >
            Go
          </span>
          <span
            className={cn(
              navDarkAtTop ? "text-amber-400" : "text-amber-600"
            )}
          >
            zuru
          </span>
        </Link>

       <div className="flex items-center gap-4">
       <ul className=" flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:opacity-90",
                    navDarkAtTop && "text-white/95 hover:text-white",
                    navLightAtTop && "text-foreground/90 hover:text-foreground",
                    !(isTransparent && isHome) &&
                      "text-foreground/80 hover:text-foreground",
                    isActive && !navDarkAtTop && "text-primary font-semibold"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className="h-5 w-px bg-current opacity-20"
            aria-hidden
          />
          {mounted && (
            <button
              type="button"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={cn(
                "rounded-full p-2 transition-colors",
                navDarkAtTop && "text-white/90 hover:bg-white/10",
                navLightAtTop && "text-foreground hover:bg-foreground/10",
                !(isTransparent && isHome) && "text-foreground hover:bg-muted"
              )}
            >
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </button>
          )}
          <div
            className="h-5 w-px bg-current opacity-20"
            aria-hidden
          />
          <Link
            href="/sign-in"
            className={cn(
              "text-sm font-medium transition-colors hover:opacity-90",
              navDarkAtTop && "text-white/95 hover:text-white",
              (navLightAtTop || !(isTransparent && isHome)) &&
                "text-foreground/80 hover:text-foreground"
            )}
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-full px-5 text-sm font-semibold shadow-md transition-all duration-300 hover:scale-[1.03] hover:shadow-lg",
              navDarkAtTop && "bg-white text-primary hover:bg-white/95",
              navLightAtTop && "bg-primary text-primary-foreground hover:bg-primary/90",
              !(isTransparent && isHome) &&
                "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            Sign Up
          </Link>
        </div>
       </div>
      </div>
    </nav>
  );
}

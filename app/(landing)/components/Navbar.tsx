"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Menu, X, Sun, Moon, Eye, EyeOff } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { authModalStyles as auth } from "@/components/auth/auth-modal-styles";

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
] as const;

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user, loading, login, signup, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupLastName, setSignupLastName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

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
  const userInitial = user?.email?.trim().charAt(0).toUpperCase() || "U";

  const navLinkClass = (active: boolean) =>
    cn(
      "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
      isTransparent
        ? active
          ? "bg-white/20 text-white"
          : "text-white/85 hover:bg-white/10 hover:text-white"
        : active
          ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
          : "text-foreground/80 hover:bg-muted/60 hover:text-foreground",
    );

  const iconButtonClass = cn(
    "inline-flex size-10 items-center justify-center rounded-full border transition-colors",
    isTransparent
      ? "border-white/40 bg-white/10 text-white hover:bg-white/20"
      : "border-border bg-background text-foreground hover:bg-muted/70",
  );

  useEffect(() => {
    if (user) {
      setAuthModalOpen(false);
      setAuthError(null);
      setAuthSuccess(null);
    }
  }, [user]);

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

  const openAuthModal = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthError(null);
    setAuthSuccess(null);
    setAuthModalOpen(true);
  };

  const switchAuthMode = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthError(null);
    setAuthSuccess(null);
  };

  const onLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if (!loginEmail.trim()) {
      setAuthError("Please enter your email.");
      return;
    }
    if (!loginPassword) {
      setAuthError("Please enter your password.");
      return;
    }
    setAuthSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed.";
      setAuthError(
        message.includes("Invalid login credentials")
          ? "Invalid email or password."
          : message,
      );
    } finally {
      setAuthSubmitting(false);
    }
  };

  const onSignupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if (!signupFirstName.trim() || !signupLastName.trim()) {
      setAuthError("Please provide your first and last name.");
      return;
    }
    if (signupPassword.length < 8) {
      setAuthError("Password must be at least 8 characters.");
      return;
    }
    if (signupPassword !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }
    if (!acceptTerms) {
      setAuthError("You must accept the terms to continue.");
      return;
    }
    setAuthSubmitting(true);
    try {
      const result = await signup(signupEmail, signupPassword, {
        firstName: signupFirstName,
        lastName: signupLastName,
      });
      if (result.needsEmailVerification) {
        setAuthSuccess("Account created. Check your email to verify your account.");
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign up failed.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
        isTransparent
          ? "border-transparent bg-transparent text-white"
          : "border-border/70 bg-background/95 text-foreground shadow-sm backdrop-blur-md"
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
            className={cn("drop-shadow-sm", isTransparent && "brightness-0 invert")}
          />
        </Link>

        <div className="hidden flex-1 items-center justify-center lg:flex">
          <div
            className={cn(
              "flex items-center gap-1 rounded-full p-1",
              isTransparent ? "bg-white/10" : "bg-muted/40 dark:bg-muted/30",
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
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={cn(iconButtonClass, "hidden sm:inline-flex")}
            >
              {theme === "dark" ? (
                <Sun className="size-[1.125rem]" />
              ) : (
                <Moon className="size-[1.125rem]" />
              )}
            </button>
          ) : null}

          {!loading && !user ? (
            <div className="hidden items-center gap-2 lg:flex">
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className={cn(
                  "rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
                  isTransparent
                    ? "border border-white/50 bg-white/10 text-white hover:bg-white/20"
                    : "border border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-600/50 dark:text-orange-300 dark:hover:bg-orange-500/10",
                )}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => openAuthModal("signup")}
                className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-600"
              >
                Sign up
              </button>
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
                <Avatar size="sm" className="ring-1 ring-orange-300/70">
                  <AvatarFallback className="bg-orange-100 font-semibold text-orange-700">
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
        className={`fixed inset-y-0 right-0 z-50 w-72 max-w-[80%] transform border-l border-border bg-background p-5 text-sm text-foreground shadow-xl transition-transform duration-300 backdrop-blur-sm ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        } lg:hidden`}
      >
        <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <BrandLogo size="2xl" />
          <button
            type="button"
            onClick={closeMobile}
            className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-muted/30 text-foreground hover:bg-muted/60"
            aria-label="Close navigation menu"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="space-y-1 text-foreground" aria-label="Mobile navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                link.isActive(pathname ?? "")
                  ? "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300"
                  : "hover:bg-muted/70",
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
                  openAuthModal("login");
                }}
                className="block w-full rounded-full border border-orange-300 px-4 py-2 text-center text-sm font-medium text-foreground shadow-sm transition hover:border-orange-400 hover:text-orange-500 dark:border-orange-500/40 dark:hover:text-orange-300"
              >
                Log in
              </Link>
              <Link
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  closeMobile();
                  openAuthModal("signup");
                }}
                className="block w-full rounded-full bg-orange-500 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-orange-400"
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

      {authModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className={auth.panel}>
            <div className="mb-5 flex justify-center">
              <BrandLogo size="lg" />
            </div>
            <div className="mb-4 flex items-center justify-between">
              <div className={auth.tabGroup}>
                <button
                  type="button"
                  onClick={() => switchAuthMode("login")}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium",
                    authMode === "login" ? auth.tabActive : auth.tabInactive,
                  )}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => switchAuthMode("signup")}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium",
                    authMode === "signup" ? auth.tabActive : auth.tabInactive,
                  )}
                >
                  Sign up
                </button>
              </div>
              <button
                type="button"
                onClick={() => setAuthModalOpen(false)}
                className={auth.closeButton}
                aria-label="Close auth modal"
              >
                <X className="size-4" />
              </button>
            </div>

            {authMode === "login" ? (
              <form className="space-y-4" onSubmit={onLoginSubmit}>
                <div className="space-y-2">
                  <label className={auth.label}>
                    Email
                  </label>
                  <Input
                    type="email"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    className={auth.input}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className={auth.label}>
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      className={cn(auth.input, "pr-10")}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      className={auth.togglePassword}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="h-10 w-full rounded-full bg-orange-500 text-white hover:bg-orange-600"
                  disabled={authSubmitting}
                >
                  {authSubmitting ? "Logging in..." : "Log in"}
                </Button>
              </form>
            ) : (
              <form className="space-y-3" onSubmit={onSignupSubmit}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    value={signupFirstName}
                    onChange={(event) => setSignupFirstName(event.target.value)}
                    placeholder="First name"
                    className={auth.input}
                    required
                  />
                  <Input
                    value={signupLastName}
                    onChange={(event) => setSignupLastName(event.target.value)}
                    placeholder="Last name"
                    className={auth.input}
                    required
                  />
                </div>
                <Input
                  type="email"
                  value={signupEmail}
                  onChange={(event) => setSignupEmail(event.target.value)}
                  placeholder="Email"
                  className={auth.input}
                  required
                />
                <div className="relative">
                  <Input
                    type={showSignupPassword ? "text" : "password"}
                    value={signupPassword}
                    onChange={(event) => setSignupPassword(event.target.value)}
                    placeholder="Password"
                    className={cn(auth.input, "pr-10")}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword((prev) => !prev)}
                    className={auth.togglePassword}
                  >
                    {showSignupPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm password"
                    className={cn(auth.input, "pr-10")}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className={auth.togglePassword}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                <label className={auth.termsLabel}>
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(event) => setAcceptTerms(event.target.checked)}
                    className={auth.checkbox}
                    required
                  />
                  <span>I agree to the Terms of Use and Privacy Policy.</span>
                </label>
                <Button
                  type="submit"
                  className="h-10 w-full rounded-full bg-orange-500 text-white hover:bg-orange-600"
                  disabled={authSubmitting}
                >
                  {authSubmitting ? "Creating account..." : "Create account"}
                </Button>
              </form>
            )}

            {authError ? (
              <p className={auth.error}>{authError}</p>
            ) : null}
            {authSuccess ? (
              <p className={auth.success}>{authSuccess}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}


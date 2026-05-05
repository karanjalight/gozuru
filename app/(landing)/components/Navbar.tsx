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

// import { ThemeToggle } from "./ThemeToggle";

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
  const userInitial = user?.email?.trim().charAt(0).toUpperCase() || "U";

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
        isHome && !scrolled
          ? "border-transparent bg-transparent text-white"
          : "border-border/80 bg-background/95 text-foreground",
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
                  : "border-border bg-background text-foreground hover:bg-muted/70"
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
          {!loading && !user ? (
            <>
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="hidden rounded-full border border-orange-400 bg-white px-6 py-2 text-sm text-orange-600 shadow-sm transition hover:border-orange-500 hover:text-orange-500 dark:bg-black/40 dark:text-orange-300 dark:border-orange-700 lg:inline-block"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => openAuthModal("signup")}
                className="hidden rounded-full bg-orange-500 px-6 py-2 text-sm text-white shadow-sm transition hover:bg-orange-600 lg:inline-block"
              >
                Sign up
              </button>
            </>
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
                <div className="absolute right-0 mt-3 w-44 rounded-xl border border-border bg-background p-2 shadow-lg">
                  <Link
                    href="/account/profile"
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-muted/70"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/70"
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

          {/* mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-sm lg:hidden transition-colors",
              isHome && !scrolled
                ? "border-white/60 bg-black/40 text-white hover:bg-black/60"
                : "border-border bg-background text-foreground hover:bg-muted/70"
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
        className={`fixed inset-y-0 right-0 z-50 w-72 max-w-[80%] transform border-l border-border bg-background p-5 text-sm text-foreground shadow-xl transition-transform duration-300 backdrop-blur-sm ${
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-muted/70"
            aria-label="Close navigation menu"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav
          className="space-y-2 text-foreground"
        >
          <Link
            href="#experiences"
            className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted/70"
            onClick={closeMobile}
          >
            Experiences
          </Link>
          <Link
            href="/how-it-works"
            className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted/70"
            onClick={closeMobile}
          >
            How it works
          </Link>
          <Link
            href="#hosts"
            className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted/70"
            onClick={closeMobile}
          >
            Become a host
          </Link>

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
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="inline-flex rounded-full border border-border bg-muted/20 p-1">
                <button
                  type="button"
                  onClick={() => switchAuthMode("login")}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm",
                    authMode === "login"
                      ? "bg-orange-500 text-white"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => switchAuthMode("signup")}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm",
                    authMode === "signup"
                      ? "bg-orange-500 text-white"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Sign up
                </button>
              </div>
              <button
                type="button"
                onClick={() => setAuthModalOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-muted/70"
                aria-label="Close auth modal"
              >
                <X className="size-4" />
              </button>
            </div>

            {authMode === "login" ? (
              <form className="space-y-4" onSubmit={onLoginSubmit}>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    className="h-10 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      className="h-10 rounded-xl pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-muted-foreground"
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
                    className="h-10 rounded-xl"
                    required
                  />
                  <Input
                    value={signupLastName}
                    onChange={(event) => setSignupLastName(event.target.value)}
                    placeholder="Last name"
                    className="h-10 rounded-xl"
                    required
                  />
                </div>
                <Input
                  type="email"
                  value={signupEmail}
                  onChange={(event) => setSignupEmail(event.target.value)}
                  placeholder="Email"
                  className="h-10 rounded-xl"
                  required
                />
                <div className="relative">
                  <Input
                    type={showSignupPassword ? "text" : "password"}
                    value={signupPassword}
                    onChange={(event) => setSignupPassword(event.target.value)}
                    placeholder="Password"
                    className="h-10 rounded-xl pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-muted-foreground"
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
                    className="h-10 rounded-xl pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-muted-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(event) => setAcceptTerms(event.target.checked)}
                    className="mt-0.5 size-4 rounded border border-input"
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
              <p className="mt-3 text-center text-xs text-red-500">{authError}</p>
            ) : null}
            {authSuccess ? (
              <p className="mt-3 text-center text-xs text-emerald-600">{authSuccess}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}


"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function LandingSignupPrompt() {
  const { user, loading, login, signup } = useAuth();
  const [open, setOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
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
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || user) return;

    const timer = window.setTimeout(() => {
      setOpen(true);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [loading, user]);

  useEffect(() => {
    if (user) {
      setOpen(false);
      setError(null);
      setSuccessMessage(null);
    }
  }, [user]);

  const onLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!loginEmail.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (!loginPassword) {
      setError("Please enter your password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : "Login failed.";
      setError(
        message.includes("Invalid login credentials")
          ? "Invalid email or password."
          : message,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onSignupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!signupFirstName.trim() || !signupLastName.trim()) {
      setError("Please provide your first and last name.");
      return;
    }
    if (signupPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (signupPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!acceptTerms) {
      setError("You must accept the terms to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signup(signupEmail, signupPassword, {
        firstName: signupFirstName,
        lastName: signupLastName,
      });
      if (result.needsEmailVerification) {
        setSuccessMessage("Account created. Check your email to verify your account.");
      }
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Sign up failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || user) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="landing-auth-title"
        className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="inline-flex rounded-full border border-border bg-muted/20 p-1">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
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
              onClick={() => setAuthMode("signup")}
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
            onClick={() => setOpen(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-muted/70"
            aria-label="Close auth modal"
          >
            <X className="size-4" />
          </button>
        </div>

        <h2 id="landing-auth-title" className="text-lg font-semibold tracking-tight">
          Join Gozuru
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign up or log in to continue.
        </p>

        {authMode === "login" ? (
          <form className="mt-5 space-y-4" onSubmit={onLoginSubmit}>
            <Input
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              placeholder="Email"
              className="h-10 rounded-xl"
              required
            />
            <div className="relative">
              <Input
                type={showLoginPassword ? "text" : "password"}
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Password"
                className="h-10 rounded-xl pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-muted-foreground"
              >
                {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <Button
              type="submit"
              className="h-10 w-full rounded-full bg-orange-500 text-white hover:bg-orange-600"
              disabled={submitting}
            >
              {submitting ? "Logging in..." : "Log in"}
            </Button>
          </form>
        ) : (
          <form className="mt-5 space-y-3" onSubmit={onSignupSubmit}>
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
                {showSignupPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
              disabled={submitting}
            >
              {submitting ? "Creating account..." : "Create account"}
            </Button>
          </form>
        )}

        {error ? <p className="mt-3 text-center text-xs text-red-500">{error}</p> : null}
        {successMessage ? (
          <p className="mt-3 text-center text-xs text-green-600">{successMessage}</p>
        ) : null}
      </div>
    </div>
  );
}

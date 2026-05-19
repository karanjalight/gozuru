"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { authModalStyles as auth } from "@/components/auth/auth-modal-styles";

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
        className={auth.panel}
      >
        <div className="mb-5 flex justify-center">
          <BrandLogo size="lg" />
        </div>
        <div className="mb-4 flex items-center justify-between">
          <div className={auth.tabGroup}>
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium",
                authMode === "login" ? auth.tabActive : auth.tabInactive,
              )}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("signup")}
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
            onClick={() => setOpen(false)}
            className={auth.closeButton}
            aria-label="Close auth modal"
          >
            <X className="size-4" />
          </button>
        </div>

        <h2 id="landing-auth-title" className={auth.title}>
          Join Gozuru
        </h2>
        <p className={auth.subtitle}>
          Sign up or log in to continue.
        </p>

        {authMode === "login" ? (
          <form className="mt-5 space-y-4" onSubmit={onLoginSubmit}>
            <Input
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              placeholder="Email"
              className={auth.input}
              required
            />
            <div className="relative">
              <Input
                type={showLoginPassword ? "text" : "password"}
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Password"
                className={cn(auth.input, "pr-10")}
                required
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword((prev) => !prev)}
                className={auth.togglePassword}
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
                {showSignupPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
              disabled={submitting}
            >
              {submitting ? "Creating account..." : "Create account"}
            </Button>
          </form>
        )}

        {error ? <p className={auth.error}>{error}</p> : null}
        {successMessage ? (
          <p className={auth.success}>{successMessage}</p>
        ) : null}
      </div>
    </div>
  );
}

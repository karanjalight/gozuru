"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Lock, Mail, MapPin, Phone, User, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LandingSignupPrompt() {
  const router = useRouter();
  const { user, loading, signup } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [password, setPassword] = useState("");
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

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (!phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    if (!location.trim()) {
      setError("Please enter your location.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    const [firstName, ...rest] = name.trim().split(/\s+/);
    const lastName = rest.join(" ");

    setSubmitting(true);
    try {
      const result = await signup(email, password, {
        firstName,
        lastName: lastName || undefined,
        phone,
        location,
      });

      if (result.needsEmailVerification) {
        setSuccessMessage("Account created. Check your email to verify your account.");
      } else {
        setOpen(false);
        router.push("/account/experiences");
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
        aria-labelledby="landing-signup-title"
        className="relative w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Close sign up prompt"
        >
          <X className="size-4" />
        </button>

        <h2 id="landing-signup-title" className="text-xl font-semibold tracking-tight">
          Join Gozuru
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign up to explore experiences and connect with local experts.
        </p>

        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Full name"
              className="h-10 rounded-xl pl-9"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email address"
              className="h-10 rounded-xl pl-9"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="tel"
              placeholder="Phone number"
              className="h-10 rounded-xl pl-9"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
          </div>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Location"
              className="h-10 rounded-xl pl-9"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              required
            />
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Password"
              className="h-10 rounded-xl pl-9"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            className="mt-1 h-10 w-full rounded-full bg-orange-500 text-sm font-semibold text-white hover:bg-orange-600"
            disabled={submitting}
          >
            {submitting ? "Creating account..." : "Sign up"}
          </Button>

          {error ? <p className="text-center text-xs text-red-500">{error}</p> : null}
          {successMessage ? (
            <p className="text-center text-xs text-green-600">{successMessage}</p>
          ) : null}
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-semibold text-orange-500">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

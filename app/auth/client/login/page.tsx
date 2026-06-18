"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ClientAuthHeader,
  clientAuthInputClassName,
} from "@/components/auth/ClientAuthShell";
import { resolveClientPostAuthPath } from "@/lib/affiliate/enroll";
import { supabase } from "@/lib/supabase/client";

export default function ClientLoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      void resolveClientPostAuthPath(user.metadata.role).then((path) => {
        router.replace(path);
      });
    }
  }, [loading, router, user]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password);
      const { data } = await supabase.auth.getUser();
      const role =
        typeof data.user?.user_metadata?.role === "string"
          ? data.user.user_metadata.role
          : undefined;
      router.push(await resolveClientPostAuthPath(role));
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

  return (
    <>
      <ClientAuthHeader
        mode="login"
        title="Welcome Back"
        subtitle="Sign in to continue to your account"
      />

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email address
          </label>
          <input
            id="email"
            type="email"
            placeholder="xyz@xyz.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={clientAuthInputClassName}
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <Link
              href="/auth/login"
              className="text-xs font-medium text-orange-500 transition hover:text-orange-600"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`${clientAuthInputClassName} pr-11`}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="h-12 w-full rounded-xl bg-orange-500 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Signing in..." : "Sign In"}
        </button>

        {error ? <p className="text-center text-sm text-red-500">{error}</p> : null}
      </form>
    </>
  );
}

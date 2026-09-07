"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ClientAuthHeader,
  clientAuthInputClassName,
} from "@/components/auth/ClientAuthShell";

export default function ClientForgotPasswordPage() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Could not send reset link.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ClientAuthHeader
        mode="login"
        title="Reset your password"
        subtitle="Enter your email and we'll send you a link to reset it"
      />

      {sent ? (
        <div className="mt-8 space-y-6">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
            <Mail className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-emerald-950">Check your email</p>
              <p className="mt-1 text-xs text-emerald-800/80">
                If an account exists for <span className="font-medium">{email}</span>, a
                password reset link is on its way.
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-slate-500">
            <Link
              href="/auth/client/login"
              className="font-semibold text-orange-500 transition hover:text-orange-600"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      ) : (
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

          <button
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-xl bg-orange-500 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Sending..." : "Send reset link"}
          </button>

          {error ? <p className="text-center text-sm text-red-500">{error}</p> : null}

          <p className="text-center text-sm text-slate-500">
            Remember your password?{" "}
            <Link
              href="/auth/client/login"
              className="font-semibold text-orange-500 transition hover:text-orange-600"
            >
              Sign in
            </Link>
          </p>
        </form>
      )}
    </>
  );
}

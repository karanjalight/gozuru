"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ClientAuthHeader,
  ClientAuthReferralNotice,
  clientAuthInputClassName,
} from "@/components/auth/ClientAuthShell";
import {
  enrollAsAffiliate,
  getClientPostSignupPath,
  setPendingAffiliateEnrollment,
} from "@/lib/affiliate/enroll";
import {
  attributeStoredReferral,
  captureReferralFromUrl,
  getActiveReferralCode,
} from "@/lib/affiliate/referral";
import { getAccountHomePath } from "@/lib/auth/useAccountRole";
import { cn } from "@/lib/utils";

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export default function ClientSignupPage() {
  const router = useRouter();
  const { signup, user, loading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [signUpAsAffiliate, setSignUpAsAffiliate] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    captureReferralFromUrl();
    setReferralCode(getActiveReferralCode());
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace(getAccountHomePath(user.metadata.role));
    }
  }, [loading, router, user]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const { firstName, lastName } = splitName(name);
    if (!firstName.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!acceptTerms) {
      setError("You must accept the terms and conditions to continue.");
      return;
    }

    const activeReferralCode = getActiveReferralCode();
    const destination = getClientPostSignupPath(signUpAsAffiliate);

    setSubmitting(true);
    try {
      const result = await signup(email, password, {
        firstName,
        lastName,
        role: "client",
        phone: phone.trim() || undefined,
        referralCode: activeReferralCode ?? undefined,
      });

      if (result.needsEmailVerification) {
        if (signUpAsAffiliate) {
          setPendingAffiliateEnrollment();
        }
        setSuccessMessage(
          signUpAsAffiliate
            ? "Account created. Verify your email to finish — we'll set up your affiliate dashboard when you sign in."
            : activeReferralCode
              ? "Account created. Check your email to verify your account."
              : "Account created. Check your email to verify your account.",
        );
      } else {
        await attributeStoredReferral();
        if (signUpAsAffiliate) {
          await enrollAsAffiliate();
        }
        router.push(destination);
      }
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Sign up failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ClientAuthHeader
        mode="signup"
        title="Get Started Now"
        subtitle="Enter your credentials to create your account"
      />

      {referralCode ? <ClientAuthReferralNotice /> : null}

      <form className={cn("space-y-5", referralCode ? "mt-6" : "mt-8")} onSubmit={onSubmit}>
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-slate-700">
            Full name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={clientAuthInputClassName}
            autoComplete="name"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email address
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={clientAuthInputClassName}
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium text-slate-700">
            Phone number{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="+254 712 345 678"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={clientAuthInputClassName}
            autoComplete="tel"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`${clientAuthInputClassName} pr-11`}
              autoComplete="new-password"
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

        <div className="space-y-3">
          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input
              id="acceptTerms"
              type="checkbox"
              checked={acceptTerms}
              onChange={(event) => setAcceptTerms(event.target.checked)}
              className="mt-0.5 size-4 rounded border-slate-300 text-orange-500 focus:ring-orange-200"
              required
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="font-medium text-orange-500 hover:text-orange-600">
                Terms and Conditions
              </Link>
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input
              id="signUpAsAffiliate"
              type="checkbox"
              checked={signUpAsAffiliate}
              onChange={(event) => setSignUpAsAffiliate(event.target.checked)}
              className="mt-0.5 size-4 rounded border-slate-300 text-orange-500 focus:ring-orange-200"
            />
            <span>
              Sign up as an affiliate and earn 5% on referrals
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="h-12 w-full rounded-xl bg-orange-500 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Creating account..." : "Sign Up"}
        </button>

        {error ? <p className="text-center text-sm text-red-500">{error}</p> : null}
        {successMessage ? (
          <p className="text-center text-sm text-emerald-600">{successMessage}</p>
        ) : null}
      </form>
    </>
  );
}

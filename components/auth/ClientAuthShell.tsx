"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { appendReferralQuery } from "@/lib/affiliate/referral";
import { cn } from "@/lib/utils";

export const CLIENT_AUTH_SIGNUP_IMAGE =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600&q=80";

export const CLIENT_AUTH_LOGIN_IMAGE =
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1600&q=80";

export const clientAuthInputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-border dark:bg-background dark:focus:ring-orange-500/20";

type ClientAuthMode = "login" | "signup";

const panelCopy: Record<
  ClientAuthMode,
  { alt: string; eyebrow: string; headline: string; body: string }
> = {
  signup: {
    alt: "People collaborating and connecting in a team meeting",
    eyebrow: "Join the community",
    headline: "Real people.\nReal experiences.",
    body: "Discover experts, book meaningful moments, and explore the world through human connection.",
  },
  login: {
    alt: "Professional expert in a warm, approachable portrait",
    eyebrow: "Welcome back",
    headline: "Pick up where\nyou left off.",
    body: "Your bookings, messages, and affiliate earnings are waiting for you.",
  },
};

export function ClientAuthHeader({
  title,
  subtitle,
  mode,
}: {
  title: string;
  subtitle: string;
  mode: ClientAuthMode;
}) {
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref");
  const alternateHref =
    mode === "login"
      ? appendReferralQuery("/auth/client/signup", referralCode)
      : appendReferralQuery("/auth/client/login", referralCode);
  const alternateLabel = mode === "login" ? "Create account" : "Sign in";

  return (
    <div>
      <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-white">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{subtitle}</p>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        {mode === "login" ? "New to Gozuru?" : "Already have an account?"}{" "}
        <Link
          href={alternateHref}
          className="font-semibold text-orange-500 transition hover:text-orange-600"
        >
          {alternateLabel}
        </Link>
      </p>
    </div>
  );
}

export function ClientAuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeMode: ClientAuthMode = pathname?.includes("/signup") ? "signup" : "login";
  const sideImage =
    activeMode === "signup" ? CLIENT_AUTH_SIGNUP_IMAGE : CLIENT_AUTH_LOGIN_IMAGE;
  const copy = panelCopy[activeMode];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-background dark:text-foreground">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Form column */}
        <div className="flex min-h-screen flex-col px-6 py-6 sm:px-10 lg:px-14 lg:py-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex shrink-0" aria-label="Gozuru home">
              <BrandLogo size="lg" priority />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ArrowLeft className="size-4" />
              Home
            </Link>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10 lg:py-12">
            {children}
          </div>
        </div>

        {/* Image column */}
        <div className="relative hidden lg:block">
          <div className="sticky top-0 h-screen p-6 pl-0">
            <div className="relative h-full overflow-hidden rounded-[2rem] shadow-2xl shadow-slate-900/20">
              <Image
                src={sideImage}
                alt={copy.alt}
                fill
                priority
                className="object-cover"
                sizes="50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/10" />
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-transparent to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-10 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
                  {copy.eyebrow}
                </p>
                <h2 className="mt-4 whitespace-pre-line text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
                  {copy.headline}
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-200">{copy.body}</p>

                <div className="mt-8 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {["A", "B", "C"].map((initial) => (
                      <span
                        key={initial}
                        className="inline-flex size-9 items-center justify-center rounded-full border-2 border-slate-950/50 bg-orange-500 text-xs font-bold text-white"
                      >
                        {initial}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-slate-300">
                    Trusted by curious travelers across Kenya
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ClientAuthReferralNotice() {
  return (
    <div className="mt-6 flex items-center gap-3 rounded-2xl border border-orange-200/80 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3.5 dark:border-orange-500/20 dark:from-orange-500/10 dark:to-amber-500/5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
        ✦
      </span>
      <div>
        <p className="text-sm font-semibold text-orange-950 dark:text-orange-100">
          You&apos;re invited
        </p>
        <p className="text-xs text-orange-800/80 dark:text-orange-200/80">
          Join Gozuru through a friend&apos;s referral link.
        </p>
      </div>
    </div>
  );
}

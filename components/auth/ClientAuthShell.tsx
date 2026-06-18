"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { appendReferralQuery } from "@/lib/affiliate/referral";
import { cn } from "@/lib/utils";

export const CLIENT_AUTH_SIGNUP_IMAGE =
  "https://images.pexels.com/photos/7149147/pexels-photo-7149147.jpeg";

export const CLIENT_AUTH_LOGIN_IMAGE =
  "https://images.pexels.com/photos/7551434/pexels-photo-7551434.jpeg";

export const clientAuthInputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

type ClientAuthMode = "login" | "signup";

const toggleItems: { mode: ClientAuthMode; href: string; label: string }[] = [
  { mode: "login", href: "/auth/client/login", label: "Sign-in" },
  { mode: "signup", href: "/auth/client/signup", label: "Sign-up" },
];

export function ClientAuthHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
  mode?: ClientAuthMode;
}) {
  return (
    <div>
      <Link href="/" className="inline-flex" aria-label="Gozuru home">
        <BrandLogo size="lg" priority />
      </Link>
      <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

export function ClientAuthReferralNotice() {
  return (
    <div className="mt-6 flex items-center gap-3 rounded-2xl border border-orange-200/80 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
        ✦
      </span>
      <div>
        <p className="text-sm font-semibold text-orange-950">You&apos;re invited</p>
        <p className="text-xs text-orange-800/80">
          Join Gozuru through a friend&apos;s referral link.
        </p>
      </div>
    </div>
  );
}

export function ClientAuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref");
  const activeMode: ClientAuthMode = pathname?.includes("/signup") ? "signup" : "login";
  const sideImage =
    activeMode === "signup" ? CLIENT_AUTH_SIGNUP_IMAGE : CLIENT_AUTH_LOGIN_IMAGE;
  const sideImageAlt =
    activeMode === "signup"
      ? "People collaborating and connecting in a team meeting"
      : "Professional expert in a warm, approachable portrait";

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <div className="flex flex-col px-6 py-8 sm:px-10 lg:px-14 lg:py-10">
          <div
            className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 p-1"
            role="tablist"
            aria-label="Authentication mode"
          >
            {toggleItems.map((item) => {
              const active = activeMode === item.mode;
              const href = appendReferralQuery(item.href, referralCode);
              return (
                <Link
                  key={item.mode}
                  href={href}
                  role="tab"
                  aria-selected={active}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition",
                    active
                      ? "bg-orange-500 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
            {children}
          </div>
        </div>

        <div className="relative hidden  h-screen p-4 lg:block lg:p-0">
          <div className="relative h-full min-h-[calc(100vh-3rem)] overflow-hidden ">
            <Image
              src={sideImage}
              alt={sideImageAlt}
              fill
              priority
              className="object-cover"
              sizes="50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Globe2,
  Instagram,
  Mail,
  MapPin,
  ShieldCheck,
  Twitter,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

/** Golden-hour mountain vista — warm travel & curiosity mood */
const FOOTER_BACKGROUND_IMAGE =
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&h=1080&fit=crop&q=85";

const explore = [
  { href: "/experts", label: "Browse experts" },
  { href: "/experiences", label: "Browse experiences" },
  { href: "/#experts", label: "Featured experts" },
  { href: "/#featured-experiences", label: "Featured experiences" },
  { href: "/#how-it-works", label: "How it works" },
];

const company = [
  { href: "/about", label: "About us" },
  { href: "/about#team", label: "The team" },
  { href: "/hosts", label: "Become a host" },
  { href: "/auth/signup", label: "Create account" },
  { href: "/auth/login", label: "Sign in" },
];

const support = [
  { href: "/contact", label: "Contact support" },
  { href: "/terms", label: "Terms and conditions" },
  { href: "/about", label: "Trust and safety" },
  { href: "/hosts", label: "Host resources" },
  { href: "/experiences", label: "Booking questions" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-stone-950 text-white">
      {/* Background photo */}
      <div
        aria-hidden
        className="absolute inset-0 scale-105 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${FOOTER_BACKGROUND_IMAGE})` }}
      />

      {/* Layered overlays — warm orange + deep stone for readability */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-stone-950/98 via-orange-950/88 to-stone-900/90"
      />
      {/* <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/55 to-orange-900/25"
      /> */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(234,88,12,0.18),transparent_55%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(15,23,42,0.65),transparent_50%)]"
      />

      {/* Top accent line */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/50 to-transparent"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 border-b border-white/10 pb-12 lg:grid-cols-[1fr_0.9fr] lg:items-end">
          <div>
            <Link
              href="/"
              className="inline-flex rounded-2xl bg-white p-2 shadow-lg shadow-orange-950/30 ring-1 ring-white/20"
              aria-label="Gozuru home"
            >
              <BrandLogo size="lg" />
            </Link>
            <p className="mt-6 max-w-xl text-lg leading-8 text-orange-50/90">
              Reward your curiosity with people-led experiences, practical local
              knowledge, and conversations that go deeper than a typical tour.
            </p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <Link
                href="/experiences"
                className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-950/40 transition hover:bg-orange-400"
              >
                Explore experiences
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <div className="flex items-center gap-3">
                <p className="text-sm text-orange-50/80">
                  Or turn what you know into someone else&apos;s best afternoon.
                </p>
                <Link
                  href="/hosts"
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-orange-300/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-orange-50 backdrop-blur transition hover:border-orange-300/50 hover:bg-white/15"
                >
                  Start hosting
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-orange-400/20 bg-gradient-to-br from-orange-950/40 to-stone-950/50 p-6 shadow-xl shadow-black/20 backdrop-blur-md">
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/20 text-orange-200 ring-1 ring-orange-400/25">
                <Compass className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-200/80">
                  Built for curious travelers
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white [font-family:var(--font-heading)]">
                  Find someone who knows the place, the work, or the story.
                </h3>
                <p className="mt-3 text-sm leading-6 text-stone-300">
                  Book local hosts for field visits, expert conversations, and
                  grounded cultural experiences.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.15fr_0.8fr_0.8fr_0.9fr]">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-orange-200/90">
              Stay close
            </h4>
            <div className="mt-5 grid gap-3 text-sm text-stone-300">
              <a
                href="mailto:hello@gozuru.com"
                className="inline-flex items-center gap-3 transition hover:text-orange-200"
              >
                <Mail className="size-4 text-orange-400/80" aria-hidden />
                hello@gozuru.com
              </a>
              <span className="inline-flex items-center gap-3">
                <MapPin className="size-4 text-orange-400/80" aria-hidden />
                Local experiences, global curiosity
              </span>
              <span className="inline-flex items-center gap-3">
                <ShieldCheck className="size-4 text-orange-400/80" aria-hidden />
                Verified hosts and secure bookings
              </span>
            </div>
            <div className="mt-6 flex gap-3">
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-stone-300 transition hover:border-orange-400/40 hover:bg-orange-500 hover:text-white"
                aria-label="Twitter"
              >
                <Twitter className="size-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-stone-300 transition hover:border-orange-400/40 hover:bg-orange-500 hover:text-white"
                aria-label="Instagram"
              >
                <Instagram className="size-4" />
              </a>
              <Link
                href="/experiences"
                className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-stone-300 transition hover:border-orange-400/40 hover:bg-orange-500 hover:text-white"
                aria-label="Explore experiences"
              >
                <Globe2 className="size-4" />
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-orange-200/90">
              Explore
            </h4>
            <ul className="mt-5 space-y-3">
              {explore.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-stone-300 transition hover:text-orange-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-orange-200/90">
              Company
            </h4>
            <ul className="mt-5 space-y-3">
              {company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-stone-300 transition hover:text-orange-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-orange-200/90">
              Support
            </h4>
            <ul className="mt-5 space-y-3">
              {support.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith("mailto:") ? (
                    <a
                      href={link.href}
                      className="text-sm text-stone-300 transition hover:text-orange-200"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-stone-300 transition hover:text-orange-200"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-stone-400 sm:flex-row">
          <p>© {year} Gozuru. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/about" className="transition hover:text-orange-200">
              About us
            </Link>
            <Link href="/hosts" className="transition hover:text-orange-200">
              Hosts
            </Link>
            <Link href="/contact" className="transition hover:text-orange-200">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

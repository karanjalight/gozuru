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

const FOOTER_BACKGROUND_IMAGE =
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1800&h=1000&fit=crop";

const explore = [
  { href: "/experiences", label: "Browse experiences" },
  { href: "/#experts", label: "Explore experts" },
  { href: "/#categories", label: "Interest categories" },
  { href: "/#experiences", label: "Popular trips" },
];

const company = [
  { href: "/about", label: "How Gozuru works" },
  { href: "/hosts", label: "Become a host" },
  { href: "/auth/signup", label: "Create account" },
  { href: "/auth/login", label: "Sign in" },
];

const support = [
  { href: "/contact", label: "Contact support" },
  { href: "/about", label: "Trust and safety" },
  { href: "/hosts", label: "Host resources" },
  { href: "/experiences", label: "Booking questions" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-slate-950 text-white">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center opacity-35"
        style={{ backgroundImage: `url(${FOOTER_BACKGROUND_IMAGE})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/90 to-slate-900/75" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/15" />

      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 border-b border-white/10 pb-12 lg:grid-cols-[1fr_0.9fr] lg:items-end">
          <div>
            <Link
              href="/"
              className="inline-flex rounded-2xl bg-white p-2 shadow-lg"
              aria-label="Gozuru home"
            >
              <BrandLogo size="lg" />
            </Link>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200">
              Reward your curiosity with people-led experiences, practical local
              knowledge, and conversations that go deeper than a typical tour.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/experiences"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Explore experiences
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/hosts"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                Become a host
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur-md">
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15">
                <Compass className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300">
                  Built for curious travelers
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight [font-family:var(--font-heading)]">
                  Find someone who knows the place, the work, or the story.
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Book local hosts for field visits, expert conversations, and
                  grounded cultural experiences.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.15fr_0.8fr_0.8fr_0.9fr]">
          <div>
            <h4 className="text-sm font-semibold text-white">Stay close</h4>
            <div className="mt-5 grid gap-3 text-sm text-slate-300">
              <a
                href="mailto:hello@gozuru.com"
                className="inline-flex items-center gap-3 transition hover:text-white"
              >
                <Mail className="size-4 text-slate-400" aria-hidden />
                hello@gozuru.com
              </a>
              <span className="inline-flex items-center gap-3">
                <MapPin className="size-4 text-slate-400" aria-hidden />
                Local experiences, global curiosity
              </span>
              <span className="inline-flex items-center gap-3">
                <ShieldCheck className="size-4 text-slate-400" aria-hidden />
                Verified hosts and secure bookings
              </span>
            </div>
            <div className="mt-6 flex gap-3">
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/30 hover:bg-white hover:text-slate-950"
                aria-label="Twitter"
              >
                <Twitter className="size-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/30 hover:bg-white hover:text-slate-950"
                aria-label="Instagram"
              >
                <Instagram className="size-4" />
              </a>
              <Link
                href="/experiences"
                className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/30 hover:bg-white hover:text-slate-950"
                aria-label="Explore experiences"
              >
                <Globe2 className="size-4" />
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Explore</h4>
            <ul className="mt-5 space-y-3">
              {explore.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-300 transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Company</h4>
            <ul className="mt-5 space-y-3">
              {company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-300 transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Support</h4>
            <ul className="mt-5 space-y-3">
              {support.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith("mailto:") ? (
                    <a
                      href={link.href}
                      className="text-sm text-slate-300 transition hover:text-white"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-slate-300 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-slate-400 sm:flex-row">
          <p>© {year} Gozuru. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/about" className="transition hover:text-white">
              About
            </Link>
            <Link href="/hosts" className="transition hover:text-white">
              Hosts
            </Link>
            <Link href="/contact" className="transition hover:text-white">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Globe2,
  Mail,
  MapPin,
  MessageCircle,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Navbar } from "../components/Navbar";

export const metadata: Metadata = {
  title: "Contact Gozuru",
  description:
    "Contact Gozuru for traveler support, host partnerships, booking questions, and general enquiries.",
};

const contactCards = [
  {
    title: "Traveler support",
    description: "Questions about experiences, bookings, payments, or finding the right host.",
    href: "mailto:hello@gozuru.com?subject=Traveler%20support",
    label: "hello@gozuru.com",
    icon: MessageCircle,
  },
  {
    title: "Host partnerships",
    description: "Want to list an experience, build a host profile, or collaborate with Gozuru?",
    href: "mailto:hosts@gozuru.com?subject=Host%20partnership",
    label: "hosts@gozuru.com",
    icon: Users,
  },
  {
    title: "Trust and safety",
    description: "Report a concern or ask about verification, meet-up procedures, and safety.",
    href: "mailto:safety@gozuru.com?subject=Trust%20and%20safety",
    label: "safety@gozuru.com",
    icon: ShieldCheck,
  },
];

const quickLinks = [
  { href: "/experiences", label: "Browse experiences", icon: Globe2 },
  { href: "/hosts", label: "Become a host", icon: Users },
  { href: "/about", label: "How Gozuru works", icon: MapPin },
];

export default function ContactPage() {
  return (
    <main className="bg-background text-foreground">
      <section className="relative isolate overflow-hidden bg-slate-950 text-white">
        <Navbar />
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center opacity-35"
          style={{
            backgroundImage:
              "url(/slidezuru2.png)",
          }}
        />
        <div className="absolute inset-0 bg-dark/80 gradient-to-br from-slate-600 via-slate-0/90 to-slate-900/65" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-32 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur">
              <Mail className="size-4" aria-hidden />
              Contact Gozuru
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl [font-family:var(--font-heading)]">
              Tell us what you want to explore.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
              Whether you are planning a trip, becoming a host, or asking about
              a booking, reach out and we will point you in the right direction.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          {contactCards.map((card) => {
            const Icon = card.icon;
            return (
              <a
                key={card.title}
                href={card.href}
                className="group rounded-3xl border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                  <Icon className="size-5" aria-hidden />
                </div>
                <h2 className="mt-5 text-lg font-semibold text-foreground">
                  {card.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {card.description}
                </p>
                <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  {card.label}
                  <ArrowRight
                    className="size-4 transition group-hover:translate-x-1"
                    aria-hidden
                  />
                </p>
              </a>
            );
          })}
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div className="rounded-[2rem] bg-slate-950 p-8 text-white sm:p-10">
            <h2 className="text-3xl font-bold tracking-tight [font-family:var(--font-heading)]">
              Send a message
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              This form opens your email client with the message details. For
              urgent booking or safety issues, email us directly.
            </p>

            <div className="mt-8 space-y-5">
              <div className="flex gap-3">
                <Clock className="mt-1 size-5 shrink-0 text-slate-400" aria-hidden />
                <div>
                  <p className="font-medium text-white">Typical response time</p>
                  <p className="text-sm text-slate-300">Within 1 to 2 business days.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="mt-1 size-5 shrink-0 text-slate-400" aria-hidden />
                <div>
                  <p className="font-medium text-white">Where we work</p>
                  <p className="text-sm text-slate-300">
                    With hosts and travelers across local communities.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="mt-1 size-5 shrink-0 text-slate-400" aria-hidden />
                <div>
                  <p className="font-medium text-white">Safety first</p>
                  <p className="text-sm text-slate-300">
                    Include your booking details if your message is about a trip.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form
            action="mailto:hello@gozuru.com"
            method="post"
            encType="text/plain"
            className="rounded-[2rem] border bg-card p-6 shadow-sm sm:p-8"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-foreground">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  className="h-12 w-full rounded-2xl border bg-background px-4 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="h-12 w-full rounded-2xl border bg-background px-4 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <label htmlFor="topic" className="text-sm font-medium text-foreground">
                Topic
              </label>
              <select
                id="topic"
                name="topic"
                className="h-12 w-full rounded-2xl border bg-background px-4 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
                defaultValue="General enquiry"
              >
                <option>General enquiry</option>
                <option>Traveler support</option>
                <option>Host application</option>
                <option>Partnership</option>
                <option>Trust and safety</option>
              </select>
            </div>

            <div className="mt-5 space-y-2">
              <label htmlFor="message" className="text-sm font-medium text-foreground">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={7}
                className="w-full resize-none rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
                placeholder="Tell us what you need help with..."
              />
            </div>

            <button
              type="submit"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 sm:w-auto"
            >
              Send message
              <Send className="size-4" aria-hidden />
            </button>
          </form>
        </div>
      </section>

      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-3xl border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <Icon className="size-6 text-foreground" aria-hidden />
                  <p className="mt-4 font-semibold text-foreground">{link.label}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

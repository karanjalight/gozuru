import Link from "next/link";
import Image from "next/image";
import { Section } from "./Section";
import { Card, CardContent } from "@/components/ui/card";

function Icon({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex size-10 items-center justify-center rounded-2xl border border-border bg-background/60 text-orange-600 shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

const steps = [
  {
    title: "Create your expert profile",
    description:
      "Sign up, add your background, and choose what you want to guide—your craft, profession, or local scene.",
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        <path
          d="M20 21v-2.2c0-2.1-1.7-3.8-3.8-3.8H7.8C5.7 15 4 16.7 4 18.8V21"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    title: "Define your offering",
    description:
      "Add a mini itinerary, meet-up details, and what guests will learn. Choose durations like 1–2 hours, 2–4 hours, half-day, or full-day.",
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        <path
          d="M8 3h8M9 7h6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M8 21h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M9 11h6M9 15h4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Set availability & pricing",
    description:
      "Open time slots, set your rates, and provide clear expectations. Travelers can book within their budget while you stay in control.",
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        <path
          d="M7 3v3M17 3v3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M5 8h14"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M7 12h4M7 16h3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M6 21h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    title: "Get booked securely",
    description:
      "Bookings include communication channels, meet-up procedures, and deposits to reduce off-platform deals and last‑minute cancellations.",
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        <path
          d="M12 2 3 6.5V12c0 5.3 3.2 9.8 9 10 5.8-.2 9-4.7 9-10V6.5L12 2Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 12.2 11.2 14l3.3-3.6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Host and get paid",
    description:
      "After the session is completed, payouts are released after a short holding period (e.g., ~36 hours) to handle any disputes fairly.",
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        <path
          d="M4 7h16v10H4V7Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M4 10h16"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M8 14h4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
] as const;

const valueProps = [
  {
    title: "Meet amazing people",
    description:
      "Connect with curious minds from around the world and share what you do best.",
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        <path
          d="M16 11a3 3 0 1 0-2.9-3.8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M8 11a3 3 0 1 0 2.9-3.8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M3.5 20v-1.2c0-1.9 1.6-3.5 3.5-3.5h10c1.9 0 3.5 1.6 3.5 3.5V20"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Earn from your expertise",
    description:
      "Supplement your income by hosting sessions on your schedule—part-time or full-time.",
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        <path
          d="M12 2v20"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M16.5 6.5c0-1.9-1.8-3.5-4.5-3.5S7.5 4.6 7.5 6.5 9.3 10 12 10s4.5 1.6 4.5 3.5S14.7 17 12 17s-4.5-1.6-4.5-3.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Showcase your skill set",
    description:
      "Build authority with reviews and visibility. Your work becomes part of the story of the place.",
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        <path
          d="M7 21h10"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M9 17h6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M12 3a5 5 0 0 0-3 9.1V14h6v-1.9A5 5 0 0 0 12 3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
] as const;

const gallery = [
  {
    src: "https://images.pexels.com/photos/31711202/pexels-photo-31711202.jpeg",
    alt: "Professional sharing insights with a traveler",
  },
  {
    src: "https://images.pexels.com/photos/33661381/pexels-photo-33661381.jpeg",
    alt: "A local guide leading a small group",
  },
  {
    src: "https://images.pexels.com/photos/2381616/pexels-photo-2381616.jpeg",
    alt: "Hands-on craft experience with an expert",
  },
] as const;

export function HostsSection() {
  return (
    <>
      <Section id="how-it-works">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              How to become a host
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl [font-family:var(--font-heading)]">
              Host in minutes, guide with confidence
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              GOZURU is built for experts, masters, and curators who are great at
              what they do—but hard to find. You set your terms; we provide the
              booking, structure, and trust signals.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                Start hosting
              </Link>
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center rounded-full border border-border bg-background/60 px-6 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Create your profile
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4">
              {gallery.map((img, idx) => (
                <div
                  key={img.src}
                  className={[
                    "relative overflow-hidden rounded-2xl border border-border bg-muted shadow-sm",
                    idx === 0 ? "col-span-2 aspect-[16/7]" : "aspect-[4/3]",
                  ].join(" ")}
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    sizes={
                      idx === 0
                        ? "(max-width: 1024px) 100vw, 520px"
                        : "(max-width: 1024px) 50vw, 260px"
                    }
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {steps.map((s, i) => (
              <Card key={s.title} className="rounded-2xl border-2 border-border">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <Icon>{s.icon}</Icon>
                    <div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="font-semibold text-foreground">{s.title}</p>
                        <span className="text-xs font-semibold text-orange-600/90">
                          Step {i + 1}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {s.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      <Section className="bg-muted/30">
        <div className="grid gap-6 md:grid-cols-3">
          {valueProps.map((p) => (
            <Card
              key={p.title}
              className="h-full rounded-2xl border-2 border-border bg-card shadow-md"
            >
              <CardContent className="p-6 sm:p-8">
                <Icon className="mb-4">{p.icon}</Icon>
                <h3 className="text-lg font-semibold text-foreground [font-family:var(--font-heading)]">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {p.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl [font-family:var(--font-heading)]">
              Fees, deposits, and trust
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              To keep the marketplace high-quality and reduce clutter, GOZURU
              applies platform fees and encourages deposits for bookings. This
              helps prevent parallel deals and supports dispute resolution.
            </p>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">
                  Traveler service fee:
                </span>{" "}
                helps fund customer support, payments, and reviews.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Expert listing fee:
                </span>{" "}
                a small percentage per confirmed booking to maintain quality.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Deposits:
                </span>{" "}
                reduce last-minute cancellations and off-platform engagements.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Payout holding period:
                </span>{" "}
                released shortly after completion to handle issues fairly.
              </li>
            </ul>
          </div>

          <Card className="rounded-2xl border-2 border-border bg-card shadow-md">
            <CardContent className="p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Suggested structure
              </p>
              <h3 className="mt-2 text-xl font-semibold text-foreground [font-family:var(--font-heading)]">
                What a great listing includes
              </h3>
              <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <p className="font-medium text-foreground">Mini itinerary</p>
                  <p className="mt-1">
                    A clear plan for the session—what you’ll do, see, and learn.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <p className="font-medium text-foreground">Meet-up details</p>
                  <p className="mt-1">
                    Location map, instructions, and a smooth start.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <p className="font-medium text-foreground">Time slots</p>
                  <p className="mt-1">
                    1–2 hours, 2–4 hours, half-day, or full-day offerings.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <p className="font-medium text-foreground">Reviews & quality</p>
                  <p className="mt-1">
                    Deliver a great experience and your profile rises.
                  </p>
                </div>
              </div>

              <Link
                href="/auth/signup"
                className="mt-7 inline-flex w-full items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                Become a host — sign up
              </Link>
            </CardContent>
          </Card>
        </div>
      </Section>
    </>
  );
}


import Link from "next/link";
import { Twitter, Instagram } from "lucide-react";

const explore = [
  { href: "#experts", label: "Explore experts" },
  { href: "#experiences", label: "Experiences" },
  { href: "#", label: "Categories" },
  { href: "#", label: "Destinations" },
];

const company = [
  { href: "#", label: "About us" },
  { href: "#", label: "Become an expert" },
  { href: "#", label: "Careers" },
  { href: "#", label: "Press" },
];

const support = [
  { href: "#", label: "Help center" },
  { href: "#contact", label: "Contact" },
  { href: "#", label: "Safety" },
  { href: "#", label: "Cancellation" },
];

const legal = [
  { href: "#", label: "Privacy" },
  { href: "#", label: "Terms" },
  { href: "#", label: "Cookies" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-foreground [font-family:var(--font-heading)]">
                Gozuru
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Reward Your Curiosity. The Gozuru of curious travelers — connect
              with local experts and discover the world through human connection.
            </p>
            <div className="mt-6 flex gap-4">
              <a
                href="#"
                className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Twitter"
              >
                <Twitter className="size-5" />
              </a>
              <a
                href="#"
                className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Instagram"
              >
                <Instagram className="size-5" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground [font-family:var(--font-heading)]">
              Explore
            </h4>
            <ul className="mt-4 space-y-3">
              {explore.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground [font-family:var(--font-heading)]">
              Company
            </h4>
            <ul className="mt-4 space-y-3">
              {company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground [font-family:var(--font-heading)]">
              Support
            </h4>
            <ul className="mt-4 space-y-3">
              {support.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {year} Gozuru. All rights reserved.
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-6">
            {legal.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-sm text-muted-foreground transition hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

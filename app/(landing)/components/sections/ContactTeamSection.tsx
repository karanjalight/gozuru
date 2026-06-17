"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import {
  CONTACT_CHANNELS,
  CONTACT_SERVICES,
  PHONE_COUNTRY_CODES,
} from "@/app/(landing)/lib/contact";
import { cn } from "@/lib/utils";
import { Section } from "./Section";

const fieldClassName = cn(
  "h-11 w-full rounded-lg border border-border bg-card px-3.5 text-sm text-foreground outline-none transition-colors",
  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
  "dark:bg-card dark:border-input",
);

function ChannelIcon({ type }: { type: "chat" | "mail" | "x" | "phone" | "map" }) {
  if (type === "chat") return <MessageCircle className="size-5 shrink-0" aria-hidden />;
  if (type === "mail") return <Mail className="size-5 shrink-0" aria-hidden />;
  if (type === "phone") return <Phone className="size-5 shrink-0" aria-hidden />;
  if (type === "map") return <MapPin className="size-5 shrink-0" aria-hidden />;
  return (
    <span className="flex size-5 shrink-0 items-center justify-center text-sm font-bold" aria-hidden>
      𝕏
    </span>
  );
}

export function ContactTeamSection() {
  const [countryCode, setCountryCode] = useState<string>(PHONE_COUNTRY_CODES[0].code);
  const [services, setServices] = useState<string[]>([]);

  const selectedDial =
    PHONE_COUNTRY_CODES.find((item) => item.code === countryCode)?.dial ?? "+254";

  const toggleService = (service: string) => {
    setServices((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service],
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const firstName = String(data.get("firstName") ?? "");
    const lastName = String(data.get("lastName") ?? "");
    const email = String(data.get("email") ?? "");
    const phone = String(data.get("phone") ?? "");
    const message = String(data.get("message") ?? "");

    const body = [
      `Name: ${firstName} ${lastName}`,
      `Email: ${email}`,
      `Phone: ${selectedDial} ${phone}`,
      `Interested in: ${services.length > 0 ? services.join(", ") : "None selected"}`,
      "",
      message,
    ].join("\n");

    window.location.href = `mailto:hello@gozuru.com?subject=${encodeURIComponent("Gozuru inquiry")}&body=${encodeURIComponent(body)}`;
  };

  return (
    <Section id="contact-team" containerClassName="max-w-6xl">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
          Get in touch
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Plan your next Gozuru experience
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          Questions about hotel visits, meetups, expos, or becoming an expert?
          Our team is here to help you get started.
        </p>
      </div>

      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16 xl:gap-20">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium text-foreground">
                First name
              </label>
              <input
                id="firstName"
                name="firstName"
                required
                className={fieldClassName}
                placeholder="First name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium text-foreground">
                Last name
              </label>
              <input
                id="lastName"
                name="lastName"
                required
                className={fieldClassName}
                placeholder="Last name"
              />
            </div>
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
              className={fieldClassName}
              placeholder="you@email.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium text-foreground">
              Phone number
            </label>
            <div className="flex overflow-hidden rounded-lg border border-border bg-card dark:border-input">
              <label className="sr-only" htmlFor="countryCode">
                Country code
              </label>
              <select
                id="countryCode"
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                className="h-11 shrink-0 border-r border-border bg-card px-3 text-sm text-foreground outline-none dark:border-input"
              >
                {PHONE_COUNTRY_CODES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.flag} {item.code}
                  </option>
                ))}
              </select>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="h-11 min-w-0 flex-1 bg-card px-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="700 000 000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium text-foreground">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={5}
              className={cn(fieldClassName, "h-auto resize-none py-3")}
              placeholder="Tell us about the experience you're looking for..."
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-foreground">I&apos;m interested in</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {CONTACT_SERVICES.map((service) => (
                <label
                  key={service}
                  className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground"
                >
                  <input
                    type="checkbox"
                    checked={services.includes(service)}
                    onChange={() => toggleService(service)}
                    className="size-4 rounded border-border text-foreground focus:ring-ring/30"
                  />
                  <span>{service}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            className="h-11 w-full rounded-lg bg-orange-600 text-sm font-medium text-white transition-colors hover:bg-orange-700"
          >
            Send message
          </button>
        </form>

        <div className="space-y-10 lg:pt-2">
          {CONTACT_CHANNELS.map((channel) => (
            <div key={channel.id}>
              <h3 className="text-lg font-semibold text-foreground">{channel.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {channel.description}
              </p>
              <ul className="mt-4 space-y-3">
                {channel.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="inline-flex items-center gap-2.5 text-sm font-medium text-foreground transition-colors hover:text-orange-600 dark:hover:text-orange-400"
                    >
                      <ChannelIcon type={link.icon} />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

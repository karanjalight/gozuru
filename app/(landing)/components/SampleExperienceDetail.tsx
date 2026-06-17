"use client";

import Image from "next/image";
import Link from "next/link";
import { ExperienceMediaCarousel } from "@/components/experience/ExperienceMediaCarousel";
import {
  ExperienceBookingPurchasePanel,
  ExperienceBookingRoot,
} from "@/components/experience/ExperienceBookingPanel";
import type { ResolvedSampleExperience } from "@/app/(landing)/lib/sample-experiences";
import { ArrowUpRight, Clock3, MapPin, ShieldCheck, Star, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "./Navbar";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SampleExperienceDetail({ experience }: { experience: ResolvedSampleExperience }) {
  const durationLabel =
    experience.durationHours === 1 ? "1 hour" : `${experience.durationHours} hours`;
  const maxGuestsLabel = `Up to ${experience.maxGuests} guest${experience.maxGuests === 1 ? "" : "s"}`;
  const priceLabel = `${formatMoney(experience.priceFrom, experience.currency)} / guest`;
  const locationLabel = `${experience.city}, ${experience.countryRegion}`;
  const shortDescription =
    experience.subtitle ||
    (experience.description.length > 180
      ? `${experience.description.slice(0, 180)}…`
      : experience.description);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 pt-24 pb-28 sm:px-6 lg:py-12 lg:pb-12 lg:pt-24">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link href="/" className="text-sm font-medium text-orange-500 hover:text-orange-600">
            Back to home
          </Link>
          <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
            Sample experience
          </span>
        </div>

        <ExperienceBookingRoot
          experience={experience.bookingExperience}
          availability={experience.availability}
          confirmedGuestsBySlotId={experience.confirmedGuestsBySlotId}
          demoMode
        >
          <section className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,420px)] lg:items-start">
            <div className="min-w-0">
              <ExperienceMediaCarousel items={experience.galleryMedia} emptyLabel={experience.title} />
            </div>

            <aside id="book-experience" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
              <ExperienceBookingPurchasePanel
                title={experience.title}
                subtitle={experience.subtitle}
                priceLabel={priceLabel}
                ratingAverage={experience.ratingAverage}
                ratingCount={experience.ratingCount}
                shortDescription={shortDescription}
                locationLabel={locationLabel}
                durationLabel={durationLabel}
                maxGuestsLabel={maxGuestsLabel}
              />
            </aside>
          </section>

          <section className="mt-16 space-y-8 border-t border-border pt-12">
            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>About this experience</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
                <p>{experience.description}</p>
                <p className="rounded-xl border border-dashed border-orange-200 bg-orange-50/50 px-4 py-3 text-xs text-orange-800 dark:border-orange-500/30 dark:bg-orange-950/20 dark:text-orange-200">
                  This is a sample listing for demo purposes. Slots and checkout are simulated — browse live
                  experiences on Gozuru to book for real.
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-8 md:grid-cols-2">
              <Card className="rounded-2xl border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>What is included</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {experience.includes.map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-orange-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>Guest requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Minimum age: {experience.minAge}+</p>
                  {experience.requirements.map((item) => (
                    <p key={item}>- {item}</p>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-5 text-sm dark:bg-muted/10 sm:grid-cols-3">
              <div>
                <p className="font-semibold text-foreground">Location</p>
                <p className="mt-1 inline-flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4 shrink-0 text-orange-500" />
                  {experience.location}
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Duration</p>
                <p className="mt-1 inline-flex items-center gap-2 text-muted-foreground">
                  <Clock3 className="size-4 shrink-0 text-orange-500" />
                  {durationLabel}
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Group size</p>
                <p className="mt-1 inline-flex items-center gap-2 text-muted-foreground">
                  <Users className="size-4 shrink-0 text-orange-500" />
                  {maxGuestsLabel}
                </p>
              </div>
            </div>

            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Reviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {experience.reviews.map((review) => (
                  <div key={review.id} className="rounded-xl border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="relative size-9 overflow-hidden rounded-full border bg-muted">
                          <Image
                            src={review.avatarUrl}
                            alt={review.name}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{review.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                        <Star className="size-3.5 fill-orange-400 text-orange-400" />
                        {review.rating.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{review.reviewText}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
              <div className="grid md:grid-cols-[minmax(240px,34%)_1fr]">
                <div className="relative aspect-[4/5] min-h-[280px] bg-muted md:aspect-auto md:min-h-[360px]">
                  <Image
                    src={experience.host.avatarUrl}
                    alt={experience.host.name}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 380px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent md:hidden" />
                  <div className="absolute inset-x-0 bottom-0 p-5 md:hidden">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">Your expert</p>
                    <p className="mt-1 text-xl font-bold text-white">{experience.host.name}</p>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-8 p-6 sm:p-8 lg:p-10">
                  <div className="space-y-4">
                    <div className="hidden md:block">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
                        Your expert
                      </p>
                      <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                        {experience.host.name}
                      </h3>
                      <p className="mt-2 text-base text-muted-foreground">{experience.host.headline}</p>
                    </div>

                    <p className="text-sm leading-7 text-foreground md:text-base">{experience.host.expertise}</p>
                    <p className="text-sm leading-7 text-muted-foreground md:text-base">
                      {experience.host.highlightStory}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Link
                      href="/experts"
                      className={cn(
                        buttonVariants({ variant: "default" }),
                        "inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-foreground px-6 text-sm font-semibold text-background hover:opacity-90 sm:flex-1",
                      )}
                    >
                      View all experts
                      <ArrowUpRight className="size-4" />
                    </Link>
                    <a
                      href="#book-experience"
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "inline-flex h-12 items-center justify-center rounded-lg border-border px-6 text-sm font-semibold sm:flex-1",
                      )}
                    >
                      Check availability
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ExperienceBookingRoot>
      </main>
    </>
  );
}

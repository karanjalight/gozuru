"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ExpertCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-2xl">
      <CardHeader className="p-0">
        <Skeleton className="aspect-[4/3] w-full rounded-none" />
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-6 w-16 rounded-lg" />
          <Skeleton className="h-6 w-14 rounded-lg" />
          <Skeleton className="h-6 w-20 rounded-lg" />
        </div>
      </CardContent>
      <div className="border-t bg-muted/30 px-4 py-3 sm:px-5">
        <Skeleton className="h-4 w-28" />
      </div>
    </Card>
  );
}

export function ExpertGridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <ExpertCardSkeleton key={i} />
      ))}
    </div>
  );
}

function ExperienceOfferCardSkeleton() {
  return (
    <div className="grid overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:bg-card lg:grid-cols-[minmax(0,280px)_1fr_auto]">
      <Skeleton className="aspect-[16/10] w-full rounded-none lg:aspect-auto lg:min-h-[220px]" />

      <div className="flex flex-col justify-center gap-3 p-5 sm:p-6">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <div className="mt-2 flex flex-wrap gap-3">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      <div className="flex flex-row items-center justify-around gap-6 border-t border-border p-5 sm:p-6 lg:flex-col lg:justify-center lg:border-l lg:border-t-0 lg:px-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 text-center">
            <Skeleton className="mx-auto h-7 w-12" />
            <Skeleton className="mx-auto h-3 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function HostProfilePortfolioSkeleton() {
  return (
    <div className="bg-white dark:bg-background">
      {/* Hero */}
      <section className="border-b border-border/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:gap-12 lg:py-16">
          <div>
            <Skeleton className="h-3 w-48 rounded-full" />
            <div className="mt-5 space-y-3">
              <Skeleton className="h-10 w-full max-w-md sm:h-12" />
              <Skeleton className="h-7 w-3/4 max-w-sm" />
              <Skeleton className="h-6 w-1/2 max-w-xs" />
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Skeleton className="h-12 w-40 rounded-full" />
              <Skeleton className="h-12 w-32 rounded-full" />
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[320px] lg:mx-0 lg:max-w-none">
            <Skeleton className="mx-auto aspect-square w-full max-w-[300px] rounded-full sm:max-w-[320px]" />
          </div>
        </div>

        <div className="border-t border-border/60">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid flex-1 grid-cols-1 gap-8 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2 text-center sm:text-left">
                  <Skeleton className="mx-auto h-8 w-16 sm:mx-0" />
                  <Skeleton className="mx-auto h-3 w-24 sm:mx-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why book with me — orange band */}
      <section className="bg-orange-500">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
          <div className="mx-auto mt-10 max-w-2xl pb-10 lg:mx-0">
            <Skeleton className="h-7 w-64 bg-white/30" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-4 w-full bg-white/25" />
              <Skeleton className="h-4 w-5/6 bg-white/25" />
              <Skeleton className="h-4 w-2/3 bg-white/25" />
            </div>
            <Skeleton className="mt-8 h-12 w-40 rounded-full bg-white/30" />
          </div>
        </div>
      </section>

      {/* Skills & highlights */}
      <section className="border-b border-border/60">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-16 lg:py-16">
          <div>
            <Skeleton className="mx-auto aspect-square w-full max-w-[260px] rounded-full lg:mx-0" />
            <div className="mt-8 space-y-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/80 bg-white p-5 shadow-sm dark:bg-card">
                <Skeleton className="size-10 rounded-full" />
                <Skeleton className="mt-4 h-4 w-2/3" />
                <div className="mt-2 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio — orange gradient band */}
      <section className="border-b border-border/60 bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-16">
          <div className="max-w-2xl">
            <Skeleton className="h-3 w-20 bg-white/30" />
            <Skeleton className="mt-3 h-8 w-3/4 bg-white/30" />
            <Skeleton className="mt-3 h-4 w-full bg-white/25" />
          </div>

          <div className="mt-10 flex flex-col gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <ExperienceOfferCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoBandItemSkeleton() {
  return (
    <div>
      <Skeleton className="h-4 w-20" />
      <div className="mt-2 flex items-center gap-2">
        <Skeleton className="size-4 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

function ReviewCardSkeleton() {
  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-4 w-10" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export function ExperienceDetailSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 pt-24 pb-28 sm:px-6 lg:py-12 lg:pb-12 lg:pt-24">
      <Skeleton className="mb-6 h-4 w-32" />

      <section className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,420px)] lg:items-start">
        <div className="min-w-0 space-y-3">
          <Skeleton className="h-64 w-full rounded-2xl md:h-[420px]" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-24 shrink-0 rounded-xl" />
            ))}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-7 w-32" />
              <div className="space-y-2 pt-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <div className="flex gap-4 pt-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <div className="rounded-2xl border border-border bg-orange-100 p-5">
                <Skeleton className="h-4 w-28 bg-orange-200/70" />
                <Skeleton className="mt-2 h-4 w-40 bg-orange-200/70" />
                <Skeleton className="mt-5 h-12 w-full rounded-xl bg-orange-200/70" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4 dark:bg-muted/10">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-4 w-48" />
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-16 space-y-8 border-t border-border pt-12">
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>

        <div className="grid gap-8 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 rounded-2xl border border-border bg-muted/20 p-5 dark:bg-muted/10 sm:grid-cols-3">
          <InfoBandItemSkeleton />
          <InfoBandItemSkeleton />
          <InfoBandItemSkeleton />
        </div>

        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
            <ReviewCardSkeleton />
            <ReviewCardSkeleton />
          </CardContent>
        </Card>

        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <div className="grid md:grid-cols-[minmax(240px,34%)_1fr]">
            <Skeleton className="aspect-[4/5] w-full rounded-none md:aspect-auto md:min-h-[360px]" />
            <div className="flex flex-col justify-between gap-8 p-6 sm:p-8 lg:p-10">
              <div className="space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-56" />
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Skeleton className="h-12 flex-1 rounded-lg" />
                <Skeleton className="h-12 flex-1 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

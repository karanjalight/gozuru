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

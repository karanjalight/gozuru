import { ExpertGridSkeleton } from "../components/LoadingSkeletons";
import { Navbar } from "../components/Navbar";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExpertsLoading() {
  return (
    <>
      <Navbar />

      <section className="relative flex min-h-[55vh] items-center justify-center overflow-hidden bg-slate-950">
        <div className="relative z-10 mx-auto flex w-full max-w-[1040px] flex-col items-center gap-8 px-4 pt-16 md:items-start">
          <Skeleton className="h-7 w-56 rounded-full bg-white/10" />
          <div className="w-full space-y-4">
            <Skeleton className="h-12 w-full max-w-xl bg-white/10 sm:h-14" />
            <Skeleton className="h-4 w-full max-w-lg bg-white/10" />
            <Skeleton className="h-4 w-2/3 max-w-md bg-white/10" />
          </div>
          <Skeleton className="mt-4 h-12 w-full max-w-xl rounded-full bg-white/10" />
        </div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 lg:px-8 lg:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl space-y-3">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <Skeleton className="h-4 w-20 shrink-0" />
        </div>

        <ExpertGridSkeleton />
      </div>
    </>
  );
}

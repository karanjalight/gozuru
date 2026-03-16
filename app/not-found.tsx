import Link from "next/link";
import { Globe404 } from "@/components/globe-404";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <Globe404 />
      <div className="relative z-10 flex flex-col items-center gap-6 px-4 text-center">
        <h1 className="text-8xl font-bold tracking-tight text-white drop-shadow-lg sm:text-9xl">
          404
        </h1>
        <p className="max-w-md text-lg text-white/90">
          This page is not on the map. Maybe it’s in another hemisphere.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#0a0a0f] transition hover:bg-white/90"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

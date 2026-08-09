import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck } from "lucide-react";
import { type LocalExpert } from "@/app/(landing)/lib/agents";
import { categoryBadgeClass } from "@/lib/category-styles";
import { cn } from "@/lib/utils";

function categoryStyle(category: string) {
  const badgeClass = categoryBadgeClass(category);
  return badgeClass ? `${badgeClass} text-white` : "bg-foreground/80 text-background";
}

export function AgentCard({
  agent,
  layout = "carousel",
}: {
  agent: LocalExpert;
  layout?: "carousel" | "grid";
}) {
  const profileHref = agent.profileHref ?? `/hosts/${agent.id}`;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm",
        "transition-[transform,box-shadow,border-color] duration-500 ease-out",
        "hover:-translate-y-2 hover:border-orange-300/60 hover:shadow-[0_24px_48px_-12px_rgba(249,115,22,0.18)]",
        "dark:hover:border-orange-500/30 dark:hover:shadow-[0_24px_48px_-12px_rgba(249,115,22,0.12)]",
        layout === "grid" ? "h-full w-full" : "w-[272px] shrink-0 sm:w-[300px]",
      )}
    >
      <Link href={profileHref} className="relative block overflow-hidden">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          <Image
            src={agent.image}
            alt={agent.name}
            fill
            sizes="320px"
            className="object-cover transition-transform duration-700 ease-out will-change-transform group-hover:scale-[1.05]"
          />

          {/* Overlays sit above the image, not on it — avoids the washed-out hover look */}
          <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/5" />
            <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/15" />
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          </div>

          <span
            className={cn(
              "absolute left-3 top-3 z-[2] rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm",
              categoryStyle(agent.category),
            )}
          >
            {agent.category}
          </span>

          <span className="group/verified absolute right-3 top-3 z-[2]">
            <span
              tabIndex={0}
              aria-describedby="verified-tooltip"
              className="inline-flex cursor-default items-center gap-1 rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-md"
            >
              <BadgeCheck className="size-3 text-orange-300" aria-hidden />
              Verified
            </span>
            <span
              id="verified-tooltip"
              role="tooltip"
              className="pointer-events-none absolute right-0 top-full z-10 mt-1.5 w-44 origin-top-right scale-95 rounded-lg bg-black/90 px-2.5 py-2 text-[11px] font-normal leading-snug text-white opacity-0 shadow-lg backdrop-blur-sm transition-all duration-200 group-hover/verified:scale-100 group-hover/verified:opacity-100 group-focus-within/verified:scale-100 group-focus-within/verified:opacity-100"
            >
              ID verified + in-person vetted
            </span>
          </span>

          <div className="absolute inset-x-0 bottom-0 z-[2] p-4 transition-transform duration-500 group-hover:translate-y-[-2px]">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/75">
              {agent.specialty}
            </p>
            <h3 className="mt-1 text-lg font-bold tracking-tight text-white">{agent.name}</h3>
            <p className="mt-0.5 line-clamp-1 text-sm text-white/85">{agent.title}</p>
          </div>
        </div>
      </Link>

      <Link
        href={profileHref}
        className="group/btn relative flex w-full items-center justify-center gap-2 bg-foreground px-4 py-3.5 text-sm font-semibold text-background transition-colors duration-300 group-hover:bg-orange-600"
      >
        <span>View profile</span>
        <ArrowUpRight
          className="size-4 transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5"
          aria-hidden
        />
      </Link>
    </article>
  );
}

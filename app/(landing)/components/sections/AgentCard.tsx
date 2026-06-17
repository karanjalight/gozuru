import Image from "next/image";
import Link from "next/link";
import { AtSign, Star } from "lucide-react";
import { type LocalExpert } from "@/app/(landing)/lib/agents";
import { cn } from "@/lib/utils";

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
        "flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        layout === "grid" ? "h-full w-full" : "w-[260px] shrink-0 sm:w-[280px]",
      )}
    >
      <div className="relative h-[220px] w-full bg-zinc-100 dark:bg-zinc-800">
        <Image
          src={agent.image}
          alt={agent.name}
          fill
          sizes="320px"
          className="object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8">
          <p className="text-xs font-medium text-white/90">{agent.specialty}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-bold text-foreground">{agent.name}</h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{agent.title}</p>
        <p className="mt-2 inline-flex items-center gap-1 text-sm text-foreground">
          {agent.reviewCount > 0 ? (
            <>
              <Star className="size-3.5 fill-orange-500 text-orange-500" aria-hidden />
              {agent.rating.toFixed(1)} · {agent.reviewCount} reviews
            </>
          ) : (
            <span className="text-muted-foreground">Gozuru expert</span>
          )}
        </p>

        <div className="mt-4 flex gap-2">
          <Link
            href={profileHref}
            className="flex flex-1 items-center justify-center rounded-lg bg-foreground px-3 py-2.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
          >
            View profile
          </Link>
          {agent.email ? (
            <a
              href={`mailto:${agent.email}`}
              aria-label={`Email ${agent.name}`}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-foreground text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              <AtSign className="size-4" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

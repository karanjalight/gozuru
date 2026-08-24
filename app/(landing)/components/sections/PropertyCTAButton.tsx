"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PropertyCTAButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "outline" | "card";
  className?: string;
};

export function PropertyCTAButton({
  href,
  children,
  variant = "primary",
  className,
}: PropertyCTAButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative inline-flex items-stretch overflow-hidden rounded-full transition-shadow duration-300",
        variant === "primary" &&
          "shadow-sm hover:shadow-md",
        variant === "outline" &&
          "border border-foreground/20 shadow-sm hover:border-foreground/35 hover:shadow-md",
        variant === "card" &&
          "w-full rounded-xl border border-foreground/15 bg-muted/20 hover:border-foreground/30 hover:bg-muted/40 dark:bg-muted/10",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center px-5 text-sm font-semibold tracking-wide transition-colors",
          variant === "primary" && "flex-1 bg-foreground text-background",
          variant === "outline" &&
            "flex-1 bg-background text-foreground group-hover:bg-foreground group-hover:text-background",
          variant === "card" && "flex-1 py-2.5 text-foreground",
        )}
      >
        {children}
      </span>

      <span
        className={cn(
          "flex items-center justify-center transition-all duration-300 ease-out",
          variant === "primary" &&
            "w-11 rounded-r-full bg-orange-400 text-white group-hover:w-14",
          variant === "outline" &&
            "w-11 rounded-r-full bg-orange-400 text-white group-hover:w-14",
          variant === "card" &&
            "w-10 rounded-r-xl bg-orange-400 text-white group-hover:w-12",
        )}
        aria-hidden
      >
        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

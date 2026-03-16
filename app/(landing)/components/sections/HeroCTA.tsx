"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ctaBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function HeroCTA() {
  return (
    <motion.div
      className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
    >
      <div className="relative w-full ">
        <Input
          type="search"
          placeholder="Where do you want to explore?"
          aria-label="Search destination"
          className="h-12 rounded-full border-2 border-foreground/15 bg-background/95 pl-5 pr-12 text-base shadow-md backdrop-blur sm"
        />
        <button
          type="button"
          aria-label="Search"
          className="absolute right-2 top-1/2 flex h-8 w-40 text-sm gap-2  -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span>
          Explore experts
          </span>
          <ArrowRight className="size-4" />
        </button>
      </div>
    </motion.div>
  );
}

export function CTAButton({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        ctaBase,
        "py-3 px-6 sm:px-8",
        variant === "primary" &&
          "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
        variant === "secondary" &&
          "border-2 border-foreground/20 bg-background/80 hover:border-foreground/30 hover:bg-background",
        className
      )}
    >
      {children}
    </Link>
  );
}

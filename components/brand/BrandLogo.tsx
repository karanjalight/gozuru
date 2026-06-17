import Image from "next/image";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "h-7",
  md: "h-9",
  lg: "h-11",
  xl: "h-14",
  nav: "h-10 sm:h-11",
  "2xl": "h-[4.25rem] sm:h-[4.75rem]",
} as const;

export type BrandLogoSize = keyof typeof sizeClasses;

type BrandLogoProps = {
  size?: BrandLogoSize;
  className?: string;
  priority?: boolean;
};

export function BrandLogo({
  size = "md",
  className,
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Gozuru"
      width={500}
      height={500}
      priority={priority}
      className={cn(sizeClasses[size], "w-auto object-contain", className)}
    />
  );
}

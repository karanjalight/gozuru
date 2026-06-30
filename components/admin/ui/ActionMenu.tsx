"use client";

import { useState } from "react";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActionItem = {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  danger?: boolean;
  disabled?: boolean;
};

export function ActionMenu({ items, label = "Actions" }: { items: ActionItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl ring-1 ring-foreground/5">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition disabled:pointer-events-none disabled:opacity-40",
                    item.danger
                      ? "text-destructive hover:bg-destructive/10"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  {Icon && <Icon className="size-4 shrink-0" />}
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

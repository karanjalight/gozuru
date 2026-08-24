"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type MultiSelectOption = {
  id: string;
  label: string;
};

type MultiSelectProps = {
  label: string;
  hint?: string;
  placeholder?: string;
  options: MultiSelectOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onAddOption?: (label: string) => MultiSelectOption | null;
  addOptionLabel?: string;
  className?: string;
};

export function MultiSelect({
  label,
  hint,
  placeholder = "Select one or more",
  options,
  selectedIds,
  onChange,
  onAddOption,
  addOptionLabel = "Add your own",
  className,
}: MultiSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const selectedOptions = selectedIds
    .map((id) => options.find((option) => option.id === id))
    .filter((option): option is MultiSelectOption => Boolean(option));

  const toggleOption = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((item) => item !== id)
        : [...selectedIds, id],
    );
  };

  const removeSelected = (id: string) => {
    onChange(selectedIds.filter((item) => item !== id));
  };

  const handleAddCustom = () => {
    const trimmed = customValue.trim();
    if (!trimmed || !onAddOption) return;
    const created = onAddOption(trimmed);
    if (!created) return;
    if (!selectedIds.includes(created.id)) {
      onChange([...selectedIds, created.id]);
    }
    setCustomValue("");
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-muted-foreground">{label}</label>
        {selectedIds.length > 0 ? (
          <span className="text-[11px] font-medium text-orange-600">
            {selectedIds.length} selected
          </span>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

      <div className="relative">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 py-2 text-left text-sm transition hover:bg-muted/40",
            open && "border-orange-500 ring-3 ring-orange-500/20",
          )}
        >
          <span
            className={cn(
              "line-clamp-1",
              selectedOptions.length === 0 && "text-muted-foreground",
            )}
          >
            {selectedOptions.length > 0
              ? selectedOptions.map((option) => option.label).join(", ")
              : placeholder}
          </span>
          <ChevronDown
            className={cn("size-4 shrink-0 text-muted-foreground transition", open && "rotate-180")}
          />
        </button>

        {open ? (
          <div
            id={listboxId}
            role="listbox"
            aria-multiselectable="true"
            className="absolute z-20 mt-2 max-h-72 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg"
          >
            <div className="max-h-52 overflow-y-auto p-1">
              {options.map((option) => {
                const selected = selectedIds.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => toggleOption(option.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
                      selected
                        ? "bg-orange-50 text-orange-900 dark:bg-orange-500/15 dark:text-orange-200"
                        : "hover:bg-muted/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border",
                        selected
                          ? "border-orange-500 bg-orange-500 text-white"
                          : "border-input bg-background",
                      )}
                    >
                      {selected ? <Check className="size-3" /> : null}
                    </span>
                    <span className="font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>

            {onAddOption ? (
              <div className="border-t border-border bg-muted/20 p-2">
                <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {addOptionLabel}
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={customValue}
                    onChange={(event) => setCustomValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddCustom();
                      }
                    }}
                    placeholder="Type and press Enter"
                    className="h-9 rounded-lg bg-background text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    disabled={!customValue.trim()}
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 px-3 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/20"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {selectedOptions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <span
              key={option.id}
              className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200"
            >
              {option.label}
              <button
                type="button"
                onClick={() => removeSelected(option.id)}
                className="rounded-full p-0.5 text-orange-700 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-500/20"
                aria-label={`Remove ${option.label}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

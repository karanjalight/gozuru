"use client";

import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, X } from "lucide-react";

type ConfirmDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** e.g. "12 bookings", "4 payment records" — rendered as a bullet list. Empty array renders no list. */
  impactLines: string[];
  loadingImpact?: boolean;
  submitting?: boolean;
  error?: string | null;
  onConfirm: () => void;
};

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  impactLines,
  loadingImpact = false,
  submitting = false,
  error = null,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          if (!submitting) onOpenChange(false);
        }}
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          disabled={submitting}
          aria-label="Close"
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0 pt-1">
            <h2 className="text-base font-semibold text-foreground">Delete {title}?</h2>
            <p className="mt-1 text-sm text-muted-foreground">This action is permanent and cannot be undone.</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
          {loadingImpact ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Checking what will be deleted…
            </p>
          ) : impactLines.length > 0 ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                This will also permanently delete
              </p>
              <ul className="mt-2 space-y-1 text-sm text-foreground">
                {impactLines.map((line) => (
                  <li key={line} className="flex items-center gap-2">
                    <span className="size-1 shrink-0 rounded-full bg-destructive" />
                    {line}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No dependent records found.</p>
          )}
        </div>

        {error ? (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : null}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting || loadingImpact}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white transition hover:bg-destructive/90 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Permanently delete
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

"use client";

import { MapPin, Pencil, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AvailabilityDraftSlot } from "./types";
import { groupSlotsByDate } from "./slotUtils";

type SlotsListProps = {
  slots: AvailabilityDraftSlot[];
  currency: string;
  editingLocalId: string | null;
  onEdit: (localId: string) => void;
  onRemove: (localId: string) => void;
};

function formatTimeRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  return `${start.toLocaleTimeString(undefined, opts)} - ${end.toLocaleTimeString(undefined, opts)}`;
}

export function SlotsList({ slots, currency, editingLocalId, onEdit, onRemove }: SlotsListProps) {
  const groups = groupSlotsByDate(slots);

  if (groups.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/10 p-8 text-center">
        <p className="text-sm font-medium text-foreground">No slots yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Add your first one above to start taking bookings.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      <h3 className="text-sm font-semibold">Your slots</h3>
      {groups.map((group) => (
        <div key={group.dateKey}>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {group.dateLabel}
          </p>
          <div className="space-y-2">
            {group.slots.map((slot) => (
              <div
                key={slot.localId}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-3",
                  slot.localId === editingLocalId
                    ? "border-orange-400 ring-2 ring-orange-200 dark:ring-orange-500/20"
                    : "border-border",
                  slot.isCancelled && "opacity-50",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {formatTimeRange(slot.startsAt, slot.endsAt)}
                    </p>
                    {slot.isCancelled ? <Badge variant="secondary">Cancelled</Badge> : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" />
                      {slot.capacity} people
                    </span>
                    <span>
                      {slot.currency || currency}{" "}
                      {slot.priceAmount ? Number(slot.priceAmount).toFixed(2) : "Standard price"}
                    </span>
                    {slot.meetingPlaceName ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {slot.meetingPlaceName}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => onEdit(slot.localId)}
                    disabled={slot.isCancelled}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => onRemove(slot.localId)}
                    disabled={slot.isCancelled}
                  >
                    <X className="size-3.5" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

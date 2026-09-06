"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AvailabilityDraftSlot } from "./types";
import { AddSlotForm } from "./AddSlotForm";
import { SlotsList } from "./SlotsList";
import { parseNumericInput } from "./slotUtils";

type AvailabilityStepProps = {
  hourlyRate: string;
  onHourlyRateChange: (value: string) => void;
  durationHours: string;
  onDurationHoursChange: (value: string) => void;
  currency: string;
  maxGuestsNumber: number;
  slots: AvailabilityDraftSlot[];
  onAddSlots: (newSlots: AvailabilityDraftSlot[]) => void;
  onUpdateSlot: (localId: string, patch: Partial<AvailabilityDraftSlot>) => void;
  onRemoveSlot: (localId: string) => void;
};

export function AvailabilityStep({
  hourlyRate,
  onHourlyRateChange,
  durationHours,
  onDurationHoursChange,
  currency,
  maxGuestsNumber,
  slots,
  onAddSlots,
  onUpdateSlot,
  onRemoveSlot,
}: AvailabilityStepProps) {
  const [editingLocalId, setEditingLocalId] = useState<string | null>(null);

  const activeSlots = useMemo(() => slots.filter((slot) => !slot.isCancelled), [slots]);
  const standardPriceNumber = parseNumericInput(hourlyRate);
  const estimatedFullBooking =
    standardPriceNumber > 0 && maxGuestsNumber > 0 ? standardPriceNumber * maxGuestsNumber : 0;

  return (
    <Card className="rounded-2xl border-border bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Set your availability</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add booking slots. Guests can only request times you publish.
          </p>
        </div>
        <div className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
          {activeSlots.length} active slot{activeSlots.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-500/20 dark:bg-orange-500/5">
        <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-200">Standard pricing</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Every slot uses this price and length unless you customize it.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Price per person</label>
            <Input
              type="number"
              min="1"
              step="0.01"
              className="h-10 rounded-xl bg-background"
              value={hourlyRate}
              onChange={(e) => onHourlyRateChange(e.target.value)}
              placeholder="120"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Default duration (hours)</label>
            <Input
              type="number"
              min="1"
              max="24"
              step="1"
              className="h-10 rounded-xl bg-background"
              value={durationHours}
              onChange={(e) => onDurationHoursChange(e.target.value)}
              placeholder="2"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Currency</label>
            <div className="flex h-10 w-full items-center rounded-xl border border-input bg-muted/30 px-3 text-sm text-foreground">
              {currency}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          ≈ {currency} {estimatedFullBooking > 0 ? estimatedFullBooking.toFixed(2) : "0.00"} if a slot fully books
        </p>
      </div>

      <AddSlotForm
        hourlyRate={hourlyRate}
        durationHours={durationHours}
        currency={currency}
        maxGuestsNumber={maxGuestsNumber}
        slots={slots}
        editingLocalId={editingLocalId}
        onAddSlots={onAddSlots}
        onUpdateSlot={onUpdateSlot}
        onCancelEdit={() => setEditingLocalId(null)}
      />

      <SlotsList
        slots={slots}
        currency={currency}
        editingLocalId={editingLocalId}
        onEdit={setEditingLocalId}
        onRemove={(localId) => {
          onRemoveSlot(localId);
          if (editingLocalId === localId) setEditingLocalId(null);
        }}
      />
    </Card>
  );
}

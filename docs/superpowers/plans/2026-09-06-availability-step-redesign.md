# Availability Step Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-rolled calendar in the last step of the "create experience" wizard with a guided, Google-Forms-style panel for adding availability slots — with repeat/bulk add, auto-computed end times, a clearer two-tier pricing model, and "Number of people" instead of "Capacity" — and replace the calendar view with a clean chronological slots list.

**Architecture:** The current single-file wizard (`app/account/experiences/create/page.tsx`, ~2071 lines) keeps owning all committed state (pricing, duration, currency, the slots array) exactly as it does today, so `persistDraftExperience`/`onFinish` need no changes to their data flow. Step 4's JSX and its local-only form/calendar logic move into a new `app/account/experiences/create/availability/` folder: pure helper functions (`slotUtils.ts`), shared types (`types.ts`), and three presentational components (`AvailabilityStep.tsx`, `AddSlotForm.tsx`, `SlotsList.tsx`) composed together and wired back into `page.tsx` via props/callbacks.

**Tech Stack:** Next.js 16 (App Router) + React 19, TypeScript 5, Tailwind v4, shadcn/ui components built on `@base-ui/react` (`Button`, `Card`, `Input`, `Badge`), `lucide-react` icons, `lib/utils.ts`'s `cn()`. No calendar/date-picker library — native `datetime-local` inputs, matching the rest of the app.

## Global Constraints

- No test runner exists in this repo (`package.json` has no `jest`/`vitest`/`playwright`; `find` for `*.test.*`/`*.spec.*` returns nothing) — do not add one. Verification is: `npx tsc --noEmit` (must produce no output) after every task, `npm run lint` after the final task, and for the one genuinely risky piece of pure logic (`generateRepeatDates`), a throwaway executable check compiled with `npx tsc` and run with `node` (exact commands in Task 2), deleted before committing. UI correctness is verified manually in the browser (Task 7), per this project's actual QA practice.
- Keep all currently-committed domain state (`hourlyRate`, `durationHours`, `currency`, `availabilitySlots`) owned by `page.tsx` exactly as today — only step-4's local/transient form state (the add-slot form fields, the old calendar view/cursor) moves into the new components. This keeps `persistDraftExperience`/`onFinish`/the edit-load effect working with zero changes to their own logic.
- `AvailabilityDraftSlot`'s shape and the `sync_host_experience_slots` RPC payload built in `onFinish` (`app/account/experiences/create/page.tsx:910-918`) must not change — no DB migration is in scope.
- "Capacity" → "Number of people" and "guest" → "person" wording changes are scoped to Step 4 only. Do not touch Step 2's "Maximum group size" copy.
- Match existing conventions exactly: `"use client"` at the top of every new component file, Tailwind classes/border-radius/color tokens consistent with the rest of the wizard (`rounded-2xl`/`rounded-xl`/`rounded-full`, `border-border`, `bg-muted/…`, orange-500/600 for primary actions), `Button`/`Input`/`Card`/`Badge` from `@/components/ui/*`, `cn` from `@/lib/utils`.

---

## Task 1: Availability types and constants

**Files:**
- Create: `app/account/experiences/create/availability/types.ts`

**Interfaces:**
- Produces: `AvailabilityDraftSlot` type, `WEEKDAY_LABELS` (short chip labels), `WEEKDAY_FULL_LABELS` (full names for `title` tooltips) — consumed by every other task in this plan.

- [ ] **Step 1: Create the file**

```ts
export type AvailabilityDraftSlot = {
  localId: string;
  id?: string;
  startsAt: string;
  endsAt: string;
  capacity: string;
  priceAmount: string;
  currency: string;
  meetingPlaceName: string;
  isCancelled: boolean;
};

export const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
export const WEEKDAY_FULL_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
```

This is a verbatim copy of the `AvailabilityDraftSlot` shape currently declared at `app/account/experiences/create/page.tsx:25-35` — do not change any field.

- [ ] **Step 2: Verify**

Run: `cd "app/account/experiences/create/availability" && npx tsc --noEmit types.ts --target es2020 --moduleResolution node`
Expected: no output (no type errors).

- [ ] **Step 3: Commit**

```bash
git add app/account/experiences/create/availability/types.ts
git commit -m "feat: add shared types for the availability step redesign"
```

---

## Task 2: Pure slot utility functions

**Files:**
- Create: `app/account/experiences/create/availability/slotUtils.ts`

**Interfaces:**
- Consumes: `AvailabilityDraftSlot` from `./types` (Task 1).
- Produces: `toLocalInputValue(date: Date): string`, `getNextHourLocalInputValue(): string`, `parseNumericInput(value: string): number`, `computeEndFromStartAndDuration(startLocalValue: string, durationHours: number): string`, `slotsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean`, `generateRepeatDates(anchorStartLocalValue: string, anchorEndLocalValue: string, weekdays: number[], weeksCount: number): RepeatOccurrence[]` (`RepeatOccurrence = { startsAt: string; endsAt: string }`), `groupSlotsByDate(slots: AvailabilityDraftSlot[]): SlotGroup[]` (`SlotGroup = { dateKey: string; dateLabel: string; slots: AvailabilityDraftSlot[] }`), `collectMeetingPlaces(slots: AvailabilityDraftSlot[]): string[]`, `makeLocalSlotId(): string` — consumed by `page.tsx` (Task 6) and every availability component (Tasks 3-5).

This is the riskiest logic in the whole feature (`generateRepeatDates`), so it gets a real executable check before anything else is built on top of it.

- [ ] **Step 1: Create the file**

```ts
import type { AvailabilityDraftSlot } from "./types";

export function toLocalInputValue(date: Date): string {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function getNextHourLocalInputValue(): string {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return toLocalInputValue(date);
}

export function parseNumericInput(value: string): number {
  const sanitized = value.replace(/[^\d.]/g, "");
  return Number.parseFloat(sanitized);
}

export function computeEndFromStartAndDuration(startLocalValue: string, durationHours: number): string {
  const start = new Date(startLocalValue);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(durationHours) || durationHours <= 0) {
    return startLocalValue;
  }
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
  return toLocalInputValue(end);
}

export function slotsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  if (!Number.isFinite(aStart.getTime()) || !Number.isFinite(aEnd.getTime())) return false;
  if (!Number.isFinite(bStart.getTime()) || !Number.isFinite(bEnd.getTime())) return false;
  return aStart < bEnd && aEnd > bStart;
}

function startOfWeek(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

export type RepeatOccurrence = { startsAt: string; endsAt: string };

export function generateRepeatDates(
  anchorStartLocalValue: string,
  anchorEndLocalValue: string,
  weekdays: number[],
  weeksCount: number,
): RepeatOccurrence[] {
  const anchorStart = new Date(anchorStartLocalValue);
  const anchorEnd = new Date(anchorEndLocalValue);
  if (!Number.isFinite(anchorStart.getTime()) || !Number.isFinite(anchorEnd.getTime())) return [];
  if (weekdays.length === 0 || weeksCount <= 0) return [];

  const durationMs = anchorEnd.getTime() - anchorStart.getTime();
  const weekStart = startOfWeek(anchorStart);
  const occurrences: RepeatOccurrence[] = [];

  for (let week = 0; week < weeksCount; week += 1) {
    for (const weekday of weekdays) {
      const candidateStart = new Date(weekStart);
      candidateStart.setDate(weekStart.getDate() + week * 7 + weekday);
      candidateStart.setHours(anchorStart.getHours(), anchorStart.getMinutes(), 0, 0);
      if (candidateStart.getTime() < anchorStart.getTime()) continue;
      const candidateEnd = new Date(candidateStart.getTime() + durationMs);
      occurrences.push({
        startsAt: toLocalInputValue(candidateStart),
        endsAt: toLocalInputValue(candidateEnd),
      });
    }
  }

  occurrences.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  return occurrences;
}

export type SlotGroup = { dateKey: string; dateLabel: string; slots: AvailabilityDraftSlot[] };

export function groupSlotsByDate(slots: AvailabilityDraftSlot[]): SlotGroup[] {
  const groups = new Map<string, AvailabilityDraftSlot[]>();
  const sorted = [...slots].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  for (const slot of sorted) {
    const date = new Date(slot.startsAt);
    if (!Number.isFinite(date.getTime())) continue;
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const existing = groups.get(dateKey);
    if (existing) {
      existing.push(slot);
    } else {
      groups.set(dateKey, [slot]);
    }
  }
  return Array.from(groups.entries()).map(([dateKey, groupSlots]) => ({
    dateKey,
    dateLabel: new Date(groupSlots[0].startsAt).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    slots: groupSlots,
  }));
}

export function collectMeetingPlaces(slots: AvailabilityDraftSlot[]): string[] {
  const names = slots.map((slot) => slot.meetingPlaceName.trim()).filter((name) => name.length > 0);
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}

let localIdCounter = 0;
export function makeLocalSlotId(): string {
  localIdCounter += 1;
  return `draft-${Date.now()}-${localIdCounter}-${Math.random().toString(16).slice(2)}`;
}
```

- [ ] **Step 2: Write and run the throwaway verification script**

Create a temporary file `app/account/experiences/create/availability/__verify__.ts`:

```ts
import {
  computeEndFromStartAndDuration,
  generateRepeatDates,
  groupSlotsByDate,
  slotsOverlap,
} from "./slotUtils";
import type { AvailabilityDraftSlot } from "./types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

assert(
  computeEndFromStartAndDuration("2026-09-09T10:00", 2) === "2026-09-09T12:00",
  "computeEndFromStartAndDuration adds hours correctly",
);

const d = (v: string) => new Date(v);
assert(
  slotsOverlap(d("2026-09-09T10:00"), d("2026-09-09T12:00"), d("2026-09-09T11:00"), d("2026-09-09T13:00")) === true,
  "slotsOverlap detects overlapping ranges",
);
assert(
  slotsOverlap(d("2026-09-09T10:00"), d("2026-09-09T12:00"), d("2026-09-09T12:00"), d("2026-09-09T14:00")) === false,
  "slotsOverlap allows back-to-back ranges that only touch",
);
assert(
  slotsOverlap(d("2026-09-09T10:00"), d("2026-09-09T12:00"), d("2026-09-09T13:00"), d("2026-09-09T14:00")) === false,
  "slotsOverlap allows fully separate ranges",
);

const anchorStartValue = "2026-09-09T10:00";
const anchorEndValue = "2026-09-09T12:00";
const anchorWeekday = new Date(2026, 8, 9).getDay();

const singleWeekday = generateRepeatDates(anchorStartValue, anchorEndValue, [anchorWeekday], 3);
assert(
  singleWeekday.length === 3,
  `generateRepeatDates returns 3 occurrences for 3 weeks on the anchor's own weekday (got ${singleWeekday.length})`,
);
assert(singleWeekday[0]?.startsAt === anchorStartValue, "generateRepeatDates first occurrence equals the anchor slot");
const firstMs = new Date(singleWeekday[0].startsAt).getTime();
const secondMs = new Date(singleWeekday[1].startsAt).getTime();
assert(secondMs - firstMs === 7 * 24 * 60 * 60 * 1000, "generateRepeatDates spaces weekly occurrences exactly 7 days apart");

const allDays = generateRepeatDates(anchorStartValue, anchorEndValue, [0, 1, 2, 3, 4, 5, 6], 1);
const expectedCount = 7 - anchorWeekday;
assert(
  allDays.length === expectedCount,
  `generateRepeatDates skips days before the anchor within its first week (expected ${expectedCount}, got ${allDays.length})`,
);

const sampleSlots: AvailabilityDraftSlot[] = [
  { localId: "a", startsAt: "2026-09-09T10:00", endsAt: "2026-09-09T12:00", capacity: "4", priceAmount: "", currency: "KES", meetingPlaceName: "Spot A", isCancelled: false },
  { localId: "b", startsAt: "2026-09-09T14:00", endsAt: "2026-09-09T16:00", capacity: "4", priceAmount: "", currency: "KES", meetingPlaceName: "Spot A", isCancelled: false },
  { localId: "c", startsAt: "2026-09-10T09:00", endsAt: "2026-09-10T11:00", capacity: "4", priceAmount: "", currency: "KES", meetingPlaceName: "Spot A", isCancelled: false },
];
const groups = groupSlotsByDate(sampleSlots);
assert(groups.length === 2, `groupSlotsByDate groups by calendar date (expected 2 groups, got ${groups.length})`);
assert(groups[0]?.slots.length === 2, "groupSlotsByDate keeps same-day slots together");

if (process.exitCode === 1) {
  console.error("Some checks FAILED");
  throw new Error("verification failed");
} else {
  console.log("All checks passed");
}
```

Run:
```bash
cd "app/account/experiences/create/availability"
npx tsc __verify__.ts slotUtils.ts types.ts --outDir /tmp/verify-availability --module commonjs --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck --rootDir .
node /tmp/verify-availability/__verify__.js
```
Expected: a `PASS: ...` line for every assertion above, ending with `All checks passed`, exit code 0. If any line says `FAIL`, fix the corresponding function in `slotUtils.ts` and re-run — do not proceed with a failing check.

- [ ] **Step 3: Delete the throwaway script**

```bash
rm app/account/experiences/create/availability/__verify__.ts
rm -rf /tmp/verify-availability
```

- [ ] **Step 4: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add app/account/experiences/create/availability/slotUtils.ts
git commit -m "feat: add availability slot utility functions (repeat generation, overlap, grouping)"
```

---

## Task 3: Slots list (calendar replacement)

**Files:**
- Create: `app/account/experiences/create/availability/SlotsList.tsx`

**Interfaces:**
- Consumes: `AvailabilityDraftSlot` from `./types`, `groupSlotsByDate` from `./slotUtils` (Tasks 1-2).
- Produces: `SlotsList` component with props `{ slots: AvailabilityDraftSlot[]; currency: string; editingLocalId: string | null; onEdit: (localId: string) => void; onRemove: (localId: string) => void }` — consumed by `AvailabilityStep` (Task 5).

- [ ] **Step 1: Create the file**

```tsx
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no output. (This file isn't imported anywhere yet, so this mainly confirms it parses and its own types are internally consistent — full integration is verified in Task 6.)

- [ ] **Step 3: Commit**

```bash
git add app/account/experiences/create/availability/SlotsList.tsx
git commit -m "feat: add grouped-by-date slots list component"
```

---

## Task 4: Add-slot form (the Forms-style panel)

**Files:**
- Create: `app/account/experiences/create/availability/AddSlotForm.tsx`

**Interfaces:**
- Consumes: `AvailabilityDraftSlot`, `WEEKDAY_LABELS`, `WEEKDAY_FULL_LABELS` from `./types`; `collectMeetingPlaces`, `computeEndFromStartAndDuration`, `generateRepeatDates`, `getNextHourLocalInputValue`, `makeLocalSlotId`, `parseNumericInput`, `slotsOverlap` from `./slotUtils` (Tasks 1-2).
- Produces: `AddSlotForm` component with props `{ hourlyRate: string; durationHours: string; currency: string; maxGuestsNumber: number; slots: AvailabilityDraftSlot[]; editingLocalId: string | null; onAddSlots: (newSlots: AvailabilityDraftSlot[]) => void; onUpdateSlot: (localId: string, patch: Partial<AvailabilityDraftSlot>) => void; onCancelEdit: () => void }` — consumed by `AvailabilityStep` (Task 5).

This is the core of the redesign: a single scrollable panel with icon-led sections (When, Repeat, Number of people, Price, Meeting place), auto-computed end time, and an optional weekly-repeat batch add.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CalendarDays, MapPin, Minus, Plus, Repeat, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AvailabilityDraftSlot } from "./types";
import { WEEKDAY_FULL_LABELS, WEEKDAY_LABELS } from "./types";
import {
  collectMeetingPlaces,
  computeEndFromStartAndDuration,
  generateRepeatDates,
  getNextHourLocalInputValue,
  makeLocalSlotId,
  parseNumericInput,
  slotsOverlap,
} from "./slotUtils";

type AddSlotFormProps = {
  hourlyRate: string;
  durationHours: string;
  currency: string;
  maxGuestsNumber: number;
  slots: AvailabilityDraftSlot[];
  editingLocalId: string | null;
  onAddSlots: (newSlots: AvailabilityDraftSlot[]) => void;
  onUpdateSlot: (localId: string, patch: Partial<AvailabilityDraftSlot>) => void;
  onCancelEdit: () => void;
};

function SectionHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
        {icon}
      </span>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
    </div>
  );
}

function PeopleStepper({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-input bg-background px-2 py-1">
      <button
        type="button"
        className="flex size-8 items-center justify-center rounded-full text-foreground hover:bg-muted disabled:opacity-40"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Decrease number of people"
      >
        <Minus className="size-4" />
      </button>
      <span className="w-10 text-center text-base font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        className="flex size-8 items-center justify-center rounded-full text-foreground hover:bg-muted"
        onClick={() => onChange(value + 1)}
        aria-label="Increase number of people"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function AddSlotForm({
  hourlyRate,
  durationHours,
  currency,
  maxGuestsNumber,
  slots,
  editingLocalId,
  onAddSlots,
  onUpdateSlot,
  onCancelEdit,
}: AddSlotFormProps) {
  const formRef = useRef<HTMLDivElement | null>(null);
  const initialMaxGuestsRef = useRef(maxGuestsNumber);
  const capacityTouchedRef = useRef(false);
  const meetingPlaceHydratedRef = useRef(false);

  const durationHoursNumber = Number.parseInt(durationHours, 10) || 1;
  const standardPriceNumber = parseNumericInput(hourlyRate);
  const meetingPlaces = useMemo(() => collectMeetingPlaces(slots), [slots]);

  const [startsAt, setStartsAt] = useState(getNextHourLocalInputValue);
  const [endOverrideEnabled, setEndOverrideEnabled] = useState(false);
  const [manualEndsAt, setManualEndsAt] = useState(() =>
    computeEndFromStartAndDuration(getNextHourLocalInputValue(), durationHoursNumber),
  );
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([]);
  const [repeatWeeksCount, setRepeatWeeksCount] = useState(4);
  const [capacity, setCapacity] = useState(String(maxGuestsNumber > 0 ? maxGuestsNumber : 1));
  const [priceOverrideEnabled, setPriceOverrideEnabled] = useState(false);
  const [priceOverrideAmount, setPriceOverrideAmount] = useState("");
  const [meetingPlaceMode, setMeetingPlaceMode] = useState<"existing" | "new">(
    meetingPlaces.length > 0 ? "existing" : "new",
  );
  const [meetingPlaceValue, setMeetingPlaceValue] = useState(meetingPlaces[0] ?? "");
  const [newMeetingPlaceValue, setNewMeetingPlaceValue] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);

  useEffect(() => {
    if (meetingPlaceHydratedRef.current) return;
    if (meetingPlaces.length === 0) return;
    meetingPlaceHydratedRef.current = true;
    setMeetingPlaceMode("existing");
    setMeetingPlaceValue(meetingPlaces[0]);
  }, [meetingPlaces]);

  useEffect(() => {
    if (capacityTouchedRef.current) return;
    if (editingLocalId) return;
    if (maxGuestsNumber === initialMaxGuestsRef.current) return;
    setCapacity(String(maxGuestsNumber > 0 ? maxGuestsNumber : 1));
  }, [maxGuestsNumber, editingLocalId]);

  useEffect(() => {
    if (!editingLocalId) return;
    const slot = slots.find((item) => item.localId === editingLocalId);
    if (!slot) return;

    setStartsAt(slot.startsAt);
    const slotDurationMs = new Date(slot.endsAt).getTime() - new Date(slot.startsAt).getTime();
    const standardDurationMs = durationHoursNumber * 60 * 60 * 1000;
    if (Math.abs(slotDurationMs - standardDurationMs) > 60_000) {
      setEndOverrideEnabled(true);
      setManualEndsAt(slot.endsAt);
    } else {
      setEndOverrideEnabled(false);
    }
    setRepeatEnabled(false);
    setCapacity(slot.capacity);
    capacityTouchedRef.current = true;
    if (slot.priceAmount.trim()) {
      setPriceOverrideEnabled(true);
      setPriceOverrideAmount(slot.priceAmount);
    } else {
      setPriceOverrideEnabled(false);
      setPriceOverrideAmount("");
    }
    const exists = meetingPlaces.includes(slot.meetingPlaceName);
    if (exists) {
      setMeetingPlaceMode("existing");
      setMeetingPlaceValue(slot.meetingPlaceName);
      setNewMeetingPlaceValue("");
    } else {
      setMeetingPlaceMode("new");
      setMeetingPlaceValue("");
      setNewMeetingPlaceValue(slot.meetingPlaceName);
    }
    setFormError(null);
    setFormNotice(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resync only when the edit target changes, not on every slots/meetingPlaces update (would clobber in-progress edits)
  }, [editingLocalId]);

  const computedEndsAt = computeEndFromStartAndDuration(startsAt, durationHoursNumber);
  const effectiveEndsAt = endOverrideEnabled ? manualEndsAt : computedEndsAt;
  const capacityNumber = Number.parseInt(capacity, 10) || 0;
  const effectivePricePerPerson =
    priceOverrideEnabled && priceOverrideAmount.trim() ? Number.parseFloat(priceOverrideAmount) : standardPriceNumber;
  const totalValue =
    Number.isFinite(effectivePricePerPerson) && effectivePricePerPerson > 0 && capacityNumber > 0
      ? effectivePricePerPerson * capacityNumber
      : 0;
  const anchorWeekday = new Date(startsAt).getDay();
  const submitLabel = editingLocalId
    ? "Update slot"
    : repeatEnabled && repeatWeekdays.length > 0
      ? `Add up to ${repeatWeekdays.length * repeatWeeksCount} slots`
      : "Add slot";

  function resetForm() {
    const nextStart = getNextHourLocalInputValue();
    setStartsAt(nextStart);
    setEndOverrideEnabled(false);
    setManualEndsAt(computeEndFromStartAndDuration(nextStart, durationHoursNumber));
    setRepeatEnabled(false);
    setRepeatWeekdays([]);
    setRepeatWeeksCount(4);
    setCapacity(String(maxGuestsNumber > 0 ? maxGuestsNumber : 1));
    capacityTouchedRef.current = false;
    setPriceOverrideEnabled(false);
    setPriceOverrideAmount("");
    setFormError(null);
  }

  function toggleWeekday(day: number) {
    setRepeatWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  function handleRepeatToggle(next: boolean) {
    setRepeatEnabled(next);
    if (next && repeatWeekdays.length === 0) {
      setRepeatWeekdays([anchorWeekday]);
    }
  }

  function handleSubmit() {
    setFormError(null);
    setFormNotice(null);

    if (!Number.isFinite(capacityNumber) || capacityNumber <= 0) {
      setFormError("Number of people must be greater than zero.");
      return;
    }
    const meetingPlaceName =
      meetingPlaceMode === "existing" ? meetingPlaceValue.trim() : newMeetingPlaceValue.trim();
    if (!meetingPlaceName) {
      setFormError("Please select or add a meeting place.");
      return;
    }
    const priceAmount = priceOverrideEnabled ? priceOverrideAmount.trim() : "";
    if (priceOverrideEnabled && priceAmount) {
      const price = Number.parseFloat(priceAmount);
      if (!Number.isFinite(price) || price < 0) {
        setFormError("Custom price must be zero or higher.");
        return;
      }
    }

    const startDate = new Date(startsAt);
    const endDate = new Date(effectiveEndsAt);
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
      setFormError("Please choose a valid start date and time.");
      return;
    }
    if (endDate <= startDate) {
      setFormError("End time must be after the start time.");
      return;
    }

    const others = slots.filter((slot) => !slot.isCancelled && slot.localId !== editingLocalId);

    if (editingLocalId) {
      const conflict = others.some((slot) =>
        slotsOverlap(startDate, endDate, new Date(slot.startsAt), new Date(slot.endsAt)),
      );
      if (conflict) {
        setFormError("This slot overlaps another slot in your schedule.");
        return;
      }
      onUpdateSlot(editingLocalId, {
        startsAt,
        endsAt: effectiveEndsAt,
        capacity: String(capacityNumber),
        priceAmount,
        currency,
        meetingPlaceName,
      });
      resetForm();
      onCancelEdit();
      return;
    }

    if (!repeatEnabled) {
      const conflict = others.some((slot) =>
        slotsOverlap(startDate, endDate, new Date(slot.startsAt), new Date(slot.endsAt)),
      );
      if (conflict) {
        setFormError("This slot overlaps another slot in your schedule.");
        return;
      }
      onAddSlots([
        {
          localId: makeLocalSlotId(),
          startsAt,
          endsAt: effectiveEndsAt,
          capacity: String(capacityNumber),
          priceAmount,
          currency,
          meetingPlaceName,
          isCancelled: false,
        },
      ]);
      resetForm();
      return;
    }

    if (repeatWeekdays.length === 0) {
      setFormError("Choose at least one day to repeat on.");
      return;
    }
    const occurrences = generateRepeatDates(startsAt, effectiveEndsAt, repeatWeekdays, repeatWeeksCount);
    const accepted: AvailabilityDraftSlot[] = [];
    let skippedCount = 0;
    for (const occurrence of occurrences) {
      const occStart = new Date(occurrence.startsAt);
      const occEnd = new Date(occurrence.endsAt);
      const conflictsExisting = others.some((slot) =>
        slotsOverlap(occStart, occEnd, new Date(slot.startsAt), new Date(slot.endsAt)),
      );
      const conflictsAccepted = accepted.some((slot) =>
        slotsOverlap(occStart, occEnd, new Date(slot.startsAt), new Date(slot.endsAt)),
      );
      if (conflictsExisting || conflictsAccepted) {
        skippedCount += 1;
        continue;
      }
      accepted.push({
        localId: makeLocalSlotId(),
        startsAt: occurrence.startsAt,
        endsAt: occurrence.endsAt,
        capacity: String(capacityNumber),
        priceAmount,
        currency,
        meetingPlaceName,
        isCancelled: false,
      });
    }
    if (accepted.length === 0) {
      setFormError("All repeated slots overlap your existing schedule.");
      return;
    }
    onAddSlots(accepted);
    if (skippedCount > 0) {
      setFormNotice(
        `Added ${accepted.length} slot${accepted.length === 1 ? "" : "s"} — skipped ${skippedCount} that overlapped your existing schedule.`,
      );
    }
    resetForm();
  }

  return (
    <div ref={formRef} className="mt-6 rounded-2xl border border-border bg-muted/20 p-5">
      <h3 className="text-base font-semibold text-foreground">
        {editingLocalId ? "Edit this slot" : "Add a time slot"}
      </h3>

      <div className="mt-5 space-y-5">
        <div className="space-y-3">
          <SectionHeader icon={<CalendarDays className="size-3.5" />} title="When" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Starts</label>
              <Input
                type="datetime-local"
                className="h-11 rounded-xl bg-background"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Ends</label>
              {endOverrideEnabled ? (
                <Input
                  type="datetime-local"
                  className="h-11 rounded-xl bg-background"
                  value={manualEndsAt}
                  onChange={(e) => setManualEndsAt(e.target.value)}
                />
              ) : (
                <div className="flex h-11 w-full items-center rounded-xl border border-input bg-muted/30 px-3 text-sm text-foreground">
                  {new Date(computedEndsAt).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-orange-600 hover:underline"
            onClick={() => {
              if (!endOverrideEnabled) setManualEndsAt(computedEndsAt);
              setEndOverrideEnabled((prev) => !prev);
            }}
          >
            {endOverrideEnabled ? "Use the standard duration instead" : "Set a different length for this slot"}
          </button>
        </div>

        {!editingLocalId ? (
          <div className="space-y-3 border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <SectionHeader icon={<Repeat className="size-3.5" />} title="Repeat" />
              <button
                type="button"
                role="switch"
                aria-checked={repeatEnabled}
                onClick={() => handleRepeatToggle(!repeatEnabled)}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  repeatEnabled ? "bg-orange-500" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                    repeatEnabled ? "translate-x-5" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>
            {repeatEnabled ? (
              <div className="space-y-3 rounded-xl bg-background/60 p-3">
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_LABELS.map((label, index) => (
                    <button
                      key={`${label}-${index}`}
                      type="button"
                      title={WEEKDAY_FULL_LABELS[index]}
                      onClick={() => toggleWeekday(index)}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full border text-xs font-semibold",
                        repeatWeekdays.includes(index)
                          ? "border-orange-500 bg-orange-500 text-white"
                          : "border-input text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-muted-foreground">For</label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    className="h-9 w-20 rounded-xl bg-background"
                    value={repeatWeeksCount}
                    onChange={(e) =>
                      setRepeatWeeksCount(Math.min(12, Math.max(1, Number.parseInt(e.target.value, 10) || 1)))
                    }
                  />
                  <span className="text-xs text-muted-foreground">week{repeatWeeksCount === 1 ? "" : "s"}</span>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-3 border-t border-border pt-5">
          <SectionHeader icon={<Users className="size-3.5" />} title="Number of people" />
          <PeopleStepper
            value={capacityNumber || 1}
            onChange={(next) => {
              capacityTouchedRef.current = true;
              setCapacity(String(next));
            }}
          />
        </div>

        <div className="space-y-3 border-t border-border pt-5">
          <SectionHeader icon={<Wallet className="size-3.5" />} title="Price" />
          {!priceOverrideEnabled ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-background/60 p-3">
              <p className="text-sm text-foreground">
                Standard price:{" "}
                <span className="font-semibold">
                  {currency} {standardPriceNumber > 0 ? standardPriceNumber.toFixed(2) : "0.00"}
                </span>{" "}
                / person
              </p>
              <button
                type="button"
                className="text-xs font-semibold text-orange-600 hover:underline"
                onClick={() => {
                  setPriceOverrideAmount(standardPriceNumber > 0 ? String(standardPriceNumber) : "");
                  setPriceOverrideEnabled(true);
                }}
              >
                Customize price for this slot
              </button>
            </div>
          ) : (
            <div className="space-y-2 rounded-xl bg-background/60 p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-10 items-center rounded-xl border border-input bg-background px-3 text-sm text-muted-foreground">
                  {currency}
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-10 rounded-xl bg-background"
                  value={priceOverrideAmount}
                  onChange={(e) => setPriceOverrideAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-orange-600 hover:underline"
                onClick={() => {
                  setPriceOverrideEnabled(false);
                  setPriceOverrideAmount("");
                }}
              >
                Use the standard price instead
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {capacityNumber || 0} people × {currency}{" "}
            {effectivePricePerPerson > 0 ? effectivePricePerPerson.toFixed(2) : "0.00"} ={" "}
            <span className="font-semibold text-foreground">
              {currency} {totalValue.toFixed(2)}
            </span>{" "}
            if this slot fully books
          </p>
        </div>

        <div className="space-y-3 border-t border-border pt-5">
          <div className="flex items-center justify-between gap-2">
            <SectionHeader icon={<MapPin className="size-3.5" />} title="Meeting place" />
            <div className="inline-flex rounded-full border border-border bg-muted/40 p-1">
              <button
                type="button"
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  meetingPlaceMode === "existing" ? "bg-background text-foreground" : "text-muted-foreground",
                )}
                onClick={() => setMeetingPlaceMode("existing")}
                disabled={meetingPlaces.length === 0}
              >
                Choose existing
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  meetingPlaceMode === "new" ? "bg-background text-foreground" : "text-muted-foreground",
                )}
                onClick={() => setMeetingPlaceMode("new")}
              >
                Add new
              </button>
            </div>
          </div>
          {meetingPlaceMode === "existing" && meetingPlaces.length > 0 ? (
            <select
              value={meetingPlaceValue}
              onChange={(e) => setMeetingPlaceValue(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {meetingPlaces.map((place) => (
                <option key={place} value={place}>
                  {place}
                </option>
              ))}
            </select>
          ) : (
            <Input
              className="h-11 rounded-xl bg-background"
              value={newMeetingPlaceValue}
              onChange={(e) => setNewMeetingPlaceValue(e.target.value)}
              placeholder="e.g. City Mall main entrance"
            />
          )}
        </div>
      </div>

      {formError ? <p className="mt-4 text-sm text-red-500">{formError}</p> : null}
      {formNotice ? <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">{formNotice}</p> : null}

      <div className="mt-5 flex items-center gap-2">
        <Button type="button" className="rounded-full bg-orange-500 text-white hover:bg-orange-600" onClick={handleSubmit}>
          <Plus className="mr-2 size-4" />
          {submitLabel}
        </Button>
        {editingLocalId ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => {
              resetForm();
              onCancelEdit();
            }}
          >
            Cancel edit
          </Button>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/account/experiences/create/availability/AddSlotForm.tsx
git commit -m "feat: add guided add-slot form with repeat, auto end time, and price override"
```

---

## Task 5: AvailabilityStep composition

**Files:**
- Create: `app/account/experiences/create/availability/AvailabilityStep.tsx`

**Interfaces:**
- Consumes: `AvailabilityDraftSlot` from `./types`; `parseNumericInput` from `./slotUtils`; `AddSlotForm` (Task 4), `SlotsList` (Task 3).
- Produces: `AvailabilityStep` component with props `{ hourlyRate: string; onHourlyRateChange: (value: string) => void; durationHours: string; onDurationHoursChange: (value: string) => void; currency: string; maxGuestsNumber: number; slots: AvailabilityDraftSlot[]; onAddSlots: (newSlots: AvailabilityDraftSlot[]) => void; onUpdateSlot: (localId: string, patch: Partial<AvailabilityDraftSlot>) => void; onRemoveSlot: (localId: string) => void }` — consumed by `page.tsx` (Task 6). This is the only export `page.tsx` needs to import from the `availability/` folder besides the type.

- [ ] **Step 1: Create the file**

```tsx
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/account/experiences/create/availability/AvailabilityStep.tsx
git commit -m "feat: compose the redesigned availability step"
```

---

## Task 6: Wire AvailabilityStep into the wizard and delete dead code

**Files:**
- Modify: `app/account/experiences/create/page.tsx`

**Interfaces:**
- Consumes: `AvailabilityStep` from `./availability/AvailabilityStep`, `AvailabilityDraftSlot` from `./availability/types`, `toLocalInputValue` + `parseNumericInput` from `./availability/slotUtils` (Tasks 1, 2, 5).

This task makes six edits to `page.tsx`, in order. Before starting, re-read the current file — line numbers below are from a version already 47 lines removed by earlier edits in this same task, so treat each `old_string` as the thing to search for, not a literal line-number lookup.

- [ ] **Step 1: Update imports**

Open `app/account/experiences/create/page.tsx`. Replace:

```ts
import { ChevronLeft, ChevronRight, ImageIcon, Play, Plus, Upload, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
```

with:

```ts
import { ChevronLeft, ChevronRight, ImageIcon, Play, Upload, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { AvailabilityStep } from "./availability/AvailabilityStep";
import type { AvailabilityDraftSlot } from "./availability/types";
import { parseNumericInput, toLocalInputValue } from "./availability/slotUtils";
```

(`Plus` is dropped because its only use in this file — the step-4 "Add slot" button — moves into `AddSlotForm.tsx`; `X`, `ChevronLeft`, `ChevronRight`, `ImageIcon`, `Play`, `Upload`, `Video` all stay because they're still used by the media step and step navigation buttons.)

- [ ] **Step 2: Delete the old availability types and calendar date helpers**

Find this block (currently lines 25-84, right after `UploadedMediaPreview` and right before `slugifyLabel`):

```ts
type AvailabilityDraftSlot = {
  localId: string;
  id?: string;
  startsAt: string;
  endsAt: string;
  capacity: string;
  priceAmount: string;
  currency: string;
  meetingPlaceName: string;
  isCancelled: boolean;
};

type CalendarView = "day" | "week" | "month" | "year";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_MEDIA_FILE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ACCEPTED_VIDEO_MIME_TYPES = new Set(["video/mp4", "video/quicktime"]);
const PHOTO_FILE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
const VIDEO_FILE_ACCEPT = "video/mp4,video/quicktime,.mp4,.mov";
function toLocalInputValue(date: Date): string {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getNextHourLocalInputValue(): string {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return toLocalInputValue(date);
}

function getTwoHoursFromNowLocalInputValue(): string {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 2);
  return toLocalInputValue(date);
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfWeek(date: Date): Date {
  const next = startOfDay(date);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function monthLabel(date: Date): string {
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
}
```

Replace it with just:

```ts
const MAX_MEDIA_FILE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ACCEPTED_VIDEO_MIME_TYPES = new Set(["video/mp4", "video/quicktime"]);
const PHOTO_FILE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
const VIDEO_FILE_ACCEPT = "video/mp4,video/quicktime,.mp4,.mov";
```

(`AvailabilityDraftSlot` now comes from the import added in Step 1. `toLocalInputValue` likewise. `getNextHourLocalInputValue`, `getTwoHoursFromNowLocalInputValue`, `startOfDay`, `endOfDay`, `startOfWeek`, `monthLabel`, `CalendarView`, and `WEEK_DAYS` are all fully deleted — every one of their usages was inside the step-4 calendar/form code being replaced in Step 6, confirmed by grepping the file before writing this plan.)

- [ ] **Step 3: Simplify the Step 4 state block**

Find:

```ts
  // Step 4: availability
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilityDraftSlot[]>([]);
  const [slotStartsAt, setSlotStartsAt] = useState(getNextHourLocalInputValue);
  const [slotEndsAt, setSlotEndsAt] = useState(getTwoHoursFromNowLocalInputValue);
  const [slotCapacity, setSlotCapacity] = useState("1");
  const [slotPrice, setSlotPrice] = useState("");
  const [slotCurrency, setSlotCurrency] = useState("KES");
  const [slotMeetingPlaceMode, setSlotMeetingPlaceMode] = useState<"existing" | "new">("existing");
  const [slotMeetingPlace, setSlotMeetingPlace] = useState("");
  const [newMeetingPlace, setNewMeetingPlace] = useState("");
  const [knownMeetingPlaces, setKnownMeetingPlaces] = useState<string[]>([]);
  const [editingLocalSlotId, setEditingLocalSlotId] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  const [calendarCursor, setCalendarCursor] = useState(new Date());
  const [submitError, setSubmitError] = useState<string | null>(null);
```

Replace with:

```ts
  // Step 4: availability
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilityDraftSlot[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
```

- [ ] **Step 4: Delete the calendar memos and inline `parseNumericInput`, keep only the numeric derivations still needed for validation**

Find:

```ts
  const currentStep = stepMeta[stepIndex];
  const isLast = stepIndex === stepMeta.length - 1;
  const parseNumericInput = (value: string): number => {
    const sanitized = value.replace(/[^\d.]/g, "");
    return Number.parseFloat(sanitized);
  };
  const durationHoursNumber = Number.parseInt(durationHours, 10);
  const standardPriceNumber = parseNumericInput(hourlyRate);
  const maxGuestsNumber = Number.parseInt(maxGuests.replace(/[^\d]/g, ""), 10);
  const estimatedHostEarnings =
    standardPriceNumber > 0 &&
    Number.isFinite(maxGuestsNumber) &&
    maxGuestsNumber > 0
      ? standardPriceNumber * maxGuestsNumber
      : 0;
  const activeAvailabilitySlots = useMemo(
    () => availabilitySlots.filter((slot) => !slot.isCancelled),
    [availabilitySlots],
  );
  const availableMeetingPlaces = useMemo(() => {
    const draftPlaces = availabilitySlots
      .map((slot) => slot.meetingPlaceName.trim())
      .filter((name) => name.length > 0);
    return Array.from(new Set([...knownMeetingPlaces, ...draftPlaces])).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [availabilitySlots, knownMeetingPlaces]);
```

then continuing all the way through the end of the `yearMonths` block (the calendar grid memos — everything up to, but not including, `async function persistDraftExperience`). Replace that entire span with:

```ts
  const currentStep = stepMeta[stepIndex];
  const isLast = stepIndex === stepMeta.length - 1;
  const durationHoursNumber = Number.parseInt(durationHours, 10);
  const standardPriceNumber = parseNumericInput(hourlyRate);
  const maxGuestsNumber = Number.parseInt(maxGuests.replace(/[^\d]/g, ""), 10);
```

Before saving, run `grep -n "activeAvailabilitySlots\|availableMeetingPlaces\|estimatedHostEarnings\|activeSlotsForCalendar\|selectedDayStart\|selectedWeekStart\|selectedMonthStart\|selectedMonthGridStart\|selectedYear\|weekEnd\|weekRangeLabel\|daySlots\|weekDays\|weekRowBlocks\|weekGrid\|monthGridDays\|yearMonths" app/account/experiences/create/page.tsx` to confirm zero remaining references (there should be none — all consumers were in the step-4 JSX block replaced in Step 6).

- [ ] **Step 5: Delete `moveCalendarCursor`**

Find and delete this entire function (it sits between `getPrimaryCategoryLabel`'s neighborhood and `getDescriptorLabel`, right after `goNext`):

```ts
  function moveCalendarCursor(direction: "prev" | "next") {
    const delta = direction === "next" ? 1 : -1;
    setCalendarCursor((prev) => {
      const next = new Date(prev);
      if (calendarView === "day") {
        next.setDate(next.getDate() + delta);
      } else if (calendarView === "week") {
        next.setDate(next.getDate() + delta * 7);
      } else if (calendarView === "month") {
        next.setMonth(next.getMonth() + delta);
      } else {
        next.setFullYear(next.getFullYear() + delta);
      }
      return next;
    });
  }

```

Replace with nothing (delete the whole block, including its trailing blank line).

- [ ] **Step 6: Replace the slot-form handlers with three simple mutators**

Find:

```ts
  function resetAvailabilityForm() {
    setSlotStartsAt(getNextHourLocalInputValue());
    setSlotEndsAt(getTwoHoursFromNowLocalInputValue());
    setSlotCapacity("1");
    setSlotPrice("");
    setSlotCurrency(currency || "KES");
    if (availableMeetingPlaces.length > 0) {
      setSlotMeetingPlaceMode("existing");
      setSlotMeetingPlace(availableMeetingPlaces[0]);
      setNewMeetingPlace("");
    } else {
      setSlotMeetingPlaceMode("new");
      setSlotMeetingPlace("");
      setNewMeetingPlace("");
    }
    setEditingLocalSlotId(null);
  }

  function addOrUpdateAvailabilitySlot() {
    const starts = new Date(slotStartsAt);
    const ends = new Date(slotEndsAt);
    const cap = Number.parseInt(slotCapacity, 10);
    const price = slotPrice.trim() ? Number.parseFloat(slotPrice) : 0;
    const meetingPlaceName =
      slotMeetingPlaceMode === "existing" ? slotMeetingPlace.trim() : newMeetingPlace.trim();

    if (!Number.isFinite(starts.getTime()) || !Number.isFinite(ends.getTime())) {
      setSubmitError("Please set a valid start and end for availability.");
      return;
    }
    if (ends <= starts) {
      setSubmitError("Availability end time must be after start time.");
      return;
    }
    if (!Number.isFinite(cap) || cap <= 0) {
      setSubmitError("Availability capacity must be greater than zero.");
      return;
    }
    if (slotPrice.trim() && (!Number.isFinite(price) || price < 0)) {
      setSubmitError("Availability price override must be zero or higher.");
      return;
    }
    if (!meetingPlaceName) {
      setSubmitError("Please select or create a meeting place for this slot.");
      return;
    }

    const collides = availabilitySlots.some((slot) => {
      if (slot.isCancelled) return false;
      if (editingLocalSlotId && slot.localId === editingLocalSlotId) return false;
      const existingStart = new Date(slot.startsAt);
      const existingEnd = new Date(slot.endsAt);
      if (!Number.isFinite(existingStart.getTime()) || !Number.isFinite(existingEnd.getTime())) {
        return false;
      }
      return starts < existingEnd && ends > existingStart;
    });
    if (collides) {
      setSubmitError("This slot overlaps another slot in your draft schedule.");
      return;
    }

    setSubmitError(null);
    if (editingLocalSlotId) {
      setAvailabilitySlots((prev) =>
        prev.map((slot) =>
          slot.localId === editingLocalSlotId
            ? {
              ...slot,
              startsAt: slotStartsAt,
              endsAt: slotEndsAt,
              capacity: String(cap),
              priceAmount: slotPrice.trim(),
              currency: slotCurrency,
              meetingPlaceName,
            }
            : slot,
        ),
      );
      if (slotMeetingPlaceMode === "new") {
        setKnownMeetingPlaces((prev) => Array.from(new Set([...prev, meetingPlaceName])));
      }
      resetAvailabilityForm();
      return;
    }

    setAvailabilitySlots((prev) => [
      ...prev,
      {
        localId: `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        startsAt: slotStartsAt,
        endsAt: slotEndsAt,
        capacity: String(cap),
        priceAmount: slotPrice.trim(),
        currency: slotCurrency,
        meetingPlaceName,
        isCancelled: false,
      },
    ]);
    if (slotMeetingPlaceMode === "new") {
      setKnownMeetingPlaces((prev) => Array.from(new Set([...prev, meetingPlaceName])));
    }
    resetAvailabilityForm();
  }

  function beginEditAvailabilitySlot(localId: string) {
    const slot = availabilitySlots.find((item) => item.localId === localId);
    if (!slot) return;
    setEditingLocalSlotId(slot.localId);
    setSlotStartsAt(slot.startsAt);
    setSlotEndsAt(slot.endsAt);
    setSlotCapacity(slot.capacity);
    setSlotPrice(slot.priceAmount);
    setSlotCurrency(slot.currency);
    const exists = availableMeetingPlaces.includes(slot.meetingPlaceName);
    if (exists) {
      setSlotMeetingPlaceMode("existing");
      setSlotMeetingPlace(slot.meetingPlaceName);
      setNewMeetingPlace("");
    } else {
      setSlotMeetingPlaceMode("new");
      setSlotMeetingPlace("");
      setNewMeetingPlace(slot.meetingPlaceName);
    }
  }

  function removeAvailabilitySlot(localId: string) {
    setAvailabilitySlots((prev) =>
      prev
        .map((slot) => (slot.localId === localId ? { ...slot, isCancelled: true } : slot)),
    );
    if (editingLocalSlotId === localId) {
      resetAvailabilityForm();
    }
  }
```

Replace with:

```ts
  function handleAddAvailabilitySlots(newSlots: AvailabilityDraftSlot[]) {
    setAvailabilitySlots((prev) => [...prev, ...newSlots]);
  }

  function handleUpdateAvailabilitySlot(localId: string, patch: Partial<AvailabilityDraftSlot>) {
    setAvailabilitySlots((prev) =>
      prev.map((slot) => (slot.localId === localId ? { ...slot, ...patch } : slot)),
    );
  }

  function handleRemoveAvailabilitySlot(localId: string) {
    setAvailabilitySlots((prev) =>
      prev.map((slot) => (slot.localId === localId ? { ...slot, isCancelled: true } : slot)),
    );
  }
```

- [ ] **Step 7: Add the "at least one slot" validation to `onFinish`**

Find (inside `onFinish`, right before `setSubmitError(null); setSubmitting(true);`):

```ts
    if (!expertise.trim() || expertise.trim().length < 10) {
      setSubmitError("Please add at least 10 characters in your expertise section.");
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
```

Replace with:

```ts
    if (!expertise.trim() || expertise.trim().length < 10) {
      setSubmitError("Please add at least 10 characters in your expertise section.");
      return;
    }

    if (availabilitySlots.filter((slot) => !slot.isCancelled).length === 0) {
      setSubmitError("Add at least one availability slot before publishing.");
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
```

- [ ] **Step 8: Clean up the edit-existing-experience load effect**

Find (inside the `loadExistingExperience` effect, right after `setAvailabilitySlots(...)`):

```ts
      setKnownMeetingPlaces(
        Array.from(
          new Set(
            (availabilityData ?? [])
              .map((slot) => String(slot.meeting_place_name ?? "").trim())
              .filter((name) => name.length > 0),
          ),
        ).sort((a, b) => a.localeCompare(b)),
      );
      const initialPlaces = Array.from(
        new Set(
          (availabilityData ?? [])
            .map((slot) => String(slot.meeting_place_name ?? "").trim())
            .filter((name) => name.length > 0),
        ),
      ).sort((a, b) => a.localeCompare(b));
      if (initialPlaces.length > 0) {
        setSlotMeetingPlaceMode("existing");
        setSlotMeetingPlace(initialPlaces[0]);
        setNewMeetingPlace("");
      } else {
        setSlotMeetingPlaceMode("new");
        setSlotMeetingPlace("");
      }
      setSlotCurrency(experience.currency ?? "KES");

      setStepIndex(1);
```

Replace with:

```ts
      setStepIndex(1);
```

(The new `AddSlotForm` derives its meeting-place default straight from the loaded `availabilitySlots` — see the `meetingPlaceHydratedRef` effect in `AddSlotForm.tsx` — so this manual sync is no longer needed. `setKnownMeetingPlaces`/`setSlotMeetingPlaceMode`/`setSlotMeetingPlace`/`setNewMeetingPlace`/`setSlotCurrency` no longer exist as state setters after Step 3, so this code would not compile if left in place.)

- [ ] **Step 9: Replace the Step 4 JSX with `<AvailabilityStep>`**

Find the JSX block that starts with `{stepIndex === 3 ? (` (immediately after the Step 3/Media JSX closes) and ends with the matching `) : null}` right before the wizard's Back/Continue/Submit button row (`{stepIndex === 0 ? null : (`). Read that whole span from the file first to get its exact current text (it is the large calendar + slot-form block — day/week/month/year view switcher, the "Configured slots" list, etc.) and replace the entire span with:

```tsx
          {stepIndex === 3 ? (
            <AvailabilityStep
              hourlyRate={hourlyRate}
              onHourlyRateChange={setHourlyRate}
              durationHours={durationHours}
              onDurationHoursChange={setDurationHours}
              currency={currency}
              maxGuestsNumber={maxGuestsNumber}
              slots={availabilitySlots}
              onAddSlots={handleAddAvailabilitySlots}
              onUpdateSlot={handleUpdateAvailabilitySlot}
              onRemoveSlot={handleRemoveAvailabilitySlot}
            />
          ) : null}
```

- [ ] **Step 10: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no output. If there are errors about unused imports/variables or missing identifiers, they mean a reference was missed in one of the steps above — find and fix it (do not silence with `eslint-disable` or `@ts-ignore`).

Run: `npm run lint`
Expected: no errors (warnings pre-existing elsewhere in the repo, if any, are out of scope).

- [ ] **Step 11: Commit**

```bash
git add app/account/experiences/create/page.tsx
git commit -m "refactor: wire the redesigned availability step into the create-experience wizard"
```

---

## Task 7: Manual QA in the browser

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (in the background, or in a separate terminal) and open `http://localhost:3000/account/experiences/create` in a browser, logged in as a host user.

- [ ] **Step 2: Walk the golden path**

1. Go through Steps 0-2 (Start, Experience, Media) to reach Step 4 ("Availability").
2. In "Standard pricing", set a price per person and duration.
3. In "Add a time slot": confirm the "Ends" field updates automatically as you change the start time or the standard duration, with no calendar visible anywhere on the page.
4. Click "Set a different length for this slot", change the end time, then click "Use the standard duration instead" — confirm it reverts to the auto-computed value.
5. Turn on "Repeat", select 2-3 weekday chips, set "For 3 weeks", click "Add up to N slots" — confirm multiple slots appear in "Your slots", grouped by date, in chronological order.
6. Add a slot whose time overlaps an existing one — confirm it's rejected with an inline message and not added.
7. Enable repeat again with a pattern where one occurrence overlaps an existing slot — confirm the notice reports a partial add ("Added X slots — skipped Y...").
8. Click "Customize price for this slot" on a new slot, set a price different from standard, add it — confirm the slots list shows that price instead of "Standard price".
9. Click "Edit" on an existing slot — confirm the form scrolls into view and pre-fills all fields correctly (including the price-override and different-length states if applicable), and that "Repeat" is hidden while editing.
10. Click "Remove" on a slot — confirm it's visually de-emphasized (not deleted from the list) and its Edit/Remove buttons become disabled.
11. Remove/cancel every slot, then try "Submit for review" — confirm it's blocked with "Add at least one availability slot before publishing."
12. Add one slot back, then submit — confirm the experience is created and you land on `/account/experiences`.
13. Open that experience via "Edit" (`?edit=<id>`) — confirm all previously-added slots load correctly into the new list, and that adding a new slot defaults "Meeting place" to the existing one.

- [ ] **Step 3: Check the "Number of people" wording**

Confirm the word "Capacity" does not appear anywhere in Step 4 — it should read "Number of people" in the add-slot form and "N people" in the slots list.

- [ ] **Step 4: Report results**

Note any visual or behavioral issues found during the walkthrough and fix them before considering this plan complete; re-run the relevant parts of Step 2 after each fix.

---

## Self-Review Notes

- **Spec coverage:** calendar removed (Task 6 Step 9); repeat/bulk add (Task 4); "Google Forms" progressive single-panel with icon-led sections (Task 4 JSX); two-tier pricing with hidden-by-default override + live total (Task 4/5); "Number of people" wording (Task 3/4/5 — "Capacity" appears nowhere in the new components); grouped chronological slots list (Task 3); at-least-one-slot validation (Task 6 Step 7); edit-flow data hydration preserved without the deleted `knownMeetingPlaces`/`slotMeetingPlaceMode` state (Task 6 Step 8, `AddSlotForm`'s `meetingPlaceHydratedRef` effect).
- **Placeholder scan:** no TBD/TODO markers; every step has complete code or an exact grep/verification command with an expected result.
- **Type consistency:** `AvailabilityDraftSlot` is defined once (Task 1) and imported everywhere else — checked that `capacity`/`priceAmount`/`currency`/`meetingPlaceName` field names match between `slotUtils.ts`, `AddSlotForm.tsx`, `SlotsList.tsx`, and the untouched `onFinish` normalization code in `page.tsx`.

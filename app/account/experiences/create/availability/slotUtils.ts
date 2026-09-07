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

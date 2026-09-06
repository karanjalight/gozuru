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

"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";

type CalendarView = "day" | "week" | "month" | "year";

type HostExperienceRow = {
  id: string;
  title: string;
  status: string;
};

type AvailabilityRow = {
  id: string;
  experience_id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  is_cancelled: boolean;
};

type CalendarEvent = {
  id: string;
  experienceId: string;
  experienceTitle: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
};

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function formatHourBlockLabel(startHour: number): string {
  const endHour = startHour + 2;
  const fmt = (hour: number) => {
    const normalized = hour % 24;
    const suffix = normalized >= 12 ? "PM" : "AM";
    const display = normalized % 12 === 0 ? 12 : normalized % 12;
    return `${display}${suffix}`;
  };
  return `${fmt(startHour)} - ${fmt(endHour)}`;
}

export default function AccountCalendarPage() {
  const { user } = useAuth();
  const [view, setView] = useState<CalendarView>("week");
  const [cursor, setCursor] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [experiences, setExperiences] = useState<HostExperienceRow[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: experienceRows, error: experiencesError } = await supabase
        .from("experiences")
        .select("id,title,status")
        .eq("host_user_id", user.id)
        .order("created_at", { ascending: false });

      if (!mounted) return;
      if (experiencesError) {
        setError(experiencesError.message);
        setLoading(false);
        return;
      }

      const nextExperiences = (experienceRows ?? []) as HostExperienceRow[];
      setExperiences(nextExperiences);
      const ids = nextExperiences.map((exp) => exp.id);

      if (ids.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const { data: slotRows, error: slotsError } = await supabase
        .from("experience_availability")
        .select("id,experience_id,starts_at,ends_at,capacity,is_cancelled")
        .in("experience_id", ids)
        .eq("is_cancelled", false)
        .order("starts_at", { ascending: true });

      if (!mounted) return;
      if (slotsError) {
        setError(slotsError.message);
        setLoading(false);
        return;
      }

      const titleById = new Map(nextExperiences.map((exp) => [exp.id, exp.title]));
      const mapped = ((slotRows ?? []) as AvailabilityRow[]).map((slot) => ({
        id: slot.id,
        experienceId: slot.experience_id,
        experienceTitle: titleById.get(slot.experience_id) ?? "Untitled experience",
        startsAt: new Date(slot.starts_at),
        endsAt: new Date(slot.ends_at),
        capacity: slot.capacity,
      }));
      setEvents(mapped);
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [user]);

  const selectedWeekStart = startOfWeek(cursor);
  const weekEnd = new Date(selectedWeekStart);
  weekEnd.setDate(selectedWeekStart.getDate() + 6);
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthGridStart = startOfWeek(monthStart);
  const selectedYear = cursor.getFullYear();

  const dayEvents = useMemo(
    () => events.filter((event) => event.startsAt <= endOfDay(cursor) && event.endsAt >= startOfDay(cursor)),
    [events, cursor],
  );

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, idx) => {
        const date = new Date(selectedWeekStart);
        date.setDate(selectedWeekStart.getDate() + idx);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        const dayEventsForDate = events.filter((event) => event.startsAt <= dayEnd && event.endsAt >= dayStart);
        return { date, events: dayEventsForDate };
      }),
    [events, selectedWeekStart],
  );

  const weekGridRows = useMemo(
    () =>
      Array.from({ length: 12 }, (_, rowIndex) => {
        const startHour = rowIndex * 2;
        const columns = weekDays.map((day) => {
          const rowStart = startOfDay(day.date);
          rowStart.setHours(startHour, 0, 0, 0);
          const rowEnd = startOfDay(day.date);
          rowEnd.setHours(startHour + 2, 0, 0, 0);
          const rowEvents = day.events.filter((event) => event.startsAt < rowEnd && event.endsAt > rowStart);
          return { date: day.date, events: rowEvents };
        });
        return { rowIndex, label: formatHourBlockLabel(startHour), columns };
      }),
    [weekDays],
  );

  const monthDays = useMemo(
    () =>
      Array.from({ length: 42 }, (_, idx) => {
        const date = new Date(monthGridStart);
        date.setDate(monthGridStart.getDate() + idx);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        const dayEventsForDate = events.filter((event) => event.startsAt <= dayEnd && event.endsAt >= dayStart);
        return { date, events: dayEventsForDate };
      }),
    [events, monthGridStart],
  );

  const yearMonths = useMemo(
    () =>
      Array.from({ length: 12 }, (_, monthIndex) => {
        const yearMonthStart = new Date(selectedYear, monthIndex, 1);
        const monthEnd = new Date(selectedYear, monthIndex + 1, 0, 23, 59, 59, 999);
        const monthEvents = events.filter(
          (event) => event.startsAt <= monthEnd && event.endsAt >= yearMonthStart,
        );
        const miniStart = startOfWeek(yearMonthStart);
        const miniDays = Array.from({ length: 35 }, (_, idx) => {
          const date = new Date(miniStart);
          date.setDate(miniStart.getDate() + idx);
          const inMonth = date.getMonth() === yearMonthStart.getMonth();
          const count = monthEvents.filter(
            (event) => startOfDay(event.startsAt).getTime() === startOfDay(date).getTime(),
          ).length;
          return { date, inMonth, count };
        });
        return { yearMonthStart, monthEvents, miniDays };
      }),
    [events, selectedYear],
  );

  function moveCursor(direction: "prev" | "next") {
    const delta = direction === "next" ? 1 : -1;
    setCursor((prev) => {
      const next = new Date(prev);
      if (view === "day") next.setDate(next.getDate() + delta);
      else if (view === "week") next.setDate(next.getDate() + delta * 7);
      else if (view === "month") next.setMonth(next.getMonth() + delta);
      else next.setFullYear(next.getFullYear() + delta);
      return next;
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All your created experiences and schedules in one view.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-semibold text-muted-foreground">
          <CalendarDays className="size-3.5" />
          {experiences.length} experiences • {events.length} active slots
        </div>
      </div>

      <Card className="rounded-3xl border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">
            {view === "week"
              ? `${selectedWeekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
              : view === "month"
                ? cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
                : view === "year"
                  ? String(selectedYear)
                  : cursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => moveCursor("prev")}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setCursor(new Date())}>
              Today
            </Button>
            <div className="inline-flex rounded-full border border-border bg-muted/40 p-1">
              {(["day", "week", "month", "year"] as CalendarView[]).map((calendarView) => (
                <button
                  key={calendarView}
                  type="button"
                  onClick={() => setView(calendarView)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize transition ${
                    view === calendarView
                      ? "bg-black text-white"
                      : "text-muted-foreground hover:bg-background"
                  }`}
                >
                  {calendarView}
                </button>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => moveCursor("next")}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading schedules...</p>
          ) : error ? (
            <p className="text-sm text-red-500">Failed to load calendar: {error}</p>
          ) : null}

          {!loading && !error && view === "day" ? (
            <div className="rounded-2xl border">
              <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-3">
                <p className="text-sm font-semibold">
                  {cursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                </p>
                <p className="text-xs text-muted-foreground">{dayEvents.length} event(s)</p>
              </div>
              <div className="max-h-[380px] space-y-2 overflow-y-auto p-4">
                {dayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No schedules on this day.</p>
                ) : (
                  dayEvents.map((event) => (
                    <div key={event.id} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                      <p className="text-sm font-semibold">{event.experienceTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} -{" "}
                        {event.endsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} • Capacity {event.capacity}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {!loading && !error && view === "week" ? (
            <div className="overflow-auto rounded-2xl border">
              <div className="grid min-w-[900px] grid-cols-[120px_repeat(7,minmax(110px,1fr))]">
                <div className="border-b border-r bg-muted/20 p-3 text-xs font-semibold text-muted-foreground">
                  Time
                </div>
                {weekDays.map((day) => (
                  <div key={day.date.toISOString()} className="border-b border-r bg-muted/20 p-3 text-center">
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                      {day.date.toLocaleDateString(undefined, { weekday: "short" })}
                    </p>
                    <p className="text-sm font-semibold">{day.date.getDate()}</p>
                  </div>
                ))}
                {weekGridRows.map((row) => (
                  <div key={row.rowIndex} className="contents">
                    <div className="border-b border-r bg-muted/10 p-3 text-[11px] text-muted-foreground">
                      {row.label}
                    </div>
                    {row.columns.map((column) => (
                      <div key={`${column.date.toISOString()}-${row.rowIndex}`} className="min-h-16 border-b border-r p-1.5">
                        {column.events.slice(0, 2).map((event) => (
                          <div key={`${event.id}-${row.rowIndex}`} className="mb-1 rounded-md bg-emerald-100 px-2 py-1 text-[10px] text-emerald-900">
                            <p className="truncate font-semibold">{event.experienceTitle}</p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!loading && !error && view === "month" ? (
            <div className="rounded-2xl border">
              <div className="grid grid-cols-7 border-b bg-muted/20">
                {WEEK_DAYS.map((label) => (
                  <p key={label} className="p-2 text-center text-[11px] font-semibold uppercase text-muted-foreground">
                    {label}
                  </p>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthDays.map((day) => {
                  const inMonth = day.date.getMonth() === cursor.getMonth();
                  return (
                    <div key={day.date.toISOString()} className={`min-h-[96px] border-b border-r p-2 ${inMonth ? "bg-background" : "bg-muted/25 text-muted-foreground"}`}>
                      <p className="text-xs font-semibold">{day.date.getDate()}</p>
                      <div className="mt-1 space-y-1">
                        {day.events.slice(0, 2).map((event) => (
                          <div key={event.id} className="rounded-md bg-emerald-100 px-2 py-1 text-[10px] text-emerald-900">
                            {event.experienceTitle}
                          </div>
                        ))}
                        {day.events.length > 2 ? (
                          <p className="text-[10px] text-muted-foreground">+{day.events.length - 2} more</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {!loading && !error && view === "year" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {yearMonths.map((month) => (
                <div key={month.yearMonthStart.toISOString()} className="rounded-xl border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      {month.yearMonthStart.toLocaleDateString(undefined, { month: "long" })}
                    </p>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                      {month.monthEvents.length} slots
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {month.miniDays.map((day) => (
                      <div key={day.date.toISOString()} className={`rounded px-1 py-1 text-[10px] ${day.inMonth ? "text-foreground" : "text-muted-foreground/60"}`}>
                        <span className={day.count > 0 ? "font-semibold text-emerald-700" : ""}>{day.date.getDate()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}


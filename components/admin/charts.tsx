"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RevenuePoint, StatusCount } from "@/lib/admin/types";
import { formatCompactMoney, formatMoney, humanizeStatus } from "@/components/admin/ui/format";

export const CHART_PALETTE = [
  "#f97316", // orange-500
  "#10b981", // emerald-500
  "#0ea5e9", // sky-500
  "#8b5cf6", // violet-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
];

const AXIS_COLOR = "var(--color-muted-foreground)";

function ChartTooltip({
  active,
  label,
  rows,
}: {
  active?: boolean;
  label?: string;
  rows: { name: string; value: string; color?: string }[];
}) {
  if (!active) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lg ring-1 ring-foreground/5">
      {label && <p className="mb-1 font-semibold text-popover-foreground">{label}</p>}
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-2">
          {r.color && <span className="size-2 rounded-full" style={{ backgroundColor: r.color }} />}
          <span className="text-muted-foreground">{r.name}</span>
          <span className="ml-auto font-medium text-popover-foreground tabular-nums">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function shortDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

export function RevenueAreaChart({
  data,
  metric,
}: {
  data: RevenuePoint[];
  metric: "revenue" | "bookings";
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="day"
          tickFormatter={shortDay}
          tick={{ fontSize: 11, fill: AXIS_COLOR }}
          tickLine={false}
          axisLine={false}
          minTickGap={28}
        />
        <YAxis
          tick={{ fontSize: 11, fill: AXIS_COLOR }}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v) => (metric === "revenue" ? formatCompactMoney(v) : String(v))}
        />
        <Tooltip
          cursor={{ stroke: "#f97316", strokeWidth: 1, strokeOpacity: 0.3 }}
          content={({ active, label, payload }) => (
            <ChartTooltip
              active={active}
              label={label ? shortDay(String(label)) : undefined}
              rows={[
                {
                  name: metric === "revenue" ? "Revenue" : "Bookings",
                  value:
                    metric === "revenue"
                      ? formatMoney(Number(payload?.[0]?.value ?? 0))
                      : String(payload?.[0]?.value ?? 0),
                  color: "#f97316",
                },
              ]}
            />
          )}
        />
        <Area
          type="monotone"
          dataKey={metric}
          stroke="#f97316"
          strokeWidth={2}
          fill="url(#revFill)"
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StatusDonut({
  data,
  kind = "count",
}: {
  data: StatusCount[];
  kind?: "count";
}) {
  const total = data.reduce((sum, d) => sum + Number(d.count), 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry, i) => (
                <Cell key={entry.status} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => (
                <ChartTooltip
                  active={active}
                  rows={
                    payload?.[0]
                      ? [
                          {
                            name: humanizeStatus(String(payload[0].payload.status)),
                            value: `${payload[0].value} (${
                              total ? Math.round((Number(payload[0].value) / total) * 100) : 0
                            }%)`,
                            color: payload[0].payload.fill,
                          },
                        ]
                      : []
                  }
                />
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums">{total.toLocaleString("en-KE")}</span>
          <span className="text-xs text-muted-foreground">total</span>
        </div>
      </div>

      <ul className="grid w-full grid-cols-1 gap-2 sm:grid-cols-1">
        {data.map((entry, i) => (
          <li key={entry.status} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length] }}
            />
            <span className="flex-1 truncate text-muted-foreground">
              {humanizeStatus(entry.status)}
            </span>
            <span className="font-medium tabular-nums">{entry.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatusBarChart({ data }: { data: StatusCount[] }) {
  const chartData = data.map((d) => ({ ...d, label: humanizeStatus(d.status) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        barCategoryGap={10}
      >
        <XAxis type="number" tick={{ fontSize: 11, fill: AXIS_COLOR }} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={90}
          tick={{ fontSize: 11, fill: AXIS_COLOR }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
          content={({ active, payload }) => (
            <ChartTooltip
              active={active}
              rows={
                payload?.[0]
                  ? [{ name: String(payload[0].payload.label), value: String(payload[0].value) }]
                  : []
              }
            />
          )}
        />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
          {chartData.map((entry, i) => (
            <Cell key={entry.status} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

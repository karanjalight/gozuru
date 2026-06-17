import {
  type PlatformStat,
  type PieSegment,
} from "@/app/(landing)/lib/investments";
import { cn } from "@/lib/utils";

const CHART_HEIGHT = 80;

function LineChart({ series, highlightedIndex }: { series: number[]; highlightedIndex?: number }) {
  const width = 280;
  const height = CHART_HEIGHT;
  const padding = 4;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;

  const points = series.map((value, index) => {
    const x = padding + (index / (series.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y, value, index };
  });

  const path = points.map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${path} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
  const highlight = highlightedIndex !== undefined ? points[highlightedIndex] : points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-20 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={areaPath} className="fill-white/20" />
      <path
        d={path}
        fill="none"
        className="stroke-white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={highlight.x}
        cy={highlight.y}
        r="4"
        className="fill-white stroke-orange-400"
        strokeWidth="2"
      />
    </svg>
  );
}

function BarChart({ series, highlightedIndex }: { series: number[]; highlightedIndex?: number }) {
  const max = Math.max(...series);

  return (
    <div className="flex h-20 items-end gap-1" aria-hidden>
      {series.map((height, index) => {
        const isHighlighted = highlightedIndex === index;
        const barHeight = `${(height / max) * 100}%`;

        return (
          <div key={index} className="flex flex-1 flex-col items-center justify-end h-full">
            <div
              className={cn(
                "relative w-full rounded-sm transition-colors",
                isHighlighted ? "bg-white" : "bg-white/30",
              )}
              style={{ height: barHeight, minHeight: "4px" }}
            >
              {isHighlighted ? (
                <div className="absolute -top-1 left-0 right-0 h-1 bg-white/80" />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PieChart({ segments, centerLabel }: { segments: PieSegment[]; centerLabel: string }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const size = 80;
  const radius = 30;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className="flex h-20 items-center justify-center" aria-hidden>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          className="stroke-white/30"
          strokeWidth="10"
        />
        {segments.map((segment, index) => {
          const length = (segment.value / total) * circumference;
          const circle = (
            <circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              className={index === 0 ? "stroke-white" : "stroke-white/40"}
              strokeWidth="10"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${center} ${center})`}
            />
          );
          offset += length;
          return circle;
        })}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-white text-[10px] font-bold"
        >
          {centerLabel}
        </text>
      </svg>
    </div>
  );
}

function StatChart({ stat }: { stat: PlatformStat }) {
  if (stat.chartType === "line") {
    return <LineChart series={stat.series} highlightedIndex={stat.highlightedIndex} />;
  }

  if (stat.chartType === "bar") {
    return <BarChart series={stat.series} highlightedIndex={stat.highlightedIndex} />;
  }

  if (stat.pieSegments?.length) {
    return <PieChart segments={stat.pieSegments} centerLabel={stat.value} />;
  }

  return null;
}

export function InvestmentStatCard({ stat }: { stat: PlatformStat }) {
  return (
    <article className="flex flex-col rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm sm:p-6">
      <p className="text-sm text-white/80">{stat.label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {stat.value}
      </p>

      <div className="mt-auto pt-8">
        <StatChart stat={stat} />
      </div>
    </article>
  );
}

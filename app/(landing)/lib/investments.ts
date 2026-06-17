export type ChartType = "line" | "bar" | "pie";

export type PieSegment = {
  value: number;
  className: string;
};

export type PlatformStat = {
  id: string;
  label: string;
  value: string;
  chartType: ChartType;
  series: number[];
  highlightedIndex?: number;
  pieSegments?: PieSegment[];
};

export type FeaturedEvent = {
  id: string;
  name: string;
  location: string;
  category: string;
  durationHours: number;
  maxAttendees: number;
  description: string;
  image: string;
  attendeeCount: number;
  rating: number;
  satisfactionPercent: number;
};

export const PLATFORM_STATS: PlatformStat[] = [
  {
    id: "positive-feedback",
    label: "Positive traveler feedback",
    value: "97%",
    chartType: "line",
    series: [88, 90, 91, 93, 94, 95, 96, 97],
    highlightedIndex: 7,
  },
  {
    id: "expert-satisfaction",
    label: "Expert satisfaction score",
    value: "4.9",
    chartType: "bar",
    series: [42, 48, 52, 58, 64, 72, 81, 92],
    highlightedIndex: 7,
  },
  {
    id: "repeat-bookings",
    label: "Travelers who rebook",
    value: "68%",
    chartType: "pie",
    series: [],
    pieSegments: [
      { value: 68, className: "stroke-foreground" },
      { value: 22, className: "stroke-muted-foreground" },
      { value: 10, className: "stroke-border" },
    ],
  },
];

export const FEATURED_EVENTS: FeaturedEvent[] = [
  {
    id: "nairobi-travel-expo",
    name: "Nairobi Travel & Culture Expo",
    location: "Kenya/Nairobi/KICC",
    category: "Expo",
    durationHours: 6,
    maxAttendees: 500,
    description:
      "Meet Gozuru experts, hotel partners, and fellow travelers at East Africa's largest curiosity-driven travel gathering — keynotes, tastings, and live bookings.",
    image: "https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg",
    attendeeCount: 480,
    rating: 4.9,
    satisfactionPercent: 98,
  },
  {
    id: "hotel-partner-series",
    name: "Hotel Partner Welcome Series",
    location: "Multiple cities worldwide",
    category: "Hotel visit",
    durationHours: 2,
    maxAttendees: 12,
    description:
      "Exclusive behind-the-scenes visits at partner hotels — meet the concierge team, explore signature spaces, and connect with a local Gozuru expert on arrival.",
    image: "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg",
    attendeeCount: 2400,
    rating: 4.8,
    satisfactionPercent: 96,
  },
  {
    id: "curators-meetup",
    name: "Curators' Monthly Meetup",
    location: "Global · rotating cities",
    category: "Meetup",
    durationHours: 3,
    maxAttendees: 30,
    description:
      "A relaxed social evening where travelers swap stories, experts share insider tips, and the Gozuru community grows one conversation at a time.",
    image: "https://images.pexels.com/photos/1267696/pexels-photo-1267696.jpeg",
    attendeeCount: 860,
    rating: 5.0,
    satisfactionPercent: 99,
  },
];

export function formatAttendeeCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1).replace(/\.0$/, "")}k+`;
  }
  return `${count}+`;
}

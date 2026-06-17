import type { ExperienceGalleryItem } from "@/components/experience/ExperienceMediaCarousel";
import type {
  ExperienceBookingExperience,
  ExperienceBookingSlot,
} from "@/components/experience/ExperienceBookingPanel";

export type SampleEventReview = {
  id: string;
  name: string;
  rating: number;
  reviewText: string;
  createdAt: string;
  avatarUrl: string;
};

export type SampleEventOrganizer = {
  id: string;
  name: string;
  headline: string;
  expertise: string;
  highlightStory: string;
  avatarUrl: string;
};

export type SampleEvent = {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  priceFrom: number;
  currency: string;
  location: string;
  city: string;
  countryRegion: string;
  durationHours: number;
  maxAttendees: number;
  minAge: number;
  meetingPoint: string;
  description: string;
  includes: string[];
  requirements: string[];
  cancellationPolicy: string;
  images: string[];
  organizer: SampleEventOrganizer;
  reviews: SampleEventReview[];
  slotTimes: Array<{ hour: number; minute: number }>;
  ratingAverage: number;
  ratingCount: number;
  attendeeCount: number;
  satisfactionPercent: number;
};

export type ResolvedSampleEvent = SampleEvent & {
  galleryMedia: ExperienceGalleryItem[];
  bookingExperience: ExperienceBookingExperience;
  availability: ExperienceBookingSlot[];
  confirmedGuestsBySlotId: Record<string, number>;
};

export const SAMPLE_EVENT_SLUGS = [
  "nairobi-travel-expo",
  "hotel-partner-series",
  "curators-meetup",
] as const;

function toGalleryMedia(title: string, images: string[]): ExperienceGalleryItem[] {
  return images.map((url, index) => ({
    url,
    previewUrl: url,
    mediaType: "image" as const,
    alt: `${title} photo ${index + 1}`,
  }));
}

function buildSampleSlots(
  slug: string,
  durationHours: number,
  maxAttendees: number,
  price: number,
  slotTimes: Array<{ hour: number; minute: number }>,
): { availability: ExperienceBookingSlot[]; confirmedGuestsBySlotId: Record<string, number> } {
  const availability: ExperienceBookingSlot[] = [];
  const confirmedGuestsBySlotId: Record<string, number> = {};
  const now = new Date();

  for (let dayOffset = 1; dayOffset <= 12; dayOffset += 1) {
    for (const time of slotTimes) {
      const startsAt = new Date(now);
      startsAt.setDate(now.getDate() + dayOffset);
      startsAt.setHours(time.hour, time.minute, 0, 0);

      const endsAt = new Date(startsAt);
      endsAt.setHours(startsAt.getHours() + durationHours);

      const slotId = `${slug}-${dayOffset}-${time.hour}${time.minute}`;
      const partiallyBooked = dayOffset % 5 === 0;

      availability.push({
        id: slotId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        capacity: maxAttendees,
        price_amount: price,
        currency: "KES",
        meeting_place_name: null,
      });

      if (partiallyBooked) {
        confirmedGuestsBySlotId[slotId] = Math.max(1, Math.floor(maxAttendees * 0.45));
      }
    }
  }

  return { availability, confirmedGuestsBySlotId };
}

const SAMPLE_EVENTS: SampleEvent[] = [
  {
    slug: "nairobi-travel-expo",
    title: "Nairobi Travel & Culture Expo",
    subtitle: "East Africa's largest curiosity-driven travel gathering.",
    category: "Expo",
    priceFrom: 30,
    currency: "KES",
    location: "Kenya/Nairobi/KICC",
    city: "Nairobi",
    countryRegion: "Kenya",
    durationHours: 6,
    maxAttendees: 500,
    minAge: 12,
    meetingPoint: "KICC main entrance, Gozuru registration desk",
    description:
      "Meet Gozuru experts, hotel partners, and fellow travelers at East Africa's largest curiosity-driven travel gathering. The expo features keynotes on sustainable tourism, live hotel partner showcases, expert-led destination previews, tasting lounges, and on-the-spot booking desks for upcoming experiences across the continent.",
    includes: [
      "Full-day expo floor access",
      "Opening keynote session",
      "Partner pavilion tour",
      "Welcome tote and show guide",
      "Access to Gozuru lounge",
    ],
    requirements: [
      "Government-issued ID for badge pickup",
      "Comfortable walking shoes",
      "Reusable water bottle encouraged",
    ],
    cancellationPolicy: "Tickets are transferable up to 48 hours before the event.",
    images: [
      "https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg",
      "https://images.pexels.com/photos/2775168/pexels-photo-2775168.jpeg",
      "https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg",
      "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg",
    ],
    organizer: {
      id: "gozuru-events",
      name: "Gozuru Events Team",
      headline: "Expo producers & community leads",
      expertise: "Large-format travel events, exhibitor curation, and on-site guest experience.",
      highlightStory:
        "The Gozuru Events Team brings together travelers, hotel partners, and local experts for flagship gatherings across Africa and beyond.",
      avatarUrl: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg",
    },
    reviews: [
      {
        id: "nte-1",
        name: "Amina H.",
        rating: 5,
        reviewText: "Incredible energy — I booked two hotel visits and a meetup before leaving the expo floor.",
        createdAt: "2026-02-10T10:00:00.000Z",
        avatarUrl: "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg",
      },
    ],
    slotTimes: [
      { hour: 9, minute: 0 },
      { hour: 11, minute: 0 },
    ],
    ratingAverage: 4.9,
    ratingCount: 480,
    attendeeCount: 480,
    satisfactionPercent: 98,
  },
  {
    slug: "hotel-partner-series",
    title: "Hotel Partner Welcome Series",
    subtitle: "Exclusive behind-the-scenes visits at partner hotels worldwide.",
    category: "Hotel visit",
    priceFrom: 85,
    currency: "KES",
    location: "Multiple cities worldwide",
    city: "Global",
    countryRegion: "Multiple cities",
    durationHours: 2,
    maxAttendees: 12,
    minAge: 16,
    meetingPoint: "Partner hotel lobby — details sent after booking",
    description:
      "Exclusive behind-the-scenes visits at partner hotels — meet the concierge team, explore signature suites and rooftop spaces, and connect with a local Gozuru expert on arrival. Each session is limited to twelve guests for an intimate, VIP-style welcome that reveals how world-class hospitality is crafted from check-in to farewell.",
    includes: [
      "Guided hotel walkthrough",
      "Concierge meet-and-greet",
      "Signature space access",
      "Welcome refreshment",
      "Expert Q&A session",
    ],
    requirements: [
      "Smart casual dress code",
      "Valid photo ID at check-in",
      "Closed-toe shoes for back-of-house areas",
    ],
    cancellationPolicy: "Free cancellation up to 24 hours before start time.",
    images: [
      "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg",
      "https://images.pexels.com/photos/261189/pexels-photo-261189.jpeg",
      "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg",
      "https://images.pexels.com/photos/189296/pexels-photo-189296.jpeg",
    ],
    organizer: {
      id: "amara-okonkwo",
      name: "Amara Okonkwo",
      headline: "Hotel & hospitality curator",
      expertise: "Luxury hotel partnerships, concierge culture, and welcome experiences.",
      highlightStory:
        "Amara curates the Hotel Partner Welcome Series, connecting travelers with the teams and spaces that define each property.",
      avatarUrl: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg",
    },
    reviews: [
      {
        id: "hps-1",
        name: "Robert L.",
        rating: 4.8,
        reviewText: "Felt like a VIP from the moment we walked in. The suite tour was unforgettable.",
        createdAt: "2026-01-20T10:00:00.000Z",
        avatarUrl: "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg",
      },
    ],
    slotTimes: [
      { hour: 10, minute: 0 },
      { hour: 14, minute: 30 },
      { hour: 17, minute: 0 },
    ],
    ratingAverage: 4.8,
    ratingCount: 240,
    attendeeCount: 2400,
    satisfactionPercent: 96,
  },
  {
    slug: "curators-meetup",
    title: "Curators' Monthly Meetup",
    subtitle: "A relaxed social evening for the Gozuru community.",
    category: "Meetup",
    priceFrom: 45,
    currency: "KES",
    location: "Global · rotating cities",
    city: "Rotating",
    countryRegion: "Global",
    durationHours: 3,
    maxAttendees: 30,
    minAge: 18,
    meetingPoint: "Venue shared 48 hours before the event",
    description:
      "A relaxed social evening where travelers swap stories, experts share insider tips, and the Gozuru community grows one conversation at a time. Each month we rotate cities and venues — from rooftop bars to gallery spaces — with facilitated intros, a short curator spotlight, and open networking over drinks and small bites.",
    includes: [
      "Welcome drink on arrival",
      "Facilitated introductions",
      "Curator spotlight talk",
      "Light bites",
      "Community photo and recap",
    ],
    requirements: [
      "Must be 18+",
      "Bring a business card or LinkedIn QR",
      "RSVP required for venue capacity",
    ],
    cancellationPolicy: "Free cancellation up to 12 hours before start time.",
    images: [
      "https://images.pexels.com/photos/1267696/pexels-photo-1267696.jpeg",
      "https://images.pexels.com/photos/115755/pexels-photo-115755.jpeg",
      "https://images.pexels.com/photos/3184296/pexels-photo-3184296.jpeg",
      "https://images.pexels.com/photos/2747446/pexels-photo-2747446.jpeg",
    ],
    organizer: {
      id: "thabo-mbeki",
      name: "Thabo Mbeki",
      headline: "Meetup & events host",
      expertise: "Community building, rooftop activations, and social event hosting.",
      highlightStory:
        "Thabo hosts the Curators' Monthly Meetup series, creating warm spaces where travelers and experts connect naturally.",
      avatarUrl: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg",
    },
    reviews: [
      {
        id: "cm-1",
        name: "Priya S.",
        rating: 5,
        reviewText: "Best networking event I've been to — zero awkwardness, all genuine conversation.",
        createdAt: "2026-03-02T10:00:00.000Z",
        avatarUrl: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg",
      },
    ],
    slotTimes: [
      { hour: 17, minute: 30 },
      { hour: 18, minute: 30 },
    ],
    ratingAverage: 5,
    ratingCount: 860,
    attendeeCount: 860,
    satisfactionPercent: 99,
  },
];

export function getSampleEvent(slug: string): ResolvedSampleEvent | null {
  const event = SAMPLE_EVENTS.find((item) => item.slug === slug);
  if (!event) return null;

  const { availability, confirmedGuestsBySlotId } = buildSampleSlots(
    event.slug,
    event.durationHours,
    event.maxAttendees,
    event.priceFrom,
    event.slotTimes,
  );

  return {
    ...event,
    galleryMedia: toGalleryMedia(event.title, event.images),
    bookingExperience: {
      id: event.slug,
      host_user_id: event.organizer.id,
      title: event.title,
      price_amount: event.priceFrom,
      currency: event.currency,
      max_guests: event.maxAttendees,
      cancellation_policy: event.cancellationPolicy,
    },
    availability,
    confirmedGuestsBySlotId,
  };
}

export function getSampleEventHref(slug: string): string {
  return `/sample-events/${slug}`;
}

export function getSampleEventTicketHref(slug: string): string {
  return `/sample-events/${slug}#book-experience`;
}

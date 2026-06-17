import type { ExperienceGalleryItem } from "@/components/experience/ExperienceMediaCarousel";
import type {
  ExperienceBookingExperience,
  ExperienceBookingSlot,
} from "@/components/experience/ExperienceBookingPanel";

export type SampleExperienceReview = {
  id: string;
  name: string;
  rating: number;
  reviewText: string;
  createdAt: string;
  avatarUrl: string;
};

export type SampleExperienceHost = {
  id: string;
  name: string;
  headline: string;
  expertise: string;
  highlightStory: string;
  avatarUrl: string;
};

export type SampleExperience = {
  slug: string;
  title: string;
  subtitle: string;
  category: "Hotel visit" | "Meetup" | "Social event" | "Expo" | "Expert session";
  priceFrom: number;
  currency: string;
  location: string;
  city: string;
  countryRegion: string;
  neighborhood: string;
  durationHours: number;
  maxGuests: number;
  minAge: number;
  meetingPoint: string;
  description: string;
  includes: string[];
  requirements: string[];
  cancellationPolicy: string;
  images: string[];
  host: SampleExperienceHost;
  reviews: SampleExperienceReview[];
  slotTimes: Array<{ hour: number; minute: number }>;
  ratingAverage: number;
  ratingCount: number;
};

export type ResolvedSampleExperience = SampleExperience & {
  galleryMedia: ExperienceGalleryItem[];
  bookingExperience: ExperienceBookingExperience;
  availability: ExperienceBookingSlot[];
  confirmedGuestsBySlotId: Record<string, number>;
};

export const SAMPLE_EXPERIENCE_SLUGS = [
  "four-seasons-insider",
  "rooftop-meetup",
  "travel-expo-preview",
  "marrakech-souk-walk",
  "harbour-dinner-series",
  "tokyo-neon-nights",
] as const;

export type SampleExperienceSlug = (typeof SAMPLE_EXPERIENCE_SLUGS)[number];

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
  maxGuests: number,
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
      const capacity = maxGuests;
      const partiallyBooked = dayOffset % 4 === 0 && time.hour === slotTimes[0]?.hour;

      availability.push({
        id: slotId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        capacity,
        price_amount: price,
        currency: "USD",
        meeting_place_name: null,
      });

      if (partiallyBooked) {
        confirmedGuestsBySlotId[slotId] = Math.max(1, Math.floor(capacity * 0.6));
      }
    }
  }

  return { availability, confirmedGuestsBySlotId };
}

const SAMPLE_EXPERIENCES: SampleExperience[] = [
  {
    slug: "four-seasons-insider",
    title: "Four Seasons Insider Tour",
    subtitle: "Behind-the-scenes access at one of Nairobi's most iconic luxury hotels.",
    category: "Hotel visit",
    priceFrom: 85,
    currency: "USD",
    location: "Kenya/Nairobi/Westlands",
    city: "Nairobi",
    countryRegion: "Kenya",
    neighborhood: "Westlands",
    durationHours: 2,
    maxGuests: 8,
    minAge: 16,
    meetingPoint: "Four Seasons Hotel Nairobi, main lobby",
    description:
      "Step beyond the velvet rope with Amara Okonkwo for a curated insider tour of the Four Seasons Nairobi. Explore the rooftop pool deck, pastry kitchen, signature suites, and hospitality operations that keep this property among the city's finest. You'll hear stories from the concierge team, taste a chef's amuse-bouche, and learn how luxury hotels craft memorable guest journeys from arrival to farewell.",
    includes: [
      "Guided lobby and suite walkthrough",
      "Rooftop pool and lounge access",
      "Pastry kitchen tasting",
      "Concierge Q&A session",
      "Welcome mocktail or coffee",
    ],
    requirements: [
      "Smart casual dress code",
      "Valid photo ID at check-in",
      "Closed-toe shoes for kitchen visit",
    ],
    cancellationPolicy: "Free cancellation up to 24 hours before start time.",
    images: [
      "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg",
      "https://images.pexels.com/photos/261189/pexels-photo-261189.jpeg",
      "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg",
      "https://images.pexels.com/photos/189296/pexels-photo-189296.jpeg",
      "https://images.pexels.com/photos/338504/pexels-photo-338504.jpeg",
      "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg",
    ],
    host: {
      id: "amara-okonkwo",
      name: "Amara Okonkwo",
      headline: "Hotel & hospitality curator",
      expertise: "Luxury hotel operations, concierge culture, and Nairobi's hospitality scene.",
      highlightStory:
        "Amara has spent a decade connecting travelers with Nairobi's finest stays — from boutique lodges to five-star icons like the Four Seasons.",
      avatarUrl: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg",
    },
    reviews: [
      {
        id: "fs-1",
        name: "Lena M.",
        rating: 5,
        reviewText: "The kitchen tour alone was worth it. Amara knows everyone on staff and makes you feel like a VIP guest.",
        createdAt: "2026-02-14T10:00:00.000Z",
        avatarUrl: "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg",
      },
      {
        id: "fs-2",
        name: "James K.",
        rating: 4.8,
        reviewText: "Perfect for design lovers — the suite details and rooftop views were stunning.",
        createdAt: "2026-01-28T10:00:00.000Z",
        avatarUrl: "https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg",
      },
    ],
    slotTimes: [
      { hour: 10, minute: 0 },
      { hour: 14, minute: 30 },
      { hour: 17, minute: 0 },
    ],
    ratingAverage: 4.9,
    ratingCount: 142,
  },
  {
    slug: "rooftop-meetup",
    title: "Curators' Rooftop Meetup",
    subtitle: "Sunset networking with Cape Town's creative and travel community.",
    category: "Meetup",
    priceFrom: 45,
    currency: "USD",
    location: "South Africa/Cape Town/V&A Waterfront",
    city: "Cape Town",
    countryRegion: "South Africa",
    neighborhood: "V&A Waterfront",
    durationHours: 3,
    maxGuests: 24,
    minAge: 18,
    meetingPoint: "Radisson RED rooftop terrace, V&A Waterfront",
    description:
      "Join Thabo Mbeki on a golden-hour rooftop meetup overlooking Table Mountain and the harbour. This session brings together hotel curators, travel creators, and local founders for structured intros, a short panel on Cape Town's tourism renaissance, and open networking over craft cocktails. Whether you're scouting partners or meeting fellow travelers, this is the city's most scenic conversation starter.",
    includes: [
      "Welcome drink on arrival",
      "Facilitated introductions",
      "Short curator panel",
      "Rooftop photo moment at sunset",
      "Digital attendee list after the event",
    ],
    requirements: ["Must be 18+", "Bring a business card or LinkedIn QR code", "Weather-appropriate layers"],
    cancellationPolicy: "Free cancellation up to 12 hours before start time.",
    images: [
      "https://images.pexels.com/photos/1267696/pexels-photo-1267696.jpeg",
      "https://images.pexels.com/photos/115755/pexels-photo-115755.jpeg",
      "https://images.pexels.com/photos/3184296/pexels-photo-3184296.jpeg",
      "https://images.pexels.com/photos/2747446/pexels-photo-2747446.jpeg",
      "https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg",
    ],
    host: {
      id: "thabo-mbeki",
      name: "Thabo Mbeki",
      headline: "Meetup & events host",
      expertise: "Community building, rooftop activations, and Cape Town's events calendar.",
      highlightStory:
        "Thabo has hosted 80+ travel meetups across Southern Africa, connecting curious travelers with the people shaping local culture.",
      avatarUrl: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg",
    },
    reviews: [
      {
        id: "rm-1",
        name: "Sarah T.",
        rating: 5,
        reviewText: "Met three potential collaborators in one evening. The sunset backdrop didn't hurt either.",
        createdAt: "2026-03-01T10:00:00.000Z",
        avatarUrl: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg",
      },
    ],
    slotTimes: [
      { hour: 17, minute: 30 },
      { hour: 18, minute: 30 },
    ],
    ratingAverage: 4.9,
    ratingCount: 98,
  },
  {
    slug: "travel-expo-preview",
    title: "Africa Travel Expo Preview",
    subtitle: "Early access walkthrough before the main floor opens to the public.",
    category: "Expo",
    priceFrom: 30,
    currency: "USD",
    location: "Kenya/Nairobi/KICC",
    city: "Nairobi",
    countryRegion: "Kenya",
    neighborhood: "KICC",
    durationHours: 4,
    maxGuests: 120,
    minAge: 12,
    meetingPoint: "KICC main entrance, Gozuru check-in desk",
    description:
      "Get a first look at Africa's biggest travel expo before the crowds arrive. The Gozuru Events Team guides you through exhibitor highlights, stage previews, and partner lounges at the KICC. You'll receive a printed show guide, priority entry to selected pavilions, and a mapped route designed for maximum discovery in minimum time — ideal for buyers, bloggers, and curious travelers alike.",
    includes: [
      "Priority expo entry badge",
      "Guided pavilion highlights tour",
      "Printed show guide and map",
      "Access to partner lounge",
      "Expo souvenir tote",
    ],
    requirements: ["Comfortable walking shoes", "Government-issued ID for badge pickup"],
    cancellationPolicy: "Tickets are transferable up to 48 hours before the event.",
    images: [
      "https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg",
      "https://images.pexels.com/photos/2775168/pexels-photo-2775168.jpeg",
      "https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg",
      "https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg",
      "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg",
    ],
    host: {
      id: "gozuru-events",
      name: "Gozuru Events Team",
      headline: "Expo producers & travel community leads",
      expertise: "Large-format travel events, exhibitor curation, and on-site guest experience.",
      highlightStory:
        "The Gozuru Events Team produces flagship expos and preview tours that connect travelers with destinations, brands, and innovators across Africa.",
      avatarUrl: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg",
    },
    reviews: [
      {
        id: "ex-1",
        name: "Daniel O.",
        rating: 4.7,
        reviewText: "Smart routing saved us hours. We hit every pavilion we cared about before lunch.",
        createdAt: "2026-01-10T10:00:00.000Z",
        avatarUrl: "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg",
      },
    ],
    slotTimes: [
      { hour: 9, minute: 0 },
      { hour: 13, minute: 0 },
    ],
    ratingAverage: 4.7,
    ratingCount: 55,
  },
  {
    slug: "marrakech-souk-walk",
    title: "Hidden Souks with a Local",
    subtitle: "Navigate the Medina's labyrinth with a culture expert who knows every alley.",
    category: "Expert session",
    priceFrom: 65,
    currency: "USD",
    location: "Morocco/Marrakech/Medina",
    city: "Marrakech",
    countryRegion: "Morocco",
    neighborhood: "Medina",
    durationHours: 3,
    maxGuests: 6,
    minAge: 10,
    meetingPoint: "Jemaa el-Fnaa square, Café de France corner",
    description:
      "Yasmine El Amrani opens the Medina's hidden doors — artisan workshops, spice cellars, and family-run riads tourists rarely find alone. Learn bargaining etiquette, taste street snacks safely, and hear the stories behind Marrakech's craft traditions. This small-group walk balances culture, commerce, and conversation at an unhurried pace.",
    includes: [
      "Expert-led Medina route",
      "Artisan workshop visit",
      "Spice and tea tasting",
      "Bottled water",
      "Digital map of recommended stops",
    ],
    requirements: ["Modest dress covering shoulders and knees", "Cash for optional purchases", "Sun hat recommended"],
    cancellationPolicy: "Free cancellation up to 24 hours before start time.",
    images: [
      "https://images.pexels.com/photos/450038/pexels-photo-450038.jpeg",
      "https://images.pexels.com/photos/360826/pexels-photo-360826.jpeg",
      "https://images.pexels.com/photos/457878/pexels-photo-457878.jpeg",
      "https://images.pexels.com/photos/1563356/pexels-photo-1563356.jpeg",
      "https://images.pexels.com/photos/1486222/pexels-photo-1486222.jpeg",
    ],
    host: {
      id: "yasmine-el-amrani",
      name: "Yasmine El Amrani",
      headline: "Culture & history expert",
      expertise: "Medina navigation, Moroccan craft traditions, and Marrakech food culture.",
      highlightStory:
        "Born and raised in the Medina, Yasmine has guided travelers through Marrakech's souks for over twelve years with warmth and insider access.",
      avatarUrl: "https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg",
    },
    reviews: [
      {
        id: "ms-1",
        name: "Claire B.",
        rating: 5,
        reviewText: "We would have been completely lost without Yasmine. The workshop visit was the highlight of our trip.",
        createdAt: "2026-02-20T10:00:00.000Z",
        avatarUrl: "https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg",
      },
    ],
    slotTimes: [
      { hour: 9, minute: 30 },
      { hour: 15, minute: 0 },
    ],
    ratingAverage: 4.9,
    ratingCount: 116,
  },
  {
    slug: "harbour-dinner-series",
    title: "Harbour Social Dinner Series",
    subtitle: "Long-table dining with Lisbon locals in a candlelit Alfama terrace.",
    category: "Social event",
    priceFrom: 95,
    currency: "USD",
    location: "Portugal/Lisbon/Alfama",
    city: "Lisbon",
    countryRegion: "Portugal",
    neighborhood: "Alfama",
    durationHours: 2,
    maxGuests: 16,
    minAge: 18,
    meetingPoint: "Miradouro de Santa Luzia, Alfama",
    description:
      "João Ferreira hosts an intimate harbour-view dinner series bringing travelers and Lisbon creatives together over seasonal Portuguese dishes. Expect shared plates, natural wine pairings, fado between courses, and conversations that last long after dessert. Each seating is limited to sixteen guests for a warm, communal table atmosphere.",
    includes: [
      "Three-course shared dinner",
      "Wine and non-alcoholic pairings",
      "Live fado performance",
      "Harbour-view terrace seating",
      "Recipe card takeaway",
    ],
    requirements: ["Must be 18+", "Please share dietary restrictions when booking", "Smart casual attire"],
    cancellationPolicy: "Free cancellation up to 48 hours before start time.",
    images: [
      "https://images.pexels.com/photos/941864/pexels-photo-941864.jpeg",
      "https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg",
      "https://images.pexels.com/photos/6267/pexels-photo-6267.jpeg",
      "https://images.pexels.com/photos/699524/pexels-photo-699524.jpeg",
      "https://images.pexels.com/photos/1126728/pexels-photo-1126728.jpeg",
    ],
    host: {
      id: "joao-ferreira",
      name: "João Ferreira",
      headline: "Expo & community lead",
      expertise: "Social dining, Portuguese gastronomy, and Lisbon's creative community.",
      highlightStory:
        "João blends his love of hospitality and community into dinner series that feel like gathering with old friends — even on your first visit to Lisbon.",
      avatarUrl: "https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg",
    },
    reviews: [
      {
        id: "hd-1",
        name: "Marco R.",
        rating: 5,
        reviewText: "The fado, the food, the view — absolutely magical. Best night of our Lisbon trip.",
        createdAt: "2026-03-05T10:00:00.000Z",
        avatarUrl: "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg",
      },
    ],
    slotTimes: [
      { hour: 19, minute: 0 },
      { hour: 20, minute: 30 },
    ],
    ratingAverage: 4.9,
    ratingCount: 74,
  },
  {
    slug: "tokyo-neon-nights",
    title: "Neon Nights Food Crawl",
    subtitle: "Late-night bites and back-alley izakayas across Shibuya's glowing streets.",
    category: "Meetup",
    priceFrom: 78,
    currency: "USD",
    location: "Japan/Tokyo/Shibuya",
    city: "Tokyo",
    countryRegion: "Japan",
    neighborhood: "Shibuya",
    durationHours: 4,
    maxGuests: 10,
    minAge: 18,
    meetingPoint: "Shibuya Crossing, Hachiko statue",
    description:
      "Kenji Tanaka leads a neon-soaked food crawl through Shibuya's backstreets — from yakitori counters and ramen basements to hidden cocktail bars locals guard jealously. You'll learn ordering etiquette, sample six stops, and finish with a skyline view from a secret rooftop. Come hungry and curious; this is Tokyo after dark at its most delicious.",
    includes: [
      "Six food and drink stops",
      "Expert guidance and translations",
      "Digital route map",
      "One cocktail or highball",
      "Rooftop finale",
    ],
    requirements: ["Must be 18+", "Comfortable walking 2 km", "Cashless payment apps helpful but not required"],
    cancellationPolicy: "Free cancellation up to 24 hours before start time.",
    images: [
      "https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg",
      "https://images.pexels.com/photos/2685417/pexels-photo-2685417.jpeg",
      "https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg",
      "https://images.pexels.com/photos/1199957/pexels-photo-1199957.jpeg",
      "https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg",
    ],
    host: {
      id: "kenji-tanaka",
      name: "Kenji Tanaka",
      headline: "Food & nightlife guide",
      expertise: "Tokyo street food, izakaya culture, and Shibuya nightlife navigation.",
      highlightStory:
        "Kenji grew up in Shibuya and spends his nights mapping the city's best bites — from salaryman ramen joints to chef's-counter secrets.",
      avatarUrl: "https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg",
    },
    reviews: [
      {
        id: "tn-1",
        name: "Amy W.",
        rating: 4.8,
        reviewText: "Every stop was a surprise. Kenji's energy and knowledge made us feel like locals by the third izakaya.",
        createdAt: "2026-02-08T10:00:00.000Z",
        avatarUrl: "https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg",
      },
    ],
    slotTimes: [
      { hour: 18, minute: 0 },
      { hour: 19, minute: 30 },
    ],
    ratingAverage: 4.8,
    ratingCount: 87,
  },
];

export function getSampleExperience(slug: string): ResolvedSampleExperience | null {
  const experience = SAMPLE_EXPERIENCES.find((item) => item.slug === slug);
  if (!experience) return null;

  const { availability, confirmedGuestsBySlotId } = buildSampleSlots(
    experience.slug,
    experience.durationHours,
    experience.maxGuests,
    experience.priceFrom,
    experience.slotTimes,
  );

  return {
    ...experience,
    galleryMedia: toGalleryMedia(experience.title, experience.images),
    bookingExperience: {
      id: experience.slug,
      host_user_id: experience.host.id,
      title: experience.title,
      price_amount: experience.priceFrom,
      currency: experience.currency,
      max_guests: experience.maxGuests,
      cancellation_policy: experience.cancellationPolicy,
    },
    availability,
    confirmedGuestsBySlotId,
  };
}

export function getAllSampleExperiences(): SampleExperience[] {
  return SAMPLE_EXPERIENCES;
}

export function getSampleExperienceHref(slug: string): string {
  return `/sample-experiences/${slug}`;
}

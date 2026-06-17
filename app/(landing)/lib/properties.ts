export type FeaturedExperience = {
  id: string;
  name: string;
  priceFrom: number;
  location: string;
  durationHours: number;
  category: "Hotel visit" | "Meetup" | "Social event" | "Expo" | "Expert session";
  maxGuests: number;
  expert: string;
  image: string;
};

export const FEATURED_EXPERIENCES: FeaturedExperience[] = [
  {
    id: "four-seasons-insider",
    name: "Four Seasons Insider Tour",
    priceFrom: 85,
    location: "Kenya/Nairobi/Westlands",
    durationHours: 2,
    category: "Hotel visit",
    maxGuests: 8,
    expert: "Amara Okonkwo",
    image: "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg",
  },
  {
    id: "rooftop-meetup",
    name: "Curators' Rooftop Meetup",
    priceFrom: 45,
    location: "South Africa/Cape Town/V&A Waterfront",
    durationHours: 3,
    category: "Meetup",
    maxGuests: 24,
    expert: "Thabo Mbeki",
    image: "https://images.pexels.com/photos/1267696/pexels-photo-1267696.jpeg",
  },
  {
    id: "travel-expo-preview",
    name: "Africa Travel Expo Preview",
    priceFrom: 30,
    location: "Kenya/Nairobi/KICC",
    durationHours: 4,
    category: "Expo",
    maxGuests: 120,
    expert: "Gozuru Events Team",
    image: "https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg",
  },
  {
    id: "marrakech-souk-walk",
    name: "Hidden Souks with a Local",
    priceFrom: 65,
    location: "Morocco/Marrakech/Medina",
    durationHours: 3,
    category: "Expert session",
    maxGuests: 6,
    expert: "Yasmine El Amrani",
    image: "https://images.pexels.com/photos/450038/pexels-photo-450038.jpeg",
  },
  {
    id: "harbour-dinner-series",
    name: "Harbour Social Dinner Series",
    priceFrom: 95,
    location: "Portugal/Lisbon/Alfama",
    durationHours: 2,
    category: "Social event",
    maxGuests: 16,
    expert: "João Ferreira",
    image: "https://images.pexels.com/photos/941864/pexels-photo-941864.jpeg",
  },
  {
    id: "tokyo-neon-nights",
    name: "Neon Nights Food Crawl",
    priceFrom: 78,
    location: "Japan/Tokyo/Shibuya",
    durationHours: 4,
    category: "Meetup",
    maxGuests: 10,
    expert: "Kenji Tanaka",
    image: "https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg",
  },
];

export function formatExperiencePrice(price: number): string {
  return `From $${price.toLocaleString("en-US")}`;
}

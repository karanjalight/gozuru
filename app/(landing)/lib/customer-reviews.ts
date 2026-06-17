export type CustomerReview = {
  id: string;
  name: string;
  rating: number;
  date: string;
  quote: string;
  avatar: string;
  experience: string;
};

export const CUSTOMER_REVIEWS: CustomerReview[] = [
  {
    id: "edward-alexander",
    name: "Edward Alexander",
    rating: 5.0,
    date: "Jan 2026",
    experience: "Hotel visit · Nairobi",
    quote:
      "The Four Seasons insider tour changed how I see Nairobi. Amara knew every corner of the property and connected us with locals we'd never have met on our own.",
    avatar: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg",
  },
  {
    id: "diana-johnston",
    name: "Diana Johnston",
    rating: 4.9,
    date: "Dec 2025",
    experience: "Meetup · Cape Town",
    quote:
      "The rooftop meetup felt like arriving somewhere I already belonged. Great people, great views, and Thabo made sure everyone left with a new connection.",
    avatar: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg",
  },
  {
    id: "lauren-contreras",
    name: "Lauren Contreras",
    rating: 5.0,
    date: "Nov 2025",
    experience: "Expert session · Marrakech",
    quote:
      "Yasmine didn't just show us the souks — she told the stories behind them. This is what travel should feel like: personal, curious, and deeply human.",
    avatar: "https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg",
  },
  {
    id: "marcus-reed",
    name: "Marcus Reed",
    rating: 4.9,
    date: "Oct 2025",
    experience: "Expo · Nairobi",
    quote:
      "The travel expo was brilliantly organized. I booked two experiences on the spot and left with contacts I still message months later.",
    avatar: "https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg",
  },
  {
    id: "sophia-martinez",
    name: "Sophia Martinez",
    rating: 5.0,
    date: "Sep 2025",
    experience: "Social event · Lisbon",
    quote:
      "The harbour dinner series was the highlight of our trip. João brought together travelers and locals over food — exactly the kind of moment Gozuru promises.",
    avatar: "https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg",
  },
];

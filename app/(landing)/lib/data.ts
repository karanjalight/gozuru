export interface Expert {
  id: string;
  name: string;
  title: string;
  location: string;
  image: string;
  rating: number;
  reviewCount: number;
  tags: string[];
  shortBio: string;
}

export interface Experience {
  id: string;
  title: string;
  description: string;
  image: string;
  location: string;
  duration: string;
  price: string;
  expertName: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  expertCount: number;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  avatar: string;
  location: string;
}

export const experts: Expert[] = [
  {
    id: "1",
    name: "Yuki Tanaka",
    title: "Tea Ceremony & Kyoto Culture",
    location: "Kyoto, Japan",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop",
    rating: 4.98,
    reviewCount: 127,
    tags: ["Culture", "Tea", "History"],
    shortBio: "Master of the way of tea. Share authentic moments in a 400-year-old machiya.",
  },
  {
    id: "2",
    name: "María Santos",
    title: "Street Food & Markets",
    location: "Oaxaca, Mexico",
    image: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=400&fit=crop",
    rating: 4.95,
    reviewCount: 89,
    tags: ["Food", "Markets", "Local"],
    shortBio: "Food anthropologist. Discover the soul of Oaxaca through its markets and moles.",
  },
  {
    id: "3",
    name: "Ahmed Hassan",
    title: "Medina Walks & Calligraphy",
    location: "Fes, Morocco",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    rating: 5.0,
    reviewCount: 64,
    tags: ["History", "Art", "Walking"],
    shortBio: "Storyteller of the medina. Unlock hidden courtyards and centuries of craft.",
  },
  {
    id: "4",
    name: "Elena Rossi",
    title: "Renaissance Art & Hidden Florence",
    location: "Florence, Italy",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop",
    rating: 4.97,
    reviewCount: 112,
    tags: ["Art", "History", "Architecture"],
    shortBio: "Art historian. Go beyond the guidebooks into workshops and secret gardens.",
  },
  {
    id: "5",
    name: "James Okello",
    title: "Safari & Wildlife",
    location: "Nairobi, Kenya",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    rating: 4.99,
    reviewCount: 203,
    tags: ["Wildlife", "Nature", "Photography"],
    shortBio: "Conservation guide. Ethical safaris and the stories behind the species.",
  },
  {
    id: "6",
    name: "Sofia Chen",
    title: "Temples & Local Life",
    location: "Taipei, Taiwan",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop",
    rating: 4.96,
    reviewCount: 78,
    tags: ["Temples", "Food", "Night markets"],
    shortBio: "Your friend in Taipei. From morning markets to mountain temples.",
  },
];

export const experiences: Experience[] = [
  {
    id: "1",
    title: "Private Tea Ceremony in a Machiya",
    description: "An intimate ceremony in a traditional wooden townhouse.",
    image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&h=400&fit=crop",
    location: "Kyoto",
    duration: "2 hours",
    price: "From $85",
    expertName: "Yuki Tanaka",
  },
  {
    id: "2",
    title: "Oaxaca Market & Mole Cooking",
    description: "Shop like a local, then cook mole with a family recipe.",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    location: "Oaxaca",
    duration: "4 hours",
    price: "From $72",
    expertName: "María Santos",
  },
  {
    id: "3",
    title: "Fes Medina: Tannery & Tiles",
    description: "Behind the scenes at a tannery and a tile workshop.",
    image: "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=600&h=400&fit=crop",
    location: "Fes",
    duration: "3 hours",
    price: "From $65",
    expertName: "Ahmed Hassan",
  },
];

export const categories: Category[] = [
  { id: "1", name: "Tech & Startups", description: "Talk to builders, operators, and insiders shaping local ecosystems", icon: "Landmark", expertCount: 124 },
  { id: "2", name: "Agriculture & Farming", description: "Visit farms, understand supply chains, and learn from producers", icon: "UtensilsCrossed", expertCount: 98 },
  { id: "3", name: "Business & FMCG", description: "Get real insights into distribution, pricing, and market dynamics", icon: "TreePine", expertCount: 67 },
  { id: "4", name: "Culture & Lifestyle", description: "Explore food, traditions, and everyday life with locals", icon: "Palette", expertCount: 83 },
  { id: "5", name: "Career & Industry Insights", description: "Learn from professionals across sectors", icon: "MapPin", expertCount: 156 },
];

export const testimonials: Testimonial[] = [
  {
    id: "1",
    quote: "Ratings & reviews from real users",
    author: "Verified users",
    role: "Community",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    location: "San Francisco",
  },
  {
    id: "2",
    quote: "Verified profiles",
    author: "Trusted hosts",
    role: "Community",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    location: "London",
  },
  {
    id: "3",
    quote: "Secure payments and a growing global community",
    author: "Global members",
    role: "Community",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    location: "Mumbai",
  },
];

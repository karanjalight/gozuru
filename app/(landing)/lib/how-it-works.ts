export type HowItWorksStep = {
  id: string;
  navLabel: string;
  title: string;
  description: string;
  image: string;
  detailImage?: string;
};

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    id: "discover",
    navLabel: "Discover experiences",
    title: "Browse by curiosity, city, or expert",
    description:
      "Find someone worth meeting — search by topic, tap an interest chip, or browse hosts directly. No generic checklist, just people worth talking to.",
    image: "https://images.pexels.com/photos/7230752/pexels-photo-7230752.jpeg",
    detailImage: "https://images.pexels.com/photos/7412095/pexels-photo-7412095.jpeg",
  },
  {
    id: "connect",
    navLabel: "Connect with experts",
    title: "Connect with verified local experts",
    description:
      "Every host on Gozuru is vetted for knowledge, hospitality, and reliability. Read profiles, see reviews, and book the person — not just the place.",
    image: "https://images.pexels.com/photos/8349428/pexels-photo-8349428.jpeg",
    detailImage: "https://images.pexels.com/photos/7551757/pexels-photo-7551757.jpeg",
  },
  {
    id: "experience",
    navLabel: "Show up & experience",
    title: "Show up for real moments",
    description:
      "Join a hotel-hosted welcome, a rooftop meetup, an expo preview, or a one-on-one walk through the city. In person or virtual — always human.",
    image: "https://images.pexels.com/photos/38430992/pexels-photo-38430992.jpeg",
    detailImage: "https://images.pexels.com/photos/35066217/pexels-photo-35066217.jpeg",
  },
  {
    id: "community",
    navLabel: "Join the community",
    title: "Join the Gozuru community",
    description:
      "Share feedback, meet fellow curious travelers at social events, and return for new experiences as our network of experts and hotel partners grows.",
    image: "https://images.pexels.com/photos/14896273/pexels-photo-14896273.jpeg",
    detailImage: "https://images.pexels.com/photos/853168/pexels-photo-853168.jpeg",
  },
];

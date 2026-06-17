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
    title: "Discover experiences that reward your curiosity",
    description:
      "Browse hotel partner visits, expert-led sessions, meetups, social dinners, and travel expos — curated for travelers who want more than a checklist.",
    image: "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg",
    detailImage: "https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg",
  },
  {
    id: "connect",
    navLabel: "Connect with experts",
    title: "Connect with verified local experts",
    description:
      "Every host on Gozuru is vetted for knowledge, hospitality, and reliability. Read profiles, see reviews, and book the person — not just the place.",
    image: "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg",
    detailImage: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg",
  },
  {
    id: "experience",
    navLabel: "Show up & experience",
    title: "Show up for real moments",
    description:
      "Join a hotel-hosted welcome, a rooftop meetup, an expo preview, or a one-on-one walk through the city. In person or virtual — always human.",
    image: "https://images.pexels.com/photos/1267696/pexels-photo-1267696.jpeg",
    detailImage: "https://images.pexels.com/photos/450038/pexels-photo-450038.jpeg",
  },
  {
    id: "community",
    navLabel: "Join the community",
    title: "Join the Gozuru community",
    description:
      "Share feedback, meet fellow curious travelers at social events, and return for new experiences as our network of experts and hotel partners grows.",
    image: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg",
    detailImage: "https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg",
  },
];

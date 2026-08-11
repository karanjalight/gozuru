export const CONTACT_SERVICES = [
  "Book an experience",
  "Hotel partner visit",
  "Meetup or social event",
  "Travel expo inquiry",
  "Become a host / expert",
  "Other",
] as const;

export const CONTACT_CHANNELS = [
  {
    id: "chat",
    title: "Chat with us",
    description: "Questions about experiences, experts, or events? Our team is here to help.",
    links: [
      { label: "Start a live chat", href: "/contact", icon: "chat" as const },
      { label: "hello@gozuru.com", href: "mailto:hello@gozuru.com", icon: "mail" as const },
      // { label: "Message us on X", href: "https://x.com/gozuru", icon: "x" as const },
    ],
  },
  // {
  //   id: "call",
  //   title: "Call us",
  //   description: "Speak with our team Mon–Fri, 8am–6pm EAT.",
  //   links: [
  //     { label: "+254 700 000 000", href: "tel:+254700000000", icon: "phone" as const },
  //   ],
  // },
  {
    id: "visit",
    title: "Meet us at an event",
    description: "Find Gozuru at travel expos, hotel partner visits, and community meetups near you.",
    links: [
      {
        label: "See upcoming events",
        href: "/experiences",
        icon: "map" as const,
      },
    ],
  },
] as const;

export const PHONE_COUNTRY_CODES = [
  { code: "KE", dial: "+254", flag: "🇰🇪" },
  { code: "US", dial: "+1", flag: "🇺🇸" },
  { code: "GB", dial: "+44", flag: "🇬🇧" },
  { code: "ZA", dial: "+27", flag: "🇿🇦" },
] as const;

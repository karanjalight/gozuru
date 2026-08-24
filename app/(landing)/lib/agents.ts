export type LocalExpert = {
  id: string;
  name: string;
  title: string;
  specialty: string;
  category: string;
  rating: number;
  reviewCount: number;
  phone: string;
  email: string;
  image: string;
  profileHref?: string;
  isVerified?: boolean;
};

export const LOCAL_EXPERTS: LocalExpert[] = [
  {
    id: "amara-okonkwo",
    name: "Amara Okonkwo",
    title: "Hotel & hospitality curator",
    specialty: "Hotel visits · Nairobi",
    category: "Hotel visit",
    rating: 5.0,
    reviewCount: 142,
    phone: "+254 712 555 0142",
    email: "amara@gozuru.com",
    image: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg",
  },
  {
    id: "thabo-mbeki",
    name: "Thabo Mbeki",
    title: "Meetup & events host",
    specialty: "Social events · Cape Town",
    category: "Meetup",
    rating: 4.9,
    reviewCount: 98,
    phone: "+27 82 555 0198",
    email: "thabo@gozuru.com",
    image: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg",
  },
  {
    id: "yasmine-el-amrani",
    name: "Yasmine El Amrani",
    title: "Culture & history expert",
    specialty: "Expert sessions · Marrakech",
    category: "Expert session",
    rating: 4.9,
    reviewCount: 116,
    phone: "+212 612 555 0167",
    email: "yasmine@gozuru.com",
    image: "https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg",
  },
  {
    id: "kenji-tanaka",
    name: "Kenji Tanaka",
    title: "Food & nightlife guide",
    specialty: "Meetups · Tokyo",
    category: "Meetup",
    rating: 4.8,
    reviewCount: 87,
    phone: "+81 90 5555 0134",
    email: "kenji@gozuru.com",
    image: "https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg",
  },
  {
    id: "joao-ferreira",
    name: "João Ferreira",
    title: "Expo & community lead",
    specialty: "Expos · Lisbon",
    category: "Expo",
    rating: 4.9,
    reviewCount: 74,
    phone: "+351 912 555 0190",
    email: "joao@gozuru.com",
    image: "https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg",
  },
  {
    id: "priya-sharma",
    name: "Priya Sharma",
    title: "Wellness & retreat host",
    specialty: "Social events · Bali",
    category: "Social event",
    rating: 4.9,
    reviewCount: 63,
    phone: "+62 812 555 0171",
    email: "priya@gozuru.com",
    image: "https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg",
  },
  {
    id: "marcus-chen",
    name: "Marcus Chen",
    title: "Business & innovation guide",
    specialty: "Expert sessions · Singapore",
    category: "Expert session",
    rating: 4.8,
    reviewCount: 91,
    phone: "+65 9123 4567",
    email: "marcus@gozuru.com",
    image: "https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg",
  },
  {
    id: "elena-rossi",
    name: "Elena Rossi",
    title: "Art & architecture curator",
    specialty: "Hotel visits · Milan",
    category: "Hotel visit",
    rating: 5.0,
    reviewCount: 108,
    phone: "+39 345 555 0199",
    email: "elena@gozuru.com",
    image: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg",
  },
  {
    id: "david-okoro",
    name: "David Okoro",
    title: "Travel expo coordinator",
    specialty: "Expos · Lagos",
    category: "Expo",
    rating: 4.7,
    reviewCount: 55,
    phone: "+234 803 555 0144",
    email: "david@gozuru.com",
    image: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg",
  },
];

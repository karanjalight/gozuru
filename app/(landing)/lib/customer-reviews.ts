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
//   {
//   id: "brian-kamau",
//   name: "Brian Kamau",
//   rating: 5.0,
//   date: "Jan 2026",
//   experience: "Hotel visit · Nairobi",
//   quote:
//     "The hotel experience completely changed how I see Nairobi. Kevin knew the place inside out and introduced us to people we would never have met on our own.",
//   avatar:
//     "https://images.pexels.com/photos/36797845/pexels-photo-36797845.jpeg",
// },
{
  id: "sharon-odhiambo",
  name: "Sharon Odhiambo",
  rating: 4.9,
  date: "Dec 2025",
  experience: "Meetup · Nairobi",
  quote:
    "The meetup felt like meeting old friends in a city I'd just arrived in. Great people, great conversations, and an experience I genuinely didn't want to end.",
  avatar:
    "https://images.pexels.com/photos/28606691/pexels-photo-28606691.jpeg",
},
// {
//   id: "ian-mwangi",
//   name: "Ian Mwangi",
//   rating: 5.0,
//   date: "Nov 2025",
//   experience: "Expert session · Mombasa",
//   quote:
//     "It wasn't just a tour of Mombasa. We heard the stories behind the places, met local people and experienced the city in a completely different way.",
//   avatar:
//     "https://images.pexels.com/photos/36124131/pexels-photo-36124131.jpeg",
// },
{
  id: "mercy-wanjiku",
  name: "Mercy Wanjiku",
  rating: 4.9,
  date: "Oct 2025",
  experience: "Expo · Nairobi",
  quote:
    "The expo was brilliantly organized. I discovered experiences I didn't even know existed and ended up booking two of them before I left.",
  avatar:
    "https://images.pexels.com/photos/23489484/pexels-photo-23489484.jpeg",
},
{
  id: "dennis-otieno",
  name: "Patricia Monywa",
  rating: 5.0,
  date: "Sep 2025",
  experience: "Social event · Diani",
  quote:
    "The evening in Diani was the highlight of our trip. Good food, great conversations and meeting both locals and other travelers made it feel genuinely special.",
  avatar:
    "https://images.pexels.com/photos/36671225/pexels-photo-36671225.jpeg",
},
];

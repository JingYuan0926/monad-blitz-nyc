export type Review = {
  author: string;
  rating: number; // 1-5
  text: string;
};

export type Activity = "working" | "talking" | "wandering" | "resting";

export type Expert = {
  id: string;
  name: string;
  title: string;
  sectionId: string;
  activity: Activity;
  priceCredits: number; // credits (10,000 = 1 MON)
  color: string; // avatar shirt color
  bio: string;
  rating: number;
  sessions: number;
  reviews: Review[];
};

export type Section = {
  id: string;
  name: string;
  emoji: string;
  color: string; // rug / accent color
  floorColor: string;
  position: [number, number, number]; // room center in the office
};

export const SECTIONS: Section[] = [
  {
    id: "coding",
    name: "Blockchain",
    emoji: "⛓️",
    color: "#6366f1",
    floorColor: "#46519e",
    position: [-10, 0, -4],
  },
  {
    id: "science",
    name: "Tech",
    emoji: "💻",
    color: "#10b981",
    floorColor: "#5e9b80",
    position: [0, 0, -4],
  },
  {
    id: "sport",
    name: "Sport",
    emoji: "🏀",
    color: "#f59e0b",
    floorColor: "#c0985f",
    position: [10, 0, -4],
  },
];

export const EXPERTS: Expert[] = [
  // Coding
  {
    id: "jason",
    activity: "working",
    name: "Vitalik Buterin",
    title: "40x Hackathon Winner",
    sectionId: "coding",
    priceCredits: 5_000,
    color: "#818cf8",
    bio: "Won 40+ hackathons in 3 years. Ask me how to pick ideas, build fast, and pitch to win.",
    rating: 4.9,
    sessions: 312,
    reviews: [
      { author: "newbie.eth", rating: 5, text: "His idea-picking framework won us our first hackathon." },
      { author: "kai", rating: 5, text: "Brutally honest pitch feedback. Worth every MON." },
    ],
  },
  {
    id: "mira",
    activity: "talking",
    name: "Kartik Talwar",
    title: "Staff Engineer, 15y",
    sectionId: "coding",
    priceCredits: 8_000,
    color: "#a5b4fc",
    bio: "15 years scaling backend systems. Architecture reviews, career advice, debugging war stories.",
    rating: 4.8,
    sessions: 187,
    reviews: [
      { author: "devto", rating: 5, text: "Saved our team a quarter of refactoring with one session." },
    ],
  },
  {
    id: "otto",
    activity: "talking",
    name: "Balaji Srinivasan",
    title: "Indie Hacker",
    sectionId: "coding",
    priceCredits: 3_000,
    color: "#c7d2fe",
    bio: "Shipped 24 products solo. Ask about MVPs, launching, and getting first paying users.",
    rating: 4.6,
    sessions: 95,
    reviews: [
      { author: "solodev", rating: 4, text: "Great launch checklist, very practical." },
    ],
  },
  // Science
  {
    id: "dr-amara",
    activity: "wandering",
    name: "Elon Musk",
    title: "Surgeon, 30y experience",
    sectionId: "science",
    priceCredits: 12_000,
    color: "#34d399",
    bio: "Three decades in the operating room. How senior doctors make decisions under pressure.",
    rating: 5.0,
    sessions: 421,
    reviews: [
      { author: "resident_y2", rating: 5, text: "Like having a mentor on call. Incredible clinical reasoning." },
    ],
  },
  {
    id: "felix",
    activity: "working",
    name: "Mark Zuckerberg",
    title: "Physics PhD, Educator",
    sectionId: "science",
    priceCredits: 4_000,
    color: "#6ee7b7",
    bio: "I make hard physics intuitive. Quantum, relativity, and how to actually study science.",
    rating: 4.7,
    sessions: 230,
    reviews: [
      { author: "stu_dent", rating: 5, text: "Explained in 10 minutes what my lectures couldn't in a month." },
    ],
  },
  {
    id: "lin",
    activity: "resting",
    name: "Jensen Huang",
    title: "Biotech Researcher",
    sectionId: "science",
    priceCredits: 9_000,
    color: "#a7f3d0",
    bio: "10 years in gene-therapy labs. Research methods, grant writing, lab career paths.",
    rating: 4.8,
    sessions: 76,
    reviews: [
      { author: "biograd", rating: 5, text: "Her grant-writing tips got my proposal funded." },
    ],
  },
  // Sport
  {
    id: "coach-d",
    activity: "wandering",
    name: "Stephen Curry",
    title: "Pro Basketball Coach",
    sectionId: "sport",
    priceCredits: 6_000,
    color: "#fbbf24",
    bio: "20 years coaching pros. Training plans, game IQ, and building a winning mindset.",
    rating: 4.9,
    sessions: 268,
    reviews: [
      { author: "hooper23", rating: 5, text: "My handle and decision-making improved in weeks." },
    ],
  },
  {
    id: "sana",
    activity: "resting",
    name: "Cristiano Ronaldo",
    title: "Olympic Sprinter",
    sectionId: "sport",
    priceCredits: 10_000,
    color: "#fcd34d",
    bio: "Two Olympics, one medal. Sprint mechanics, recovery, and performing under pressure.",
    rating: 4.9,
    sessions: 154,
    reviews: [
      { author: "trackmom", rating: 5, text: "Fixed my daughter's start technique in one session." },
    ],
  },
  {
    id: "ben",
    activity: "working",
    name: "Jeremy Lin",
    title: "S&C / Nutrition Coach",
    sectionId: "sport",
    priceCredits: 4_000,
    color: "#fde68a",
    bio: "Strength, conditioning and nutrition for everyday athletes. No fads, just what works.",
    rating: 4.5,
    sessions: 112,
    reviews: [
      { author: "gymrat", rating: 4, text: "Simple meal plan that I actually stuck to." },
    ],
  },
];

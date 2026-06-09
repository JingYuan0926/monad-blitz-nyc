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
  color: string; // rug / accent color
  floorColor: string;
  position: [number, number, number]; // room center in the office
};

export const SECTIONS: Section[] = [
  {
    id: "coding",
    name: "Blockchain",
    color: "#6366f1",
    floorColor: "#46519e",
    position: [-10, 0, -4],
  },
  {
    id: "science",
    name: "Tech",
    color: "#10b981",
    floorColor: "#5e9b80",
    position: [0, 0, -4],
  },
  {
    id: "sport",
    name: "Sport",
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
    title: "Ethereum Co-founder",
    sectionId: "coding",
    priceCredits: 5_000,
    color: "#818cf8",
    bio: "Co-created Ethereum at 19. Protocol design, token economics, and watching ideas survive contact with reality.",
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
    title: "ETHGlobal Co-founder",
    sectionId: "coding",
    priceCredits: 8_000,
    color: "#a5b4fc",
    bio: "Built the hackathons where half of crypto got its start. Ask me how winning teams actually work.",
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
    title: "Investor, ex-Coinbase CTO",
    sectionId: "coding",
    priceCredits: 3_000,
    color: "#c7d2fe",
    bio: "Network states, startup playbooks, and contrarian bets that aged well.",
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
    title: "CEO, Tesla and SpaceX",
    sectionId: "science",
    priceCredits: 12_000,
    color: "#34d399",
    bio: "Rockets, cars, and first-principles thinking. Ask me about building impossible things on impossible deadlines.",
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
    title: "CEO, Meta",
    sectionId: "science",
    priceCredits: 4_000,
    color: "#6ee7b7",
    bio: "Built Facebook from a dorm room. Scaling products to billions, and the bets that did and did not pay off.",
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
    title: "CEO, NVIDIA",
    sectionId: "science",
    priceCredits: 9_000,
    color: "#a7f3d0",
    bio: "Three decades betting the company on accelerated computing. GPUs, AI, and surviving near-death moments.",
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
    title: "4x NBA Champion",
    sectionId: "sport",
    priceCredits: 6_000,
    color: "#fbbf24",
    bio: "Changed how basketball is played from beyond the arc. Preparation, confidence, and shooting through slumps.",
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
    title: "Football Legend",
    sectionId: "sport",
    priceCredits: 10_000,
    color: "#fcd34d",
    bio: "Five Ballons d'Or and two decades at the top. Discipline, longevity, and outworking talent.",
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
    title: "NBA Guard, Linsanity",
    sectionId: "sport",
    priceCredits: 4_000,
    color: "#fde68a",
    bio: "From undrafted to global phenomenon overnight. Resilience, faith, and seizing the one shot you get.",
    rating: 4.5,
    sessions: 112,
    reviews: [
      { author: "gymrat", rating: 4, text: "Simple meal plan that I actually stuck to." },
    ],
  },
];

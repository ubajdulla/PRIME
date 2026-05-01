export type PaymentStatus = "unpaid" | "cash" | "online";
export type JoinType = "direct" | "request";
export type EventStatus = "upcoming" | "past" | "draft";

export interface Player {
  id: string;
  name: string;
  avatar: string;
  position: string;
  skillLevel: string;
  telegram?: string;
  instagram?: string;
}

export interface RosterPlayer extends Player {
  paymentStatus: PaymentStatus;
}

export interface AdminEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  price: number;
  priceLabel: string;
  capacity: number;
  joinType: JoinType;
  category: string;
  status: EventStatus;
  description: string;
  image: string;
  roster: RosterPlayer[];
  waitlist: Player[];
  requests: Player[];
}

// Ordered lowest → highest
export const SKILL_ORDER = ["Rookie", "Beginner", "Intermediate", "Advanced", "Pro", "PRIME"] as const;
export type SkillLevel = typeof SKILL_ORDER[number];

export const SKILL_STYLE: Record<string, {
  text: string;
  badge: string;      // inactive badge
  activeBadge: string; // active / selected badge
  dot: string;
  border: string;
}> = {
  PRIME:        { text: "text-[#ccff00]", badge: "bg-[#ccff00]/10 text-[#ccff00] border border-[#ccff00]/20",          activeBadge: "bg-[#ccff00] text-black border border-[#ccff00]",          dot: "bg-[#ccff00]",   border: "border-[#ccff00]/30" },
  Pro:          { text: "text-[#3390ec]", badge: "bg-[#3390ec]/10 text-[#3390ec] border border-[#3390ec]/20",          activeBadge: "bg-[#3390ec] text-white border border-[#3390ec]",          dot: "bg-[#3390ec]",   border: "border-[#3390ec]/30" },
  Advanced:     { text: "text-[#a855f7]", badge: "bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/20",          activeBadge: "bg-[#a855f7] text-white border border-[#a855f7]",          dot: "bg-[#a855f7]",   border: "border-[#a855f7]/30" },
  Intermediate: { text: "text-[#eab308]", badge: "bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/20",          activeBadge: "bg-[#eab308] text-black border border-[#eab308]",          dot: "bg-[#eab308]",   border: "border-[#eab308]/30" },
  Beginner:     { text: "text-[#f97316]", badge: "bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20",          activeBadge: "bg-[#f97316] text-white border border-[#f97316]",          dot: "bg-[#f97316]",   border: "border-[#f97316]/30" },
  Rookie:       { text: "text-[#79828b]", badge: "bg-white/5 text-[#79828b] border border-white/10",                   activeBadge: "bg-[#79828b] text-white border border-[#79828b]",          dot: "bg-[#79828b]",   border: "border-white/15" },
};

const AVATARS = [
  "https://images.unsplash.com/photo-1667970573560-6ecf6a143514?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1587930693964-e16abf7299f5?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1582836997529-023a5ae82b1f?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
];

export const ALL_PLAYERS: Player[] = [
  { id: "p1",  name: "ZeroCool",     avatar: AVATARS[0],  position: "Outside Hitter",  skillLevel: "Pro",          telegram: "@zerocool",     instagram: "@zerocool_vb" },
  { id: "p2",  name: "NeonSamurai",  avatar: AVATARS[1],  position: "Setter",           skillLevel: "PRIME",        telegram: "@neonsamurai",  instagram: "@neonsamurai" },
  { id: "p3",  name: "CyberNinja99", avatar: AVATARS[2],  position: "Libero",           skillLevel: "Beginner",     telegram: "@cyberninja99" },
  { id: "p4",  name: "GlitchKing",   avatar: AVATARS[3],  position: "Middle Blocker",   skillLevel: "Advanced",     instagram: "@glitchking" },
  { id: "p5",  name: "PrimeAlpha",   avatar: AVATARS[4],  position: "Opposite Hitter",  skillLevel: "PRIME",        telegram: "@primealpha",   instagram: "@primealpha_vb" },
  { id: "p6",  name: "ViperX",       avatar: AVATARS[5],  position: "Right Side",       skillLevel: "Pro",          telegram: "@viperx" },
  { id: "p7",  name: "ShadowStrike", avatar: AVATARS[6],  position: "Outside Hitter",   skillLevel: "Intermediate", instagram: "@shadowstrike" },
  { id: "p8",  name: "GhostRider",   avatar: AVATARS[7],  position: "Setter",           skillLevel: "Pro",          telegram: "@ghostrider_vb" },
  { id: "p9",  name: "FluxCore",     avatar: AVATARS[8],  position: "Libero",           skillLevel: "Rookie" },
  { id: "p10", name: "NovaBurst",    avatar: AVATARS[9],  position: "Middle Blocker",   skillLevel: "Advanced",     telegram: "@novaburst" },
  { id: "p11", name: "QuantumX",     avatar: AVATARS[10], position: "Outside Hitter",   skillLevel: "Pro",          instagram: "@quantumx_vb" },
  { id: "p12", name: "SteelNova",    avatar: AVATARS[11], position: "Right Side",       skillLevel: "Rookie" },
];

export const ADMIN_EVENTS: AdminEvent[] = [
  {
    id: "e1",
    title: "PRO-AM INVITATIONAL #12",
    date: "TODAY • FRI, OCT 25",
    time: "20:00 - 22:00",
    location: "Cyber Arena, Sector 4",
    price: 625,
    priceLabel: "625 CZK",
    capacity: 10,
    joinType: "direct",
    category: "GAMES",
    status: "upcoming",
    description: "High stakes competitive scrimmage for top-tier players. Bring your A-game. Voice comms mandatory.",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=400&fit=crop",
    roster: [
      { ...ALL_PLAYERS[0], paymentStatus: "cash" },
      { ...ALL_PLAYERS[1], paymentStatus: "online" },
      { ...ALL_PLAYERS[2], paymentStatus: "unpaid" },
      { ...ALL_PLAYERS[3], paymentStatus: "cash" },
      { ...ALL_PLAYERS[4], paymentStatus: "online" },
      { ...ALL_PLAYERS[5], paymentStatus: "unpaid" },
      { ...ALL_PLAYERS[6], paymentStatus: "cash" },
      { ...ALL_PLAYERS[7], paymentStatus: "unpaid" },
    ],
    waitlist: [ALL_PLAYERS[8], ALL_PLAYERS[9]],
    requests: [],
  },
  {
    id: "e2",
    title: "MIDNIGHT SCRIM",
    date: "TODAY • FRI, OCT 25",
    time: "23:00 - 02:00",
    location: "Neon Hub",
    price: 375,
    priceLabel: "375 CZK",
    capacity: 10,
    joinType: "request",
    category: "TOURNAMENT",
    status: "upcoming",
    description: "Late night tournament scrim. Invite-only with request approval.",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=400&fit=crop",
    roster: [
      { ...ALL_PLAYERS[0], paymentStatus: "online" },
      { ...ALL_PLAYERS[1], paymentStatus: "online" },
      { ...ALL_PLAYERS[2], paymentStatus: "cash" },
      { ...ALL_PLAYERS[3], paymentStatus: "unpaid" },
      { ...ALL_PLAYERS[4], paymentStatus: "unpaid" },
    ],
    waitlist: [ALL_PLAYERS[10]],
    requests: [ALL_PLAYERS[8], ALL_PLAYERS[9], ALL_PLAYERS[11]],
  },
  {
    id: "e3",
    title: "MORNING GRIND SESSION",
    date: "TOMORROW • SAT, OCT 26",
    time: "09:00 - 11:00",
    location: "Virtual Dojo",
    price: 250,
    priceLabel: "250 CZK",
    capacity: 12,
    joinType: "direct",
    category: "TRAININGS",
    status: "upcoming",
    description: "Morning training session for skill development and conditioning.",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=400&fit=crop",
    roster: [
      { ...ALL_PLAYERS[2], paymentStatus: "unpaid" },
      { ...ALL_PLAYERS[5], paymentStatus: "unpaid" },
    ],
    waitlist: [],
    requests: [],
  },
  {
    id: "e4",
    title: "WEEKEND WARRIORS CLASH",
    date: "SAT, OCT 26",
    time: "18:00 - 21:00",
    location: "Main Stadium",
    price: 750,
    priceLabel: "750 CZK",
    capacity: 16,
    joinType: "request",
    category: "TOURNAMENT",
    status: "upcoming",
    description: "Weekend tournament clash. Request-only entry for serious players.",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=400&fit=crop",
    roster: [
      { ...ALL_PLAYERS[0], paymentStatus: "cash" },
      { ...ALL_PLAYERS[1], paymentStatus: "cash" },
      { ...ALL_PLAYERS[2], paymentStatus: "online" },
      { ...ALL_PLAYERS[3], paymentStatus: "unpaid" },
      { ...ALL_PLAYERS[4], paymentStatus: "unpaid" },
    ],
    waitlist: [ALL_PLAYERS[9]],
    requests: [ALL_PLAYERS[7], ALL_PLAYERS[10]],
  },
  {
    id: "e5",
    title: "CASUAL LOBBY MIX",
    date: "SUN, OCT 27",
    time: "15:00 - 17:00",
    location: "Beach Court 3",
    price: 0,
    priceLabel: "FREE",
    capacity: 8,
    joinType: "direct",
    category: "BEACH",
    status: "upcoming",
    description: "Casual beach volleyball. All skill levels welcome.",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=400&fit=crop",
    roster: [{ ...ALL_PLAYERS[11], paymentStatus: "unpaid" }],
    waitlist: [],
    requests: [],
  },
  {
    id: "e6",
    title: "CIRCUIT BREAKER PRO",
    date: "MON, OCT 14",
    time: "19:00 - 21:00",
    location: "Cyber Arena, Sector 4",
    price: 500,
    priceLabel: "500 CZK",
    capacity: 12,
    joinType: "direct",
    category: "GAMES",
    status: "past",
    description: "Past competitive game — all players paid, game completed.",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=400&fit=crop",
    roster: [
      { ...ALL_PLAYERS[0], paymentStatus: "cash" },
      { ...ALL_PLAYERS[1], paymentStatus: "cash" },
      { ...ALL_PLAYERS[2], paymentStatus: "online" },
      { ...ALL_PLAYERS[3], paymentStatus: "cash" },
      { ...ALL_PLAYERS[4], paymentStatus: "online" },
      { ...ALL_PLAYERS[5], paymentStatus: "online" },
      { ...ALL_PLAYERS[6], paymentStatus: "cash" },
      { ...ALL_PLAYERS[7], paymentStatus: "online" },
      { ...ALL_PLAYERS[8], paymentStatus: "cash" },
      { ...ALL_PLAYERS[9], paymentStatus: "cash" },
      { ...ALL_PLAYERS[10], paymentStatus: "online" },
      { ...ALL_PLAYERS[11], paymentStatus: "cash" },
    ],
    waitlist: [],
    requests: [],
  },
  {
    id: "e7",
    title: "SUMMER BEACH LEAGUE",
    date: "WED, OCT 9",
    time: "10:00 - 14:00",
    location: "Beach Court 1",
    price: 300,
    priceLabel: "300 CZK",
    capacity: 16,
    joinType: "direct",
    category: "BEACH",
    status: "past",
    description: "Summer beach league finals.",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=400&fit=crop",
    roster: [
      { ...ALL_PLAYERS[3], paymentStatus: "cash" },
      { ...ALL_PLAYERS[4], paymentStatus: "online" },
      { ...ALL_PLAYERS[5], paymentStatus: "cash" },
      { ...ALL_PLAYERS[6], paymentStatus: "cash" },
      { ...ALL_PLAYERS[7], paymentStatus: "online" },
      { ...ALL_PLAYERS[8], paymentStatus: "cash" },
    ],
    waitlist: [],
    requests: [],
  },
  {
    id: "e8",
    title: "NIGHT SMASH #5",
    date: "DRAFT",
    time: "21:00 - 23:00",
    location: "Indoor Hall B",
    price: 450,
    priceLabel: "450 CZK",
    capacity: 12,
    joinType: "direct",
    category: "GAMES",
    status: "draft",
    description: "Night game session — not published yet.",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=400&fit=crop",
    roster: [],
    waitlist: [],
    requests: [],
  },
];

export function getCategoryStyle(category: string): string {
  const styles: Record<string, string> = {
    GAMES:      "bg-[#3390ec]/10 text-[#3390ec]",
    TOURNAMENT: "bg-[#eab308]/10 text-[#eab308]",
    TRAININGS:  "bg-[#4dcd5e]/10 text-[#4dcd5e]",
    BEACH:      "bg-[#f97316]/10 text-[#f97316]",
    EVENTS:     "bg-[#a855f7]/10 text-[#a855f7]",
  };
  return styles[category] ?? "bg-white/10 text-white";
}

export function getStatusStyle(status: EventStatus): string {
  if (status === "upcoming") return "bg-[#4dcd5e]/10 text-[#4dcd5e]";
  if (status === "past")     return "bg-white/5 text-[#79828b]";
  if (status === "draft")    return "bg-[#eab308]/10 text-[#eab308]";
  return "bg-white/5 text-white";
}

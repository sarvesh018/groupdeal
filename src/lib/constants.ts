export const APP_NAME = "GroupDeal";
export const APP_TAGLINE = "Buy your car as a group. Pay less than you would alone.";

export const CITY_LOCALITIES: Record<string, string[]> = {
  pune: ["Wakad", "Hinjewadi", "Baner", "Aundh", "Kothrud", "Kharadi", "Hadapsar", "Pimple Saudagar", "Viman Nagar"],
  bengaluru: ["Whitefield", "Koramangala", "Indiranagar", "HSR Layout", "Jayanagar", "Electronic City", "Hebbal", "Marathahalli"],
  indore: ["Vijay Nagar", "Palasia", "Rau", "Bhawarkua", "Scheme 78", "Sudama Nagar", "Nipania"],
  mumbai: ["Andheri", "Powai", "Thane", "Borivali", "Chembur", "Vashi", "Mulund", "Bandra"],
  hyderabad: ["Gachibowli", "Madhapur", "Kondapur", "Kukatpally", "Banjara Hills", "Miyapur", "Uppal"],
  ahmedabad: ["Satellite", "Bopal", "Prahlad Nagar", "Maninagar", "Chandkheda", "Thaltej", "Navrangpura"],
};

export const GROUP_STATUSES = ["forming", "ready", "negotiating", "offers", "completed", "expired"] as const;
export type GroupStatus = (typeof GROUP_STATUSES)[number];

export const STATUS_LABEL: Record<string, string> = {
  forming: "Filling up",
  ready: "Group full",
  negotiating: "Talking to showrooms",
  offers: "Offers in",
  completed: "Completed",
  expired: "Closed",
};

/** The path an active group walks. Shown as steps on the group page. */
export const STATUS_STEPS: { key: GroupStatus; label: string; hint: string }[] = [
  { key: "forming", label: "Filling up", hint: "Buyers join until the group is full" },
  { key: "ready", label: "Group full", hint: "We confirm who is serious about buying" },
  { key: "negotiating", label: "Talking to showrooms", hint: "Authorised showrooms send written quotes" },
  { key: "offers", label: "Offers in", hint: "Compare quotes and pick one, or walk away" },
  { key: "completed", label: "Completed", hint: "Members booked directly with the showroom" },
];

export const MEMBER_STAGES = ["interested", "verified", "accepted", "booked", "delivered"] as const;
export const STAGE_LABEL: Record<string, string> = {
  interested: "Joined",
  verified: "Verified buyer",
  accepted: "Offer accepted",
  booked: "Booked",
  delivered: "Delivered",
};

export const BODY_TYPES = ["hatchback", "sedan", "suv", "mpv"] as const;
export const BODY_LABEL: Record<string, string> = {
  hatchback: "Hatchback",
  sedan: "Sedan",
  suv: "SUV",
  mpv: "MPV",
};

export const TRANSMISSIONS = ["Any", "Manual", "Automatic"] as const;
export const MIN_TARGET = 5;
export const MAX_TARGET = 20;

/**
 * Business rules shared by the app and the setup scripts.
 * Plain functions only: no database access, so they can be tested and reused anywhere.
 */

export type LineLike = {
  variant: string;
  exShowroom: number;
  makerOffer: number;
  dealerDiscount: number;
  insurance: number;
  rto: number;
  accessories: number;
  otherCharges: number;
  onRoad: number;
};

export type ColourLike = { colour: string; deliveryWeeks: number };

export const REFERRAL_DAYS = 90;
export const DISPUTE_DAYS = 7;
export const GST_RATE = 0.18;

/** Statuses where a referral is still open and can expire. */
export const OPEN_REFERRAL = ["sent", "acknowledged", "contacted", "test_drive"] as const;
/** Statuses a showroom sales team moves a buyer through. */
export const REFERRAL_STEPS = ["acknowledged", "contacted", "test_drive", "booked", "delivered"] as const;

export const REFERRAL_LABEL: Record<string, string> = {
  sent: "New",
  acknowledged: "Acknowledged",
  contacted: "Contacted",
  test_drive: "Test drive",
  booked: "Booked",
  delivered: "Delivered",
  lost: "Lost",
  cancelled: "Withdrawn by buyer",
  expired: "Expired",
};

export const LOST_REASONS = [
  "Bought elsewhere",
  "Changed car",
  "Postponed purchase",
  "Loan not approved",
  "Not reachable",
  "Price",
  "Other",
];

export const FEATURES = ["Sunroof", "6 airbags", "ADAS", "360° camera", "Ventilated seats", "Wireless charging", "Cruise control", "Automatic climate control"];

export function onRoadOf(l: Omit<LineLike, "onRoad" | "variant">) {
  return l.exShowroom - l.makerOffer - l.dealerDiscount + l.insurance + l.rto + l.accessories + l.otherCharges;
}

export const splitList = (s: string) =>
  s.split(",").map((x) => x.trim()).filter(Boolean);

/**
 * The line of a showroom's rate card that applies to one member:
 * their exact variant, else an "All variants" line, else the cheapest line.
 */
export function lineForMember<L extends LineLike>(lines: L[], variant: string): { line: L | undefined; exact: boolean } {
  if (lines.length === 0) return { line: undefined, exact: false };
  const exact = variant ? lines.find((l) => l.variant === variant) : undefined;
  if (exact) return { line: exact, exact: true };
  const all = lines.find((l) => l.variant === "All variants");
  if (all) return { line: all, exact: !variant };
  return { line: [...lines].sort((a, b) => a.onRoad - b.onRoad)[0], exact: false };
}

/**
 * Delivery for a member's colour choice: their first colour, else the quickest
 * colour they said is also fine, else the showroom's general delivery time.
 */
export function deliveryForMember(
  colours: ColourLike[],
  fallbackWeeks: number,
  colour: string,
  altColours: string[],
): { weeks: number; colour: string | null; preferred: boolean } {
  const first = colour ? colours.find((c) => c.colour === colour) : undefined;
  if (first) return { weeks: first.deliveryWeeks, colour: first.colour, preferred: true };
  const alts = colours.filter((c) => altColours.includes(c.colour)).sort((a, b) => a.deliveryWeeks - b.deliveryWeeks);
  if (alts[0]) return { weeks: alts[0].deliveryWeeks, colour: alts[0].colour, preferred: false };
  return { weeks: fallbackWeeks, colour: null, preferred: !colour };
}

export type Band = { minPrice: number; maxPrice: number | null; fee: number };

/** The fee for one confirmed booking, from the car's ex-showroom price. */
export function feeForPrice(exShowroom: number, bands: Band[]) {
  const sorted = [...bands].sort((a, b) => a.minPrice - b.minPrice);
  const band = sorted.find((b) => exShowroom >= b.minPrice && (b.maxPrice === null || exShowroom < b.maxPrice));
  return band?.fee ?? sorted.at(-1)?.fee ?? 0;
}

export const gstOn = (amount: number) => Math.round(amount * GST_RATE);

export function monthKey(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function referralCode(groupId: number, membershipId: number) {
  return `GD-${String(groupId).padStart(3, "0")}-${String(membershipId).padStart(4, "0")}`;
}

export function deliveryText(weeks: number) {
  if (weeks <= 0) return "In stock";
  return `About ${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}

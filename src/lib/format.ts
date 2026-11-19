const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function rupees(n: number) {
  return `₹${inr.format(Math.round(n))}`;
}

/** 1185000 -> "₹11.85 lakh" */
export function lakh(n: number) {
  const v = n / 100000;
  return `₹${v.toFixed(v >= 10 ? 1 : 2).replace(/\.?0+$/, "")} lakh`;
}

export function priceRange(min: number, max: number) {
  const f = (n: number) => (n / 100000).toFixed(1).replace(/\.0$/, "");
  return `₹${f(min)}–${f(max)} lakh`;
}

export function daysLeft(deadline: Date | string) {
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

export function deadlineText(deadline: Date | string) {
  const d = daysLeft(deadline);
  if (d < 0) return "Deadline passed";
  if (d === 0) return "Closes today";
  if (d === 1) return "1 day left";
  return `${d} days left`;
}

export function shortDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

/** Privacy: other members see "Rahul S." rather than a full name. */
export function publicName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export { referralCode } from "./rules";

export function nextMonths(count = 6) {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    out.push(d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }));
  }
  return out;
}

export type Fmt = "count" | "rupees" | "percent";

/** Numbers on charts and dashboards. */
export function fmt(v: number, f: Fmt = "count") {
  if (f === "rupees") return `₹${inr.format(Math.round(v))}`;
  if (f === "percent") return `${Math.round(v)}%`;
  return inr.format(v);
}

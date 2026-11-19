/**
 * Fills the database with DUMMY data: cities, car models with indicative
 * prices, fictional showrooms, sample buyers, groups and quotes.
 * None of the showrooms, people, prices or quotes are real.
 */
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { getDb, schema } from "../src/db";
import { CITY_LOCALITIES } from "../src/lib/constants";

// Small seeded random generator so every setup produces the same data.
let seedState = 20261116;
function rnd() {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const DAY = 86400000;
const L = 100000;

const CITIES = [
  { name: "Pune", slug: "pune", state: "Maharashtra", prefixes: ["Sahyadri", "Deccan", "Mula"] },
  { name: "Bengaluru", slug: "bengaluru", state: "Karnataka", prefixes: ["Cauvery", "Nandi", "Garden City"] },
  { name: "Indore", slug: "indore", state: "Madhya Pradesh", prefixes: ["Malwa", "Rajwada", "Narmada"] },
  { name: "Mumbai", slug: "mumbai", state: "Maharashtra", prefixes: ["Sagar", "Gateway", "Konkan"] },
  { name: "Hyderabad", slug: "hyderabad", state: "Telangana", prefixes: ["Charminar", "Golconda", "Musi"] },
  { name: "Ahmedabad", slug: "ahmedabad", state: "Gujarat", prefixes: ["Sabarmati", "Kankaria", "Heritage"] },
];

// [brand, [name, bodyType, fuels, min lakh, max lakh][]] — prices are indicative dummy values.
const CATALOGUE: [string, [string, string, string, number, number][]][] = [
  ["Tata", [
    ["Punch", "suv", "Petrol,CNG", 6.0, 10.2],
    ["Nexon", "suv", "Petrol,Diesel,CNG", 8.0, 15.6],
    ["Curvv", "suv", "Petrol,Diesel", 10.0, 19.0],
    ["Harrier", "suv", "Diesel", 15.0, 26.0],
    ["Tiago", "hatchback", "Petrol,CNG", 5.0, 8.5],
  ]],
  ["Hyundai", [
    ["Creta", "suv", "Petrol,Diesel", 11.0, 20.5],
    ["Venue", "suv", "Petrol,Diesel", 7.9, 13.6],
    ["Exter", "suv", "Petrol,CNG", 6.0, 10.5],
    ["i20", "hatchback", "Petrol", 7.0, 11.2],
    ["Verna", "sedan", "Petrol", 11.0, 17.5],
  ]],
  ["Maruti Suzuki", [
    ["Swift", "hatchback", "Petrol,CNG", 6.5, 9.6],
    ["Baleno", "hatchback", "Petrol,CNG", 6.7, 9.9],
    ["Brezza", "suv", "Petrol,CNG", 8.3, 14.1],
    ["Grand Vitara", "suv", "Petrol,Hybrid,CNG", 11.0, 20.0],
    ["Dzire", "sedan", "Petrol,CNG", 6.8, 10.2],
    ["Ertiga", "mpv", "Petrol,CNG", 8.8, 13.2],
  ]],
  ["Mahindra", [
    ["XUV 3XO", "suv", "Petrol,Diesel", 8.0, 15.6],
    ["Thar", "suv", "Petrol,Diesel", 11.5, 17.6],
    ["Scorpio N", "suv", "Petrol,Diesel", 13.8, 24.5],
    ["XUV700", "suv", "Petrol,Diesel", 14.0, 25.5],
  ]],
  ["Kia", [
    ["Sonet", "suv", "Petrol,Diesel", 8.0, 15.7],
    ["Seltos", "suv", "Petrol,Diesel", 11.0, 20.5],
    ["Carens", "mpv", "Petrol,Diesel", 10.6, 19.7],
  ]],
  ["Toyota", [
    ["Glanza", "hatchback", "Petrol,CNG", 6.9, 10.0],
    ["Urban Cruiser Hyryder", "suv", "Petrol,Hybrid,CNG", 11.3, 20.0],
    ["Innova Hycross", "mpv", "Petrol,Hybrid", 19.9, 31.0],
  ]],
  ["Honda", [
    ["Amaze", "sedan", "Petrol", 8.0, 11.0],
    ["City", "sedan", "Petrol,Hybrid", 12.0, 16.5],
    ["Elevate", "suv", "Petrol", 11.9, 16.7],
  ]],
  ["MG", [
    ["Astor", "suv", "Petrol", 10.0, 18.0],
    ["Windsor EV", "suv", "Electric", 13.5, 16.0],
    ["Hector", "suv", "Petrol,Diesel", 14.0, 22.9],
  ]],
];

const FIRST = ["Aarav", "Vivaan", "Aditya", "Rohan", "Kunal", "Siddharth", "Nikhil", "Rahul", "Amit", "Prateek", "Sagar", "Omkar", "Tejas", "Varun", "Harsh", "Manish", "Priya", "Sneha", "Ananya", "Pooja", "Neha", "Shruti", "Kavya", "Isha", "Meera", "Divya", "Ritika", "Aishwarya", "Tanvi", "Nidhi"];
const LAST = ["Kulkarni", "Deshmukh", "Joshi", "Patil", "Sharma", "Verma", "Iyer", "Reddy", "Rao", "Shah", "Mehta", "Patel", "Jain", "Agarwal", "Nair", "Gupta", "Chavan", "Pawar", "Hegde", "Shetty", "Trivedi", "Malhotra", "Saxena", "Bhatt"];
const SHOWROOM_KIND = ["Motors", "Auto", "Wheels"];
const VARIANTS = ["Base", "Mid", "Top", "Top Automatic", ""];
const NOTES = ["Prefer white or grey", "Need exchange for my old car", "Looking at a loan", "Flexible on colour", "", "", ""];

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const round = (n: number, to: number) => Math.round(n / to) * to;

export async function resetDatabase() {
  const db = await getDb();
  await db.execute(
    sql`TRUNCATE notifications, disputes, fees, statements, fee_bands, booking_proofs, referral_events, referrals, quote_colours, quote_lines, invitations, showroom_documents, showroom_staff, quotes, memberships, groups, users, showrooms, models, brands, cities RESTART IDENTITY CASCADE`,
  );
}

export async function isSeeded() {
  const db = await getDb();
  const rows = await db.select({ id: schema.cities.id }).from(schema.cities).limit(1);
  return rows.length > 0;
}

export async function seed() {
  const db = await getDb();
  const now = Date.now();

  const cityRows = await db
    .insert(schema.cities)
    .values(CITIES.map(({ name, slug, state }) => ({ name, slug, state })))
    .returning();

  const brandRows = await db
    .insert(schema.brands)
    .values(CATALOGUE.map(([name]) => ({ name, slug: slugify(name) })))
    .returning();

  const modelRows = await db
    .insert(schema.models)
    .values(
      CATALOGUE.flatMap(([brand, list]) =>
        list.map(([name, bodyType, fuels, min, max]) => ({
          brandId: brandRows.find((b) => b.name === brand)!.id,
          name,
          slug: slugify(`${brand} ${name}`),
          bodyType,
          fuels,
          priceMin: Math.round(min * L),
          priceMax: Math.round(max * L),
        })),
      ),
    )
    .returning();

  // Fictional showrooms: two per brand in every city.
  const showroomValues = cityRows.flatMap((city, ci) =>
    brandRows.flatMap((brand, bi) =>
      [0, 1].map((k) => {
        const prefix = CITIES[ci].prefixes[(bi + k) % 3];
        return {
          name: `${prefix} ${SHOWROOM_KIND[(bi + k) % 3]} ${brand.name}`,
          brandId: brand.id,
          cityId: city.id,
          locality: CITY_LOCALITIES[city.slug][(bi * 2 + k) % CITY_LOCALITIES[city.slug].length],
          phone: `1800-000-${String(1000 + ci * 100 + bi * 2 + k)}`,
          rating: Math.round((3.8 + rnd() * 1.1) * 10) / 10,
        };
      }),
    ),
  );
  const showroomRows = await db.insert(schema.showrooms).values(showroomValues).returning();

  // People. Two demo accounts you can sign in with, plus 120 sample buyers.
  const adminHash = await bcrypt.hash("admin1234", 10);
  const demoHash = await bcrypt.hash("demo1234", 10);
  const pune = cityRows[0];
  const userValues: (typeof schema.users.$inferInsert)[] = [
    { name: "Admin", email: "admin@groupdeal.demo", phone: "9000000001", passwordHash: adminHash, role: "admin", cityId: pune.id, locality: "Baner", createdAt: new Date(now - 60 * DAY) },
    { name: "Demo Buyer", email: "buyer@groupdeal.demo", phone: "9000000002", passwordHash: demoHash, role: "buyer", cityId: pune.id, locality: "Wakad", createdAt: new Date(now - 20 * DAY) },
  ];
  for (let i = 0; i < 120; i++) {
    const city = cityRows[i % cityRows.length];
    const first = FIRST[i % FIRST.length];
    const last = LAST[(i * 7 + Math.floor(i / FIRST.length)) % LAST.length];
    // More sign-ups in recent days, so the admin chart shows growth.
    const ago = Math.floor(Math.pow(rnd(), 1.8) * 45);
    userValues.push({
      name: `${first} ${last}`,
      email: `${first}.${last}${i}@example.com`.toLowerCase(),
      phone: `90000${String(10000 + i)}`,
      passwordHash: demoHash,
      role: "buyer",
      cityId: city.id,
      locality: pick(CITY_LOCALITIES[city.slug]),
      createdAt: new Date(now - ago * DAY - int(0, DAY)),
    });
  }
  const userRows = await db.insert(schema.users).values(userValues).returning();
  const buyers = userRows.filter((u) => u.role === "buyer");
  const demo = userRows[1];

  // Groups: seven per city, across the different stages.
  const STATUS_PLAN = ["forming", "forming", "forming", "forming", "ready", "negotiating", "offers", "offers", "completed", "forming", "expired", "forming"];
  let g = 0;
  for (const city of cityRows) {
    const cityBuyers = buyers.filter((u) => u.cityId === city.id && u.id !== demo.id);
    const chosen = shuffle(modelRows).slice(0, 7);
    for (const model of chosen) {
      const status = STATUS_PLAN[g % STATUS_PLAN.length];
      g++;
      const target = int(6, 12);
      const full = status !== "forming" && status !== "expired";
      const count = full ? Math.min(cityBuyers.length, target + int(0, 2)) : status === "expired" ? int(1, 3) : int(2, target - 1);
      const members = shuffle(cityBuyers).slice(0, count);
      const createdAgo = status === "forming" ? int(2, 12) : int(14, 40);
      const deadline =
        status === "forming" ? new Date(now + int(3, 21) * DAY) : new Date(now - int(1, 10) * DAY);
      const fuels = model.fuels.split(",");

      const [group] = await db
        .insert(schema.groups)
        .values({
          modelId: model.id,
          cityId: city.id,
          creatorId: members[0].id,
          variant: pick(VARIANTS),
          fuel: fuels.length > 1 && rnd() < 0.4 ? "Any" : fuels[0],
          transmission: pick(["Any", "Any", "Manual", "Automatic"]),
          description: "",
          targetSize: target,
          deadline,
          status,
          createdAt: new Date(now - createdAgo * DAY),
        })
        .returning();

      // Quotes arrive once a group reaches the "offers" stage.
      let quoteRows: (typeof schema.quotes.$inferSelect)[] = [];
      if (status === "offers" || status === "completed") {
        const rooms = showroomRows.filter((s) => s.cityId === city.id && s.brandId === model.brandId);
        const ex = round(model.priceMin + (model.priceMax - model.priceMin) * 0.55, 1000);
        const makerOffer = round(int(10, 60) * 1000, 5000);
        quoteRows = await db
          .insert(schema.quotes)
          .values(
            rooms.map((room) => {
              const dealerDiscount = round(int(5, 35) * 1000, 1000);
              const insurance = round(ex * (0.03 + rnd() * 0.008), 100);
              const rto = round(ex * 0.11, 100);
              const accessories = pick([0, 8000, 12000, 18000, 25000]);
              const otherCharges = pick([2500, 4000, 6500, 8000]);
              return {
                groupId: group.id,
                showroomId: room.id,
                exShowroom: ex,
                makerOffer,
                dealerDiscount,
                insurance,
                rto,
                accessories,
                otherCharges,
                onRoad: ex - makerOffer - dealerDiscount + insurance + rto + accessories + otherCharges,
                deliveryWeeks: int(1, 6),
                validUntil: new Date(now + int(5, 12) * DAY),
              };
            }),
          )
          .returning();
      }

      const best = [...quoteRows].sort((a, b) => a.onRoad - b.onRoad)[0];
      await db.insert(schema.memberships).values(
        members.map((u, i) => {
          let stage = "interested";
          let acceptedQuoteId: number | null = null;
          const r = rnd();
          if (status === "ready") stage = r < 0.4 ? "verified" : "interested";
          if (status === "negotiating") stage = r < 0.65 ? "verified" : "interested";
          if (status === "offers") {
            stage = r < 0.3 ? "accepted" : r < 0.75 ? "verified" : "interested";
          }
          if (status === "completed") {
            stage = r < 0.25 ? "delivered" : r < 0.5 ? "booked" : r < 0.8 ? "verified" : "interested";
          }
          if (["accepted", "booked", "delivered"].includes(stage) && best) acceptedQuoteId = best.id;
          return {
            groupId: group.id,
            userId: u.id,
            stage,
            purchaseMonth: "",
            note: pick(NOTES),
            acceptedQuoteId,
            joinedAt: new Date(now - Math.max(0, createdAgo - i) * DAY - int(0, DAY / 2)),
          };
        }),
      );
    }
  }

  // Put the demo buyer in two Pune groups so their dashboard is not empty.
  const puneGroups = await db.select().from(schema.groups).where(sql`${schema.groups.cityId} = ${pune.id}`);
  const forDemo = [puneGroups.find((x) => x.status === "forming"), puneGroups.find((x) => x.status === "offers")].filter(Boolean);
  for (const grp of forDemo) {
    await db.insert(schema.memberships).values({
      groupId: grp!.id,
      userId: demo.id,
      stage: grp!.status === "offers" ? "verified" : "interested",
      joinedAt: new Date(now - 3 * DAY),
    });
  }

  const { seedPortal } = await import("./seed-portal");
  await seedPortal();

  return {
    cities: cityRows.length,
    brands: brandRows.length,
    models: modelRows.length,
    showrooms: showroomRows.length,
    users: userRows.length,
    groups: g,
  };
}

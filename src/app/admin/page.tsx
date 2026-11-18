import Link from "next/link";
import { listCities } from "@/lib/queries";
import { adminDashboard } from "@/lib/dashboard";
import { requireAdmin } from "@/lib/session";
import { BODY_LABEL, GROUP_STATUSES, MEMBER_STAGES, STATUS_LABEL } from "@/lib/constants";
import { ChartCard, Columns, Donut, HBars, Heatmap, Lines, Meter, Stacked, type Series, type Slice } from "@/components/dashboard-charts";
import { fmt } from "@/lib/format";

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

// Groups move through these stages in order, so they share one blue that darkens step by step.
const STAGE_COLOR: Record<string, string> = {
  forming: "var(--seq-1)",
  ready: "var(--seq-2)",
  negotiating: "var(--seq-3)",
  offers: "var(--seq-4)",
  completed: "var(--seq-5)",
  expired: "var(--series-none)",
};
const STAGE_SERIES: Series[] = GROUP_STATUSES.map((k) => ({ key: k, label: STATUS_LABEL[k], color: STAGE_COLOR[k] }));

const CAT = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)", "var(--series-6)"];
const FUEL_ORDER = ["Petrol", "Diesel", "CNG", "Hybrid", "Electric"];
const PRICE_ORDER = ["Under ₹8L", "₹8–12L", "₹12–18L", "₹18L+"];

function Kpi({ label, value, note, big = false }: { label: string; value: string | number; note?: string; big?: boolean }) {
  return (
    <div className={`border-t pt-4 ${big ? "border-line-strong" : "border-line"}`}>
      <p className="text-[13px] text-dim">{label}</p>
      <p className={`tnum mt-1.5 font-display leading-none tracking-[-0.05em] ${big ? "text-5xl lg:text-6xl" : "text-3xl"}`}>{value}</p>
      {note && <p className="mt-2 text-[13px] text-faint">{note}</p>}
    </div>
  );
}

function Section({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <section className="mt-20">
      <div className="grid gap-3 border-t border-line pt-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <h2 className="text-4xl leading-none sm:text-5xl">{title}</h2>
        <p className="max-w-sm text-sm text-dim lg:text-right">{lead}</p>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ city?: string }> }) {
  await requireAdmin(); // pages render alongside the layout, so each one checks for itself
  const { city: citySlug } = await searchParams;
  const cities = await listCities();
  const city = cities.find((c) => c.slug === citySlug);
  const d = await adminDashboard(city?.id);
  const t = d.totals;
  const where = city ? city.name : "all cities";

  /* ---------- people */
  const signups30 = d.daily.reduce((a, p) => a + p.signups, 0);
  const joins30 = d.daily.reduce((a, p) => a + p.joins, 0);

  /* ---------- groups */
  const stageCount = (k: string) => d.groupsByStage.find((x) => x.key === k)?.n ?? 0;
  const stageSlices: Slice[] = GROUP_STATUSES.map((k) => ({ key: k, label: STATUS_LABEL[k], value: stageCount(k), color: STAGE_COLOR[k] }));
  const splitNames = [...new Set(d.groupsSplit.map((r) => r.name))];
  const splitRows = splitNames
    .map((name) => ({
      label: name,
      parts: Object.fromEntries(d.groupsSplit.filter((r) => r.name === name).map((r) => [r.key, r.n])) as Record<string, number>,
    }))
    .sort((a, b) => Object.values(b.parts).reduce((x, y) => x + y, 0) - Object.values(a.parts).reduce((x, y) => x + y, 0));

  /* ---------- cars */
  const bodySlices: Slice[] = d.byBody.map((r, i) => ({ key: r.name, label: BODY_LABEL[r.name] ?? r.name, value: r.seats, color: CAT[i % CAT.length] }));
  const fuelSlices: Slice[] = [
    ...FUEL_ORDER.map((f, i) => ({ key: f, label: f, value: d.byFuel.find((r) => r.name === f)?.seats ?? 0, color: CAT[i] })),
    { key: "Any", label: "No preference", value: d.byFuel.find((r) => r.name === "Any")?.seats ?? 0, color: "var(--series-none)" },
  ];
  const gearSlices: Slice[] = [
    { key: "Manual", label: "Manual", value: d.byGearbox.find((r) => r.name === "Manual")?.seats ?? 0, color: CAT[0] },
    { key: "Automatic", label: "Automatic", value: d.byGearbox.find((r) => r.name === "Automatic")?.seats ?? 0, color: CAT[1] },
    { key: "Any", label: "No preference", value: d.byGearbox.find((r) => r.name === "Any")?.seats ?? 0, color: "var(--series-none)" },
  ];
  const priceRows = PRICE_ORDER.map((b) => ({ label: b, value: d.byPrice.find((r) => r.name === b)?.seats ?? 0 }));
  const heatRows = [...new Set(d.heat.map((h) => h.row))].sort(
    (a, b) => d.heat.filter((h) => h.row === b).reduce((s, h) => s + h.n, 0) - d.heat.filter((h) => h.row === a).reduce((s, h) => s + h.n, 0),
  );
  const heatCols = d.byBrand.map((b) => b.name);
  const heatCells = Object.fromEntries(d.heat.map((h) => [`${h.row}|${h.col}`, h.n]));

  /* ---------- showrooms and offers */
  const stageN = (k: string) => d.memberStages.find((x) => x.key === k)?.n ?? 0;
  const reached = (i: number) => MEMBER_STAGES.slice(i).reduce((a, k) => a + stageN(k), 0);
  const funnelLabels = ["Joined a group", "Verified as serious", "Picked an offer", "Booked with showroom", "Took delivery"];
  const funnel = MEMBER_STAGES.map((k, i) => ({ label: funnelLabels[i], value: reached(i), note: `${pct(reached(i), t.seats)}%`, key: k }));
  const topQuoting = d.byShowroom.slice(0, 8);
  const topPicked = [...d.byShowroom].filter((s) => s.picks > 0).sort((a, b) => b.picks - a.picks).slice(0, 8);
  const showroomSeries: Series[] = [
    { key: "quoting", label: "Has sent a quote", color: "var(--series-1)" },
    { key: "idle", label: "No quote yet", color: "var(--series-none)" },
  ];

  return (
    <div>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]" role="group" aria-label="City">
        <Link href="/admin" className={`chip ${!city ? "chip-on" : ""}`} aria-current={!city ? "true" : undefined}>All cities</Link>
        {cities.map((c) => (
          <Link key={c.id} href={`/admin?city=${c.slug}`} className={`chip ${city?.id === c.id ? "chip-on" : ""}`} aria-current={city?.id === c.id ? "true" : undefined}>
            {c.name}
          </Link>
        ))}
      </div>

      {/* --------------------------------------------------------- headline numbers */}
      <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-4">
        <Kpi big label="Registered users" value={fmt(t.users)} note={`${signups30} joined in the last 30 days`} />
        <Kpi big label="Active groups" value={fmt(t.active)} note={`${t.groups} groups in total`} />
        <Kpi big label="Seats taken" value={fmt(t.seats)} note={`${pct(t.verified, t.seats)}% verified as serious`} />
        <Kpi big label="Offers picked" value={fmt(t.accepted)} note={`${t.booked} booked, ${t.delivered} delivered`} />
      </div>
      <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
        <Kpi label="Showrooms" value={fmt(t.showrooms)} />
        <Kpi label="Quotes received" value={fmt(t.quotes)} />
        <Kpi label="Average fill of open groups" value={`${Math.round(t.avgFill * 100)}%`} />
        <Kpi label="Seats per user" value={t.users ? (t.seats / t.users).toFixed(1) : "0"} />
      </div>

      {/* -------------------------------------------------------------- people */}
      <Section title="People" lead={`Who signs up, where they live, and how many go on to join a group. ${where}.`}>
        <ChartCard
          className="md:col-span-2"
          title="Sign-ups and seats taken per day"
          sub={`Last 30 days, ${where}: ${signups30} sign-ups, ${joins30} seats taken`}
          table={{ columns: ["Day", "Sign-ups", "Seats taken"], rows: [...d.daily].reverse().map((p) => [p.label, p.signups, p.joins]) }}
        >
          <Lines
            points={d.daily}
            unit=""
            series={[
              { key: "signups", label: "Sign-ups", color: "var(--series-1)" },
              { key: "joins", label: "Seats taken", color: "var(--series-2)" },
            ]}
          />
        </ChartCard>

        <ChartCard title="Users who joined a group" sub={`Registered users in ${where} with at least one seat`}>
          <Meter value={t.usersInGroup} max={t.users} label="have taken a seat" />
          <p className="mt-6 text-sm leading-relaxed text-dim">
            The rest signed up but haven&apos;t joined yet. They are worth a reminder when a group for their city fills.
          </p>
        </ChartCard>

        <ChartCard
          className="md:col-span-2 xl:col-span-3"
          title={city ? `Users by area in ${city.name}` : "Users by city"}
          sub={city ? "Top 10 areas by registered users" : "Registered users in each city"}
          table={{ columns: [city ? "Area" : "City", "Users"], rows: d.usersByPlace.map((r) => [r.name, r.n]) }}
        >
          <Columns rows={d.usersByPlace.map((r) => ({ label: r.name, value: r.n }))} unit="users" />
        </ChartCard>
      </Section>

      {/* -------------------------------------------------------------- groups */}
      <Section title="Groups" lead="How many groups exist, which stage each is at, and how fast new ones start.">
        <ChartCard
          title="Groups by stage"
          sub={`Share of all ${t.groups} groups, ${where}`}
          table={{ columns: ["Stage", "Groups", "Share"], rows: stageSlices.map((s) => [s.label, s.value, `${pct(s.value, t.groups)}%`]) }}
        >
          <Donut slices={stageSlices} unit="groups" centre="groups" />
        </ChartCard>

        <ChartCard
          className="md:col-span-1 xl:col-span-2"
          title={city ? `Groups per brand in ${city.name}` : "Groups per city"}
          sub="Each bar split by stage"
          table={{
            columns: [city ? "Brand" : "City", ...STAGE_SERIES.map((s) => s.label), "Total"],
            rows: splitRows.map((r) => [r.label, ...STAGE_SERIES.map((s) => r.parts[s.key] ?? 0), Object.values(r.parts).reduce((a, b) => a + b, 0)]),
          }}
        >
          <Stacked rows={splitRows} series={STAGE_SERIES} unit="groups" />
        </ChartCard>

        <ChartCard
          className="md:col-span-2 xl:col-span-3"
          title="New groups per week"
          sub={`Groups started in each of the last 8 weeks, ${where}`}
          table={{ columns: ["Week starting", "Groups started"], rows: d.weekly.map((w) => [w.label, w.n]) }}
        >
          <Columns rows={d.weekly.map((w) => ({ label: w.label, value: w.n }))} unit="groups started" height={170} highlightLast />
        </ChartCard>
      </Section>

      {/* ---------------------------------------------------------------- cars */}
      <Section title="Cars" lead="Which cars, brands and budgets buyers want, counted in seats taken.">
        <ChartCard
          className="md:col-span-2"
          title="Most wanted models"
          sub={`Top 10 by seats taken, ${where}`}
          table={{ columns: ["Model", "Seats", "Groups"], rows: d.byModel.map((r) => [r.name, r.seats, r.groups]) }}
        >
          <HBars unit="seats" rows={d.byModel.map((r) => ({ label: r.name, value: r.seats, note: `${r.groups} ${r.groups === 1 ? "group" : "groups"}` }))} />
        </ChartCard>

        <ChartCard
          title="Demand by brand"
          sub={`Seats taken, ${where}`}
          table={{ columns: ["Brand", "Seats", "Groups"], rows: d.byBrand.map((r) => [r.name, r.seats, r.groups]) }}
        >
          <HBars unit="seats" rows={d.byBrand.map((r) => ({ label: r.name, value: r.seats }))} />
        </ChartCard>

        <ChartCard
          title="Body type"
          sub="Share of seats taken"
          table={{ columns: ["Body type", "Seats"], rows: bodySlices.map((s) => [s.label, s.value]) }}
        >
          <Donut slices={bodySlices} unit="seats" centre="seats" />
        </ChartCard>

        <ChartCard
          title="Fuel wanted"
          sub="Share of seats taken, by the group's fuel choice"
          table={{ columns: ["Fuel", "Seats"], rows: fuelSlices.map((s) => [s.label, s.value]) }}
        >
          <Donut slices={fuelSlices} unit="seats" centre="seats" />
        </ChartCard>

        <ChartCard
          title="Gearbox wanted"
          sub="Share of seats taken, by the group's gearbox choice"
          table={{ columns: ["Gearbox", "Seats"], rows: gearSlices.map((s) => [s.label, s.value]) }}
        >
          <Donut slices={gearSlices} unit="seats" centre="seats" />
        </ChartCard>

        <ChartCard
          title="Demand by budget"
          sub="Seats taken, by the car's average ex-showroom price"
          table={{ columns: ["Price band", "Seats"], rows: priceRows.map((r) => [r.label, r.value]) }}
        >
          <Columns rows={priceRows} unit="seats" />
        </ChartCard>

        {!city && (
          <ChartCard
            className="md:col-span-2"
            title="Demand by city and brand"
            sub="Seats taken. Brighter cells mean more seats"
            table={{
              columns: ["City", ...heatCols],
              rows: heatRows.map((r) => [r, ...heatCols.map((c) => heatCells[`${r}|${c}`] ?? 0)]),
            }}
          >
            <Heatmap rowLabels={heatRows} colLabels={heatCols} cells={heatCells} unit="seats" />
          </ChartCard>
        )}
      </Section>

      {/* ------------------------------------------------- showrooms and offers */}
      <Section title="Showrooms and offers" lead="Which showrooms quote, which offers buyers pick, and how many go on to buy.">
        <ChartCard
          title="From joining to delivery"
          sub={`Buyers who reached each step, as a share of all ${t.seats} seats`}
          table={{ columns: ["Step", "Buyers", "Share"], rows: funnel.map((r) => [r.label, r.value, r.note]) }}
        >
          <HBars unit="buyers" rows={funnel.map(({ label, value, note }) => ({ label, value, note }))} />
        </ChartCard>

        <ChartCard
          title="Quotes sent by showroom"
          sub="Top 8 showrooms by quotes sent"
          table={{ columns: ["Showroom", "City", "Quotes", "Offers picked"], rows: d.byShowroom.map((s) => [s.name, s.city, s.quotes, s.picks]) }}
        >
          <HBars unit="quotes" rows={topQuoting.map((s) => ({ label: s.name, value: s.quotes, note: city ? undefined : s.city }))} />
        </ChartCard>

        <ChartCard
          title="Offers picked by showroom"
          sub="Top 8 showrooms by buyers who picked their quote"
          table={{ columns: ["Showroom", "City", "Offers picked", "Quotes"], rows: [...d.byShowroom].sort((a, b) => b.picks - a.picks).map((s) => [s.name, s.city, s.picks, s.quotes]) }}
        >
          <HBars unit="buyers" rows={topPicked.map((s) => ({ label: s.name, value: s.picks, note: city ? undefined : s.city }))} />
        </ChartCard>

        <ChartCard
          className="md:col-span-1"
          title="Average discount by brand"
          sub="Carmaker offer plus showroom discount, per quote"
          table={{ columns: ["Brand", "Average discount", "Quotes"], rows: d.discountByBrand.map((r) => [r.name, fmt(r.avg, "rupees"), r.quotes]) }}
        >
          <HBars unit="average discount" f="rupees" rows={d.discountByBrand.map((r) => ({ label: r.name, value: r.avg }))} />
        </ChartCard>

        <ChartCard
          className="md:col-span-1 xl:col-span-2"
          title="Showrooms that have quoted"
          sub={`Showrooms per brand, ${where}`}
          table={{ columns: ["Brand", "Showrooms", "Have quoted"], rows: d.showroomsByBrand.map((r) => [r.name, r.n, r.quoting]) }}
        >
          <Stacked
            unit="showrooms"
            series={showroomSeries}
            rows={d.showroomsByBrand.map((r) => ({ label: r.name, parts: { quoting: r.quoting, idle: r.n - r.quoting } }))}
          />
        </ChartCard>
      </Section>

      <p className="mt-14 text-sm text-faint">
        All figures come from the sample data loaded at setup. They update as people join and as you move groups and members through stages.
      </p>
    </div>
  );
}

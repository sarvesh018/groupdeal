"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import type { GroupCard as G } from "@/lib/queries";
import { BODY_LABEL, BODY_TYPES } from "@/lib/constants";
import { GroupRow } from "./group-row";

const BUDGETS = [
  { key: "any", label: "Any budget", test: () => true },
  { key: "u8", label: "Under ₹8 lakh", test: (g: G) => g.priceMin < 800000 },
  { key: "8-12", label: "₹8–12 lakh", test: (g: G) => g.priceMin < 1200000 && g.priceMax >= 800000 },
  { key: "12-18", label: "₹12–18 lakh", test: (g: G) => g.priceMin < 1800000 && g.priceMax >= 1200000 },
  { key: "18+", label: "Above ₹18 lakh", test: (g: G) => g.priceMax >= 1800000 },
];

const STAGES = [
  { key: "open", label: "Open to join", test: (g: G) => g.status === "forming" || g.status === "ready" },
  { key: "talks", label: "With showrooms", test: (g: G) => g.status === "negotiating" || g.status === "offers" },
  { key: "done", label: "Completed", test: (g: G) => g.status === "completed" },
  { key: "all", label: "All", test: () => true },
];

const SORTS = [
  { key: "full", label: "Nearly full first" },
  { key: "soon", label: "Closing soonest" },
  { key: "new", label: "Newest" },
];

export function GroupExplorer({
  groups,
  cities,
  brands,
  joinedIds,
  initialCity,
  signedIn,
}: {
  groups: G[];
  cities: { id: number; name: string; slug: string }[];
  brands: string[];
  joinedIds: number[];
  initialCity: string;
  signedIn: boolean;
}) {
  const [q, setQ] = useState("");
  const [city, setCity] = useState(initialCity);
  const [brand, setBrand] = useState("all");
  const [body, setBody] = useState("all");
  const [budget, setBudget] = useState("any");
  const [stage, setStage] = useState("open");
  const [sort, setSort] = useState("full");

  const joined = useMemo(() => new Set(joinedIds), [joinedIds]);

  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const budgetTest = BUDGETS.find((b) => b.key === budget)!.test;
    const stageTest = STAGES.find((s) => s.key === stage)!.test;
    const list = groups.filter((g) => {
      if (city !== "all" && g.citySlug !== city) return false;
      if (brand !== "all" && g.brand !== brand) return false;
      if (body !== "all" && g.bodyType !== body) return false;
      if (!budgetTest(g) || !stageTest(g)) return false;
      const hay = `${g.brand} ${g.model} ${g.city} ${g.fuel} ${g.variant}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    list.sort((a, b) => {
      if (sort === "full") return b.members / b.targetSize - a.members / a.targetSize;
      if (sort === "soon") return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [groups, q, city, brand, body, budget, stage, sort]);

  const filtered = q !== "" || brand !== "all" || body !== "all" || budget !== "any" || city !== "all" || stage !== "open";
  const clear = () => {
    setQ(""); setCity("all"); setBrand("all"); setBody("all"); setBudget("any"); setStage("open");
  };

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-faint" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search car, brand or city"
          aria-label="Search groups"
          className="field rounded-full py-4 pl-13 pr-12 text-base"
        />
        {q && (
          <button onClick={() => setQ("")} aria-label="Clear search" className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-dim hover:bg-raised hover:text-text">
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="City">
        <button onClick={() => setCity("all")} aria-pressed={city === "all"} className={`chip ${city === "all" ? "chip-on" : ""}`}>All cities</button>
        {cities.map((c) => (
          <button key={c.id} onClick={() => setCity(c.slug)} aria-pressed={city === c.slug} className={`chip ${city === c.slug ? "chip-on" : ""}`}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Brand" className="field">
          <option value="all">All brands</option>
          {brands.map((b) => <option key={b}>{b}</option>)}
        </select>
        <select value={body} onChange={(e) => setBody(e.target.value)} aria-label="Body type" className="field">
          <option value="all">Any body type</option>
          {BODY_TYPES.map((b) => <option key={b} value={b}>{BODY_LABEL[b]}</option>)}
        </select>
        <select value={budget} onChange={(e) => setBudget(e.target.value)} aria-label="Budget" className="field">
          {BUDGETS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" className="field">
          {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line">
        <div className="flex gap-6" role="tablist" aria-label="Group stage">
          {STAGES.map((s) => (
            <button
              key={s.key}
              role="tab"
              aria-selected={stage === s.key}
              onClick={() => setStage(s.key)}
              className={`-mb-px border-b-2 pb-3 text-sm font-medium transition ${stage === s.key ? "border-accent text-text" : "border-transparent text-dim hover:text-text"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="ml-auto pb-3 text-sm text-dim" aria-live="polite">
          <span className="tnum font-semibold text-text">{shown.length}</span> {shown.length === 1 ? "group" : "groups"}
          {filtered && (
            <button onClick={clear} className="ml-3 font-medium text-accent hover:underline">Clear filters</button>
          )}
        </p>
      </div>

      {shown.length > 0 ? (
        <div>
          {shown.map((g) => (
            <div key={g.id} className="animate-rise">
              <GroupRow g={g} joined={joined.has(g.id)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-(--radius-card) border border-dashed border-line-strong p-12 text-center">
          <p className="font-display text-2xl">No group matches that yet</p>
          <p className="mx-auto mt-2 max-w-md text-dim">
            Be the first. Start a group for the car you want and share the link with friends and colleagues.
          </p>
          <Link href={signedIn ? "/groups/new" : "/register?next=/groups/new"} className="btn btn-primary mt-6">Start a group</Link>
        </div>
      )}
    </div>
  );
}

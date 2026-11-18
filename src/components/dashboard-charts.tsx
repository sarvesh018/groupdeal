"use client";

import { useState } from "react";
import { fmt, type Fmt } from "@/lib/format";

/* ------------------------------------------------------------------ format */

/* ------------------------------------------------------------- the card */

export type TableData = { columns: string[]; rows: (string | number)[][] };

/**
 * A chart with a title, a line saying what it covers, and a switch
 * to read the same numbers as a table.
 */
export function ChartCard({
  title,
  sub,
  table,
  children,
  className = "",
}: {
  title: string;
  sub?: string;
  table?: TableData;
  children: React.ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <section className={`card flex min-w-0 flex-col p-5 sm:p-6 ${className}`}>
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-xl leading-tight tracking-[-0.025em]">{title}</h3>
          {sub && <p className="mt-1 text-[13px] text-faint">{sub}</p>}
        </div>
        {table && (
          <div className="flex shrink-0 rounded-full border border-line p-0.5 text-xs" role="group" aria-label={`${title}: view`}>
            {(["chart", "table"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`rounded-full px-2.5 py-1 capitalize transition-colors ${view === v ? "bg-raised text-text" : "text-faint hover:text-text"}`}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </header>
      <div className="mt-5 flex-1">
        {view === "chart" || !table ? (
          children
        ) : (
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  {table.columns.map((c, i) => (
                    <th key={c} className={`sticky top-0 border-b border-line bg-panel py-2 pr-3 text-xs font-medium text-faint ${i > 0 ? "text-right" : ""}`}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    {r.map((cell, j) => (
                      <td key={j} className={`py-2 pr-3 ${j > 0 ? "tnum text-right" : "text-dim"}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function Empty() {
  return <p className="py-10 text-center text-sm text-faint">No data for this selection yet.</p>;
}

function Legend({ items }: { items: { key: string; label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-dim">
      {items.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------------------------- horizontal bars */

/** Ranked bars for one measure. The leading bar takes the accent; the rest stay quiet. */
export function HBars({
  rows,
  f = "count",
  unit,
}: {
  rows: { label: string; value: number; note?: string }[];
  f?: Fmt;
  unit: string;
}) {
  if (rows.length === 0) return <Empty />;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.label} className="group" title={`${r.label}: ${fmt(r.value, f)} ${unit}${r.note ? ` (${r.note})` : ""}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-dim transition-colors group-hover:text-text">{r.label}</span>
            <span className="tnum shrink-0">
              {fmt(r.value, f)}
              {r.note && <span className="ml-2 text-xs text-faint">{r.note}</span>}
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-raised">
            <div
              className="h-2 origin-left animate-grow rounded-full transition-[filter] group-hover:brightness-125"
              style={{
                width: `${r.value > 0 ? Math.max(1.5, (r.value / max) * 100) : 0}%`,
                background: i === 0 ? "var(--color-accent)" : "var(--bar-quiet)",
                animationDelay: `${i * 40}ms`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------ vertical columns */

export function Columns({
  rows,
  f = "count",
  unit,
  height = 190,
  highlightLast = false,
}: {
  rows: { label: string; value: number }[];
  f?: Fmt;
  unit: string;
  height?: number;
  /** Accent the last column (e.g. "this week") instead of the tallest. */
  highlightLast?: boolean;
}) {
  if (rows.length === 0 || rows.every((r) => r.value === 0)) return <Empty />;
  const max = Math.max(1, ...rows.map((r) => r.value));
  const top = rows.reduce((b, r, i) => (r.value > rows[b].value ? i : b), 0);
  const hot = highlightLast ? rows.length - 1 : top;
  return (
    <div>
      <div className="flex items-end gap-[2px] border-b border-line-strong sm:gap-1.5" style={{ height }}>
        {rows.map((r, i) => (
          <div key={r.label} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end" title={`${r.label}: ${fmt(r.value, f)} ${unit}`}>
            <span className="tnum mb-1 text-center text-[11px] text-dim transition-colors group-hover:text-text">{fmt(r.value, f)}</span>
            <div
              className="mx-auto w-full max-w-12 origin-bottom rounded-t-[4px] transition-[filter] group-hover:brightness-125"
              style={{
                height: `${r.value > 0 ? Math.max(2, (r.value / max) * (height - 26)) : 0}px`,
                background: i === hot ? "var(--color-accent)" : "var(--bar-quiet)",
                animation: `grow-y 0.8s var(--ease-out-expo) ${i * 35}ms both`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-[2px] sm:gap-1.5">
        {rows.map((r) => (
          <span key={r.label} className="min-w-0 flex-1 truncate text-center text-[11px] text-faint">{r.label}</span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ donut / pie */

export type Slice = { key: string; label: string; value: number; color: string };

/**
 * Share of a whole. Hover a slice or a legend row to read it in the centre.
 * Zero slices are left out; meant for six slices or fewer.
 */
export function Donut({ slices, unit, centre }: { slices: Slice[]; unit: string; centre?: string }) {
  const [on, setOn] = useState<string | null>(null);
  const shown = slices.filter((s) => s.value > 0);
  const total = shown.reduce((a, s) => a + s.value, 0);
  if (total === 0) return <Empty />;
  const R = 70, W = 22, C = 2 * Math.PI * R, GAP = shown.length > 1 ? 3 : 0;
  // Where each slice starts along the ring.
  const starts = shown.map((_, i) => shown.slice(0, i).reduce((a, s) => a + (s.value / total) * C, 0));
  const active = shown.find((s) => s.key === on);
  return (
    <div className="flex flex-col items-center gap-5">
      <svg viewBox="0 0 180 180" className="w-44 shrink-0" role="img" aria-label={`${centre ?? unit}: ${shown.map((s) => `${s.label} ${s.value}`).join(", ")}`}>
        <g transform="rotate(-90 90 90)">
          {shown.map((s, i) => {
            const len = (s.value / total) * C;
            const dash = Math.max(0.5, len - GAP);
            const el = (
              <circle
                key={s.key}
                cx="90"
                cy="90"
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={on === s.key ? W + 6 : W}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-starts[i]}
                opacity={on && on !== s.key ? 0.35 : 1}
                className="cursor-pointer transition-[stroke-width,opacity] duration-200"
                onPointerEnter={() => setOn(s.key)}
                onPointerLeave={() => setOn(null)}
              >
                <title>{`${s.label}: ${fmt(s.value)} ${unit} (${Math.round((s.value / total) * 100)}%)`}</title>
              </circle>
            );
            return el;
          })}
        </g>
        <text x="90" y="88" textAnchor="middle" className="tnum pointer-events-none" fontFamily="var(--font-display)" fontSize="28" fill="var(--color-text)">
          {active ? `${Math.round((active.value / total) * 100)}%` : fmt(total)}
        </text>
        <text x="90" y="108" textAnchor="middle" className="pointer-events-none" fontSize="11" fill="var(--color-faint)">
          {active ? active.label : centre ?? unit}
        </text>
      </svg>
      <ul className="w-full min-w-0 space-y-1">
        {shown.map((s) => (
          <li
            key={s.key}
            onPointerEnter={() => setOn(s.key)}
            onPointerLeave={() => setOn(null)}
            className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${on === s.key ? "bg-raised" : ""}`}
          >
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-dim">{s.label}</span>
            <span className="tnum">{fmt(s.value)}</span>
            <span className="tnum w-10 text-right text-faint">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------- stacked bars */

export type Series = { key: string; label: string; color: string };

/** One bar per row, split into parts. Bar length is the row's total. */
export function Stacked({
  rows,
  series,
  unit,
}: {
  rows: { label: string; parts: Record<string, number> }[];
  series: Series[];
  unit: string;
}) {
  const [on, setOn] = useState<{ row: string; key: string } | null>(null);
  const totals = rows.map((r) => series.reduce((a, s) => a + (r.parts[s.key] ?? 0), 0));
  const max = Math.max(1, ...totals);
  if (rows.length === 0) return <Empty />;
  const used = series.filter((s) => rows.some((r) => (r.parts[s.key] ?? 0) > 0));
  const hovered = on ? rows.find((r) => r.label === on.row) : undefined;
  const hs = on ? series.find((s) => s.key === on.key) : undefined;
  return (
    <div>
      <Legend items={used} />
      <ul className="mt-4 space-y-3">
        {rows.map((r, i) => (
          <li key={r.label} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-sm">
            <span className="truncate text-dim">{r.label}</span>
            <div className="flex h-5 gap-[2px]" style={{ width: `${(totals[i] / max) * 100}%` }}>
              {series.map((s) => {
                const v = r.parts[s.key] ?? 0;
                if (!v) return null;
                return (
                  <div
                    key={s.key}
                    className="h-full origin-left animate-grow first:rounded-l-[4px] last:rounded-r-[4px] transition-opacity"
                    style={{ flex: v, background: s.color, opacity: on && !(on.row === r.label && on.key === s.key) ? 0.45 : 1 }}
                    onPointerEnter={() => setOn({ row: r.label, key: s.key })}
                    onPointerLeave={() => setOn(null)}
                    title={`${r.label}, ${s.label}: ${v} ${unit}`}
                  />
                );
              })}
            </div>
            <span className="tnum text-right">{totals[i]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 h-5 text-[13px] text-dim" aria-live="polite">
        {hovered && hs ? (
          <>
            <span className="text-text">{hovered.label}</span>, {hs.label}: <span className="tnum text-text">{hovered.parts[hs.key]}</span> {unit}
          </>
        ) : (
          <span className="text-faint">Hover a segment for its count.</span>
        )}
      </p>
    </div>
  );
}

/* -------------------------------------------------------- line chart */

export function Lines({
  points,
  series,
  unit,
}: {
  points: ({ label: string } & Record<string, number | string>)[];
  series: Series[];
  unit: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 220, padL = 30, padR = 14, padT = 14, padB = 26;
  const val = (p: (typeof points)[number], k: string) => Number(p[k] ?? 0);
  const max = Math.max(4, ...points.flatMap((p) => series.map((s) => val(p, s.key))));
  const top = Math.ceil(max / 4) * 4;
  const x = (i: number) => padL + (i / Math.max(1, points.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB);
  const labelEvery = Math.ceil(points.length / 6);
  const h = hover !== null ? points[hover] : null;
  return (
    <div>
      <Legend items={series} />
      <div className="relative mt-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none"
          role="img"
          aria-label={`${series.map((s) => s.label).join(" and ")} per day`}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - r.left) / r.width) * W;
            const i = Math.round(((px - padL) / (W - padL - padR)) * (points.length - 1));
            setHover(Math.max(0, Math.min(points.length - 1, i)));
          }}
          onPointerLeave={() => setHover(null)}
        >
          {[0, top / 2, top].map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="rgb(255 255 255 / 0.08)" />
              <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-faint)">{t}</text>
            </g>
          ))}
          {points.map((p, i) =>
            i % labelEvery === 0 ? (
              <text key={p.label} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : "middle"} fontSize="11" fill="var(--color-faint)">{p.label}</text>
            ) : null,
          )}
          {series.map((s) => (
            <path
              key={s.key}
              d={points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(val(p, s.key)).toFixed(1)}`).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {hover !== null && h && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={padT} y2={y(0)} stroke="var(--color-faint)" />
              {series.map((s) => (
                <circle key={s.key} cx={x(hover)} cy={y(val(h, s.key))} r="4.5" fill={s.color} stroke="var(--color-panel)" strokeWidth="2" />
              ))}
            </g>
          )}
        </svg>
        {hover !== null && h && (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-raised px-3 py-2 text-xs shadow-xl"
            style={{ left: `${Math.min(85, Math.max(15, (x(hover) / W) * 100))}%` }}
          >
            <p className="text-faint">{h.label}</p>
            {series.map((s) => (
              <p key={s.key} className="mt-0.5 flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />
                <span className="text-dim">{s.label}</span>
                <span className="tnum ml-auto pl-3 text-text">{val(h, s.key)} {unit}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ heat map */

const SEQ = ["var(--seq-5)", "var(--seq-4)", "var(--seq-3)", "var(--seq-2)", "var(--seq-1)"];

/** Rows × columns, each cell shaded by its count: brighter = more. */
export function Heatmap({
  rowLabels,
  colLabels,
  cells,
  unit,
}: {
  rowLabels: string[];
  colLabels: string[];
  cells: Record<string, number>;
  unit: string;
}) {
  const max = Math.max(1, ...Object.values(cells));
  const step = (v: number) => (v <= 0 ? -1 : Math.min(4, Math.floor((v / max) * 5 - 1e-9)));
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-[3px] text-xs">
          <thead>
            <tr>
              <th />
              {colLabels.map((c) => (
                <th key={c} className="px-1 pb-1 text-center font-normal text-faint" title={c}>
                  <span className="block max-w-[4.5rem] truncate">{c.replace("Maruti Suzuki", "Maruti")}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowLabels.map((r) => (
              <tr key={r}>
                <th className="whitespace-nowrap pr-2 text-left font-normal text-dim">{r}</th>
                {colLabels.map((c) => {
                  const v = cells[`${r}|${c}`] ?? 0;
                  const k = step(v);
                  return (
                    <td
                      key={c}
                      title={`${r}, ${c}: ${v} ${unit}`}
                      className="tnum h-9 min-w-10 rounded-[4px] text-center transition-[filter] hover:brightness-125"
                      style={{ background: k < 0 ? "var(--color-raised)" : SEQ[k], color: k >= 3 ? "#0b1830" : k < 0 ? "var(--color-faint)" : "#f5f5f5" }}
                    >
                      {v || "–"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-faint">
        <span>Fewer</span>
        {SEQ.map((c) => <span key={c} className="h-2.5 w-6 rounded-[2px]" style={{ background: c }} aria-hidden />)}
        <span>More {unit}</span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- meter */

export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <p className="flex items-baseline gap-2">
        <span className="tnum font-display text-5xl leading-none tracking-[-0.05em]">{Math.round(pct)}%</span>
        <span className="text-sm text-dim">{label}</span>
      </p>
      <div className="mt-4 h-2.5 rounded-full bg-raised">
        <div className="h-2.5 origin-left animate-grow rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-[13px] text-faint"><span className="tnum text-dim">{fmt(value)}</span> of {fmt(max)}</p>
    </div>
  );
}

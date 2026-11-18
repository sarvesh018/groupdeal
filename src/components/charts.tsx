"use client";

import { useState } from "react";

/**
 * Ranked horizontal bars: one measure across items, one colour.
 * The value is printed beside each bar, so no axis is needed.
 */
export function BarList({
  rows,
  unit,
  empty = "Nothing to show yet",
}: {
  rows: { label: string; value: number; note?: string }[];
  unit: string;
  empty?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="py-6 text-sm text-faint">{empty}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.label} className="group" title={`${r.label}: ${r.value} ${unit}${r.note ? ` (${r.note})` : ""}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-dim transition-colors group-hover:text-text">{r.label}</span>
            <span className="tnum shrink-0 font-semibold">
              {r.value}
              {r.note && <span className="ml-2 font-normal text-faint">{r.note}</span>}
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-raised">
            <div
              className="h-2 origin-left animate-grow rounded-full bg-chart transition-[filter] group-hover:brightness-125"
              style={{ width: `${Math.max(r.value > 0 ? 1.5 : 0, (r.value / max) * 100)}%`, animationDelay: `${i * 50}ms` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A daily count over time, with a crosshair and tooltip on hover or touch. */
export function TrendChart({ points, unit }: { points: { label: string; n: number }[]; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 200, padL = 28, padR = 12, padT = 12, padB = 26;
  const max = Math.max(4, ...points.map((p) => p.n));
  const top = Math.ceil(max / 4) * 4;
  const x = (i: number) => padL + (i / Math.max(1, points.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.n).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`;
  const ticks = [0, top / 2, top];
  const labelEvery = Math.ceil(points.length / 6);
  const h = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        role="img"
        aria-label={`${unit} per day over the last ${points.length} days`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - padL) / (W - padL - padR)) * (points.length - 1));
          setHover(Math.max(0, Math.min(points.length - 1, i)));
        }}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="rgb(255 255 255 / 0.1)" strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-faint)">{t}</text>
          </g>
        ))}
        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text key={p.label} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : "middle"} fontSize="11" fill="var(--color-faint)">{p.label}</text>
          ) : null,
        )}
        <path d={area} fill="var(--color-accent)" opacity="0.1" />
        <path d={line} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && h && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={y(0)} stroke="var(--color-faint)" strokeWidth="1" />
            <circle cx={x(hover)} cy={y(h.n)} r="5" fill="var(--color-accent)" stroke="var(--color-panel)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover !== null && h && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-raised px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: `${Math.min(88, Math.max(12, (x(hover) / W) * 100))}%` }}
        >
          <span className="text-dim">{h.label}: </span>
          <span className="tnum font-semibold">{h.n} {unit}</span>
        </div>
      )}
    </div>
  );
}

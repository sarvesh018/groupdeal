/** Simple line drawings by body type. Stand-ins until real car photos are licensed. */
const BODIES: Record<string, string> = {
  suv: "M12 60V44q2-9 18-12l22-18q5-4 12-4h74q9 0 15 6l18 17q17 3 19 14v13",
  mpv: "M12 60V42q2-9 16-12l26-17q5-3 12-3h82q9 0 14 7l12 17q14 3 16 13v13",
  sedan: "M8 60V48q2-7 22-10l32-17q6-4 16-4h44q10 0 18 6l20 15q26 2 32 11v11",
  hatchback: "M12 60V46q2-8 22-11l26-18q5-3 12-3h66q10 0 16 8l16 16q12 2 14 11v11",
};
const WINDOWS: Record<string, string> = {
  suv: "M40 32l16-13q4-3 9-3h30v16zM103 16h33q6 0 10 4l12 12h-55z",
  mpv: "M38 30l19-12q4-2 8-2h32v14zM105 16h41q5 0 8 4l7 10h-56z",
  sedan: "M42 38l24-13q5-2 11-2h20v15zM105 23h18q7 0 12 4l13 11h-43z",
  hatchback: "M44 35l19-13q4-2 8-2h24v15zM103 20h34q6 0 9 4l10 11h-53z",
};

export function CarGlyph({ bodyType, className = "" }: { bodyType: string; className?: string }) {
  const body = BODIES[bodyType] ?? BODIES.suv;
  const win = WINDOWS[bodyType] ?? WINDOWS.suv;
  return (
    <svg viewBox="0 0 200 76" fill="none" className={className} aria-hidden>
      <path d={win} fill="currentColor" opacity="0.12" />
      <path d={`${body}H172M132 60H68M32 60H12`} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50" cy="60" r="11" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="152" cy="60" r="11" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="50" cy="60" r="3" fill="currentColor" />
      <circle cx="152" cy="60" r="3" fill="currentColor" />
    </svg>
  );
}

/**
 * The product's signature: a group shown as seats. Filled seats are members,
 * the pulsing one is the next seat to take, outlines are still open.
 */
export function Seats({
  filled,
  total,
  size = "md",
  animate = false,
  showNext = true,
  tone = "dark",
}: {
  filled: number;
  total: number;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  showNext?: boolean;
  /** "light" is for the one light section of the site. */
  tone?: "dark" | "light";
}) {
  const dot = size === "lg" ? "size-5" : size === "md" ? "size-3" : "size-2";
  const gap = size === "lg" ? "gap-2.5" : size === "md" ? "gap-1.5" : "gap-1";
  const taken = Math.min(filled, total);
  const extra = Math.max(0, filled - total);
  return (
    <div
      className={`flex flex-wrap items-center ${gap}`}
      role="img"
      aria-label={`${filled} of ${total} seats taken`}
    >
      {Array.from({ length: total }, (_, i) => {
        const isTaken = i < taken;
        const isNext = showNext && i === taken;
        return (
          <span
            key={i}
            style={animate ? { animationDelay: `${i * 55}ms` } : undefined}
            className={`${dot} rounded-full ${animate ? "animate-seat" : ""} ${
              isTaken
                ? "bg-accent"
                : isNext
                  ? "animate-beacon border-2 border-accent"
                  : tone === "light"
                    ? "border border-ink/30"
                    : "border border-line-strong"
            }`}
          />
        );
      })}
      {extra > 0 && <span className="ml-1 text-xs font-semibold text-accent">+{extra}</span>}
    </div>
  );
}

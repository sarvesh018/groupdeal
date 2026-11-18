import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { GroupCard as G } from "@/lib/queries";
import { STATUS_LABEL } from "@/lib/constants";
import { deadlineText, priceRange } from "@/lib/format";
import { Seats } from "./seats";

/**
 * One group as a line on the board: car, city, seats, time left.
 * The whole line is the link.
 */
export function GroupRow({ g, joined = false, note }: { g: G; joined?: boolean; note?: string }) {
  const filling = g.status === "forming";
  const left = Math.max(0, g.targetSize - g.members);
  const spec = [g.fuel !== "Any" && g.fuel, g.transmission !== "Any" && g.transmission].filter(Boolean).join(", ");
  return (
    <Link
      href={`/groups/${g.id}`}
      className="group relative grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-4 border-b border-line py-6 transition-colors duration-300 hover:bg-white/[0.025] sm:px-4 lg:grid-cols-[minmax(0,1.5fr)_8rem_minmax(0,1.2fr)_9.5rem_2.5rem]"
    >
      <span className="absolute inset-y-0 left-0 w-px origin-top scale-y-0 bg-accent transition-transform duration-500 ease-(--ease-out-expo) group-hover:scale-y-100" aria-hidden />

      <span className="min-w-0 transition-transform duration-500 ease-(--ease-out-expo) group-hover:translate-x-2">
        <span className="block text-[13px] text-faint">
          {g.brand}
          {joined && <span className="ml-3 text-mint">You&apos;re in</span>}
        </span>
        <span className="mt-0.5 block truncate font-display text-[1.7rem] font-medium leading-tight tracking-[-0.035em] sm:text-[2rem]">{g.model}</span>
        <span className="mt-1 block truncate text-sm text-dim">
          {priceRange(g.priceMin, g.priceMax)}{spec ? `, ${spec}` : ""}
        </span>
      </span>

      <span className="justify-self-end text-right text-sm text-dim lg:justify-self-start lg:text-left">{g.city}</span>

      <span className="col-span-2 lg:col-span-1">
        <Seats filled={g.members} total={g.targetSize} size="md" showNext={filling} />
        <span className="mt-2 block text-sm text-dim">
          <span className="tnum font-semibold text-text">{g.members}</span> of {g.targetSize} buyers
          {filling && left > 0 && <span className="text-accent">, {left} to go</span>}
        </span>
      </span>

      <span className="text-sm">
        <span className={filling ? "text-text" : g.status === "offers" ? "text-mint" : "text-dim"}>
          {filling ? deadlineText(g.deadline) : STATUS_LABEL[g.status]}
        </span>
        {note && <span className="mt-0.5 block text-faint">{note}</span>}
      </span>

      <span className="hidden size-10 place-items-center justify-self-end rounded-full border border-line text-dim transition-all duration-300 group-hover:border-accent group-hover:bg-accent group-hover:text-ink lg:grid" aria-hidden>
        <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:rotate-45" />
      </span>
    </Link>
  );
}

import { STATUS_LABEL } from "@/lib/constants";

const TONE: Record<string, string> = {
  forming: "border-accent/40 text-accent",
  ready: "border-line-strong text-text",
  negotiating: "border-line-strong text-text",
  offers: "border-mint/50 text-mint",
  completed: "border-line text-dim",
  expired: "border-line text-faint",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE[status] ?? TONE.completed}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

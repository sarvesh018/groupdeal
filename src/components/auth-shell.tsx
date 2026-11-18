import { Seats } from "./seats";

/** Split screen for sign-in and sign-up: a statement on the left, the form on the right. */
export function AuthShell({
  title,
  lead,
  children,
  filled = 7,
}: {
  title: string;
  lead: string;
  children: React.ReactNode;
  filled?: number;
}) {
  return (
    <div className="shell grid gap-12 pt-12 lg:min-h-[calc(100svh-4.5rem)] lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-20 lg:pt-0">
      <div className="flex flex-col justify-center lg:border-r lg:border-line lg:pr-16">
        <h1 className="text-6xl leading-[0.92] tracking-[-0.05em] sm:text-7xl xl:text-8xl">{title}</h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-dim">{lead}</p>
        <div className="mt-12 hidden lg:block">
          <Seats filled={filled} total={10} size="lg" animate />
          <p className="mt-4 text-sm text-faint">Seven are in. The glowing seat is yours.</p>
        </div>
      </div>
      <div className="flex flex-col justify-center lg:py-16">{children}</div>
    </div>
  );
}

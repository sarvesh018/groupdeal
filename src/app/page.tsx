import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { listCities, listGroups } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { HeroVisual } from "@/components/hero-visual";
import { LineReveal, Magnetic, Reveal } from "@/components/motion";
import { GroupRow } from "@/components/group-row";
import { StepsScroll } from "@/components/steps-scroll";
import { deadlineText } from "@/lib/format";

const ACTIVE = ["forming", "ready", "negotiating", "offers"];

export default async function Home() {
  const [user, groups, cities] = await Promise.all([getCurrentUser(), listGroups(), listCities()]);
  const forming = groups.filter((g) => g.status === "forming");
  const almostFull = [...forming].sort((a, b) => b.members / b.targetSize - a.members / a.targetSize);
  const feature = almostFull[0];
  const board = almostFull.slice(1, 6);
  const startHref = user ? "/groups/new" : "/register?next=/groups/new";
  const seatsTaken = groups.filter((g) => ACTIVE.includes(g.status)).reduce((n, g) => n + g.members, 0);

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="relative -mt-[4.5rem] flex min-h-[100svh] flex-col overflow-hidden">
        <div className="absolute inset-x-0 top-[4rem] h-[40svh] sm:h-[48svh] lg:left-[30%] lg:top-0 lg:h-[63svh]">
          {feature && <HeroVisual filled={feature.members} total={feature.targetSize} />}
        </div>

        {feature && (
          <Reveal delay={0.9} className="shell absolute inset-x-0 top-[6.5rem] hidden lg:block">
            <Link href={`/groups/${feature.id}`} className="group inline-block max-w-[17rem] text-sm leading-relaxed">
              <span className="flex items-center gap-2 text-faint">
                <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
                A real group, filling up now
              </span>
              <span className="mt-2 block font-display text-xl leading-snug tracking-[-0.02em] text-text">
                {feature.brand} {feature.model}, {feature.city}
              </span>
              <span className="mt-1 block text-dim">
                <span className="tnum text-text">{feature.members}</span> of {feature.targetSize} seats taken. {deadlineText(feature.deadline)}.
              </span>
              <span className="mt-3 inline-flex items-center gap-1.5 border-b border-line-strong pb-0.5 text-text transition-colors group-hover:border-accent group-hover:text-accent">
                The glowing seat is yours <ArrowUpRight className="size-4" aria-hidden />
              </span>
            </Link>
          </Reveal>
        )}

        <div className="shell relative mt-auto pb-10 pt-[44svh] sm:pt-[54svh] lg:pb-14 lg:pt-[52svh]">
          <h1 className="text-[clamp(2.6rem,6.1vw,7.25rem)] font-medium leading-[0.96] tracking-[-0.045em]">
            <LineReveal lines={["Ten buyers walk in together.", "The showroom listens."]} delay={0.15} />
          </h1>
          <div className="mt-8 grid gap-8 lg:mt-12 lg:grid-cols-[1fr_auto] lg:items-end">
            <Reveal delay={0.55}>
              <p className="max-w-xl text-lg leading-relaxed text-dim">
                Join people in your city who want the same car. We take the whole group to authorised
                showrooms and bring back their written quotes. You choose whether to buy.
              </p>
            </Reveal>
            <Reveal delay={0.7} className="flex flex-wrap items-center gap-3">
              <Magnetic>
                <Link href="/groups" className="btn btn-primary btn-lg">Find a group</Link>
              </Magnetic>
              <Link href={startHref} className="btn btn-quiet btn-lg">Start a group</Link>
            </Reveal>
          </div>
          {feature && (
            <Link href={`/groups/${feature.id}`} className="mt-8 block border-t border-line pt-5 text-sm text-dim lg:hidden">
              Shown above: the {feature.brand} {feature.model} group in {feature.city},{" "}
              <span className="tnum text-text">{feature.members}</span> of {feature.targetSize} seats taken.{" "}
              <span className="text-accent">See it</span>
            </Link>
          )}
        </div>
        <ArrowDown className="absolute bottom-6 right-12 hidden size-5 animate-bounce text-faint [animation-duration:2.4s] xl:block" aria-hidden />
      </section>

      {/* ---------------------------------------------------------- cities */}
      <section className="rule">
        <div className="shell grid gap-12 py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20 lg:py-36">
          <Reveal className="lg:sticky lg:top-32 lg:self-start">
            <h2 className="text-5xl leading-[0.98] sm:text-6xl xl:text-7xl">One group per car, per city.</h2>
            <p className="mt-6 max-w-sm text-lg leading-relaxed text-dim">
              Splitting buyers across small groups helps nobody. Everyone in a city who wants the same car
              sits at one table.
            </p>
            <p className="mt-10 text-sm text-faint">
              <span className="tnum font-display text-4xl tracking-[-0.04em] text-text">{seatsTaken}</span>
              <span className="ml-3">seats taken in active groups right now</span>
            </p>
          </Reveal>
          <ul>
            {cities.map((c, i) => {
              const n = groups.filter((g) => g.cityId === c.id && ACTIVE.includes(g.status)).length;
              return (
                <li key={c.id}>
                  <Reveal delay={i * 0.05}>
                    <Link
                      href={`/groups?city=${c.slug}`}
                      className="group flex items-baseline justify-between gap-6 border-b border-line py-5 transition-colors first:border-t lg:py-7"
                    >
                      <span className="font-display text-4xl tracking-[-0.04em] text-dim transition-all duration-500 ease-(--ease-out-expo) group-hover:translate-x-3 group-hover:text-text sm:text-5xl lg:text-6xl">
                        {c.name}
                      </span>
                      <span className="flex shrink-0 items-center gap-4 text-sm text-faint">
                        <span><span className="tnum text-text">{n}</span> active {n === 1 ? "group" : "groups"}</span>
                        <ArrowUpRight className="size-5 text-accent opacity-0 transition-all duration-300 group-hover:opacity-100" aria-hidden />
                      </span>
                    </Link>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------- how it works */}
      <StepsScroll />

      {/* ------------------------------------------------------- the board */}
      {board.length > 0 && (
        <section className="shell py-24 lg:py-36">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Reveal>
              <h2 className="text-5xl leading-[0.98] sm:text-6xl xl:text-7xl">Nearly full.</h2>
              <p className="mt-4 max-w-md text-lg text-dim">These groups need a few more buyers before they go to showrooms.</p>
            </Reveal>
            <Link href="/groups" className="btn btn-quiet">See all groups</Link>
          </div>
          <div className="rule mt-12">
            {board.map((g, i) => (
              <Reveal key={g.id} delay={i * 0.04}>
                <GroupRow g={g} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* --------------------------------------------------------- promise */}
      <section className="rule">
        <div className="shell grid gap-10 py-24 lg:grid-cols-[minmax(0,2fr)_minmax(0,9fr)] lg:py-36">
          <p className="text-sm text-faint">What we promise, and what we don&apos;t</p>
          <Reveal>
            <p className="font-display text-3xl leading-[1.12] tracking-[-0.035em] sm:text-5xl sm:leading-[1.06] xl:text-6xl">
              We won&apos;t promise a discount before a showroom puts it in writing.{" "}
              <span className="text-faint">
                You see every quote in full, you buy directly from an authorised showroom, and the invoice
                and warranty are in your name.
              </span>
            </p>
            <ul className="mt-12 grid gap-x-10 gap-y-6 text-dim sm:grid-cols-3">
              <li className="border-t border-line pt-5"><span className="block font-display text-xl tracking-[-0.02em] text-text">Free for buyers</span>No joining fee, no deposit.</li>
              <li className="border-t border-line pt-5"><span className="block font-display text-xl tracking-[-0.02em] text-text">No commitment</span>Leave a group any time.</li>
              <li className="border-t border-line pt-5"><span className="block font-display text-xl tracking-[-0.02em] text-text">Your money, your showroom</span>We never handle the payment.</li>
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------- end */}
      <section className="rule">
        <div className="shell flex flex-col items-start gap-10 pb-4 pt-24 lg:flex-row lg:items-end lg:justify-between lg:pt-36">
          <Reveal>
            <h2 className="text-[clamp(3.2rem,9vw,9.5rem)] leading-[0.9] tracking-[-0.055em] lg:whitespace-nowrap">Take your seat.</h2>
          </Reveal>
          <Reveal delay={0.15} className="flex shrink-0 flex-wrap gap-3 lg:flex-nowrap lg:pb-5">
            <Magnetic>
              <Link href="/groups" className="btn btn-primary btn-lg">Find a group</Link>
            </Magnetic>
            <Link href={startHref} className="btn btn-quiet btn-lg">Start a group</Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}

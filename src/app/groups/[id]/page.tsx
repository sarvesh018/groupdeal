import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Star } from "lucide-react";
import { getGroup, myReferral } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { STAGE_LABEL, STATUS_LABEL, STATUS_STEPS } from "@/lib/constants";
import { deadlineText, nextMonths, priceRange, publicName, shortDate } from "@/lib/format";
import { Seats } from "@/components/seats";
import { CarGlyph } from "@/components/car-glyph";
import { ChoicesForm, JoinForm, LeaveForm, SignInToJoin } from "@/components/join-panel";
import { ReferralCard } from "@/components/referral-card";
import { ShareGroup } from "@/components/copy-link";
import { QuoteCompare } from "@/components/quote-compare";
import { Reveal } from "@/components/motion";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await getGroup(Number(id));
  return { title: g ? `${g.brand} ${g.model} group in ${g.city}` : "Group not found" };
}

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const groupId = Number(id);
  if (!Number.isInteger(groupId)) notFound();
  const [g, user] = await Promise.all([getGroup(groupId), getCurrentUser()]);
  if (!g) notFound();

  const me = user ? g.memberRows.find((m) => m.userId === user.id) : undefined;
  const open = g.status === "forming" || g.status === "ready";
  const stepIndex = STATUS_STEPS.findIndex((s) => s.key === g.status);
  const showQuotes = g.quoteRows.length > 0 && (g.status === "offers" || g.status === "completed");
  const myQuote = me?.acceptedQuoteId ? g.quoteRows.find((q) => q.id === me.acceptedQuoteId) : undefined;
  const referral = me && myQuote ? await myReferral(me.id, myQuote.id) : null;
  const canEditChoices = !!me && ["forming", "ready", "negotiating"].includes(g.status);
  const left = Math.max(0, g.targetSize - g.members);
  const spec = [g.variant && `${g.variant} variant`, g.fuel !== "Any" && g.fuel, g.transmission !== "Any" && g.transmission].filter(Boolean);

  return (
    <div className="shell pt-8 lg:pt-12">
      <Link href="/groups" className="inline-flex items-center gap-1.5 text-sm text-dim transition-colors hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> All groups
      </Link>

      {created && (
        <div className="mt-6 rounded-xl border border-mint/40 bg-mint/10 p-4 text-sm text-mint" role="status">
          Group started, and you have the first seat. Share the link to fill the rest.
        </div>
      )}

      <header className="relative mt-10 lg:mt-16">
        <CarGlyph bodyType={g.bodyType} className="pointer-events-none absolute -top-10 right-0 hidden w-[26rem] text-white/[0.07] lg:block" />
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-dim">
          <span className={`flex items-center gap-2 ${g.status === "forming" ? "text-accent" : g.status === "offers" ? "text-mint" : "text-text"}`}>
            <span className="size-1.5 rounded-full bg-current" aria-hidden />
            {STATUS_LABEL[g.status]}
          </span>
          <span>{g.city}</span>
          <span>{g.brand}</span>
        </p>
        <h1 className="mt-4 text-[clamp(3.4rem,10vw,10rem)] leading-[0.9] tracking-[-0.055em]">{g.model}</h1>
        <p className="mt-6 max-w-2xl text-lg text-dim">
          {priceRange(g.priceMin, g.priceMax)} ex-showroom (indicative)
          {spec.length > 0 && <>. Group preference: {spec.join(", ")}</>}
        </p>
        {g.description && <p className="mt-4 max-w-2xl leading-relaxed text-text/90">{g.description}</p>}
      </header>

      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-16">
        <div className="min-w-0">
          {g.status === "expired" ? (
            <p className="border-y border-line py-6 text-dim">
              This group closed before it filled. You can start a new one for the same car.
            </p>
          ) : (
            <ol className="grid gap-x-5 gap-y-6 sm:grid-cols-5">
              {STATUS_STEPS.map((s, i) => {
                const done = i < stepIndex;
                const now = i === stepIndex;
                return (
                  <li key={s.key} className={`border-t pt-4 ${now ? "border-accent" : done ? "border-text/60" : "border-line"}`}>
                    <span className={`flex items-center gap-2 text-sm ${now ? "text-accent" : done ? "text-text" : "text-faint"}`}>
                      <span className="tnum font-display">{String(i + 1).padStart(2, "0")}</span>
                      {done && <Check className="size-3.5" aria-label="Done" />}
                    </span>
                    <p className={`mt-2 font-display text-lg leading-snug tracking-[-0.02em] ${done || now ? "text-text" : "text-faint"}`}>{s.label}</p>
                    <p className={`mt-1.5 text-[13px] leading-snug ${now ? "text-dim" : "text-faint"}`}>{s.hint}</p>
                  </li>
                );
              })}
            </ol>
          )}

          {myQuote && me && referral && (
            <ReferralCard referral={referral} showroom={myQuote.showroom} locality={myQuote.showroomLocality} city={g.city} phone={myQuote.showroomPhone} groupId={g.id} />
          )}

          {showQuotes && (
            <Reveal className="mt-20">
              <section>
                <h2 className="text-4xl leading-none sm:text-5xl">Offers for this group</h2>
                <p className="mt-4 text-dim">
                  {g.quoteRows.length} written {g.quoteRows.length === 1 ? "quote" : "quotes"}, every charge listed.
                  {!me && " Only members can pick an offer."}
                </p>
                <div className="mt-8">
                  <QuoteCompare group={g} me={me} canAct={!!me && g.status === "offers" && ["interested", "verified", "accepted"].includes(me.stage)} />
                </div>
              </section>
            </Reveal>
          )}

          <Reveal className="mt-20">
            <section>
              <h2 className="text-4xl leading-none sm:text-5xl">Who&apos;s in</h2>
              <p className="mt-4 text-dim">Other members see only a first name and area. Phone numbers stay private.</p>
              <ul className="rule mt-8 grid gap-x-12 sm:grid-cols-2">
                {g.memberRows.map((m, i) => (
                  <li key={m.id} className="flex items-center gap-4 border-b border-line py-4">
                    <span className="tnum w-6 font-display text-sm text-faint">{String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {publicName(m.name)}
                        {m.userId === user?.id && <span className="ml-2 text-xs text-accent">You</span>}
                        {m.userId === g.creatorId && <span className="ml-2 text-xs font-normal text-faint">Started this group</span>}
                      </span>
                      <span className="block truncate text-sm text-dim">{m.locality || g.city}</span>
                    </span>
                    {m.stage !== "interested" && <span className="shrink-0 text-xs text-mint">{STAGE_LABEL[m.stage]}</span>}
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>

          <Reveal className="mt-20">
            <section>
              <h2 className="text-4xl leading-none sm:text-5xl">{g.brand} showrooms in {g.city}</h2>
              <p className="mt-4 text-dim">Authorised showrooms we invite to quote. Sample names for this demo.</p>
              <ul className="rule mt-8">
                {g.localShowrooms.map((s) => (
                  <li key={s.id} className="flex items-baseline justify-between gap-4 border-b border-line py-5">
                    <span className="min-w-0">
                      <span className="block truncate font-display text-2xl tracking-[-0.03em]">{s.name}</span>
                      <span className="block text-sm text-dim">{s.locality}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-sm text-dim">
                      <Star className="size-3.5 fill-accent text-accent" aria-hidden />{s.rating.toFixed(1)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        </div>

        <aside className="order-first lg:order-none">
          <div className="card p-6 sm:p-7 lg:sticky lg:top-28">
            <Seats filled={g.members} total={g.targetSize} size="lg" animate showNext={open && !me} />
            <p className="mt-6 flex items-baseline gap-2">
              <span className="tnum font-display text-6xl leading-none tracking-[-0.05em]">{g.members}</span>
              <span className="text-dim">of {g.targetSize} buyers</span>
            </p>
            {g.status === "forming" && (
              <p className="mt-3 text-sm text-dim">
                {left > 0 ? `${left} more to go. ` : ""}{deadlineText(g.deadline)}, closes {shortDate(g.deadline)}.
              </p>
            )}

            <div className="mt-6 border-t border-line pt-6">
              {me ? (
                <div className="space-y-4">
                  <p className="flex items-center gap-2 font-semibold text-mint">
                    <Check className="size-5" aria-hidden /> You&apos;re in this group
                  </p>
                  <p className="text-sm text-dim">Your status: {STAGE_LABEL[me.stage]}</p>
                  {open && (
                    <>
                      <p className="text-sm leading-relaxed text-dim">Fuller groups get a better hearing. Invite people who want this car.</p>
                      <ShareGroup path={`/groups/${g.id}`} text={`Join our ${g.brand} ${g.model} buying group in ${g.city}:`} />
                    </>
                  )}
                  {canEditChoices && me && (
                    <details className="border-t border-line pt-4">
                      <summary className="cursor-pointer text-sm font-medium">
                        Your choices: {[me.variant || "any variant", me.colour || "any colour", me.transmission].filter(Boolean).join(", ")}
                      </summary>
                      <div className="mt-4">
                        <ChoicesForm groupId={g.id} months={nextMonths()} variants={g.variantList} colours={g.colourList} value={me} purchaseMonth={me.purchaseMonth} />
                      </div>
                    </details>
                  )}
                  {(open || g.status === "negotiating") && <LeaveForm groupId={g.id} />}
                </div>
              ) : open ? (
                user ? <JoinForm groupId={g.id} months={nextMonths()} variants={g.variantList} colours={g.colourList} /> : <SignInToJoin groupId={g.id} />
              ) : (
                <p className="text-sm leading-relaxed text-dim">
                  This group is no longer taking new members.{" "}
                  <Link href="/groups/new" className="font-semibold text-accent hover:underline">Start a new group</Link> for this car.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

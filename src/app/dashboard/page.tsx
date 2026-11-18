import Link from "next/link";
import { Plus } from "lucide-react";
import { listCities, listGroups, listGroupsByIds, listMyMemberships } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { STAGE_LABEL } from "@/lib/constants";
import { GroupRow } from "@/components/group-row";

export const metadata = { title: "My groups" };

export default async function Dashboard() {
  const user = await requireUser("/dashboard");
  const mine = await listMyMemberships(user.id);
  const [myGroups, all, cities] = await Promise.all([
    listGroupsByIds(mine.map((m) => m.groupId)),
    listGroups(),
    listCities(),
  ]);
  const city = cities.find((c) => c.id === user.cityId);
  const joined = new Set(mine.map((m) => m.groupId));
  const nearby = all
    .filter((g) => g.cityId === user.cityId && g.status === "forming" && !joined.has(g.id))
    .sort((a, b) => b.members / b.targetSize - a.members / a.targetSize)
    .slice(0, 3);
  const withOffers = myGroups.filter((g) => g.status === "offers");

  return (
    <div className="shell pt-12 lg:pt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-6xl leading-[0.95] sm:text-7xl lg:text-8xl">Hello, {user.name.split(" ")[0]}</h1>
          <p className="mt-4 text-lg text-dim">
            {myGroups.length === 0
              ? "You haven't joined a group yet."
              : `You're in ${myGroups.length} ${myGroups.length === 1 ? "group" : "groups"}.`}
            {withOffers.length > 0 && <span className="text-mint"> {withOffers.length} {withOffers.length === 1 ? "has" : "have"} offers waiting.</span>}
          </p>
        </div>
        <Link href="/groups/new" className="btn btn-quiet"><Plus className="size-4" aria-hidden />Start a group</Link>
      </div>

      <section className="mt-16">
        <h2 className="text-3xl">Your groups</h2>
        {myGroups.length > 0 ? (
          <div className="rule mt-6">
            {mine.map((m) => {
              const g = myGroups.find((x) => x.id === m.groupId);
              if (!g) return null;
              return <GroupRow key={m.id} g={g} joined note={`You: ${STAGE_LABEL[m.stage]}`} />;
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-(--radius-card) border border-dashed border-line p-10 text-center">
            <p className="font-display text-2xl">Take your first seat</p>
            <p className="mx-auto mt-2 max-w-md text-dim">Find the group for the car you want. Joining is free and commits you to nothing.</p>
            <Link href={`/groups${city ? `?city=${city.slug}` : ""}`} className="btn btn-primary mt-6">Find a group</Link>
          </div>
        )}
      </section>

      {nearby.length > 0 && (
        <section className="mt-20">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-3xl">Filling up in {city?.name}</h2>
            <Link href={`/groups?city=${city?.slug}`} className="text-sm font-semibold text-accent hover:underline">See all in {city?.name}</Link>
          </div>
          <div className="rule mt-6">
            {nearby.map((g) => <GroupRow key={g.id} g={g} />)}
          </div>
        </section>
      )}
    </div>
  );
}

import { listCatalogue, listCities, listGroups, listMyMemberships } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { GroupExplorer } from "@/components/group-explorer";

export const metadata = { title: "Find a group" };

export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ city?: string }> }) {
  const { city } = await searchParams;
  const user = await getCurrentUser();
  const [groups, cities, catalogue, mine] = await Promise.all([
    listGroups(),
    listCities(),
    listCatalogue(),
    user ? listMyMemberships(user.id) : Promise.resolve([]),
  ]);
  const initialCity = cities.some((c) => c.slug === city) ? city! : "all";
  return (
    <div className="shell pt-12 lg:pt-20">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <h1 className="text-6xl leading-[0.95] sm:text-7xl lg:text-8xl">Find a group</h1>
        <p className="max-w-xs text-dim lg:pb-2 lg:text-right">Each dot is a seat. Filled seats are buyers already in.</p>
      </div>
      <div className="mt-10">
        <GroupExplorer
          groups={groups}
          cities={cities}
          brands={catalogue.map((b) => b.name)}
          joinedIds={mine.map((m) => m.groupId)}
          initialCity={initialCity}
          signedIn={!!user}
        />
      </div>
    </div>
  );
}

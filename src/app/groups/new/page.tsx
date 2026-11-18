import { listCatalogue, listCities } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { nextMonths } from "@/lib/format";
import { CreateGroupForm } from "@/components/create-group-form";

export const metadata = { title: "Start a group" };

export default async function NewGroupPage() {
  const user = await requireUser("/groups/new");
  const [catalogue, cities] = await Promise.all([listCatalogue(), listCities()]);
  return (
    <div className="shell pt-12 lg:pt-20">
      <h1 className="text-6xl leading-[0.95] sm:text-7xl lg:text-8xl">Start a group</h1>
      <p className="mt-5 max-w-xl text-lg text-dim">Pick the car and the city. If a group for it is already open, we&apos;ll point you there instead.</p>
      <div className="mt-12">
        <CreateGroupForm catalogue={catalogue} cities={cities} defaultCityId={user.cityId} months={nextMonths()} />
      </div>
    </div>
  );
}

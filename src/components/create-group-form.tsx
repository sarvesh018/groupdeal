"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createGroup, type GroupFormState } from "@/app/actions/groups";
import { MAX_TARGET, MIN_TARGET, TRANSMISSIONS } from "@/lib/constants";
import { priceRange } from "@/lib/format";
import { SubmitButton } from "./submit-button";
import { FormError } from "./form-message";
import { Seats } from "./seats";
import { CarGlyph } from "./car-glyph";
import { ChoiceFields } from "./choice-fields";

type Brand = {
  id: number;
  name: string;
  models: { id: number; name: string; bodyType: string; fuels: string; priceMin: number; priceMax: number; variants: string; colours: string }[];
};

export function CreateGroupForm({
  catalogue,
  cities,
  defaultCityId,
  months,
}: {
  catalogue: Brand[];
  cities: { id: number; name: string }[];
  defaultCityId: number;
  months: string[];
}) {
  const [state, action] = useActionState<GroupFormState, FormData>(createGroup, null);
  const [brandId, setBrandId] = useState(catalogue[0].id);
  const brand = catalogue.find((b) => b.id === brandId)!;
  const [modelId, setModelId] = useState(brand.models[0].id);
  const model = brand.models.find((m) => m.id === modelId) ?? brand.models[0];
  const [cityId, setCityId] = useState(defaultCityId);
  const [target, setTarget] = useState(10);
  const fuels = model.fuels.split(",");
  const variants = model.variants.split(",").map((v) => v.trim()).filter(Boolean);
  const colours = model.colours.split(",").map((v) => v.trim()).filter(Boolean);
  const cityName = cities.find((c) => c.id === cityId)?.name;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <form action={action} className="card space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="brand">Brand</label>
            <select
              id="brand"
              value={brandId}
              onChange={(e) => {
                const b = catalogue.find((x) => x.id === Number(e.target.value))!;
                setBrandId(b.id);
                setModelId(b.models[0].id);
              }}
              className="field"
            >
              {catalogue.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="modelId">Car</label>
            <select id="modelId" name="modelId" value={model.id} onChange={(e) => setModelId(Number(e.target.value))} className="field">
              {brand.models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cityId">City</label>
            <select id="cityId" name="cityId" value={cityId} onChange={(e) => setCityId(Number(e.target.value))} className="field">
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <p className="mt-1.5 text-xs text-faint">One group covers the whole city, so nearby areas don&apos;t split the numbers.</p>
          </div>
          <div>
            <label className="label" htmlFor="groupVariant">Group focus</label>
            <select id="groupVariant" name="groupVariant" key={model.id} className="field" defaultValue="">
              <option value="">All variants</option>
              {variants.map((v) => <option key={v}>{v}</option>)}
            </select>
            <p className="mt-1.5 text-xs text-faint">Members still pick their own variant and colour.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="fuel">Fuel</label>
            <select id="fuel" name="fuel" key={model.id} className="field" defaultValue="Any">
              <option>Any</option>
              {fuels.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="transmission">Gearbox</label>
            <select id="transmission" name="transmission" className="field">
              {TRANSMISSIONS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="targetSize">
            Group size: <span className="tnum font-semibold text-text">{target} buyers</span>
          </label>
          <input
            id="targetSize"
            name="targetSize"
            type="range"
            min={MIN_TARGET}
            max={MAX_TARGET}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <p className="mt-1.5 text-xs text-faint">Smaller groups fill faster. Larger groups carry more weight with showrooms.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="days">Keep the group open for</label>
            <select id="days" name="days" className="field" defaultValue="21">
              <option value="14">2 weeks</option>
              <option value="21">3 weeks</option>
              <option value="30">30 days</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="purchaseMonth">When do you plan to buy?</label>
            <select id="purchaseMonth" name="purchaseMonth" className="field">
              {months.map((m) => <option key={m}>{m}</option>)}
              <option>Not sure yet</option>
            </select>
          </div>
        </div>

        <div className="border-t border-line pt-5" key={`choices-${model.id}`}>
          <ChoiceFields variants={variants} colours={colours} idPrefix="new" />
        </div>

        <div>
          <label className="label" htmlFor="description">Note to people joining <span className="text-faint">(optional)</span></label>
          <textarea id="description" name="description" rows={3} maxLength={400} placeholder="For example: colleagues from Hinjewadi looking to buy before March." className="field" />
        </div>

        {state?.duplicateId && (
          <div role="alert" className="rounded-xl border border-accent/50 bg-accent/10 p-4">
            <p className="font-semibold text-accent">A {model.name} group is already open in {cityName}</p>
            <p className="mt-1 text-sm text-dim">Joining it gets everyone a fuller group than starting a second one.</p>
            <Link href={`/groups/${state.duplicateId}`} className="btn btn-primary btn-sm mt-3">See that group</Link>
          </div>
        )}
        <FormError message={state?.error} />
        <SubmitButton className="btn btn-primary w-full py-3 text-base" pendingText="Starting group">Start this group</SubmitButton>
      </form>

      <aside aria-label="Preview">
        <div className="card relative overflow-hidden p-6 lg:sticky lg:top-24">
          <CarGlyph bodyType={model.bodyType} className="absolute -right-6 top-2 w-44 text-accent/40" />
          <p className="text-sm text-dim">Your group</p>
          <p className="mt-12 text-sm text-dim">{brand.name}</p>
          <p className="font-display text-3xl leading-tight">{model.name}</p>
          <p className="mt-1 text-sm text-dim">{priceRange(model.priceMin, model.priceMax)}, {cityName}</p>
          <div className="mt-6">
            <Seats filled={1} total={target} size="md" />
          </div>
          <p className="mt-3 text-sm text-dim">You take the first seat. {target - 1} to fill.</p>
        </div>
      </aside>
    </div>
  );
}

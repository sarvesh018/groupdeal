import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";

/**
 * Every number on the admin dashboard, in one call.
 * Pass a city id to see one city; leave it out for all cities.
 */
export async function adminDashboard(cityId?: number) {
  const db = await getDb();
  const rows = async <T,>(q: SQL) => {
    const res = (await db.execute(q)) as unknown as { rows?: T[] } | T[];
    return (Array.isArray(res) ? res : (res.rows ?? [])) as T[];
  };
  // Filters reused below. "g" is always the groups table.
  const gc = cityId ? sql`and g.city_id = ${cityId}` : sql``;
  const uc = cityId ? sql`and u.city_id = ${cityId}` : sql``;
  const sc = cityId ? sql`and s.city_id = ${cityId}` : sql``;

  const [totals] = await rows<{
    users: number; usersInGroup: number; groups: number; active: number; seats: number;
    verified: number; accepted: number; booked: number; delivered: number;
    quotes: number; showrooms: number; avgFill: number;
  }>(sql`
    select
      (select count(*)::int from users u where true ${uc}) as "users",
      (select count(distinct m.user_id)::int from memberships m join users u on u.id = m.user_id where true ${uc}) as "usersInGroup",
      (select count(*)::int from groups g where true ${gc}) as "groups",
      (select count(*)::int from groups g where g.status in ('forming','ready','negotiating','offers') ${gc}) as "active",
      (select count(*)::int from memberships m join groups g on g.id = m.group_id where true ${gc}) as "seats",
      (select count(*)::int from memberships m join groups g on g.id = m.group_id where m.stage <> 'interested' ${gc}) as "verified",
      (select count(*)::int from memberships m join groups g on g.id = m.group_id where m.stage in ('accepted','booked','delivered') ${gc}) as "accepted",
      (select count(*)::int from memberships m join groups g on g.id = m.group_id where m.stage in ('booked','delivered') ${gc}) as "booked",
      (select count(*)::int from memberships m join groups g on g.id = m.group_id where m.stage = 'delivered' ${gc}) as "delivered",
      (select count(*)::int from quotes q join groups g on g.id = q.group_id where true ${gc}) as "quotes",
      (select count(*)::int from showrooms s where true ${sc}) as "showrooms",
      (select coalesce(avg(least(1.0, (select count(*) from memberships m where m.group_id = g.id)::float / g.target_size)), 0)::float
         from groups g where g.status = 'forming' ${gc}) as "avgFill"
  `);

  /* ------------------------------------------------------------ users */
  const usersByPlace = cityId
    ? await rows<{ name: string; n: number }>(sql`
        select coalesce(nullif(u.locality, ''), 'Area not set') as name, count(*)::int as n
        from users u where u.city_id = ${cityId} group by 1 order by n desc, name limit 10`)
    : await rows<{ name: string; n: number }>(sql`
        select c.name, count(u.id)::int as n from cities c left join users u on u.city_id = c.id
        group by c.id, c.name order by n desc, c.name`);

  const userTimes = await rows<{ t: Date | string }>(sql`select u.created_at as t from users u where true ${uc}`);
  const joinTimes = await rows<{ t: Date | string }>(sql`
    select m.joined_at as t from memberships m join groups g on g.id = m.group_id where true ${gc}`);
  const groupTimes = await rows<{ t: Date | string }>(sql`select g.created_at as t from groups g where true ${gc}`);

  const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const countBy = (list: { t: Date | string }[], key: (d: Date) => string) => {
    const m = new Map<string, number>();
    for (const r of list) {
      const k = key(new Date(r.t));
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const signupsByDay = countBy(userTimes, dayKey);
  const joinsByDay = countBy(joinTimes, dayKey);
  const daily: { label: string; signups: number; joins: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    daily.push({
      label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }),
      signups: signupsByDay.get(dayKey(d)) ?? 0,
      joins: joinsByDay.get(dayKey(d)) ?? 0,
    });
  }

  // Groups started per week, last 8 weeks (week = 7 days ending today).
  const weekly: { label: string; n: number }[] = [];
  for (let w = 7; w >= 0; w--) {
    const end = Date.now() - w * 7 * 86400000;
    const start = end - 7 * 86400000;
    const n = groupTimes.filter((r) => {
      const t = new Date(r.t).getTime();
      return t > start && t <= end;
    }).length;
    weekly.push({
      label: w === 0 ? "This week" : new Date(start + 86400000).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }),
      n,
    });
  }

  /* ----------------------------------------------------------- groups */
  const groupsByStage = await rows<{ key: string; n: number }>(sql`
    select g.status as key, count(*)::int as n from groups g where true ${gc} group by g.status`);

  // Each city's groups split by stage; inside one city, each brand's.
  const groupsSplit = cityId
    ? await rows<{ name: string; key: string; n: number }>(sql`
        select b.name, g.status as key, count(*)::int as n
        from groups g join models mo on mo.id = g.model_id join brands b on b.id = mo.brand_id
        where g.city_id = ${cityId} group by b.name, g.status`)
    : await rows<{ name: string; key: string; n: number }>(sql`
        select c.name, g.status as key, count(*)::int as n
        from groups g join cities c on c.id = g.city_id group by c.name, g.status`);

  /* ------------------------------------------------------------- cars */
  const seatsPer = (dim: SQL, limit?: number) =>
    rows<{ name: string; seats: number; groups: number }>(sql`
      select ${dim} as name, count(m.id)::int as seats, count(distinct g.id)::int as groups
      from groups g
      join models mo on mo.id = g.model_id
      join brands b on b.id = mo.brand_id
      left join memberships m on m.group_id = g.id
      where true ${gc}
      group by 1 order by seats desc, name
      ${limit ? sql`limit ${limit}` : sql``}`);

  const byModel = await seatsPer(sql`b.name || ' ' || mo.name`, 10);
  const byBrand = await seatsPer(sql`b.name`);
  const byBody = await seatsPer(sql`mo.body_type`);
  const byFuel = await seatsPer(sql`g.fuel`);
  const byGearbox = await seatsPer(sql`g.transmission`);
  const byPrice = await seatsPer(sql`case
      when (mo.price_min + mo.price_max) / 2 < 800000 then 'Under ₹8L'
      when (mo.price_min + mo.price_max) / 2 < 1200000 then '₹8–12L'
      when (mo.price_min + mo.price_max) / 2 < 1800000 then '₹12–18L'
      else '₹18L+' end`);

  const heat = cityId
    ? []
    : await rows<{ row: string; col: string; n: number }>(sql`
        select c.name as row, b.name as col, count(m.id)::int as n
        from groups g
        join cities c on c.id = g.city_id
        join models mo on mo.id = g.model_id
        join brands b on b.id = mo.brand_id
        left join memberships m on m.group_id = g.id
        group by c.name, b.name`);

  /* ------------------------------------------------ showrooms and offers */
  const memberStages = await rows<{ key: string; n: number }>(sql`
    select m.stage as key, count(*)::int as n from memberships m join groups g on g.id = m.group_id where true ${gc} group by m.stage`);

  const byShowroom = await rows<{ name: string; city: string; quotes: number; picks: number; discount: number }>(sql`
    select s.name, c.name as city,
      count(distinct q.id)::int as quotes,
      count(m.id)::int as picks,
      coalesce(avg(q.maker_offer + q.dealer_discount), 0)::float as discount
    from showrooms s
    join cities c on c.id = s.city_id
    join quotes q on q.showroom_id = s.id
    left join memberships m on m.accepted_quote_id = q.id
    where true ${sc}
    group by s.id, s.name, c.name
    order by quotes desc, picks desc, s.name`);

  const discountByBrand = await rows<{ name: string; avg: number; quotes: number }>(sql`
    select b.name, avg(q.maker_offer + q.dealer_discount)::float as avg, count(*)::int as quotes
    from quotes q
    join groups g on g.id = q.group_id
    join models mo on mo.id = g.model_id
    join brands b on b.id = mo.brand_id
    where true ${gc}
    group by b.name order by avg desc`);

  const showroomsByBrand = await rows<{ name: string; n: number; quoting: number }>(sql`
    select b.name, count(s.id)::int as n,
      count(s.id) filter (where exists (select 1 from quotes q where q.showroom_id = s.id))::int as quoting
    from brands b join showrooms s on s.brand_id = b.id
    where true ${sc}
    group by b.name order by quoting desc, n desc, b.name`);

  return {
    totals,
    usersByPlace,
    daily,
    weekly,
    groupsByStage,
    groupsSplit,
    byModel,
    byBrand,
    byBody,
    byFuel,
    byGearbox,
    byPrice,
    heat,
    memberStages,
    byShowroom,
    discountByBrand,
    showroomsByBrand,
  };
}

export type Dashboard = Awaited<ReturnType<typeof adminDashboard>>;

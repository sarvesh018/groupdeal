# GroupDeal — group car buying (first draft)

People in the same city who want the same car join one group. When the group fills, you take it to authorised showrooms, collect written quotes, and members pick an offer and buy directly from the showroom.

This is a working first draft: real sign-up and login, groups you can search, join, leave and start, quote comparison, and an admin panel with statistics. **All cars, prices, showrooms, people and quotes are dummy data.**

"GroupDeal" is a placeholder name. Change it in `src/lib/constants.ts`.

---

## 1. Run it on your computer (5 minutes)

You need [Node.js](https://nodejs.org) version 20 or newer. Nothing else: no database to install, no accounts to create.

```bash
npm install        # download the libraries
npm run db:setup   # create the tables and load the dummy data
npm run dev        # start the app
```

Open http://localhost:3000 and sign in:

| Role  | Email             | Password    |
| ----- | ----------------- | ----------- |
| Admin | admin@groupdeal.demo   | admin1234   |
| Buyer | buyer@groupdeal.demo   | demo1234    |

Every sample buyer (for example `aarav.kulkarni0@example.com`) also uses `demo1234`. You can register new accounts too.

Without a `DATABASE_URL`, the app keeps its data in a small built-in PostgreSQL inside the `.data` folder. That is for trying things locally only. To start again with fresh dummy data, stop the app and run `npm run db:reset`.

---

## 2. What is in the app

**Design**

- Dark theme from one set of tokens: near-black surfaces, one accent (warm orange), Space Grotesk for headings and Manrope for text.
- The home page opens on a 3D ring of seats drawn from a real group in the database: lit seats are buyers already in, the pulsing seat is the next one. It leans toward the pointer and settles as you scroll. Browsers without WebGL get a flat version, and visitors who ask for reduced motion get a still one.
- Groups are shown as lines on a board rather than a grid of cards. "How it works" pins and scrolls sideways on desktop, on the site's one light section.
- Smooth scrolling, page fades, scroll reveals and a magnetic main button. All motion switches off under the reduced-motion setting.
- The navigation is transparent at the top of a page and turns translucent on scroll; phones get a full-screen menu.

**For buyers**

- Create an account and sign in (email and password; passwords are stored hashed, sessions are signed cookies).
- Browse all groups. Search and filter instantly by city, brand, body type, budget and stage; sort by nearly full, closing soon or newest.
- Group page: seats taken, deadline, the five stages, who is in (first name and area only), and the brand's showrooms in that city.
- Join with one tap, say when you plan to buy, leave any time. The database blocks joining the same group twice.
- Start a group. If one is already open for that car in that city, you are pointed to it instead of creating a duplicate.
- Share a group on WhatsApp or copy the invite link.
- When offers are in: compare quotes side by side, line by line, and pick one. You get a reference code to give the showroom. Picking an offer is not a booking, and no money moves through the app.
- "My groups" page and a profile page (change details, city, password).

**For you (admin)** at `/admin`

- **Dashboard:** 18 charts, all filterable to one city with one tap. Every chart has a Table switch to read the same numbers as a table.
  - *Headline numbers:* users, active groups, seats taken, offers picked, showrooms, quotes, average fill of open groups, seats per user.
  - *People:* sign-ups and seats taken per day (line), share of users who joined a group (meter), users by city or by area (columns).
  - *Groups:* groups by stage (pie), groups per city split by stage (stacked bars), new groups per week (columns).
  - *Cars:* top 10 models and demand by brand (bars), body type, fuel and gearbox (pies), demand by budget (columns), city × brand demand (heat map).
  - *Showrooms and offers:* joining-to-delivery funnel, quotes sent and offers picked per showroom, average discount by brand (bars), showrooms that have quoted (stacked bars).
- **Groups:** search and filter, open a group, move it through stages, see members' contact details, mark buyers as verified, booked or delivered, enter showroom quotes (the on-road price is worked out for you), delete quotes.
- **Users:** search, filter by city, make someone an admin.
- **Showrooms:** the dummy showroom list by city and brand.

**Dummy data loaded by `npm run db:setup`**

6 cities (Pune, Bengaluru, Indore, Mumbai, Hyderabad, Ahmedabad), 8 brands, 32 car models with indicative prices, 96 invented showrooms, 122 users and 42 groups at different stages, with quotes on the groups that have reached "Offers in".

---

## 3. Put it online

For up to about 100 users, two hosted services are enough: **Supabase** for the database and **Vercel** for the app. Both have free plans at the time of writing; check their current limits before you rely on them.

### Step 1 — Database (Supabase)

1. Create a project at https://supabase.com. Pick the **Mumbai (ap-south-1)** region and set a database password.
2. Click **Connect** and copy the **Transaction pooler** connection string (it uses port 6543). Put your password into it.

### Step 2 — Secrets on your computer

Copy `.env.example` to `.env.local` and fill it in:

```
DATABASE_URL=postgresql://postgres.xxxx:YOUR-PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
AUTH_SECRET=<a long random string>
```

Make the random string with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3 — Create the tables in Supabase

```bash
npm run db:setup
```

This now talks to Supabase (because `DATABASE_URL` is set), creates the tables and loads the dummy data. Run `npm run dev` to check the app works against it.

### Step 4 — App (Vercel)

1. Push this folder to a GitHub repository.
2. At https://vercel.com choose **Add New → Project** and import the repository.
3. Under **Environment Variables** add `DATABASE_URL` and `AUTH_SECRET` with the same values as in `.env.local`.
4. Click **Deploy**. You get a public address in about two minutes. Add your own domain under **Settings → Domains**.

### Step 5 — Straight after the first deploy

- Sign in as admin and change the password on the Profile page.
- Remove the "Demo accounts" box from `src/app/login/page.tsx`.

> **Careful:** `npm run db:reset` deletes everything in whichever database `DATABASE_URL` points to. Never run it against a database with real users.

---

## 4. Before real buyers use it

This draft is for demos and testing with friendly users. These are not built yet:

- **Mobile OTP login.** It needs a paid SMS provider. Email and password are used for now.
- **Forgot password.** An admin cannot reset a password from the panel yet.
- **Real data.** Replace the dummy cars, prices and showrooms (`scripts/seed.ts`) with real ones, and use only showrooms that have agreed to take part.
- **Car photos.** Line drawings stand in for photos, which need a licence.
- **Dealer login.** You enter quotes on a showroom's behalf in the admin panel.
- **Notifications.** No emails or WhatsApp messages are sent.
- **Legal pages.** Terms, privacy policy, consent wording and a grievance officer's contact, reviewed by a lawyer.
- **Fee tracking and payments.** Nothing is charged or invoiced.

---

## 5. Find your way around the code

| Folder / file              | What it holds                                                        |
| -------------------------- | -------------------------------------------------------------------- |
| `src/app/`                 | The pages. Each folder is an address, e.g. `groups/[id]` is a group page |
| `src/app/admin/`           | The admin panel                                                      |
| `src/app/actions/`         | Everything that changes data: sign-up, join, start a group, admin edits |
| `src/components/`          | Reusable pieces: group row, seats, charts, forms, motion helpers     |
| `src/components/seat-ring-scene.tsx` | The 3D hero scene                                          |
| `src/lib/queries.ts`       | Everything that reads data for the buyer pages and admin tables      |
| `src/lib/dashboard.ts`     | Every number on the admin dashboard                                  |
| `src/components/dashboard-charts.tsx` | The chart components: bars, columns, pie, stacked, line, heat map |
| `src/lib/session.ts`       | Login sessions and the "must be signed in / must be admin" checks    |
| `src/lib/constants.ts`     | App name, stage names, areas per city, group size limits             |
| `src/db/schema.ts`         | The database tables                                                  |
| `src/app/globals.css`      | The theme: colours, fonts, buttons, cards. Change the look from here |
| `scripts/seed.ts`          | The dummy data                                                       |
| `drizzle/`                 | Generated table-creation SQL. Don't edit by hand                     |

**Common changes**

- *Add a city:* add it to `CITIES` in `scripts/seed.ts` and its areas to `CITY_LOCALITIES` in `src/lib/constants.ts`, then `npm run db:reset` (local only).
- *Add a car or brand:* add it to `CATALOGUE` in `scripts/seed.ts`, then `npm run db:reset`.
- *Change chart colours:* edit `--series-*` and `--seq-*` in `src/app/globals.css`. The current ones were checked for colour-blind readability on the dark background.
- *Change colours:* edit the `--color-*` values at the top of `src/app/globals.css`. To change the accent, also update `ACCENT` in `src/components/seat-ring-scene.tsx`.
- *Change a table:* edit `src/db/schema.ts`, run `npm run db:generate`, then `npm run db:setup`.

**Built with** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Drizzle ORM and PostgreSQL. The 3D hero uses Three.js through React Three Fiber and Drei; motion uses Motion (Framer Motion) and Lenis.

## Commands

| Command               | What it does                                             |
| --------------------- | -------------------------------------------------------- |
| `npm run dev`         | Run the app while you work on it                         |
| `npm run build`       | Build the fast production version                        |
| `npm start`           | Run the production version (after `build`)               |
| `npm run db:setup`    | Create tables; load dummy data if the database is empty  |
| `npm run db:reset`    | Wipe everything and load fresh dummy data                |
| `npm run db:generate` | Make new table-creation SQL after editing the schema     |

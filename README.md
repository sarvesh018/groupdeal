# GroupDeal — group car buying

People in the same city who want the same car join one group. When the group fills, you take it to authorised showrooms, collect written quotes, and members pick an offer and buy directly from the showroom.

This version adds **Phase 1 of the showroom portal**: showrooms sign up and get verified, receive invitations to quote, send sealed rate cards per variant and colour, see the buyers who picked them, record bookings, and get a monthly GST invoice. **All cars, prices, showrooms, people and quotes are dummy data.**

> **Upgrading your live site from the earlier version?** Go to [section 4](#4-upgrade-your-live-site-to-this-version). Don't run `db:reset` on it.

---

## 1. Run it on your computer (5 minutes)

You need [Node.js](https://nodejs.org) version 20 or newer. Nothing else: no database to install, no accounts to create.

```bash
npm install        # download the libraries
npm run db:setup   # create the tables and load the dummy data
npm run dev        # start the app
```

Open http://localhost:3000 and sign in:

| Role            | Email                    | Password  |
| --------------- | ------------------------ | --------- |
| Admin           | admin@groupdeal.demo     | admin1234 |
| Buyer           | buyer@groupdeal.demo     | demo1234  |
| Showroom owner  | showroom@groupdeal.demo  | demo1234  |
| Sales executive | sales@groupdeal.demo     | demo1234  |
| Competing showroom (same brand, same city) | rival@groupdeal.demo | demo1234 |
| Showroom waiting to be verified | pending@groupdeal.demo | demo1234 |

**For a guided walk-through of the whole journey (buyer, two competing showrooms, admin), follow [DEMO.md](DEMO.md).** It takes about 15 minutes.

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
- **Your own choices** in a group: variant, first-choice colour, other colours you'd accept, gearbox, must-have features, and whether a nearby variant is fine. Editable until offers are out.
- When offers are in: each quote shows **your** on-road price for your variant and delivery time for your colour, with an "In stock for you" tag. Pick one after ticking consent to share your name and phone with that showroom only. You get a reference code (`GD-…`) and a progress tracker (sent, acknowledged, called, test drive, booked, delivered). Switching offers withdraws the earlier referral.
- "I've booked": enter the booking number and an optional receipt photo. If the showroom hasn't recorded it, they're asked to confirm.
- Updates (bell icon) when offers arrive, a showroom has your details, or a booking is recorded.
- "My groups" page and a profile page (change details, city, password).

**For showrooms** at `/showroom` (apply at `/showroom/register`)

- **Sign-up and verification:** brand, city, area, GSTIN, dealer code, and an optional GST certificate or dealership letter (PDF or photo, 2 MB). Nothing else is visible until an admin verifies the showroom.
- **Home:** what needs doing (groups waiting for a quote, new buyers, bookings to confirm), fees due, free bookings left, recent updates.
- **Invitations:** what the group wants, without names: counts by variant, colour, other colours, gearbox, features, purchase month. Build a **rate card**: a price per variant (or one "All variants" price), delivery per colour, validity and a note. Save a draft or send. Quotes are sealed and editable until the deadline. Decline if you can't supply.
- **Quotes:** how each quote did. Rank against other showrooms and how many picked you appear only after offers are released.
- **Buyers:** everyone who picked your offer. Contact details appear when you **acknowledge** (the buyer is told). Call or WhatsApp in one tap, assign to a salesperson, move through contacted, test drive, booked (with booking number), delivered or lost (with reason). Full timeline. Referrals expire after 90 days without a booking.
- **Billing:** fee per booking, monthly invoices (printable GST tax invoice: CGST+SGST in the same state, IGST otherwise), and bookings buyers reported that you need to confirm or dispute within 7 days.
- **Team:** the owner adds managers (see everything, send quotes) and sales executives (see only buyers assigned to them).
- **Settings:** phone, area, address, GSTIN, dealer code, more documents.

**For you (admin)** at `/admin`

- **Dashboard:** 18 charts, all filterable to one city with one tap. Every chart has a Table switch to read the same numbers as a table.
  - *Headline numbers:* users, active groups, seats taken, offers picked, showrooms, quotes, average fill of open groups, seats per user.
  - *People:* sign-ups and seats taken per day (line), share of users who joined a group (meter), users by city or by area (columns).
  - *Groups:* groups by stage (pie), groups per city split by stage (stacked bars), new groups per week (columns).
  - *Cars:* top 10 models and demand by brand (bars), body type, fuel and gearbox (pies), demand by budget (columns), city × brand demand (heat map).
  - *Showrooms and offers:* joining-to-delivery funnel, quotes sent and offers picked per showroom, average discount by brand (bars), showrooms that have quoted (stacked bars).
- **Groups:** search and filter, open a group, move it through stages, see members' contact details, mark buyers as verified, booked or delivered, enter showroom quotes (the on-road price is worked out for you), delete quotes.
- **Users:** search, filter by city, make someone an admin.
- **Showrooms:** filter by status; verify, pause or re-open a showroom; view its documents, team and activity; set its number of free bookings.
- **Group page:** invite verified showrooms of that brand and city with a 2–7 day deadline, see who replied, and **release offers** (closes quoting and tells every member). You can still enter a quote by hand for a showroom without a login.
- **Referrals:** every buyer sent to a showroom, and bookings to check. When a showroom disputes a reported booking or doesn't answer in 7 days, you decide (fee due or no fee) after viewing the receipt.
- **Billing:** edit fee bands (fee per booking by ex-showroom price), fees by month, create the month's invoices for every showroom, mark invoices paid, waive or cancel a fee.
- **Dashboard:** a row for showrooms to verify, open referrals, referral bookings and fees earned.

**How the fee works:** when a showroom marks a referred buyer as booked (or you decide a disputed booking was through GroupDeal), a fee is created from the band for that car's ex-showroom price, plus 18% GST. Each showroom's first bookings are free (3 by default, 1 in the demo data). Starting bands: under ₹10 lakh ₹2,500; ₹10–20 lakh ₹4,000; ₹20–40 lakh ₹9,000; above ₹18,000. These are starting points; change them under Admin → Billing.

**Dummy data loaded by `npm run db:setup`**

6 cities (Pune, Bengaluru, Indore, Mumbai, Hyderabad, Ahmedabad), 8 brands, 32 car models with indicative prices and their real variant and colour names (as commonly sold in India; check before relying on them), 96 invented showrooms (all verified) plus one waiting for verification, 125 users and 43 groups at different stages. Groups with offers have rate cards per variant and colour; members who picked an offer have referrals at various stages, with fees, last month's invoices and one booking for a showroom to confirm. The demo showroom and its competitor (both Pune Maruti Suzuki dealers) have a Swift group waiting for their quotes, and the demo buyer is in it. Showrooms have invented names, addresses, GST numbers and dealer codes.

**Car photos:** 23 of the 32 models show a photo from [Wikimedia Commons](https://commons.wikimedia.org), freely licensed and credited on each picture with a link to its page (author and licence). They're loaded straight from Commons, so they need an internet connection; if a photo can't load, or a model has no free photo (Curvv, Harrier, Thar, Scorpio N, Carens, Glanza, Amaze, Astor, Windsor EV), a drawn outline is shown. The list lives in `src/lib/catalogue-data.ts`. For a real launch, use the carmakers' official images with permission, or your own photos.

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

For invoices, also set your business details (shown on every invoice):

```
BUSINESS_NAME=Your registered business name
BUSINESS_GSTIN=27XXXXX0000X1Z5
BUSINESS_ADDRESS=Your registered address
BUSINESS_STATE=Maharashtra
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
3. Under **Environment Variables** add `DATABASE_URL`, `AUTH_SECRET` and the `BUSINESS_*` values, the same as in `.env.local`.
4. Click **Deploy**. You get a public address in about two minutes. Add your own domain under **Settings → Domains**.

### Step 5 — Straight after the first deploy

- Sign in as admin and change the password on the Profile page. Do the same for the demo showroom accounts, or remove them.
- The "Demo accounts" box on the sign-in page is hidden automatically when `DATABASE_URL` is set. To show it on a demo site, add `SHOW_DEMO_LOGINS=1`.

> **Careful:** `npm run db:reset` deletes everything in whichever database `DATABASE_URL` points to. Never run it against a database with real users.

---

## 4. Upgrade your live site to this version

Your live database keeps all its users, groups and quotes. This version only **adds** tables and columns, and fills them in from what's already there:

- every existing showroom is marked verified;
- every existing quote becomes a one-line rate card ("All variants") and counts as an invitation the showroom answered;
- members who already picked an offer get a referral (`GD-…` code), so showrooms can see them; members marked booked or delivered keep that status. No fees are created for bookings made before this version;
- the starting fee bands are added;
- if a showroom had two quotes for the same group, only its newest is kept (members who picked the older one are moved to the newer one).

**Steps** (on your computer, in this new folder, with `.env.local` pointing at Supabase):

1. **Copy your settings.** Copy `.env.local` from your old folder into this one. If you changed any files in the live version yourself (for example removed the demo box), make the same change here, because these files replace them.
2. `npm install`
3. `npm run db:backup` saves every table to `backups/backup-<time>.json`. Keep that file somewhere safe. (Supabase's free plan has no automatic backups.)
4. `npm run db:migrate` adds the new tables and fills them in. Running it twice is safe; it only applies what's new.
   It also applies `0002_car_details`, which swaps the placeholder variants (Base, Mid, Top) for each model's real variant and colour names. Members who already chose "Base/Mid/Top" keep that text; offers then show them the closest price line.
5. `npm run db:rename-demo` changes the old `@toli.demo` demo emails to `@groupdeal.demo`. Optional.
6. `npm run db:demo-showrooms` adds the demo showroom logins (owner, sales executive, and a competing showroom of the same brand). If you ran it before, it only adds the competing showroom. Optional; skip it if you don't want demo logins on the live site.
7. `npm run dev` and check: sign in as admin, open Admin → Showrooms and Referrals; sign in as the showroom owner.
8. Push to GitHub. Vercel deploys automatically. Add the `BUSINESS_*` variables in Vercel first (Settings → Environment Variables), then redeploy.

**If something goes wrong after deploying:** in Vercel, open **Deployments**, pick the previous one and choose **Promote to Production** (instant rollback). The previous version keeps working with the upgraded database, because nothing was removed. If you ever need the old data back, the backup file has every row.

> **Never run `npm run db:reset` or `npm run db:setup -- --reset` against the live database.** They delete everything.

**Note on the session cookie:** the cookie name changed with the rename, so everyone is signed out once after this update.

---

## 5. Before real buyers use it

This version is for demos and testing with friendly users and showrooms. These are not built yet:

- **Mobile OTP login.** It needs a paid SMS provider. Email and password are used for now.
- **Forgot password.** An admin cannot reset a password from the panel yet.
- **Real data.** Replace the dummy cars, prices and showrooms (`scripts/seed.ts`) with real ones, and verify only showrooms that have signed an agreement with you.
- **Email and WhatsApp notifications.** Updates appear in the app (bell icon) only.
- **Online payment of invoices.** Invoices are printable; you record payment by hand (Mark paid). Confirm the invoice format, SAC code (998599 is used) and GST treatment with your accountant.
- **File storage.** Uploaded documents and receipts are kept in the database (2 MB each). For more than a few hundred, move them to Supabase Storage.
- **Legal pages.** Terms for buyers, the showroom partner agreement (fees, the 90-day referral window, disputes), privacy policy and consent wording, reviewed by a lawyer.
- **Official car photos.** The demo uses freely licensed Wikimedia Commons photos for 23 models. For a real launch, get permission to use the carmakers' images or take your own.

---

## 6. Find your way around the code

| Folder / file              | What it holds                                                        |
| -------------------------- | -------------------------------------------------------------------- |
| `src/app/`                 | The pages. Each folder is an address, e.g. `groups/[id]` is a group page |
| `src/app/admin/`           | The admin panel                                                      |
| `src/app/showroom/`        | The showroom portal (`(portal)/` needs a showroom login; `register/` is public) |
| `src/app/actions/`         | Everything that changes data: sign-up, join, start a group, admin edits |
| `src/components/`          | Reusable pieces: group row, seats, charts, forms, motion helpers     |
| `src/components/seat-ring-scene.tsx` | The 3D hero scene                                          |
| `src/lib/queries.ts`       | Reads data for buyer pages and admin tables                          |
| `src/lib/showroom-queries.ts`, `src/lib/admin-queries.ts` | Reads data for the showroom portal and new admin pages |
| `src/lib/portal.ts`        | Referrals, bookings, fees and notifications: the rules that change several tables at once |
| `src/lib/catalogue-data.ts` | Variant and colour names and the credited photo for each car model |
| `src/lib/rules.ts`         | Plain business rules: fee bands, GST, which price line applies to a buyer, referral codes |
| `src/lib/dashboard.ts`     | Every number on the admin dashboard                                  |
| `src/components/dashboard-charts.tsx` | The chart components: bars, columns, pie, stacked, line, heat map |
| `src/lib/session.ts`       | Login sessions and the "must be signed in / admin / showroom" checks |
| `src/lib/constants.ts`     | App name, stage names, areas per city, group size limits             |
| `src/db/schema.ts`         | The database tables                                                  |
| `src/app/globals.css`      | The theme: colours, fonts, buttons, cards. Change the look from here |
| `scripts/seed.ts`, `scripts/seed-portal.ts` | The dummy data                                  |
| `drizzle/`                 | Table changes, applied in order. `0001_showroom_portal.sql` is this version's upgrade |

**Common changes**

- *Add a city:* add it to `CITIES` in `scripts/seed.ts` and its areas to `CITY_LOCALITIES` in `src/lib/constants.ts`, then `npm run db:reset` (local only).
- *Add a car or brand:* add it to `CATALOGUE` in `scripts/seed.ts` and its variants, colours and photo to `src/lib/catalogue-data.ts`, then `npm run db:reset` (local only).
- *Change a car photo:* edit its `photo` in `src/lib/catalogue-data.ts` (the exact Commons file name, author and licence).
- *Change chart colours:* edit `--series-*` and `--seq-*` in `src/app/globals.css`. The current ones were checked for colour-blind readability on the dark background.
- *Change colours:* edit the `--color-*` values at the top of `src/app/globals.css`. To change the accent, also update `ACCENT` in `src/components/seat-ring-scene.tsx`.
- *Change a table:* edit `src/db/schema.ts`, run `npm run db:generate`, check the new file in `drizzle/` only adds things, then `npm run db:backup` and `npm run db:migrate`. Never edit a migration that has already run on the live database.
- *Change the fee:* Admin → Billing. *Change the free bookings per showroom:* Admin → Showrooms → open one.

**Built with** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Drizzle ORM and PostgreSQL. The 3D hero uses Three.js through React Three Fiber and Drei; motion uses Motion (Framer Motion) and Lenis.

## Commands

| Command               | What it does                                             |
| --------------------- | -------------------------------------------------------- |
| `npm run dev`         | Run the app while you work on it                         |
| `npm run build`       | Build the fast production version                        |
| `npm start`           | Run the production version (after `build`)               |
| `npm run db:setup`    | Create tables; load dummy data if the database is empty  |
| `npm run db:reset`    | Wipe everything and load fresh dummy data (never on live) |
| `npm run db:migrate`  | Apply new table changes only. Use this to upgrade live   |
| `npm run db:backup`   | Save every table to `backups/` as JSON                   |
| `npm run db:demo-showrooms` | Add the demo showroom logins to an existing database |
| `npm run db:rename-demo` | Rename old `@toli.demo` accounts to `@groupdeal.demo` |
| `npm run db:generate` | Make new table-change SQL after editing the schema       |

# GroupDeal demo script (about 15 minutes)

A walk-through of the whole journey with the demo data: buyers in a group, two competing showrooms, and you as the admin. Run it locally after `npm run db:setup`, or online after `npm run db:reset` on a **demo** database (never on one with real users).

Use two browser windows (one normal, one private) so you can stay signed in as two people at once.

| Who | Email | Password |
| --- | --- | --- |
| Buyer (Wakad, Pune) | buyer@groupdeal.demo | demo1234 |
| Showroom owner (a Pune Maruti Suzuki dealer) | showroom@groupdeal.demo | demo1234 |
| Sales executive at the same showroom | sales@groupdeal.demo | demo1234 |
| Owner of the competing Pune Maruti Suzuki showroom | rival@groupdeal.demo | demo1234 |
| Showroom waiting for verification | pending@groupdeal.demo | demo1234 |
| Admin | admin@groupdeal.demo | admin1234 |

All showrooms, people, prices and quotes are invented. Car photos come from Wikimedia Commons and are credited on each picture.

---

## 1. The buyer (2 min)

1. Sign in as **buyer**. *My groups* shows the groups you're in.
2. Open **Find a group**, filter by Pune and a budget. Each line shows the car, seats taken and time left.
3. Open the **Maruti Suzuki Swift** group in Pune (stage: *Showrooms quoting*). Under **Your choices** you can see and change your variant, colour, other acceptable colours, gearbox and must-have features.

## 2. Two showrooms quote (4 min)

4. In the other window, sign in as **showroom**. The showroom's name is at the top. Home shows *1 group waiting for your quote*, new buyers to acknowledge, and a booking a buyer reported.
5. Open **Invitations → the Swift group**. You see what the group wants (how many want each variant and colour) but no names or numbers.
6. Fill the **rate card**: prices are pre-filled across the price range; give a discount on the variants most people want. Set *In stock* for the first colour. Press **Send quote**.
7. Sign out and sign in as **rival**, the other Maruti Suzuki showroom in Pune. Open the same invitation, quote different prices (for example a bigger discount but 4 weeks' delivery) and send.

## 3. The admin releases offers (2 min)

8. Sign in as **admin**. The dashboard shows partner numbers at the top (showrooms to verify, buyers with showrooms, bookings, fees).
9. Open **Groups → the Swift group**. *Showrooms invited* shows both quotes as *Quote sent*. Press **Release 2 offers to members**. Every member gets an update.

## 4. The buyer picks (2 min)

10. Back as **buyer**, open the bell (*Updates*): *2 offers are in for your group*.
11. On the group page each offer shows **your** on-road price for your variant, and delivery for your colour ("In stock for you").
12. Tick the consent box on one offer and press **I want this offer**. You get a reference code (GD-…) and a progress tracker.

## 5. The showroom sells (3 min)

13. As the showroom you picked, open **Buyers**. The new buyer's phone is hidden until you press **Acknowledge and show contact**. Call or WhatsApp in one tap.
14. Assign the buyer to a salesperson, then **Move to → Booked** with a booking number. The fee is added to the showroom's bill (the first booking is a free trial).
15. Optional: sign in as **sales** (the executive). They see only the buyers assigned to them.
16. In **Billing → Bookings buyers reported**, confirm the booking a buyer reported.

## 6. The admin bills and verifies (2 min)

17. As **admin**, open **Billing**: fee bands, fees by month. Press **Create invoices** for this month, then open an invoice (print or save as PDF).
18. Open **Referrals** to see every buyer sent to a showroom and any bookings to check.
19. Open **Showrooms → To verify → Mula Riverside Kia**, look at its details and set it to **Verified**. Sign in as **pending** to see it unlocked.

---

**To start over:** stop the app and run `npm run db:reset` (local or a demo database only).

/**
 * Adds the demo showroom logins (owner and sales executive) to an existing database,
 * e.g. your live Supabase one after upgrading. Changes nothing if they already exist.
 * Run: npm run db:demo-showrooms
 */
import { ensureDemoShowroomUsers, DEMO_SALES_EMAIL, DEMO_SHOWROOM_EMAIL } from "./seed-portal";

ensureDemoShowroomUsers()
  .then((r) => {
    if (r.added) {
      console.log(`Added demo logins to "${r.showroom}":`);
      console.log(`  Owner           ${DEMO_SHOWROOM_EMAIL} / demo1234`);
      console.log(`  Sales executive ${DEMO_SALES_EMAIL} / demo1234`);
      console.log("Change these passwords (Profile page) if your site is public.");
    } else console.log("Demo showroom logins already exist. Nothing changed.");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

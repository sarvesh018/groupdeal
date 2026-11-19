import { runMigrations } from "./migrate";

async function main() {
  const reset = process.argv.includes("--reset");
  await runMigrations();
  const { seed, isSeeded, resetDatabase } = await import("./seed");
  if (await isSeeded()) {
    if (!reset) {
      console.log("Dummy data is already there. Run `npm run db:reset` to wipe and reload it.");
      process.exit(0);
    }
    await resetDatabase();
    console.log("Old data removed.");
  }
  const counts = await seed();
  console.log("Dummy data loaded:", counts);
  console.log("\nSign in with:");
  console.log("  Admin  admin@groupdeal.demo / admin1234");
  console.log("  Buyer  buyer@groupdeal.demo / demo1234");
  console.log("  Showroom owner  showroom@groupdeal.demo / demo1234");
  console.log("  Sales executive sales@groupdeal.demo / demo1234");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

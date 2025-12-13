import { db } from "../server/db";
import { distributions, releases, downloads } from "../shared/schema";
import * as fs from "fs";

async function exportDatabase() {
  console.log("Exporting development database...\n");

  const allDistributions = await db.select().from(distributions);
  console.log(`Found ${allDistributions.length} distributions`);

  const allReleases = await db.select().from(releases);
  console.log(`Found ${allReleases.length} releases`);

  const allDownloads = await db.select().from(downloads);
  console.log(`Found ${allDownloads.length} downloads`);

  const backup = {
    exportedAt: new Date().toISOString(),
    distributions: allDistributions,
    releases: allReleases,
    downloads: allDownloads,
  };

  fs.writeFileSync("full_backup.json", JSON.stringify(backup, null, 2));
  console.log("\nExported to full_backup.json");
  console.log(`Total: ${allDistributions.length} distros, ${allReleases.length} releases, ${allDownloads.length} downloads`);
}

exportDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Export failed:", err);
    process.exit(1);
  });

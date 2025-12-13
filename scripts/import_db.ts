import { db } from "../server/db";
import { distributions, releases, downloads } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";

interface BackupData {
  exportedAt: string;
  distributions: any[];
  releases: any[];
  downloads: any[];
}

async function importDatabase() {
  console.log("Reading backup file...\n");
  
  if (!fs.existsSync("full_backup.json")) {
    console.error("full_backup.json not found. Run export_db.ts first.");
    process.exit(1);
  }

  const backup: BackupData = JSON.parse(fs.readFileSync("full_backup.json", "utf-8"));
  console.log(`Backup from: ${backup.exportedAt}`);
  console.log(`Contains: ${backup.distributions.length} distros, ${backup.releases.length} releases, ${backup.downloads.length} downloads\n`);

  // Clear existing data (in reverse order due to foreign keys)
  console.log("Clearing existing data...");
  await db.delete(downloads);
  await db.delete(releases);
  await db.delete(distributions);
  console.log("Cleared existing tables.\n");

  // Import distributions (need to handle identity columns)
  console.log("Importing distributions...");
  for (const distro of backup.distributions) {
    const { id, ...distroData } = distro;
    await db.insert(distributions).values(distroData);
  }
  console.log(`Imported ${backup.distributions.length} distributions`);

  // Get the new distribution ID mapping
  const newDistros = await db.select().from(distributions);
  const distroMapping: Record<string, number> = {};
  
  // Map old IDs to new IDs by name
  for (const oldDistro of backup.distributions) {
    const newDistro = newDistros.find(d => d.name === oldDistro.name);
    if (newDistro) {
      distroMapping[oldDistro.id] = newDistro.id;
    }
  }

  // Import releases with new distro IDs
  console.log("Importing releases...");
  const releaseMapping: Record<string, number> = {};
  
  for (const release of backup.releases) {
    const { id, distroId, ...releaseData } = release;
    const newDistroId = distroMapping[distroId];
    if (!newDistroId) {
      console.warn(`Skipping release ${id}: distro ${distroId} not found`);
      continue;
    }
    const [newRelease] = await db.insert(releases).values({
      ...releaseData,
      distroId: newDistroId,
    }).returning();
    releaseMapping[id] = newRelease.id;
  }
  console.log(`Imported ${Object.keys(releaseMapping).length} releases`);

  // Import downloads with new release IDs
  console.log("Importing downloads...");
  let downloadCount = 0;
  
  for (const download of backup.downloads) {
    const { id, releaseId, ...downloadData } = download;
    const newReleaseId = releaseMapping[releaseId];
    if (!newReleaseId) {
      console.warn(`Skipping download ${id}: release ${releaseId} not found`);
      continue;
    }
    await db.insert(downloads).values({
      ...downloadData,
      releaseId: newReleaseId,
    });
    downloadCount++;
  }
  console.log(`Imported ${downloadCount} downloads`);

  console.log("\nImport complete!");
}

importDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  });

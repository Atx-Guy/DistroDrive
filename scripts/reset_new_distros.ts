
import { db } from "../server/db";
import { distributions } from "@shared/schema";
import { inArray } from "drizzle-orm";

async function main() {
    const names = [
        "Bazzite", "Bluefin", "CachyOS", "Rhino Linux", "ChimeraOS",
        "Whonix", "Oracle Linux", "Nitrux", "KaOS", "Ultramarine"
    ];

    console.log("Deleting distributions:", names);
    await db.delete(distributions).where(inArray(distributions.name, names));
    console.log("Deletion complete. Server restart will re-seed them.");
}

main().catch(console.error).finally(() => process.exit());

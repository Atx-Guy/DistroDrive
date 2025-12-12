import Parser from "rss-parser";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { news } from "../shared/schema";
import { eq } from "drizzle-orm";

const { Pool } = pg;

const RSS_FEEDS = [
  { name: "DistroWatch", url: "https://distrowatch.com/news/dw.xml" },
  { name: "Phoronix", url: "https://www.phoronix.com/rss.php" },
  { name: "9to5Linux", url: "https://9to5linux.com/feed" },
];

interface FeedItem {
  title: string;
  link: string;
  pubDate?: string;
  isoDate?: string;
}

async function fetchNews() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL must be set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  const parser = new Parser();

  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const feed of RSS_FEEDS) {
    console.log(`Fetching ${feed.name}...`);

    try {
      const feedData = await parser.parseURL(feed.url);
      console.log(`  Found ${feedData.items.length} items`);

      for (const item of feedData.items as FeedItem[]) {
        if (!item.title || !item.link) {
          continue;
        }

        const existingNews = await db
          .select()
          .from(news)
          .where(eq(news.sourceUrl, item.link))
          .limit(1);

        if (existingNews.length > 0) {
          totalSkipped++;
          continue;
        }

        const publishedAt = item.isoDate
          ? new Date(item.isoDate)
          : item.pubDate
            ? new Date(item.pubDate)
            : new Date();

        await db.insert(news).values({
          title: item.title,
          sourceUrl: item.link,
          publishedAt,
        });

        totalAdded++;
        console.log(`  + Added: ${item.title.substring(0, 60)}...`);
      }
    } catch (error) {
      console.error(`  Error fetching ${feed.name}:`, error instanceof Error ? error.message : error);
      totalErrors++;
    }
  }

  console.log(`\nSummary:`);
  console.log(`  Added: ${totalAdded}`);
  console.log(`  Skipped (duplicates): ${totalSkipped}`);
  console.log(`  Feed errors: ${totalErrors}`);

  await pool.end();
}

fetchNews().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

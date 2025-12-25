import 'dotenv/config';
import { db } from '../server/db.js';
import { distributions } from '../shared/schema.js';
import { sql } from 'drizzle-orm';

console.log('Checking for placeholder logos...\n');

// Count distributions with placeholder logos
const placeholderCount = await db.execute(sql`
  SELECT COUNT(*) as count 
  FROM distributions 
  WHERE logo_url LIKE '%placehold.co%'
`);

console.log(`Total distributions with placeholder logos: ${placeholderCount.rows[0].count}\n`);

// List distributions with placeholders
const placeholderDistros = await db.execute(sql`
  SELECT name, logo_url 
  FROM distributions 
  WHERE logo_url LIKE '%placehold.co%' 
  ORDER BY name
`);

console.log('Distributions with placeholder logos:');
console.log('='.repeat(60));
for (const distro of placeholderDistros.rows) {
    console.log(`${distro.name}: ${distro.logo_url}`);
}

process.exit(0);

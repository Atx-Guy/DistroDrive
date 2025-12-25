import 'dotenv/config';
import { db } from '../server/db.js';
import { distributions } from '../shared/schema.js';

console.log('Checking ALL distribution logos...\n');

const allDistros = await db.select().from(distributions).orderBy(distributions.name);

console.log(`Total distributions: ${allDistros.length}\n`);
console.log('='.repeat(80));
console.log('Logo Status Report');
console.log('='.repeat(80));

for (const distro of allDistros) {
    const logoUrl = distro.logoUrl || 'NULL';
    const status = !distro.logoUrl ? '❌ NULL' :
        logoUrl.includes('placehold.co') ? '❌ PLACEHOLDER' :
            logoUrl.startsWith('data:image') ? '⚠️  FALLBACK SVG' :
                logoUrl.length > 0 ? '✓ HAS LOGO' : '❌ EMPTY';

    console.log(`${status.padEnd(20)} ${distro.name}`);
    if (logoUrl.length < 200) {
        console.log(`${''.padEnd(20)} ${logoUrl}`);
    } else {
        console.log(`${''.padEnd(20)} ${logoUrl.substring(0, 60)}... (base64 SVG)`);
    }
    console.log();
}

process.exit(0);

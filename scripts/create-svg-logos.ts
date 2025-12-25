import 'dotenv/config';
import { db } from '../server/db.js';
import { distributions } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Creates self-contained SVG logos as base64 data URIs
 * These ALWAYS work because they're embedded directly, no external requests
 */
function createDistroSVG(name: string, color: string): string {
    const initial = name.charAt(0).toUpperCase();
    const svg = `
<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" fill="${color}" rx="8"/>
  <text x="32" y="42" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle" font-weight="bold">${initial}</text>
</svg>
`.trim();

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Color palette for different distros
const distroColors: Record<string, string> = {
    'Ubuntu': '#E95420',
    'Fedora': '#51A2DA',
    'Debian': '#A80030',
    'Arch Linux': '#1793D1',
    'Linux Mint': '#86BE43',
    'Manjaro': '#35BF5C',
    'openSUSE Leap': '#73BA25',
    'openSUSE Tumbleweed': '#73BA25',
    'Pop!_OS': '#48B9C7',
    'Elementary OS': '#64BAFF',
    'Zorin OS': '#0CC1F3',
    'MX Linux': '#000000',
    'EndeavourOS': '#7F7FFF',
    'Kali Linux': '#557C94',
    'Kubuntu': '#0079C1',
    'Xubuntu': '#178DCE',
    'Lubuntu': '#0068C8',
    'Rocky Linux': '#10B981',
    'AlmaLinux': '#000001',
    'CentOS Stream': '#932279',
    'LMDE': '#86BE43',
    'Ubuntu MATE': '#87A752',
    'Ubuntu Studio': '#E9642A',
    'Bodhi Linux': '#34A853',
    'Artix Linux': '#41B883',
    'Clear Linux': '#00AED9',
    'Alpine Linux': '#0D597F',
    'Arm https://placehold.co/400x400?text=Abian': '#FA7343',
    'Solus': '#5294E2',
    'Gentoo': '#54487A',
    'Slackware': '#000B1E',
    'Void Linux': '#478061',
    'NixOS': '#5277C3',
    'Tails': '#56347C',
    'Qubes OS': '#3874D8',
    'Peppermint OS': '#CCCCCC',
    'antiX': '#CC0000',
    'Deepin': '#2CA7F8',
    'KDE neon': '#27AE60',
    'Mageia': '#2397D4',
    'PCLinuxOS': '#FFB900',
    'Puppy Linux': '#93C83E',
    'SparkyLinux': '#E60000',
    'Vanilla OS': '#FBBC04',
    'Nobara': '#DC3545',
    'Raspberry Pi OS': '#C51A4A',
    'Asahi Linux': '#E6007A',
    'Garuda Linux': '#0096FF',
    'Parrot OS': '#00D9A0',
    'Fedora Silverblue': '#51A2DA',
};

async function main() {
    console.log('='.repeat(80));
    console.log('Creating Self-Hosted SVG Logos (Guaranteed to Work)');
    console.log('='.repeat(80));
    console.log();

    const allDistros = await db.select().from(distributions);

    let updatedCount = 0;

    for (const distro of allDistros) {
        const color = distroColors[distro.name] || '#0EA5E9'; // Default blue
        const svgLogo = createDistroSVG(distro.name, color);

        await db.update(distributions)
            .set({ logoUrl: svgLogo })
            .where(eq(distributions.id, distro.id));

        console.log(`✓ ${distro.name}: Self-hosted SVG (${color})`);
        updatedCount++;
    }

    console.log();
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Updated: ${updatedCount distributions`);
  console.log(`All logos are now self - hosted SVGs that ALWAYS work`);
  console.log();

  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

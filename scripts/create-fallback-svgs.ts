import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGOS_DIR = path.join(__dirname, '../client/public/logos');

// Logo designs with brand colors for distributions
const SVG_LOGOS: Record<string, { color: string; secondary?: string; name: string }> = {
    'fedora': { color: '#3C6EB4', secondary: '#FFFFFF', name: 'Fedora' },
    'arch': { color: '#1793D1', secondary: '#FFFFFF', name: 'Arch Linux' },
    'mint': { color: '#86BE43', secondary: '#FFFFFF', name: 'Linux Mint' },
    'manjaro': { color: '#35BF5C', secondary: '#FFFFFF', name: 'Manjaro' },
    'popos': { color: '#48B9C7', secondary: '#FED04B', name: 'Pop!_OS' },
    'elementary': { color: '#64BAFF', secondary: '#FFFFFF', name: 'elementary OS' },
    'endeavour': { color: '#7F7FFF', secondary: '#FFFFFF', name: 'EndeavourOS' },
    'kubuntu': { color: '#0079C1', secondary: '#FFFFFF', name: 'Kubuntu' },
    'xubuntu': { color: '#178DCE', secondary: '#FFFFFF', name: 'Xubuntu' },
    'lubuntu': { color: '#0068C8', secondary: '#FFFFFF', name: 'Lubuntu' },
    'mate': { color: '#87A752', secondary: '#FFFFFF', name: 'Ubuntu MATE' },
    'studio': { color: '#E9642A', secondary: '#FFFFFF', name: 'Ubuntu Studio' },
    'rocky': { color: '#10B981', secondary: '#FFFFFF', name: 'Rocky Linux' },
    'centos': { color: '#932279', secondary: '#FFFFFF', name: 'CentOS' },
    'bodhi': { color: '#34A853', secondary: '#FFFFFF', name: 'Bodhi' },
    'alpine': { color: '#0D597F', secondary: '#FFFFFF', name: 'Alpine' },
    'solus': { color: '#5294E2', secondary: '#FFFFFF', name: 'Solus' },
    'slackware': { color: '#000B1E', secondary: '#7DAEA3', name: 'Slackware' },
    'nixos': { color: '#5277C3', secondary: '#7EB6DA', name: 'NixOS' },
    'tails': { color: '#56347C', secondary: '#FFFFFF', name: 'Tails' },
    'peppermint': { color: '#CC3333', secondary: '#FFFFFF', name: 'Peppermint' },
    'antix': { color: '#CC0000', secondary: '#FFFFFF', name: 'antiX' },
    'deepin': { color: '#2CA7F8', secondary: '#FFFFFF', name: 'Deepin' },
    'neon': { color: '#27AE60', secondary: '#FFFFFF', name: 'KDE neon' },
    'pclinux': { color: '#FFB900', secondary: '#000000', name: 'PCLinuxOS' },
    'puppy': { color: '#93C83E', secondary: '#FFFFFF', name: 'Puppy Linux' },
    'sparky': { color: '#E60000', secondary: '#FFFFFF', name: 'SparkyLinux' },
    'nobara': { color: '#DC3545', secondary: '#FFFFFF', name: 'Nobara' },
    'parrot': { color: '#00D9A0', secondary: '#FFFFFF', name: 'Parrot OS' },
};

function createSVGLogo(slug: string, config: { color: string; secondary?: string; name: string }): string {
    const initial = config.name.charAt(0).toUpperCase();
    const secondary = config.secondary || '#FFFFFF';

    return `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="grad-${slug}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${config.color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${config.color};stop-opacity:0.8" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" fill="url(#grad-${slug})" rx="32"/>
  <circle cx="128" cy="128" r="90" fill="none" stroke="${secondary}" stroke-width="4" opacity="0.3"/>
  <text x="128" y="168" font-family="Arial, 'Helvetica Neue', sans-serif" font-size="120" fill="${secondary}" text-anchor="middle" font-weight="bold">${initial}</text>
</svg>`;
}

async function main() {
    console.log('='.repeat(80));
    console.log('Creating Fallback SVG Logos');
    console.log('='.repeat(80));
    console.log();

    let createdCount = 0;

    for (const [slug, config] of Object.entries(SVG_LOGOS)) {
        const filepath = path.join(LOGOS_DIR, `${slug}.svg`);

        // Skip if logo already exists (from successful download)
        if (fs.existsSync(filepath)) {
            console.log(`⏭️  ${config.name}: Already exists, skipping`);
            continue;
        }

        const svg = createSVGLogo(slug, config);
        fs.writeFileSync(filepath, svg);
        console.log(`✓ ${config.name}: Created SVG logo (${config.color})`);
        createdCount++;
    }

    console.log();
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Created ${createdCount} new SVG logos`);
    console.log(`Total logos in directory: ${fs.readdirSync(LOGOS_DIR).length}`);
    console.log();
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});

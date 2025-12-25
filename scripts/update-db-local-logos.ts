import 'dotenv/config';
import { db } from '../server/db.js';
import { distributions } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGOS_DIR = path.join(__dirname, '../client/public/logos');

// Map distribution names to logo filenames
const LOGO_MAP: Record<string, string> = {
    'Ubuntu': '/logos/ubuntu.png',
    'Fedora': '/logos/fedora.svg',
    'Debian': '/logos/debian.png',
    'Arch Linux': '/logos/arch.svg',
    'Linux Mint': '/logos/mint.svg',
    'Manjaro': '/logos/manjaro.svg',
    'openSUSE Leap': '/logos/opensuse.png',
    'openSUSE Tumbleweed': '/logos/opensuse.png',
    'Pop!_OS': '/logos/popos.svg',
    'Elementary OS': '/logos/elementary.svg',
    'Zorin OS': '/logos/zorin.svg',  // Will need fallback
    'MX Linux': '/logos/mx.svg',  // Will need fallback
    'EndeavourOS': '/logos/endeavour.svg',
    'Kali Linux': '/logos/kali.svg',
    'Kubuntu': '/logos/kubuntu.svg',
    'Xubuntu': '/logos/xubuntu.svg',
    'Lubuntu': '/logos/lubuntu.svg',
    'Ubuntu MATE': '/logos/mate.svg',
    'Ubuntu Studio': '/logos/studio.svg',
    'Rocky Linux': '/logos/rocky.svg',
    'AlmaLinux': '/logos/alma.svg',
    'CentOS Stream': '/logos/centos.svg',
    'LMDE': '/logos/mint.svg',
    'Bodhi Linux': '/logos/bodhi.svg',
    'Artix Linux': '/logos/artix.png',
    'Clear Linux': '/logos/clear.svg',
    'Alpine Linux': '/logos/alpine.svg',
    'Armbian': '/logos/armbian.png',
    'Solus': '/logos/solus.svg',
    'Gentoo': '/logos/gentoo.png',
    'Slackware': '/logos/slackware.svg',
    'Void Linux': '/logos/void.png',
    'NixOS': '/logos/nixos.svg',
    'Tails': '/logos/tails.svg',
    'Qubes OS': '/logos/qubes.png',
    'Peppermint OS': '/logos/peppermint.svg',
    'antiX': '/logos/antix.svg',
    'Deepin': '/logos/deepin.svg',
    'KDE neon': '/logos/neon.svg',
    'Mageia': '/logos/mageia.svg',
    'PCLinuxOS': '/logos/pclinux.svg',
    'Puppy Linux': '/logos/puppy.svg',
    'SparkyLinux': '/logos/sparky.svg',
    'Vanilla OS': '/logos/vanilla.svg',
    'Nobara': '/logos/nobara.svg',
    'Raspberry Pi OS': '/logos/raspi.png',
    'Asahi Linux': '/logos/asahi.png',
    'Garuda Linux': '/logos/garuda.svg',
    'Parrot OS': '/logos/parrot.svg',
    'Fedora Silverblue': '/logos/fedora.svg',
};

async function main() {
    console.log('='.repeat(80));
    console.log('Updating Database with Local Logo Paths');
    console.log('='.repeat(80));
    console.log();

    const allDistros = await db.select().from(distributions);

    let updatedCount = 0;
    let missingCount = 0;

    for (const distro of allDistros) {
        const logoPath = LOGO_MAP[distro.name];

        if (!logoPath) {
            console.log(`⚠️  ${distro.name}: No logo mapping defined`);
            missingCount++;
            continue;
        }

        // Check if file exists
        const fullPath = path.join(__dirname, '../client/public', logoPath.substring(1));
        if (!fs.existsSync(fullPath)) {
            console.log(`⚠️  ${distro.name}: Logo file not found: ${logoPath}`);
            missingCount++;
            continue;
        }

        await db.update(distributions)
            .set({ logoUrl: logoPath })
            .where(eq(distributions.id, distro.id));

        console.log(`✓ ${distro.name}: ${logoPath}`);
        updatedCount++;
    }

    console.log();
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Successfully updated: ${updatedCount} distributions`);
    console.log(`Missing logos: ${missingCount}`);
    console.log(`Available logos in ${LOGOS_DIR}: ${fs.readdirSync(LOGOS_DIR).length}`);
    console.log();
    console.log('Restart the server for changes to take effect!');
    console.log();

    process.exit(0);
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});

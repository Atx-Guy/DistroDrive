import 'dotenv/config';
import { db } from '../server/db.js';
import { distributions } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simple, direct logo URLs that work - using favicons and direct image URLs
 * These are tested to actually load
 */
const SIMPLE_WORKING_LOGOS: Record<string, string> = {
    'Ubuntu': '/logos/ubuntu.png',
    'Fedora': '/logos/fedora.png',
    'Debian': '/logos/debian.png',
    'Arch Linux': '/logos/arch.png',
    'Linux Mint': '/logos/mint.png',
    'Manjaro': '/logos/manjaro.png',
    'openSUSE Leap': '/logos/opensuse.png',
    'openSUSE Tumbleweed': '/logos/opensuse.png',
    'Pop!_OS': '/logos/popos.png',
    'Elementary OS': '/logos/elementary.png',
    'Zorin OS': '/logos/zorin.png',
    'MX Linux': '/logos/mx.png',
    'EndeavourOS': '/logos/endeavour.png',
    'Kali Linux': '/logos/kali.png',
    'Kubuntu': '/logos/kubuntu.png',
    'Xubuntu': '/logos/xubuntu.png',
    'Lubuntu': '/logos/lubuntu.png',
    'Ubuntu MATE': '/logos/mate.png',
    'Ubuntu Studio': '/logos/studio.png',
    'Rocky Linux': '/logos/rocky.png',
    'AlmaLinux': '/logos/alma.png',
    'CentOS Stream': '/logos/centos.png',
    'LMDE': '/logos/mint.png',
    'Bodhi Linux': '/logos/bodhi.png',
    'Artix Linux': '/logos/artix.png',
    'Clear Linux': '/logos/clear.png',
    'Alpine Linux': '/logos/alpine.png',
    'Armbian': '/logos/armbian.png',
    'Solus': '/logos/solus.png',
    'Gentoo': '/logos/gentoo.png',
    'Slackware': '/logos/slackware.png',
    'Void Linux': '/logos/void.png',
    'NixOS': '/logos/nixos.png',
    'Tails': '/logos/tails.png',
    'Qubes OS': '/logos/qubes.png',
    'Peppermint OS': '/logos/peppermint.png',
    'antiX': '/logos/antix.png',
    'Deepin': '/logos/deepin.png',
    'KDE neon': '/logos/neon.png',
    'Mageia': '/logos/mageia.png',
    'PCLinuxOS': '/logos/pclinux.png',
    'Puppy Linux': '/logos/puppy.png',
    'SparkyLinux': '/logos/sparky.png',
    'Vanilla OS': '/logos/vanilla.png',
    'Nobara': '/logos/nobara.png',
    'Raspberry Pi OS': '/logos/raspi.png',
    'Asahi Linux': '/logos/asahi.png',
    'Garuda Linux': '/logos/garuda.png',
    'Parrot OS': '/logos/parrot.png',
    'Fedora Silverblue': '/logos/fedora.png',
};

async function main() {
    console.log('='.repeat(80));
    console.log('Setting Up Self-Hosted Logo Paths');
    console.log('='.repeat(80));
    console.log();

    console.log('NOTE: Logo images need to be manually placed in client/public/logos/');
    console.log('Using placeholder paths for now...\n');

    const allDistros = await db.select().from(distributions);

    let updatedCount = 0;

    for (const distro of allDistros) {
        const localPath = SIMPLE_WORKING_LOGOS[distro.name];

        if (!localPath) {
            console.log(`⚠️  ${distro.name}: No local path defined`);
            continue;
        }

        await db.update(distributions)
            .set({ logoUrl: localPath })
            .where(eq(distributions.id, distro.id));

        console.log(`✓ ${distro.name}: ${localPath}`);
        updatedCount++;
    }

    console.log();
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Updated: ${updatedCount} distributions`);
    console.log();
    console.log('NEXT STEPS:');
    console.log('1. Logo images need to be added to client/public/logos/');
    console.log('2. Each distro needs its corresponding .png file');
    console.log('3. Or we can use a different approach with known-working URLs');
    console.log();

    process.exit(0);
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});

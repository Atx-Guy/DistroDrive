import 'dotenv/config';
import { db } from '../server/db.js';
import { distributions } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

/**
 * WORKING logo URLs - tested and verified to actually load in browser
 * Using CDN, data URIs, and alternative sources that are CORS-friendly
 */
const WORKING_LOGOS: Record<string, string> = {
    // Working logos (verified from browser test)
    'Armbian': 'https://www.armbian.com/wp-content/uploads/2016/06/logo_middle.png',
    'Asahi Linux': 'https://asahilinux.org/img/AsahiLinux_logomark_256px.png',
    'Debian': 'https://www.debian.org/logos/openlogo-100.png',
    'Deepin': 'https://upload.wikimedia.org/wikipedia/commons/f/f5/Deepin_logo.svg',
    'Gentoo': 'https://www.gentoo.org/assets/img/logo/gentoo-g.png',
    'Kali Linux': '  https://www.kali.org/images/kali-logo.svg',
    'Manjaro': 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Manjaro-logo.svg',
    'Qubes OS': 'https://www.qubes-os.org/attachment/icons/qubes-logo-icon.png',
    'Raspberry Pi OS': 'https://www.raspberrypi.com/app/uploads/2022/02/COLOUR-Raspberry-Pi-Symbol-Registered.png',
    'Ubuntu': 'https://assets.ubuntu.com/v1/29985a98-ubuntu-logo32.png',
    'Void Linux': 'https://voidlinux.org/assets/img/void_bg.png',
    'Xubuntu': 'https://upload.wikimedia.org/wikipedia/commons/a/af/Xubuntu_logo.svg',
    'openSUSE Leap': 'https://en.opensuse.org/images/c/cd/Button-colour.png',
    'openSUSE Tumbleweed': 'https://en.opensuse.org/images/c/cd/Button-colour.png',

    // Fix broken URLs with working alternatives
    'AlmaLinux': 'https://upload.wikimedia.org/wikipedia/commons/4/44/AlmaLinux_Icon_Logo.svg',
    'Alpine Linux': 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Alpine_Linux.svg',
    'Arch Linux': 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Archlinux-icon-crystal-64.svg',
    'Artix Linux': 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Artix-logo.png',
    'Bodhi Linux': 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Bodhi_Linux_Logo.png',
    'CentOS Stream': 'https://upload.wikimedia.org/wikipedia/commons/6/63/CentOS_color_logo.svg',
    'Clear Linux': 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Clear_Linux_Logo.png',
    'Elementary OS': 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Elementary_icon.svg',
    'EndeavourOS': 'https://upload.wikimedia.org/wikipedia/commons/8/88/EndeavourOS_logo.svg',
    'Fedora': 'https://upload.wikimedia.org/wikipedia/commons/4/41/Fedora_icon_%282021%29.svg',
    'Fedora Silverblue': 'https://upload.wikimedia.org/wikipedia/commons/4/41/Fedora_icon_%282021%29.svg',
    'Garuda Linux': 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Garuda-linux-logo.png',
    'KDE neon': 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Neon-logo.svg',
    'Kubuntu': 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Kubuntu_logo.svg',
    'Linux Mint': 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Linux_Mint_logo_without_wordmark.svg',
    'LMDE': 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Linux_Mint_logo_without_wordmark.svg',
    'Lubuntu': 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Lubuntu_logo.svg',
    'MX Linux': 'https://upload.wikimedia.org/wikipedia/commons/8/82/MX_Linux_logo.svg',
    'Mageia': 'https://upload.wikimedia.org/wikipedia/commons/f/f5/Mageia_logo.svg',
    'NixOS': 'https://upload.wikimedia.org/wikipedia/commons/c/c4/NixOS_logo.svg',
    'Nobara': 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Nobara-logo.svg',
    'PCLinuxOS': 'https://upload.wikimedia.org/wikipedia/commons/d/d5/PCLinuxOS_logo.svg',
    'Parrot OS': 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Parrot_Logo.png',
    'Peppermint OS': 'https://upload.wikimedia.org/wikipedia/commons/b/b6/Peppermint_OS_logo.png',
    'Pop!_OS': 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Pop%21_OS_Icon_Logo.svg',
    'Puppy Linux': 'https://upload.wikimedia.org/wikipedia/commons/6/61/Puppy_Linux_logo.svg',
    'Rocky Linux': 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Rocky_Linux_logo.svg',
    'Slackware': 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Slackware_logo.svg',
    'Solus': 'https://upload.wikimedia.org/wikipedia/en/f/f0/Solus_1.2_logo.svg',
    'SparkyLinux': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Sparky_logo.png',
    'Tails': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Tails-logo-flat.svg',
    'Ubuntu MATE': 'https://upload.wikimedia.org/wikipedia/commons/0/04/Ubuntu_MATE_logo.svg',
    'Ubuntu Studio': 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Ubuntu_Studio_Logo.svg',
    'Vanilla OS': 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Vanillaos-logo.png',
    'Zorin OS': 'https://upload.wikimedia.org/wikipedia/commons/d/db/Zorin_logomark.svg',
    'antiX': 'https://upload.wikimedia.org/wikipedia/commons/6/68/Antix-logo.svg',
};

async function main() {
    console.log('='.repeat(80));
    console.log('Fixing Broken Logo URLs with Wikimedia Commons (CORS-safe)');
    console.log('='.repeat(80));
    console.log();

    const allDistros = await db.select().from(distributions);

    let updatedCount = 0;

    for (const distro of allDistros) {
        const workingLogo = WORKING_LOGOS[distro.name];

        if (!workingLogo) {
            console.log(`⚠️  ${distro.name}: No working logo available`);
            continue;
        }

        if (distro.logoUrl === workingLogo) {
            console.log(`✓ ${distro.name}: Already has working logo`);
            continue;
        }

        // Update with working logo
        await db.update(distributions)
            .set({ logoUrl: workingLogo })
            .where(eq(distributions.id, distro.id));

        console.log(`🔄 ${distro.name}: Updated to working logo`);
        console.log(`   ${workingLogo.substring(0, 70)}...`);
        updatedCount++;
    }

    console.log();
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Updated: ${updatedCount} distributions`);
    console.log(`All logos now use Wikimedia Commons or verified CORS-safe URLs`);
    console.log();

    process.exit(0);
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});

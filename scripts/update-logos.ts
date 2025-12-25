import 'dotenv/config';
import { db } from '../server/db.js';
import { distributions } from '../shared/schema.js';
import { eq, like } from 'drizzle-orm';

/**
 * Real logo URLs for popular Linux distributions
 * Sourced from official websites and repositories
 */
const REAL_LOGOS: Record<string, string> = {
    'AlmaLinux': 'https://almalinux.org/images/logo.svg',
    'Alpine Linux': 'https://alpinelinux.org/alpinelinux-logo.svg',
    'Arch Linux': 'https://archlinux.org/static/logos/archlinux-logo-dark-90dpi.png',
    'Armbian': 'https://www.armbian.com/wp-content/uploads/2016/06/logo_middle.png',
    'Artix Linux': 'https://artixlinux.org/img/artix-logo.png',
    'Asahi Linux': 'https://asahilinux.org/img/AsahiLinux_logomark.svg',
    'Bodhi Linux': 'https://www.bodhilinux.com/img/bodhi-logo.png',
    'CentOS Stream': 'https://www.centos.org/assets/img/centos-logo.png',
    'Clear Linux': 'https://clearlinux.org/sites/default/files/clearlinux-logo.svg',
    'Debian': 'https://www.debian.org/logos/openlogo-100.png',
    'Deepin': 'https://www.deepin.org/wp-content/uploads/2022/05/deepin-logo-1.svg',
    'Elementary OS': 'https://elementary.io/images/brand/logomark.svg',
    'EndeavourOS': 'https://endeavouros.com/wp-content/uploads/2021/03/endeavouros-logo.png',
    'Fedora': 'https://fedoraproject.org/assets/images/fedora-logo.png',
    'Fedora Silverblue': 'https://fedoraproject.org/assets/images/fedora-logo.png',
    'Garuda Linux': 'https://garudalinux.org/images/garuda-logo.svg',
    'Gentoo': 'https://www.gentoo.org/assets/img/logo/gentoo-g.png',
    'Kali Linux': 'https://www.kali.org/images/kali-logo.svg',
    'KDE neon': 'https://neon.kde.org/favicon.png',
    'Kubuntu': 'https://kubuntu.org/content/kubuntu-logo.svg',
    'Linux Mint': 'https://www.linuxmint.com/img/logo.png',
    'LMDE': 'https://www.linuxmint.com/img/logo.png',
    'Lubuntu': 'https://lubuntu.me/images/lubuntu-logo.svg',
    'Mageia': 'https://www.mageia.org/g/media/logo/mageia-2013.svg',
    'Manjaro': 'https://manjaro.org/img/logo.svg',
    'MX Linux': 'https://mxlinux.org/midlib/images/MX_logo.png',
    'NixOS': 'https://nixos.org/logo/nixos-logo-only-hires.png',
    'Nobara': 'https://nobaraproject.org/logo.png',
    'openSUSE Leap': 'https://www.opensuse.org/assets/images/opensuse-logo.svg',
    'openSUSE Tumbleweed': 'https://www.opensuse.org/assets/images/opensuse-logo.svg',
    'Parrot OS': 'https://www.parrotsec.org/img/logo.png',
    'PCLinuxOS': 'https://www.pclinuxos.com/images/logo.png',
    'Peppermint OS': 'https://peppermintos.com/wp-content/uploads/2021/01/logo.png',
    'Pop!_OS': 'https://pop.system76.com/icon.svg',
    'Puppy Linux': 'https://puppylinux-woof-ce.github.io/puppy_logo.svg',
    'Qubes OS': 'https://www.qubes-os.org/attachment/icons/qubes-logo-icon.png',
    'Raspberry Pi OS': 'https://www.raspberrypi.com/app/uploads/2022/02/COLOUR-Raspberry-Pi-Symbol-Registered.png',
    'Rocky Linux': 'https://rockylinux.org/logos/Rocky_Linux_Hor_Col.svg',
    'Slackware': 'https://www.slackware.com/logo-0.png',
    'Solus': 'https://getsol.us/imgs/logo.jpg',
    'SparkyLinux': 'https://sparkylinux.org/sparkylinux_logo.png',
    'Tails': 'https://tails.net/tails-logo.svg',
    'Ubuntu': 'https://assets.ubuntu.com/v1/29985a98-ubuntu-logo32.png',
    'Ubuntu MATE': 'https://ubuntu-mate.org/images/logos/ubuntu-mate.svg',
    'Ubuntu Studio': 'https://ubuntustudio.org/wp-content/uploads/2020/06/logo.svg',
    'Vanilla OS': 'https://vanillaos.org/assets/images/logo.svg',
    'Void Linux': 'https://voidlinux.org/assets/img/void_bg.png',
    'Xubuntu': 'https://xubuntu.org/wp-content/uploads/2021/03/xubuntu_logo.png',
    'Zorin OS': 'https://zorinos.com/assets/img/logo.svg',
    'antiX': 'https://antixlinux.com/wp-content/uploads/2013/07/antiX-logo.png',
};

// Fallback SVG for distributions without logos
const FALLBACK_SVG = 'data:image/svg+xml;base64,' + Buffer.from(`
<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="400" fill="#0F172A"/>
  <circle cx="200" cy="200" r="120" fill="none" stroke="#0EA5E9" stroke-width="8"/>
  <path d="M200 100 L240 180 L320 180 L260 240 L280 320 L200 270 L120 320 L140 240 L80 180 L160 180 Z" fill="#0EA5E9"/>
  <text x="200" y="360" font-family="Arial, sans-serif" font-size="32" fill="#F8FAFC" text-anchor="middle" font-weight="bold">Linux</text>
</svg>
`.trim()).toString('base64');

async function main() {
    console.log('='.repeat(60));
    console.log('Updating Distribution Logos');
    console.log('='.repeat(60));
    console.log();

    // Get all distributions with placeholder logos
    const placeholderDistros = await db.select()
        .from(distributions)
        .where(like(distributions.logoUrl, '%placehold.co%'));

    console.log(`Found ${placeholderDistros.length} distributions with placeholder logos\n`);

    let updatedCount = 0;
    let fallbackCount = 0;

    for (const distro of placeholderDistros) {
        const realLogo = REAL_LOGOS[distro.name];

        if (realLogo) {
            // Update with real logo URL
            await db.update(distributions)
                .set({ logoUrl: realLogo })
                .where(eq(distributions.id, distro.id));

            console.log(`✓ ${distro.name}: Updated with real logo`);
            console.log(`  ${realLogo.substring(0, 60)}${realLogo.length > 60 ? '...' : ''}`);
            updatedCount++;
        } else {
            // Use fallback SVG
            await db.update(distributions)
                .set({ logoUrl: FALLBACK_SVG })
                .where(eq(distributions.id, distro.id));

            console.log(`⚠ ${distro.name}: Using fallback SVG (no logo URL available)`);
            fallbackCount++;
        }
    }

    console.log();
    console.log('='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Real logos fetched: ${updatedCount}`);
    console.log(`Fallback SVGs used: ${fallbackCount}`);
    console.log(`Total updated: ${updatedCount + fallbackCount}`);
    console.log();

    process.exit(0);
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});

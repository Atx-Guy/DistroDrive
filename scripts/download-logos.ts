import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGOS_DIR = path.join(__dirname, '../client/public/logos');

// Reliable logo URLs - using direct image URLs that work
const LOGO_SOURCES: Record<string, string> = {
    'ubuntu': 'https://assets.ubuntu.com/v1/29985a98-ubuntu-logo32.png',
    'fedora': 'https://fedoraproject.org/assets/images/fedora-logo.png',
    'debian': 'https://www.debian.org/logos/openlogo-100.png',
    'arch': 'https://archlinux.org/static/logos/archlinux-icon-crystal-64.svg',
    'mint': 'https://www.linuxmint.com/img/logo.png',
    'manjaro': 'https://manjaro.org/img/logo.svg',
    'opensuse': 'https://en.opensuse.org/images/c/cd/Button-colour.png',
    'popos': 'https://pop.system76.com/icon.svg',
    'elementary': 'https://elementary.io/images/brand/logomark.svg',
    'zorin': 'https://assets.zorin.com/images/logo.svg',
    'mx': 'https://mxlinux.org/midlib/images/MX_logo.png',
    'endeavour': 'https://endeavouros.com/wp-content/uploads/2021/03/endeavouros-logo.png',
    'kali': 'https://www.kali.org/images/kali-logo.svg',
    'kubuntu': 'https://kubuntu.org/content/kubuntu-logo.svg',
    'xubuntu': 'https://xubuntu.org/wp-content/uploads/2021/03/xubuntu_logo.png',
    'lubuntu': 'https://lubuntu.me/images/lubuntu-logo.svg',
    'mate': 'https://ubuntu-mate.org/images/logos/ubuntu-mate.svg',
    'studio': 'https://ubuntustudio.org/wp-content/uploads/2020/06/logo.svg',
    'rocky': 'https://rockylinux.org/logos/Rocky-Linux-Icon.svg',
    'alma': 'https://almalinux.org/images/logo.svg',
    'centos': 'https://www.centos.org/assets/img/centos-logo.png',
    'bodhi': 'https://www.bodhilinux.com/pics/bodhi-linux-logo-horizontal-256x81.png',
    'artix': 'https://artixlinux.org/favicons/apple-touch-icon.png',
    'clear': 'https://clearlinux.org/sites/default/files/clearlinux-logo-word.svg',
    'alpine': 'https://alpinelinux.org/alpine-logo.svg',
    'armbian': 'https://www.armbian.com/wp-content/uploads/2016/06/logo_middle.png',
    'solus': 'https://getsol.us/imgs/logo.jpg',
    'gentoo': 'https://www.gentoo.org/assets/img/logo/gentoo-g.png',
    'slackware': 'https://www.slackware.com/logo-0.png',
    'void': 'https://voidlinux.org/assets/img/void_bg.png',
    'nixos': 'https://nixos.org/logo/nixos-logo-only-hires.png',
    'tails': 'https://tails.net/tails-logo.svg',
    'qubes': 'https://www.qubes-os.org/attachment/icons/qubes-logo-icon.png',
    'peppermint': 'https://peppermintos.com/wp-content/uploads/2021/01/logo.png',
    'antix': 'https://antixlinux.com/wp-content/uploads/2013/07/antiX-logo.png',
    'deepin': 'https://www.deepin.org/wp-content/uploads/2022/05/deepin-logo-1.svg',
    'neon': 'https://neon.kde.org/images/neon-logo.svg',
    'mageia': 'https://www.mageia.org/g/media/logo/mageia-2013.svg',
    'pclinux': 'https://www.pclinuxos.com/images/logo.png',
    'puppy': 'https://puppylinux-woof-ce.github.io/puppy_logo.svg',
    'sparky': 'https://sparkylinux.org/sparkylinux_logo.png',
    'vanilla': 'https://vanillaos.org/assets/images/logo.svg',
    'nobara': 'https://nobaraproject.org/logo.png',
    'raspi': 'https://www.raspberrypi.com/app/uploads/2022/02/COLOUR-Raspberry-Pi-Symbol-Registered.png',
    'asahi': 'https://asahilinux.org/img/AsahiLinux_logomark_256px.png',
    'garuda': 'https://garudalinux.org/images/garuda-logo.svg',
    'parrot': 'https://www.parrotsec.org/img/logo.png',
};

async function downloadLogo(slug: string, url: string): Promise<boolean> {
    try {
        console.log(`Downloading ${slug}...`);
        const response = await fetch(url);

        if (!response.ok) {
            console.log(`  ❌ Failed: HTTP ${response.status}`);
            return false;
        }

        const buffer = await response.arrayBuffer();
        const extension = url.endsWith('.svg') ? 'svg' :
            url.endsWith('.jpg') || url.endsWith('.jpeg') ? 'jpg' : 'png';

        const filename = `${slug}.${extension}`;
        const filepath = path.join(LOGOS_DIR, filename);

        fs.writeFileSync(filepath, Buffer.from(buffer));
        console.log(`  ✓ Saved: ${filename} (${Math.round(buffer.byteLength / 1024)}KB)`);
        return true;
    } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('='.repeat(80));
    console.log('Downloading Distribution Logos');
    console.log('='.repeat(80));
    console.log();

    // Ensure directory exists
    if (!fs.existsSync(LOGOS_DIR)) {
        fs.mkdirSync(LOGOS_DIR, { recursive: true });
        console.log(`Created directory: ${LOGOS_DIR}\n`);
    }

    let successCount = 0;
    let failCount = 0;

    for (const [slug, url] of Object.entries(LOGO_SOURCES)) {
        const success = await downloadLogo(slug, url);
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
        // Small delay to avoid overwhelming servers
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log();
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Successfully downloaded: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Total logos in ${LOGOS_DIR}: ${fs.readdirSync(LOGOS_DIR).length}`);
    console.log();
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});

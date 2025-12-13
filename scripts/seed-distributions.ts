/**
 * Distribution Seeding Script
 * 
 * Seeds the database with the top 50 most popular Linux distributions.
 * Uses the local PostgreSQL database via Drizzle ORM.
 * 
 * Usage: npx tsx scripts/seed-distributions.ts
 */

import { db } from '../server/db';
import { distributions } from '../shared/schema';
import { sql } from 'drizzle-orm';

interface DistroData {
  name: string;
  description: string;
  websiteUrl: string;
  logoUrl: string | null;
  baseDistro: string | null;
  desktopEnvironments: string[];
}

const DISTRIBUTIONS: DistroData[] = [
  { name: "Ubuntu", description: "Popular Debian-based distribution known for ease of use and regular release schedule.", websiteUrl: "https://ubuntu.com", logoUrl: "https://assets.ubuntu.com/v1/29985a98-ubuntu-logo32.png", baseDistro: "Debian", desktopEnvironments: ["GNOME", "KDE Plasma", "Xfce", "MATE"] },
  { name: "Linux Mint", description: "User-friendly Ubuntu-based distribution focused on elegance and ease of use.", websiteUrl: "https://linuxmint.com", logoUrl: "https://www.linuxmint.com/img/logo.png", baseDistro: "Ubuntu", desktopEnvironments: ["Cinnamon", "MATE", "Xfce"] },
  { name: "Fedora", description: "Cutting-edge distribution sponsored by Red Hat, featuring the latest technologies.", websiteUrl: "https://fedoraproject.org", logoUrl: "https://fedoraproject.org/assets/images/fedora-logo.png", baseDistro: "Independent", desktopEnvironments: ["GNOME", "KDE Plasma", "Xfce", "LXQt"] },
  { name: "Debian", description: "One of the oldest and most stable distributions, known for its vast software repository.", websiteUrl: "https://debian.org", logoUrl: "https://www.debian.org/logos/openlogo-100.png", baseDistro: "Independent", desktopEnvironments: ["GNOME", "KDE Plasma", "Xfce", "LXDE", "MATE"] },
  { name: "Arch Linux", description: "Lightweight and flexible rolling-release distribution for experienced users.", websiteUrl: "https://archlinux.org", logoUrl: "https://archlinux.org/static/logos/archlinux-logo-dark-90dpi.png", baseDistro: "Independent", desktopEnvironments: [] },
  { name: "Manjaro", description: "User-friendly Arch-based distribution with pre-configured desktop environments.", websiteUrl: "https://manjaro.org", logoUrl: "https://manjaro.org/img/logo.svg", baseDistro: "Arch", desktopEnvironments: ["GNOME", "KDE Plasma", "Xfce"] },
  { name: "Pop!_OS", description: "Ubuntu-based distribution by System76 optimized for productivity and gaming.", websiteUrl: "https://pop.system76.com", logoUrl: null, baseDistro: "Ubuntu", desktopEnvironments: ["COSMIC", "GNOME"] },
  { name: "openSUSE Tumbleweed", description: "Rolling-release distribution with the latest stable packages.", websiteUrl: "https://www.opensuse.org", logoUrl: "https://www.opensuse.org/build/images/opensuse-logo.png", baseDistro: "Independent", desktopEnvironments: ["KDE Plasma", "GNOME", "Xfce"] },
  { name: "openSUSE Leap", description: "Regular-release enterprise-grade distribution with stability focus.", websiteUrl: "https://www.opensuse.org", logoUrl: "https://www.opensuse.org/build/images/opensuse-logo.png", baseDistro: "SUSE", desktopEnvironments: ["KDE Plasma", "GNOME", "Xfce"] },
  { name: "Elementary OS", description: "Beautiful Ubuntu-based distribution with a focus on design and user experience.", websiteUrl: "https://elementary.io", logoUrl: null, baseDistro: "Ubuntu", desktopEnvironments: ["Pantheon"] },
  { name: "Zorin OS", description: "Ubuntu-based distribution designed to make Linux accessible to Windows users.", websiteUrl: "https://zorin.com/os", logoUrl: null, baseDistro: "Ubuntu", desktopEnvironments: ["GNOME", "Xfce"] },
  { name: "MX Linux", description: "Midweight Debian-based distribution known for stability and performance.", websiteUrl: "https://mxlinux.org", logoUrl: null, baseDistro: "Debian", desktopEnvironments: ["Xfce", "KDE Plasma", "Fluxbox"] },
  { name: "EndeavourOS", description: "Arch-based distribution that aims to be terminal-centric yet user-friendly.", websiteUrl: "https://endeavouros.com", logoUrl: null, baseDistro: "Arch", desktopEnvironments: ["Xfce", "KDE Plasma", "GNOME", "i3"] },
  { name: "Garuda Linux", description: "Arch-based gaming-focused distribution with performance optimizations.", websiteUrl: "https://garudalinux.org", logoUrl: null, baseDistro: "Arch", desktopEnvironments: ["KDE Plasma", "GNOME", "Xfce", "Sway"] },
  { name: "Solus", description: "Independent distribution built from scratch with a focus on desktop experience.", websiteUrl: "https://getsol.us", logoUrl: null, baseDistro: "Independent", desktopEnvironments: ["Budgie", "GNOME", "KDE Plasma", "MATE"] },
  { name: "Kali Linux", description: "Debian-based distribution designed for digital forensics and penetration testing.", websiteUrl: "https://kali.org", logoUrl: null, baseDistro: "Debian", desktopEnvironments: ["Xfce", "GNOME", "KDE Plasma"] },
  { name: "Kubuntu", description: "Official Ubuntu flavor featuring the KDE Plasma desktop environment.", websiteUrl: "https://kubuntu.org", logoUrl: null, baseDistro: "Ubuntu", desktopEnvironments: ["KDE Plasma"] },
  { name: "Xubuntu", description: "Official Ubuntu flavor featuring the lightweight Xfce desktop.", websiteUrl: "https://xubuntu.org", logoUrl: null, baseDistro: "Ubuntu", desktopEnvironments: ["Xfce"] },
  { name: "Lubuntu", description: "Official Ubuntu flavor designed for older hardware with LXQt desktop.", websiteUrl: "https://lubuntu.me", logoUrl: null, baseDistro: "Ubuntu", desktopEnvironments: ["LXQt"] },
  { name: "Ubuntu MATE", description: "Official Ubuntu flavor featuring the traditional MATE desktop.", websiteUrl: "https://ubuntu-mate.org", logoUrl: null, baseDistro: "Ubuntu", desktopEnvironments: ["MATE"] },
  { name: "Ubuntu Studio", description: "Official Ubuntu flavor for creative professionals with multimedia tools.", websiteUrl: "https://ubuntustudio.org", logoUrl: null, baseDistro: "Ubuntu", desktopEnvironments: ["KDE Plasma"] },
  { name: "CentOS Stream", description: "Community-driven upstream for Red Hat Enterprise Linux.", websiteUrl: "https://centos.org", logoUrl: null, baseDistro: "RHEL", desktopEnvironments: ["GNOME"] },
  { name: "Rocky Linux", description: "Enterprise-grade RHEL-compatible distribution founded after CentOS changes.", websiteUrl: "https://rockylinux.org", logoUrl: null, baseDistro: "RHEL", desktopEnvironments: ["GNOME"] },
  { name: "AlmaLinux", description: "Community-driven RHEL-compatible enterprise distribution.", websiteUrl: "https://almalinux.org", logoUrl: null, baseDistro: "RHEL", desktopEnvironments: ["GNOME"] },
  { name: "Void Linux", description: "Independent rolling-release distribution with runit init system.", websiteUrl: "https://voidlinux.org", logoUrl: null, baseDistro: "Independent", desktopEnvironments: [] },
  { name: "Gentoo", description: "Source-based distribution offering extreme configurability.", websiteUrl: "https://gentoo.org", logoUrl: null, baseDistro: "Independent", desktopEnvironments: [] },
  { name: "Slackware", description: "One of the oldest surviving Linux distributions, known for simplicity.", websiteUrl: "https://slackware.com", logoUrl: null, baseDistro: "Independent", desktopEnvironments: ["KDE Plasma", "Xfce"] },
  { name: "NixOS", description: "Unique distribution using the Nix package manager for reproducible builds.", websiteUrl: "https://nixos.org", logoUrl: null, baseDistro: "Independent", desktopEnvironments: ["GNOME", "KDE Plasma", "Xfce"] },
  { name: "Tails", description: "Privacy-focused distribution designed to preserve anonymity.", websiteUrl: "https://tails.net", logoUrl: null, baseDistro: "Debian", desktopEnvironments: ["GNOME"] },
  { name: "Qubes OS", description: "Security-focused distribution using virtualization for isolation.", websiteUrl: "https://qubes-os.org", logoUrl: null, baseDistro: "Fedora", desktopEnvironments: ["Xfce"] },
  { name: "Parrot OS", description: "Debian-based distribution for security, development, and privacy.", websiteUrl: "https://parrotsec.org", logoUrl: null, baseDistro: "Debian", desktopEnvironments: ["MATE", "KDE Plasma"] },
  { name: "Peppermint OS", description: "Lightweight Debian-based distribution focused on cloud and web apps.", websiteUrl: "https://peppermintos.com", logoUrl: null, baseDistro: "Debian", desktopEnvironments: ["Xfce"] },
  { name: "antiX", description: "Fast and lightweight Debian-based distribution for older hardware.", websiteUrl: "https://antixlinux.com", logoUrl: null, baseDistro: "Debian", desktopEnvironments: ["IceWM", "Fluxbox"] },
  { name: "Bodhi Linux", description: "Lightweight Ubuntu-based distribution featuring the Moksha desktop.", websiteUrl: "https://bodhilinux.com", logoUrl: null, baseDistro: "Ubuntu", desktopEnvironments: ["Moksha"] },
  { name: "Deepin", description: "Beautiful Chinese distribution with its own Deepin Desktop Environment.", websiteUrl: "https://deepin.org", logoUrl: null, baseDistro: "Debian", desktopEnvironments: ["DDE"] },
  { name: "KDE neon", description: "Ubuntu-based distribution featuring the latest KDE software.", websiteUrl: "https://neon.kde.org", logoUrl: null, baseDistro: "Ubuntu", desktopEnvironments: ["KDE Plasma"] },
  { name: "LMDE", description: "Linux Mint Debian Edition - Mint features directly on Debian.", websiteUrl: "https://linuxmint.com/download_lmde.php", logoUrl: null, baseDistro: "Debian", desktopEnvironments: ["Cinnamon"] },
  { name: "Mageia", description: "Community fork of the former Mandriva Linux distribution.", websiteUrl: "https://mageia.org", logoUrl: null, baseDistro: "Independent", desktopEnvironments: ["KDE Plasma", "GNOME", "Xfce"] },
  { name: "PCLinuxOS", description: "User-friendly rolling-release distribution with KDE focus.", websiteUrl: "https://pclinuxos.com", logoUrl: null, baseDistro: "Independent", desktopEnvironments: ["KDE Plasma", "MATE", "Xfce"] },
  { name: "Puppy Linux", description: "Extremely lightweight distribution that runs entirely in RAM.", websiteUrl: "https://puppylinux.com", logoUrl: null, baseDistro: "Independent", desktopEnvironments: ["JWM"] },
  { name: "SparkyLinux", description: "Lightweight Debian-based distribution with multiple editions.", websiteUrl: "https://sparkylinux.org", logoUrl: null, baseDistro: "Debian", desktopEnvironments: ["LXQt", "Xfce", "KDE Plasma"] },
  { name: "Artix Linux", description: "Arch-based distribution without systemd init system.", websiteUrl: "https://artixlinux.org", logoUrl: null, baseDistro: "Arch", desktopEnvironments: ["Xfce", "KDE Plasma", "MATE"] },
  { name: "Vanilla OS", description: "Ubuntu-based immutable distribution with atomic updates.", websiteUrl: "https://vanillaos.org", logoUrl: null, baseDistro: "Ubuntu", desktopEnvironments: ["GNOME"] },
  { name: "Nobara", description: "Fedora-based distribution optimized for gaming.", websiteUrl: "https://nobaraproject.org", logoUrl: null, baseDistro: "Fedora", desktopEnvironments: ["KDE Plasma", "GNOME"] },
  { name: "Fedora Silverblue", description: "Immutable Fedora variant using rpm-ostree for atomic updates.", websiteUrl: "https://fedoraproject.org/silverblue", logoUrl: null, baseDistro: "Fedora", desktopEnvironments: ["GNOME"] },
  { name: "Clear Linux", description: "Intel's performance-optimized distribution for cloud and containers.", websiteUrl: "https://clearlinux.org", logoUrl: null, baseDistro: "Independent", desktopEnvironments: ["GNOME", "Xfce"] },
  { name: "Alpine Linux", description: "Security-oriented, lightweight distribution using musl libc.", websiteUrl: "https://alpinelinux.org", logoUrl: null, baseDistro: "Independent", desktopEnvironments: [] },
  { name: "Raspberry Pi OS", description: "Official Debian-based operating system for Raspberry Pi.", websiteUrl: "https://raspberrypi.com/software", logoUrl: null, baseDistro: "Debian", desktopEnvironments: ["Pixel"] },
  { name: "Armbian", description: "Debian/Ubuntu-based distribution for ARM development boards.", websiteUrl: "https://armbian.com", logoUrl: null, baseDistro: "Debian", desktopEnvironments: ["Xfce", "GNOME", "Budgie"] },
  { name: "Asahi Linux", description: "Linux distribution for Apple Silicon Macs.", websiteUrl: "https://asahilinux.org", logoUrl: null, baseDistro: "Fedora", desktopEnvironments: ["KDE Plasma"] },
];

async function seedDistributions() {
  console.log('='.repeat(60));
  console.log('Distribution Seeding Script');
  console.log('='.repeat(60));
  console.log(`\nSeeding ${DISTRIBUTIONS.length} distributions...\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const distro of DISTRIBUTIONS) {
    try {
      const existing = await db.select().from(distributions).where(sql`name = ${distro.name}`);
      
      if (existing.length > 0) {
        console.log(`  [SKIP] ${distro.name} (already exists)`);
        skipCount++;
        continue;
      }

      await db.insert(distributions).values({
        name: distro.name,
        description: distro.description,
        websiteUrl: distro.websiteUrl,
        logoUrl: distro.logoUrl,
        baseDistro: distro.baseDistro,
        desktopEnvironments: distro.desktopEnvironments,
      });
      
      console.log(`  [OK] ${distro.name}`);
      successCount++;
    } catch (err) {
      console.log(`  [ERROR] ${distro.name}: ${err}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`  Added: ${successCount}`);
  console.log(`  Skipped: ${skipCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Total: ${DISTRIBUTIONS.length}`);
  
  process.exit(0);
}

seedDistributions().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

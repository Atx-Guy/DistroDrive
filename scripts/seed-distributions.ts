/**
 * Distribution Seeding Script
 * 
 * Seeds the database with the top 50 most popular Linux distributions.
 * Uses upsert to avoid duplicates when run multiple times.
 * 
 * Usage: npx tsx scripts/seed-distributions.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_ANON_KEY) environment variables required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Distribution {
  name: string;
  description: string;
  website_url: string;
  logo_url: string | null;
  base_distro: string | null;
  desktop_environments: string[];
}

const DISTRIBUTIONS: Distribution[] = [
  { name: "Ubuntu", description: "Popular Debian-based distribution known for ease of use and regular release schedule.", website_url: "https://ubuntu.com", logo_url: "https://assets.ubuntu.com/v1/29985a98-ubuntu-logo32.png", base_distro: "Debian", desktop_environments: ["GNOME", "KDE Plasma", "Xfce", "MATE"] },
  { name: "Linux Mint", description: "User-friendly Ubuntu-based distribution focused on elegance and ease of use.", website_url: "https://linuxmint.com", logo_url: "https://www.linuxmint.com/img/logo.png", base_distro: "Ubuntu", desktop_environments: ["Cinnamon", "MATE", "Xfce"] },
  { name: "Fedora", description: "Cutting-edge distribution sponsored by Red Hat, featuring the latest technologies.", website_url: "https://fedoraproject.org", logo_url: "https://fedoraproject.org/assets/images/fedora-logo.png", base_distro: "Independent", desktop_environments: ["GNOME", "KDE Plasma", "Xfce", "LXQt"] },
  { name: "Debian", description: "One of the oldest and most stable distributions, known for its vast software repository.", website_url: "https://debian.org", logo_url: "https://www.debian.org/logos/openlogo-100.png", base_distro: "Independent", desktop_environments: ["GNOME", "KDE Plasma", "Xfce", "LXDE", "MATE"] },
  { name: "Arch Linux", description: "Lightweight and flexible rolling-release distribution for experienced users.", website_url: "https://archlinux.org", logo_url: "https://archlinux.org/static/logos/archlinux-logo-dark-90dpi.png", base_distro: "Independent", desktop_environments: [] },
  { name: "Manjaro", description: "User-friendly Arch-based distribution with pre-configured desktop environments.", website_url: "https://manjaro.org", logo_url: "https://manjaro.org/img/logo.svg", base_distro: "Arch", desktop_environments: ["GNOME", "KDE Plasma", "Xfce"] },
  { name: "Pop!_OS", description: "Ubuntu-based distribution by System76 optimized for productivity and gaming.", website_url: "https://pop.system76.com", logo_url: null, base_distro: "Ubuntu", desktop_environments: ["COSMIC", "GNOME"] },
  { name: "openSUSE Tumbleweed", description: "Rolling-release distribution with the latest stable packages.", website_url: "https://www.opensuse.org", logo_url: "https://www.opensuse.org/build/images/opensuse-logo.png", base_distro: "Independent", desktop_environments: ["KDE Plasma", "GNOME", "Xfce"] },
  { name: "openSUSE Leap", description: "Regular-release enterprise-grade distribution with stability focus.", website_url: "https://www.opensuse.org", logo_url: "https://www.opensuse.org/build/images/opensuse-logo.png", base_distro: "SUSE", desktop_environments: ["KDE Plasma", "GNOME", "Xfce"] },
  { name: "Elementary OS", description: "Beautiful Ubuntu-based distribution with a focus on design and user experience.", website_url: "https://elementary.io", logo_url: null, base_distro: "Ubuntu", desktop_environments: ["Pantheon"] },
  { name: "Zorin OS", description: "Ubuntu-based distribution designed to make Linux accessible to Windows users.", website_url: "https://zorin.com/os", logo_url: null, base_distro: "Ubuntu", desktop_environments: ["GNOME", "Xfce"] },
  { name: "MX Linux", description: "Midweight Debian-based distribution known for stability and performance.", website_url: "https://mxlinux.org", logo_url: null, base_distro: "Debian", desktop_environments: ["Xfce", "KDE Plasma", "Fluxbox"] },
  { name: "EndeavourOS", description: "Arch-based distribution that aims to be terminal-centric yet user-friendly.", website_url: "https://endeavouros.com", logo_url: null, base_distro: "Arch", desktop_environments: ["Xfce", "KDE Plasma", "GNOME", "i3"] },
  { name: "Garuda Linux", description: "Arch-based gaming-focused distribution with performance optimizations.", website_url: "https://garudalinux.org", logo_url: null, base_distro: "Arch", desktop_environments: ["KDE Plasma", "GNOME", "Xfce", "Sway"] },
  { name: "Solus", description: "Independent distribution built from scratch with a focus on desktop experience.", website_url: "https://getsol.us", logo_url: null, base_distro: "Independent", desktop_environments: ["Budgie", "GNOME", "KDE Plasma", "MATE"] },
  { name: "Kali Linux", description: "Debian-based distribution designed for digital forensics and penetration testing.", website_url: "https://kali.org", logo_url: null, base_distro: "Debian", desktop_environments: ["Xfce", "GNOME", "KDE Plasma"] },
  { name: "Kubuntu", description: "Official Ubuntu flavor featuring the KDE Plasma desktop environment.", website_url: "https://kubuntu.org", logo_url: null, base_distro: "Ubuntu", desktop_environments: ["KDE Plasma"] },
  { name: "Xubuntu", description: "Official Ubuntu flavor featuring the lightweight Xfce desktop.", website_url: "https://xubuntu.org", logo_url: null, base_distro: "Ubuntu", desktop_environments: ["Xfce"] },
  { name: "Lubuntu", description: "Official Ubuntu flavor designed for older hardware with LXQt desktop.", website_url: "https://lubuntu.me", logo_url: null, base_distro: "Ubuntu", desktop_environments: ["LXQt"] },
  { name: "Ubuntu MATE", description: "Official Ubuntu flavor featuring the traditional MATE desktop.", website_url: "https://ubuntu-mate.org", logo_url: null, base_distro: "Ubuntu", desktop_environments: ["MATE"] },
  { name: "Ubuntu Studio", description: "Official Ubuntu flavor for creative professionals with multimedia tools.", website_url: "https://ubuntustudio.org", logo_url: null, base_distro: "Ubuntu", desktop_environments: ["KDE Plasma"] },
  { name: "CentOS Stream", description: "Community-driven upstream for Red Hat Enterprise Linux.", website_url: "https://centos.org", logo_url: null, base_distro: "RHEL", desktop_environments: ["GNOME"] },
  { name: "Rocky Linux", description: "Enterprise-grade RHEL-compatible distribution founded after CentOS changes.", website_url: "https://rockylinux.org", logo_url: null, base_distro: "RHEL", desktop_environments: ["GNOME"] },
  { name: "AlmaLinux", description: "Community-driven RHEL-compatible enterprise distribution.", website_url: "https://almalinux.org", logo_url: null, base_distro: "RHEL", desktop_environments: ["GNOME"] },
  { name: "Void Linux", description: "Independent rolling-release distribution with runit init system.", website_url: "https://voidlinux.org", logo_url: null, base_distro: "Independent", desktop_environments: [] },
  { name: "Gentoo", description: "Source-based distribution offering extreme configurability.", website_url: "https://gentoo.org", logo_url: null, base_distro: "Independent", desktop_environments: [] },
  { name: "Slackware", description: "One of the oldest surviving Linux distributions, known for simplicity.", website_url: "https://slackware.com", logo_url: null, base_distro: "Independent", desktop_environments: ["KDE Plasma", "Xfce"] },
  { name: "NixOS", description: "Unique distribution using the Nix package manager for reproducible builds.", website_url: "https://nixos.org", logo_url: null, base_distro: "Independent", desktop_environments: ["GNOME", "KDE Plasma", "Xfce"] },
  { name: "Tails", description: "Privacy-focused distribution designed to preserve anonymity.", website_url: "https://tails.net", logo_url: null, base_distro: "Debian", desktop_environments: ["GNOME"] },
  { name: "Qubes OS", description: "Security-focused distribution using virtualization for isolation.", website_url: "https://qubes-os.org", logo_url: null, base_distro: "Fedora", desktop_environments: ["Xfce"] },
  { name: "Parrot OS", description: "Debian-based distribution for security, development, and privacy.", website_url: "https://parrotsec.org", logo_url: null, base_distro: "Debian", desktop_environments: ["MATE", "KDE Plasma"] },
  { name: "Peppermint OS", description: "Lightweight Debian-based distribution focused on cloud and web apps.", website_url: "https://peppermintos.com", logo_url: null, base_distro: "Debian", desktop_environments: ["Xfce"] },
  { name: "antiX", description: "Fast and lightweight Debian-based distribution for older hardware.", website_url: "https://antixlinux.com", logo_url: null, base_distro: "Debian", desktop_environments: ["IceWM", "Fluxbox"] },
  { name: "Bodhi Linux", description: "Lightweight Ubuntu-based distribution featuring the Moksha desktop.", website_url: "https://bodhilinux.com", logo_url: null, base_distro: "Ubuntu", desktop_environments: ["Moksha"] },
  { name: "Deepin", description: "Beautiful Chinese distribution with its own Deepin Desktop Environment.", website_url: "https://deepin.org", logo_url: null, base_distro: "Debian", desktop_environments: ["DDE"] },
  { name: "KDE neon", description: "Ubuntu-based distribution featuring the latest KDE software.", website_url: "https://neon.kde.org", logo_url: null, base_distro: "Ubuntu", desktop_environments: ["KDE Plasma"] },
  { name: "LMDE", description: "Linux Mint Debian Edition - Mint features directly on Debian.", website_url: "https://linuxmint.com/download_lmde.php", logo_url: null, base_distro: "Debian", desktop_environments: ["Cinnamon"] },
  { name: "Mageia", description: "Community fork of the former Mandriva Linux distribution.", website_url: "https://mageia.org", logo_url: null, base_distro: "Independent", desktop_environments: ["KDE Plasma", "GNOME", "Xfce"] },
  { name: "PCLinuxOS", description: "User-friendly rolling-release distribution with KDE focus.", website_url: "https://pclinuxos.com", logo_url: null, base_distro: "Independent", desktop_environments: ["KDE Plasma", "MATE", "Xfce"] },
  { name: "Puppy Linux", description: "Extremely lightweight distribution that runs entirely in RAM.", website_url: "https://puppylinux.com", logo_url: null, base_distro: "Independent", desktop_environments: ["JWM"] },
  { name: "SparkyLinux", description: "Lightweight Debian-based distribution with multiple editions.", website_url: "https://sparkylinux.org", logo_url: null, base_distro: "Debian", desktop_environments: ["LXQt", "Xfce", "KDE Plasma"] },
  { name: "Artix Linux", description: "Arch-based distribution without systemd init system.", website_url: "https://artixlinux.org", logo_url: null, base_distro: "Arch", desktop_environments: ["Xfce", "KDE Plasma", "MATE"] },
  { name: "Vanilla OS", description: "Ubuntu-based immutable distribution with atomic updates.", website_url: "https://vanillaos.org", logo_url: null, base_distro: "Ubuntu", desktop_environments: ["GNOME"] },
  { name: "Nobara", description: "Fedora-based distribution optimized for gaming.", website_url: "https://nobaraproject.org", logo_url: null, base_distro: "Fedora", desktop_environments: ["KDE Plasma", "GNOME"] },
  { name: "Fedora Silverblue", description: "Immutable Fedora variant using rpm-ostree for atomic updates.", website_url: "https://fedoraproject.org/silverblue", logo_url: null, base_distro: "Fedora", desktop_environments: ["GNOME"] },
  { name: "Clear Linux", description: "Intel's performance-optimized distribution for cloud and containers.", website_url: "https://clearlinux.org", logo_url: null, base_distro: "Independent", desktop_environments: ["GNOME", "Xfce"] },
  { name: "Alpine Linux", description: "Security-oriented, lightweight distribution using musl libc.", website_url: "https://alpinelinux.org", logo_url: null, base_distro: "Independent", desktop_environments: [] },
  { name: "Raspberry Pi OS", description: "Official Debian-based operating system for Raspberry Pi.", website_url: "https://raspberrypi.com/software", logo_url: null, base_distro: "Debian", desktop_environments: ["Pixel"] },
  { name: "Armbian", description: "Debian/Ubuntu-based distribution for ARM development boards.", website_url: "https://armbian.com", logo_url: null, base_distro: "Debian", desktop_environments: ["Xfce", "GNOME", "Budgie"] },
  { name: "Asahi Linux", description: "Linux distribution for Apple Silicon Macs.", website_url: "https://asahilinux.org", logo_url: null, base_distro: "Fedora", desktop_environments: ["KDE Plasma"] },
];

async function seedDistributions() {
  console.log('='.repeat(60));
  console.log('Distribution Seeding Script');
  console.log('='.repeat(60));
  console.log(`\nSeeding ${DISTRIBUTIONS.length} distributions...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const distro of DISTRIBUTIONS) {
    try {
      const { data, error } = await supabase
        .from('distributions')
        .upsert(
          {
            name: distro.name,
            description: distro.description,
            website_url: distro.website_url,
            logo_url: distro.logo_url,
            base_distro: distro.base_distro,
            desktop_environments: distro.desktop_environments,
          },
          { onConflict: 'name' }
        )
        .select();

      if (error) {
        console.log(`  [ERROR] ${distro.name}: ${error.message}`);
        errorCount++;
      } else {
        console.log(`  [OK] ${distro.name}`);
        successCount++;
      }
    } catch (err) {
      console.log(`  [ERROR] ${distro.name}: ${err}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Total: ${DISTRIBUTIONS.length}`);
}

seedDistributions().catch(console.error);

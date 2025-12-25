/**
 * Distribution Brand Colors
 * 
 * Official brand colors for Linux distributions used in logo rendering.
 * Colors are sourced from official brand guidelines and Simple Icons metadata.
 */

export const DISTRO_BRAND_COLORS: Record<string, string> = {
    // Major Distributions
    "Ubuntu": "var(--distro-ubuntu)",
    "Linux Mint": "var(--distro-mint)",
    "Fedora": "var(--distro-fedora)",
    "Debian": "var(--distro-debian)",
    "Arch Linux": "var(--distro-arch)",
    "Manjaro": "var(--distro-manjaro)",
    "Pop!_OS": "var(--distro-popos)",
    "openSUSE Tumbleweed": "var(--distro-opensuse)",
    "openSUSE Leap": "var(--distro-opensuse)",
    "Elementary OS": "var(--distro-elementary)",
    "Zorin OS": "var(--distro-zorin)",
    "MX Linux": "var(--distro-mx)",
    "EndeavourOS": "var(--distro-endeavour)",
    "Garuda Linux": "var(--distro-garuda)",
    "Solus": "var(--distro-solus)",
    "Kali Linux": "var(--distro-kali)",

    // Ubuntu Flavors
    "Kubuntu": "var(--distro-kubuntu)",
    "Xubuntu": "var(--distro-xubuntu)",
    "Lubuntu": "var(--distro-lubuntu)",
    "Ubuntu MATE": "var(--distro-mate)",
    "Ubuntu Studio": "var(--distro-ubuntu)", // Fallback to Ubuntu orange if specific not defined

    // Enterprise
    "CentOS Stream": "var(--distro-centos)",
    "Rocky Linux": "var(--distro-rocky)",
    "AlmaLinux": "var(--distro-alma)",

    // Advanced/Minimal
    "Void Linux": "var(--distro-void)",
    "Gentoo": "var(--distro-gentoo)",
    "Slackware": "var(--distro-slackware)",
    "NixOS": "var(--distro-nixos)",
    "Alpine Linux": "var(--distro-alpine)",

    // Security/Privacy
    "Tails": "var(--distro-tails)",
    "Qubes OS": "var(--distro-qubes)",
    "Parrot OS": "var(--distro-parrot)",

    // Lightweight
    "Peppermint OS": "var(--distro-mx)", // Fallback
    "antiX": "var(--distro-debian)", // Fallback
    "Bodhi Linux": "var(--distro-mint)", // Fallback
    "Deepin": "var(--distro-deepin)",
    "Puppy Linux": "var(--distro-debian)", // Fallback
    "SparkyLinux": "var(--distro-debian)", // Fallback

    // Specialized
    "KDE neon": "var(--distro-neon)",
    "LMDE": "var(--distro-mint)",
    "Mageia": "var(--distro-mageia)",
    "PCLinuxOS": "var(--distro-pclinux)", // Verify if exists, otherwise define
    "Artix Linux": "var(--distro-artix)",
    "Vanilla OS": "var(--distro-vanilla)",
    "Nobara": "var(--distro-nobara)",
    "Fedora Silverblue": "var(--distro-fedora)",
    "Clear Linux": "var(--distro-clear)",

    // ARM/Special Hardware
    "Raspberry Pi OS": "var(--distro-raspi)",
    "Armbian": "var(--distro-armbian)",
    "Asahi Linux": "var(--distro-ubuntu)", // Fallback or new var
};

/**
 * Get the brand color for a distribution
 * @param distroName - Name of the distribution
 * @returns Hex color code or fallback color
 */
export function getDistroBrandColor(distroName: string): string {
    return DISTRO_BRAND_COLORS[distroName] || "#6B7280"; // gray-500 fallback
}

/**
 * Simple Icons slug mapping for distributions
 * Maps distribution names to their Simple Icons identifiers
 */
export const DISTRO_SIMPLE_ICONS_SLUGS: Record<string, string> = {
    "Ubuntu": "ubuntu",
    "Linux Mint": "linuxmint",
    "Fedora": "fedora",
    "Debian": "debian",
    "Arch Linux": "archlinux",
    "Manjaro": "manjaro",
    "Pop!_OS": "popos",
    "openSUSE Tumbleweed": "opensuse",
    "openSUSE Leap": "opensuse",
    "Elementary OS": "elementary",
    "Zorin OS": "zorin",
    "MX Linux": "mxlinux",
    "EndeavourOS": "endeavouros",
    "Garuda Linux": "garudalinux",
    "Solus": "solus",
    "Kali Linux": "kalilinux",
    "Kubuntu": "kubuntu",
    "Xubuntu": "xubuntu",
    "Lubuntu": "lubuntu",
    "Ubuntu MATE": "ubuntumate",
    "CentOS Stream": "centos",
    "Rocky Linux": "rockylinux",
    "AlmaLinux": "almalinux",
    "Void Linux": "voidlinux",
    "Gentoo": "gentoo",
    "Slackware": "slackware",
    "NixOS": "nixos",
    "Alpine Linux": "alpinelinux",
    "Tails": "tails",
    "Qubes OS": "qubesos",
    "Parrot OS": "parrotsecurity",
    "KDE neon": "kde",
    "LMDE": "linuxmint",
    "Mageia": "mageia",
    "Artix Linux": "artixlinux",
    "Fedora Silverblue": "fedora",
    "Raspberry Pi OS": "raspberrypi",
    "Armbian": "armbian",
    "Deepin": "deepin",
    "Oracle Linux": "oracle",
};

/**
 * Local logo file mapping for "distro-icons" (high contrast/micro usage)
 */
export const DISTRO_LOGO_FILES: Record<string, string> = {
    "AlmaLinux": "alma.svg",
    "Alpine Linux": "alpine.svg",
    "antiX": "antix.svg",
    "Arch Linux": "arch.svg",
    "Armbian": "armbian.png",
    "Artix Linux": "artix.png",
    "Asahi Linux": "asahi.png",
    "Bodhi Linux": "bodhi.svg",
    "CentOS Stream": "centos.svg",
    "Clear Linux": "clear.svg",
    "Debian": "debian.png",
    "Deepin": "deepin.svg",
    "Elementary OS": "elementary.svg",
    "EndeavourOS": "endeavour.svg",
    "Fedora": "fedora.svg",
    "Garuda Linux": "garuda.svg",
    "Gentoo": "gentoo.png",
    "Kali Linux": "kali.svg",
    "Kubuntu": "kubuntu.svg",
    "Lubuntu": "lubuntu.svg",
    "Mageia": "mageia.svg",
    "Manjaro": "manjaro.svg",
    "Ubuntu MATE": "mate.svg",
    "Linux Mint": "mint.svg",
    "MX Linux": "mx.svg",
    "KDE neon": "neon.svg",
    "NixOS": "nixos.svg",
    "Nobara": "nobara.svg",
    "openSUSE Tumbleweed": "opensuse.png",
    "openSUSE Leap": "opensuse.png",
    "Parrot OS": "parrot.svg",
    "PCLinuxOS": "pclinux.svg",
    "Peppermint OS": "peppermint.svg",
    "Pop!_OS": "popos.svg",
    "Puppy Linux": "puppy.svg",
    "Qubes OS": "qubes.png",
    "Raspberry Pi OS": "raspi.png",
    "Rocky Linux": "rocky.svg",
    "Slackware": "slackware.svg",
    "Solus": "solus.svg",
    "SparkyLinux": "sparky.svg",
    "Ubuntu Studio": "studio.svg",
    "Tails": "tails.svg",
    "Ubuntu": "ubuntu.png",
    "Vanilla OS": "vanilla.svg",
    "Void Linux": "void.png",
    "Xubuntu": "xubuntu.svg",
    "Zorin OS": "zorin.svg",
};

/**
 * Get the local logo path for a distribution
 */
export function getDistroLogoPath(distroName: string): string | null {
    const filename = DISTRO_LOGO_FILES[distroName];
    return filename ? `/logos/${filename}` : null;
}

/**
 * Get the Simple Icons slug for a distribution
 * @param distroName - Name of the distribution
 * @returns Simple Icons slug or null if not available
 */
export function getDistroSimpleIconsSlug(distroName: string): string | null {
    return DISTRO_SIMPLE_ICONS_SLUGS[distroName] || null;
}


/**
 * Distribution Brand Colors
 * 
 * Official brand colors for Linux distributions used in logo rendering.
 * Colors are sourced from official brand guidelines and Simple Icons metadata.
 */

export const DISTRO_BRAND_COLORS: Record<string, string> = {
    // Major Distributions
    "Ubuntu": "#E95420",
    "Linux Mint": "#87CF3E",
    "Fedora": "#51A2DA",
    "Debian": "#D70A53",
    "Arch Linux": "#1793D1",
    "Manjaro": "#35BF5C",
    "Pop!_OS": "#48B9C7",
    "openSUSE Tumbleweed": "#73BA25",
    "openSUSE Leap": "#73BA25",
    "Elementary OS": "#64BAFF",
    "Zorin OS": "#0CC1F3",
    "MX Linux": "#000000",
    "EndeavourOS": "#7F7FFF",
    "Garuda Linux": "#2EBBD6",
    "Solus": "#5294E2",
    "Kali Linux": "#557C94",

    // Ubuntu Flavors
    "Kubuntu": "#0079C1",
    "Xubuntu": "#2283D0",
    "Lubuntu": "#0068C8",
    "Ubuntu MATE": "#87A752",
    "Ubuntu Studio": "#E95420",

    // Enterprise
    "CentOS Stream": "#262577",
    "Rocky Linux": "#10B981",
    "AlmaLinux": "#000000",

    // Advanced/Minimal
    "Void Linux": "#478061",
    "Gentoo": "#54487A",
    "Slackware": "#000000",
    "NixOS": "#5277C3",
    "Alpine Linux": "#0D597F",

    // Security/Privacy
    "Tails": "#56347C",
    "Qubes OS": "#3874D8",
    "Parrot OS": "#15D4F8",

    // Lightweight
    "Peppermint OS": "#000000",
    "antiX": "#FF0000",
    "Bodhi Linux": "#119900",
    "Deepin": "#2CA7F8",
    "Puppy Linux": "#C90000",
    "SparkyLinux": "#000000",

    // Specialized
    "KDE neon": "#1D99F3",
    "LMDE": "#87CF3E",
    "Mageia": "#2397D4",
    "PCLinuxOS": "#004B8D",
    "Artix Linux": "#10A0CC",
    "Vanilla OS": "#FFA14E",
    "Nobara": "#FF6347",
    "Fedora Silverblue": "#51A2DA",
    "Clear Linux": "#44D0F0",

    // ARM/Special Hardware
    "Raspberry Pi OS": "#C51A4A",
    "Armbian": "#FF6700",
    "Asahi Linux": "#E95420",
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
};

/**
 * Get the Simple Icons slug for a distribution
 * @param distroName - Name of the distribution
 * @returns Simple Icons slug or null if not available
 */
export function getDistroSimpleIconsSlug(distroName: string): string | null {
    return DISTRO_SIMPLE_ICONS_SLUGS[distroName] || null;
}

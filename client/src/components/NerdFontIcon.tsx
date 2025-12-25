
import { cn } from "@/lib/utils";

export interface NerdFontIconProps extends React.HTMLAttributes<HTMLSpanElement> {
    name: string;
    className?: string;
}

// Common Linux Distro PUA codes from Nerd Fonts (Symbols Nerd Font)
// Based on 3.0.0+ mappings.
const NERD_FONT_MAPPINGS: Record<string, string> = {
    // Distros
    "ubuntu": "\ue73a",
    "linux mint": "\uf30e", // Mint leaf often mapped here or similar
    "fedora": "\ue7d9",
    "debian": "\ue77d",
    "arch linux": "\ue732",
    "manjaro": "\uf312",
    "pop!_os": "\uf304", // Pop os specific or generic
    "opensuse": "\xe7ad", // Suse
    "elementary os": "\uf309",
    "zorin os": "\uf316", // Maybe generic
    "mx linux": "\uf30f", // Maybe generic
    "endeavouros": "\uf317",
    "garuda linux": "\uf318",
    "solus": "\uf319",
    "kali linux": "\uf327",
    "gentoo": "\ue7e6",
    "slackware": "\uf313",
    "alpine lipid": "\uf300",
    "alpine": "\uf300",
    "nixos": "\ue7f6", // snowflake-ish
    "android": "\ue70e",
    "apple": "\ue711",
    "linux": "\ue712",
    "windows": "\ue70f",
    "terminal": "\ue795",
    "docker": "\ue7b0",
    "git": "\ue702",
    "github": "\ue709",
    "code": "\ue796",
    "database": "\ue706",
    "server": "\ue7a2",
    "raspberry pi": "\ue722",
    "freebsd": "\uf30c",
    "archive": "\uea98",
    "history": "\uea82",
};

/**
 * Renders a Nerd Font glyph for a given name (usually distro or tech name).
 * Requires a Nerd Font to be available in the system font stack.
 */
export function NerdFontIcon({ name, className, ...props }: NerdFontIconProps) {
    const key = name.toLowerCase();
    // Try exact match, or 'linux' fallback
    const glyph = NERD_FONT_MAPPINGS[key] || NERD_FONT_MAPPINGS["linux"];

    return (
        <span
            className={cn("font-nerd text-lg", className)}
            role="img"
            aria-label={`${name} icon`}
            {...props}
        >
            {glyph}
        </span>
    );
}

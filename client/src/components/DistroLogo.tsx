/**
 * DistroLogo Component
 * 
 * Renders Linux distribution logos using inline SVGs from Simple Icons
 * with brand-accurate colors and size variants.
 * 
 * Features:
 * - Inline SVG rendering (zero external image requests)
 * - CSS-controlled theming with fill="currentColor"
 * - Size variants: micro (16-30px), standard (24-48px), large (64-96px)
 * - Brand-accurate fallback colors
 */

import { memo } from "react";
import * as simpleIcons from "simple-icons";
import { getDistroBrandColor, getDistroSimpleIconsSlug, getDistroLogoPath } from "@/lib/distro-brand-colors";
import { cn } from "@/lib/utils";

type ColorMode = "brand" | "current" | "custom";
type SizeVariant = "micro" | "standard" | "large";

interface DistroLogoProps {
    distroName: string;
    size?: number;
    variant?: SizeVariant;
    className?: string;
    colorMode?: ColorMode;
    customColor?: string;
    logoUrl?: string;
}

const SIZE_PRESETS: Record<SizeVariant, number> = {
    micro: 24,
    standard: 48,
    large: 80,
};

function DistroLogoComponent({
    distroName,
    size,
    variant = "standard",
    className,
    colorMode = "brand",
    customColor,
    logoUrl,
}: DistroLogoProps) {
    const finalSize = size || SIZE_PRESETS[variant];
    const slug = getDistroSimpleIconsSlug(distroName);

    // Micro variant: Use updated distro-icons (local assets) for high contrast/legibility in small sizes
    if (variant === "micro") {
        const logoPath = getDistroLogoPath(distroName);
        if (logoPath) {
            return (
                <img
                    src={logoPath}
                    alt={`${distroName} logo`}
                    className={cn("object-contain", className)}
                    style={{ width: finalSize, height: finalSize }}
                />
            );
        }
    }

    // Determine fill color based on mode
    let fillColor = "currentColor";
    if (colorMode === "brand") {
        fillColor = getDistroBrandColor(distroName);
    } else if (colorMode === "custom" && customColor) {
        fillColor = customColor;
    }

    // 1. Try Simple Icons SVG
    if (slug) {
        const iconKey = `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}` as keyof typeof simpleIcons;
        const icon = simpleIcons[iconKey];

        if (icon) {
            return (
                <div
                    className={cn("flex items-center justify-center flex-shrink-0", className)}
                    style={{ width: finalSize, height: finalSize, color: fillColor }}
                    role="img"
                    aria-label={`${distroName} logo`}
                >
                    <svg
                        viewBox="0 0 24 24"
                        width={finalSize}
                        height={finalSize}
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <title>{distroName}</title>
                        <path d={icon.path} />
                    </svg>
                </div>
            );
        }
    }

    // 2. Fallback to logoUrl from DB (e.g. Wikimedia SVGs or hosted images)
    if (logoUrl && !logoUrl.includes("placehold.co")) {
        return (
            <img
                src={logoUrl}
                alt={`${distroName} logo`}
                className={cn("object-contain", className)}
                style={{ width: finalSize, height: finalSize }}
            />
        );
    }

    // 3. Final Fallback: First letter
    const brandColor = getDistroBrandColor(distroName);
    const fontSize = Math.floor(finalSize * 0.5);

    return (
        <div
            className={cn(
                "flex items-center justify-center flex-shrink-0 rounded-md bg-muted",
                className
            )}
            style={{ width: finalSize, height: finalSize }}
            role="img"
            aria-label={`${distroName} logo`}
        >
            <span
                className="font-bold"
                style={{
                    fontSize: `${fontSize}px`,
                    color: colorMode === "brand" ? brandColor : fillColor,
                }}
            >
                {distroName.charAt(0).toUpperCase()}
            </span>
        </div>
    );
}

export const DistroLogo = memo(DistroLogoComponent);

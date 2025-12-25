/**
 * DistroLogo Component
 * 
 * Renders Linux distribution logos using inline SVGs from Simple Icons
 * with fallback to self-hosted images.
 */

import { memo } from "react";
import * as simpleIcons from "simple-icons";
import { getDistroBrandColor, getDistroSimpleIconsSlug } from "@/lib/distro-brand-colors";
import { cn } from "@/lib/utils";

interface DistroLogoProps {
    distroName: string;
    size?: number;
    className?: string;
    useBrandColor?: boolean;
}

function DistroLogoComponent({
    distroName,
    size = 48,
    className,
    useBrandColor = true
}: DistroLogoProps) {
    const slug = getDistroSimpleIconsSlug(distroName);

    // Try to get Simple Icon
    if (slug) {
        const iconKey = `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}` as keyof typeof simpleIcons;
        const icon = simpleIcons[iconKey];

        if (icon) {
            const brandColor = useBrandColor ? getDistroBrandColor(distroName) : "currentColor";

            return (
                <div
                    className={cn("flex items-center justify-center", className)}
                    style={{ width: size, height: size }}
                    role="img"
                    aria-label={`${distroName} logo`}
                >
                    <svg
                        viewBox="0 0 24 24"
                        width={size}
                        height={size}
                        fill={brandColor}
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <title>{distroName}</title>
                        <path d={icon.path} />
                    </svg>
                </div>
            );
        }
    }

    // Fallback to self-hosted logos
    const logoFileName = distroName
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/!/g, "")
        .replace(/os$/i, "");

    // Try common file extensions
    const possibleExtensions = ["svg", "png"];
    const logoSrc = `/logos/${logoFileName}.${possibleExtensions[0]}`;

    return (
        <div
            className={cn("flex items-center justify-center rounded-md overflow-hidden", className)}
            style={{ width: size, height: size }}
        >
            <img
                src={logoSrc}
                alt={`${distroName} logo`}
                className="w-full h-full object-contain"
                onError={(e) => {
                    // Try PNG if SVG fails
                    const img = e.currentTarget;
                    if (img.src.endsWith('.svg')) {
                        img.src = `/logos/${logoFileName}.png`;
                    } else {
                        // Final fallback: show first letter
                        const parent = img.parentElement;
                        if (parent) {
                            parent.innerHTML = `<span class="text-2xl font-bold text-muted-foreground">${distroName.charAt(0)}</span>`;
                        }
                    }
                }}
            />
        </div>
    );
}

export const DistroLogo = memo(DistroLogoComponent);

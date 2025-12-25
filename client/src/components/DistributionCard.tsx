import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { DistroLogo } from "@/components/DistroLogo";
import type { Distribution } from "@shared/schema";

interface DistributionCardProps {
  distribution: Distribution;
}

export function DistributionCard({ distribution }: DistributionCardProps) {
  return (
    <Link href={`/distro/${distribution.id}`}>
      <Card
        className="p-6 hover-elevate active-elevate-2 cursor-pointer transition-all duration-200 h-full flex flex-col"
        data-testid={`card-distribution-${distribution.id}`}
      >
        <div className="flex items-start gap-4">
          <DistroLogo
            distroName={distribution.name}
            logoUrl={distribution.logoUrl}
            size={48}
            className="w-12 h-12"
          />

          <div className="flex-1 min-w-0">
            <h3 className="font-serif font-bold text-lg text-foreground mb-1 truncate" data-testid={`text-distro-name-${distribution.id}`}>
              {distribution.name}
            </h3>
            {distribution.baseDistro && (
              <Badge variant="secondary" className="text-xs" data-testid={`badge-base-distro-${distribution.id}`}>
                <DistroLogo
                  distroName={distribution.baseDistro}
                  variant="micro"
                  className="w-3 h-3 mr-1"
                />
                {distribution.baseDistro}
              </Badge>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-4 line-clamp-2 flex-1" data-testid={`text-distro-description-${distribution.id}`}>
          {distribution.description}
        </p>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {distribution.desktopEnvironments.slice(0, 3).map((de) => (
            <Badge key={de} variant="outline" className="text-xs">
              {de}
            </Badge>
          ))}
          {distribution.desktopEnvironments.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{distribution.desktopEnvironments.length - 3}
            </Badge>
          )}
        </div>

        <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
          <ExternalLink className="w-3 h-3" />
          <span className="truncate">{distribution.websiteUrl.replace(/^https?:\/\//, '')}</span>
        </div>
      </Card>
    </Link>
  );
}

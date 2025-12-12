import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
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
          <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
            {distribution.logoUrl ? (
              <img 
                src={distribution.logoUrl} 
                alt={`${distribution.name} logo`}
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = `<span class="text-2xl font-bold text-muted-foreground">${distribution.name.charAt(0)}</span>`;
                }}
              />
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">
                {distribution.name.charAt(0)}
              </span>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-serif font-bold text-lg text-foreground mb-1 truncate" data-testid={`text-distro-name-${distribution.id}`}>
              {distribution.name}
            </h3>
            {distribution.baseDistro && (
              <Badge variant="secondary" className="text-xs" data-testid={`badge-base-distro-${distribution.id}`}>
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

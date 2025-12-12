import { DistributionCard } from "./DistributionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { ServerCrash, SearchX } from "lucide-react";
import type { Distribution } from "@shared/schema";

interface DistributionGridProps {
  distributions: Distribution[];
  isLoading: boolean;
  error: Error | null;
  searchQuery: string;
}

function DistributionCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="w-16 h-16 rounded-md" />
        <div className="flex-1">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16" />
      </div>
    </Card>
  );
}

export function DistributionGrid({ distributions, isLoading, error, searchQuery }: DistributionGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <DistributionCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <ServerCrash className="w-16 h-16 text-destructive mb-4" />
          <h3 className="font-serif font-bold text-xl text-foreground mb-2">
            Failed to load distributions
          </h3>
          <p className="text-muted-foreground max-w-md">
            We couldn't fetch the distribution list. Please check your connection and try again.
          </p>
        </div>
      </Card>
    );
  }

  if (distributions.length === 0) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <SearchX className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="font-serif font-bold text-xl text-foreground mb-2">
            No distributions found
          </h3>
          <p className="text-muted-foreground max-w-md">
            {searchQuery 
              ? `No distributions match "${searchQuery}". Try a different search term.`
              : "No distributions are available at the moment."
            }
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="grid-distributions">
      {distributions.map((distro) => (
        <DistributionCard key={distro.id} distribution={distro} />
      ))}
    </div>
  );
}

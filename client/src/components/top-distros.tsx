import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Download } from "lucide-react";
import type { TopDistro } from "@shared/schema";

export function TopDistros() {
  const { data: topDistros, isLoading } = useQuery<TopDistro[]>({
    queryKey: ["/api/top-distros"],
  });

  return (
    <Card data-testid="card-top-distros">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="w-5 h-5 text-primary" />
          Popular Downloads
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3" data-testid="skeleton-top-distros">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-6 h-6 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="w-12 h-4" />
              </div>
            ))}
          </div>
        ) : topDistros && topDistros.length > 0 ? (
          <ol className="space-y-2" data-testid="list-top-distros">
            {topDistros.map((distro, index) => (
              <li
                key={distro.distroId}
                className="flex items-center gap-3 py-1"
                data-testid={`item-top-distro-${distro.distroId}`}
              >
                <span
                  className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground"
                  data-testid={`text-rank-${distro.distroId}`}
                >
                  {index + 1}
                </span>
                <span
                  className="flex-1 text-sm font-medium truncate"
                  data-testid={`text-distro-name-${distro.distroId}`}
                >
                  {distro.name}
                </span>
                <span
                  className="text-xs text-muted-foreground flex items-center gap-1"
                  data-testid={`text-click-count-${distro.distroId}`}
                >
                  <Download className="w-3 h-3" />
                  {distro.clickCount}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="text-no-downloads">
            No download data yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}

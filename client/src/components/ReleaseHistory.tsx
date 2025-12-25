import { useMemo } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { NerdFontIcon } from "@/components/NerdFontIcon";
import type { Release } from "@shared/schema";

interface ReleaseHistoryProps {
  releases: Release[];
  distroName: string;
}

export function ReleaseHistory({ releases, distroName }: ReleaseHistoryProps) {
  // Sort releases by date
  const sortedReleases = useMemo(() =>
    [...releases].sort((a, b) =>
      new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
    ), [releases]);

  // Prepare chart data - map versions to numeric Y values
  const chartData = useMemo(() =>
    sortedReleases.map((release, index) => ({
      date: new Date(release.releaseDate).getTime(),
      dateStr: format(new Date(release.releaseDate), "MMM yyyy"),
      y: index + 1,
      version: release.versionNumber,
      isLts: release.isLts,
    })), [sortedReleases]);

  // Check if potentially discontinued (last release > 2 years ago)
  const latestRelease = sortedReleases[sortedReleases.length - 1];
  const daysSinceLastRelease = latestRelease ?
    differenceInDays(new Date(), new Date(latestRelease.releaseDate)) : 0;
  const isPotentiallyDiscontinued = daysSinceLastRelease > 730; // More than 2 years (365 * 2)

  if (releases.length === 0) return null;

  return (
    <div className="space-y-4">
      {isPotentiallyDiscontinued && (
        <Badge variant="destructive" className="text-sm py-1.5 px-3" data-testid="badge-discontinued-warning">
          <AlertTriangle className="w-4 h-4 mr-2" />
          Warning: Potentially Discontinued - Last release over 2 years ago
        </Badge>
      )}

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <NerdFontIcon name="history" className="text-primary" />
          <h3 className="font-semibold text-lg">Release History</h3>
        </div>

        <div className="h-64" data-testid="chart-release-history">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 60 }}>
              <XAxis
                dataKey="date"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value) => format(new Date(value), "MMM yyyy")}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                dataKey="y"
                type="number"
                domain={[0, 'dataMax + 1']}
                tickFormatter={(value) => {
                  const item = chartData.find(d => d.y === value);
                  return item?.version || '';
                }}
                tick={{ fontSize: 11 }}
                width={50}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <Card className="p-3 shadow-lg">
                      <p className="font-semibold">{distroName} v{data.version}</p>
                      <p className="text-sm text-muted-foreground">{data.dateStr}</p>
                      {data.isLts && (
                        <Badge variant="default" className="mt-1 bg-green-600 text-xs">LTS</Badge>
                      )}
                    </Card>
                  );
                }}
              />
              <Scatter data={chartData} fill="hsl(var(--primary))">
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.isLts ? "hsl(142 76% 36%)" : "hsl(var(--primary))"}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>Standard Release</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-600" />
            <span>LTS Release</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

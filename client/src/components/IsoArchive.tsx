import { useMemo } from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Archive, HardDrive } from "lucide-react";
import type { ReleaseWithDownloads } from "@shared/schema";

interface IsoArchiveProps {
  releases: ReleaseWithDownloads[];
  distroId: number;
}

function formatFileSize(sizeStr: string | null): string {
  if (!sizeStr) return "Unknown";
  return sizeStr;
}

export function IsoArchive({ releases, distroId }: IsoArchiveProps) {
  // Get releases with valid downloads, sorted by date (newest first)
  const releasesWithDownloads = useMemo(() => {
    return releases
      .filter(r => r.downloads && r.downloads.some(d => d.isoUrl && !d.isoUrl.includes('placeholder')))
      .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
  }, [releases]);

  // Get 2nd and 3rd most recent (skip the first which is "latest")
  const previousVersions = releasesWithDownloads.slice(1, 3);

  if (previousVersions.length === 0) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Archive className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Previous Versions</h3>
      </div>

      <div className="space-y-4">
        {previousVersions.map((release) => {
          const validDownloads = release.downloads.filter(
            d => d.isoUrl && !d.isoUrl.includes('placeholder')
          );
          const primaryDownload = validDownloads[0];

          return (
            <div 
              key={release.id} 
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/50 rounded-md"
              data-testid={`archive-release-${release.id}`}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono font-semibold" data-testid={`text-archive-version-${release.id}`}>
                  v{release.versionNumber}
                </span>
                {release.isLts && (
                  <Badge variant="default" className="bg-green-600 text-xs">LTS</Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {format(new Date(release.releaseDate), "MMM d, yyyy")}
                </span>
                {primaryDownload?.downloadSize && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />
                    {formatFileSize(primaryDownload.downloadSize)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {validDownloads.slice(0, 2).map((download) => (
                  <Button
                    key={download.id}
                    size="sm"
                    variant="outline"
                    asChild
                    data-testid={`button-archive-download-${download.id}`}
                  >
                    <a href={download.isoUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-1" />
                      {download.architecture}
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

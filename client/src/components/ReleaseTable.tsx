import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Download, 
  Link2, 
  Shield, 
  ChevronDown, 
  ChevronUp,
  HardDrive,
  Cpu
} from "lucide-react";
import type { ReleaseWithDownloads, Download as DownloadType } from "@shared/schema";

interface ReleaseTableProps {
  releases: ReleaseWithDownloads[];
}

function DownloadSection({ downloads }: { downloads: DownloadType[] }) {
  const [selectedArch, setSelectedArch] = useState<string>("amd64");
  const [showChecksum, setShowChecksum] = useState(false);

  const architectures = [...new Set(downloads.map(d => d.architecture))];
  const currentDownload = downloads.find(d => d.architecture === selectedArch) || downloads[0];

  if (!currentDownload) {
    return <p className="text-sm text-muted-foreground">No downloads available</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground mr-2">Architecture:</span>
        {architectures.map((arch) => (
          <Button
            key={arch}
            variant={selectedArch === arch ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedArch(arch)}
            className="toggle-elevate"
            data-testid={`button-arch-${arch}`}
          >
            <Cpu className="w-3 h-3 mr-1.5" />
            {arch}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Button 
          asChild
          data-testid={`button-download-iso-${currentDownload.id}`}
        >
          <a href={currentDownload.isoUrl} target="_blank" rel="noopener noreferrer">
            <Download className="w-4 h-4 mr-2" />
            Download ISO
            {currentDownload.downloadSize && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {currentDownload.downloadSize}
              </Badge>
            )}
          </a>
        </Button>

        {currentDownload.torrentUrl && (
          <Button 
            variant="secondary" 
            asChild
            data-testid={`button-download-torrent-${currentDownload.id}`}
          >
            <a href={currentDownload.torrentUrl} target="_blank" rel="noopener noreferrer">
              <Link2 className="w-4 h-4 mr-2" />
              Torrent
            </a>
          </Button>
        )}
      </div>

      {currentDownload.checksum && (
        <div className="space-y-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowChecksum(!showChecksum)}
            className="text-muted-foreground -ml-2"
            data-testid={`button-toggle-checksum-${currentDownload.id}`}
          >
            <Shield className="w-4 h-4 mr-2" />
            {showChecksum ? "Hide" : "Show"} Checksum
            {showChecksum ? (
              <ChevronUp className="w-4 h-4 ml-1" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-1" />
            )}
          </Button>
          
          {showChecksum && (
            <div className="bg-muted rounded-md p-3">
              <code className="text-xs font-mono text-foreground break-all" data-testid={`text-checksum-${currentDownload.id}`}>
                {currentDownload.checksum}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ReleaseTable({ releases }: ReleaseTableProps) {
  const [expandedRelease, setExpandedRelease] = useState<number | null>(
    releases.length > 0 ? releases[0].id : null
  );

  if (releases.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">No releases available</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {releases.map((release) => (
        <Card 
          key={release.id} 
          className="overflow-hidden"
          data-testid={`card-release-${release.id}`}
        >
          <button
            onClick={() => setExpandedRelease(expandedRelease === release.id ? null : release.id)}
            className="w-full p-4 flex items-center justify-between gap-4 text-left hover-elevate"
            data-testid={`button-expand-release-${release.id}`}
          >
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-primary" />
                <span className="font-mono font-medium text-foreground" data-testid={`text-version-${release.id}`}>
                  {release.versionNumber}
                </span>
              </div>
              
              {release.isLts && (
                <Badge className="bg-secondary text-secondary-foreground" data-testid={`badge-lts-${release.id}`}>
                  LTS
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:block" data-testid={`text-release-date-${release.id}`}>
                {format(new Date(release.releaseDate), "MMM d, yyyy")}
              </span>
              {expandedRelease === release.id ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </button>

          {expandedRelease === release.id && (
            <div className="border-t border-border p-4 bg-background/50">
              <div className="sm:hidden mb-4">
                <span className="text-sm text-muted-foreground">
                  Released: {format(new Date(release.releaseDate), "MMM d, yyyy")}
                </span>
              </div>
              <DownloadSection downloads={release.downloads} />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

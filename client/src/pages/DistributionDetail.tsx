import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { format } from "date-fns";
import { Header } from "@/components/Header";
import { ReleaseTable } from "@/components/ReleaseTable";
import { ReleaseHistory } from "@/components/ReleaseHistory";
import { IsoArchive } from "@/components/IsoArchive";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  ExternalLink, 
  Globe, 
  Monitor,
  Layers,
  ServerCrash,
  Download,
  HardDrive,
  Calendar
} from "lucide-react";
import type { DistributionWithReleases, ReleaseWithDownloads } from "@shared/schema";

function DetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-start gap-6">
        <Skeleton className="w-24 h-24 rounded-lg" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full max-w-lg" />
          <Skeleton className="h-4 w-3/4 max-w-md" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </div>
  );
}

interface DownloadLatestSectionProps {
  releases: ReleaseWithDownloads[];
}

function DownloadLatestSection({ releases }: DownloadLatestSectionProps) {
  const latestRelease = useMemo(() => {
    const releasesWithDownloads = releases
      .filter(r => r.downloads && r.downloads.some(d => d.isoUrl && !d.isoUrl.includes('placeholder')))
      .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
    return releasesWithDownloads[0] || null;
  }, [releases]);

  if (!latestRelease) return null;

  const validDownloads = latestRelease.downloads.filter(
    d => d.isoUrl && !d.isoUrl.includes('placeholder')
  );
  const primaryDownload = validDownloads[0];

  return (
    <section className="space-y-4">
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-serif font-bold text-2xl text-foreground">
                Download Latest
              </h2>
              <span className="font-mono text-xl font-semibold text-primary" data-testid="text-latest-version">
                v{latestRelease.versionNumber}
              </span>
              {latestRelease.isLts && (
                <Badge variant="default" className="bg-green-600" data-testid="badge-latest-lts">
                  Long Term Support
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Released {format(new Date(latestRelease.releaseDate), "MMMM d, yyyy")}
              </span>
              {primaryDownload?.downloadSize && (
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4" />
                  {primaryDownload.downloadSize}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {validDownloads.map((download) => (
              <Button
                key={download.id}
                size="lg"
                asChild
                data-testid={`button-download-latest-${download.architecture}`}
              >
                <a href={download.isoUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-5 h-5 mr-2" />
                  Download {download.architecture}
                </a>
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <IsoArchive releases={releases} distroId={0} />
    </section>
  );
}

export default function DistributionDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: distribution, isLoading, error } = useQuery<DistributionWithReleases>({
    queryKey: ["/api/distributions", id],
    enabled: id > 0,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to all distributions
          </Button>
        </Link>

        {isLoading && <DetailSkeleton />}

        {error && (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <ServerCrash className="w-16 h-16 text-destructive mb-4" />
              <h3 className="font-serif font-bold text-xl text-foreground mb-2">
                Failed to load distribution
              </h3>
              <p className="text-muted-foreground max-w-md mb-4">
                We couldn't fetch the distribution details. Please try again.
              </p>
              <Link href="/">
                <Button>Return to Home</Button>
              </Link>
            </div>
          </Card>
        )}

        {distribution && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                {distribution.logoUrl ? (
                  <img 
                    src={distribution.logoUrl} 
                    alt={`${distribution.name} logo`}
                    className="w-20 h-20 object-contain"
                    data-testid="img-distro-logo"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `<span class="text-4xl font-bold text-muted-foreground">${distribution.name.charAt(0)}</span>`;
                    }}
                  />
                ) : (
                  <span className="text-4xl font-bold text-muted-foreground">
                    {distribution.name.charAt(0)}
                  </span>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="font-serif font-bold text-3xl text-foreground" data-testid="text-distro-name">
                    {distribution.name}
                  </h1>
                  {distribution.baseDistro && (
                    <Badge variant="secondary" data-testid="badge-base-distro">
                      Based on {distribution.baseDistro}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mb-4 max-w-2xl" data-testid="text-distro-description">
                  {distribution.description}
                </p>
                <Button variant="outline" asChild data-testid="link-website">
                  <a href={distribution.websiteUrl} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-4 h-4 mr-2" />
                    Visit Official Website
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Layers className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Base Distribution</span>
                </div>
                <p className="font-medium text-foreground" data-testid="text-base-distro">
                  {distribution.baseDistro || "Independent"}
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Monitor className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Desktop Environments</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {distribution.desktopEnvironments.map((de) => (
                    <Badge key={de} variant="outline" className="text-xs" data-testid={`badge-de-${de}`}>
                      {de}
                    </Badge>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Official Website</span>
                </div>
                <a 
                  href={distribution.websiteUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline truncate block"
                  data-testid="link-website-short"
                >
                  {distribution.websiteUrl.replace(/^https?:\/\//, '')}
                </a>
              </Card>
            </div>

            {/* Release History Chart */}
            {distribution.releases.length > 0 && (
              <ReleaseHistory 
                releases={distribution.releases} 
                distroName={distribution.name}
              />
            )}

            {/* TIER 1: Download Latest Section */}
            <DownloadLatestSection releases={distribution.releases} />
          </div>
        )}
      </main>
    </div>
  );
}

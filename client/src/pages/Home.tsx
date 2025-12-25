
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DistroLogo } from "@/components/DistroLogo";
import { Header } from "@/components/Header";
import { FilterSidebar } from "@/components/FilterSidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  ExternalLink,
  Magnet,
  HardDrive,
  Shield,
  Usb,
  Plus,
  Check,
  TrendingDown,
  Filter,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import type { DistributionWithLatestRelease, DistributionWithReleases } from "@shared/schema";
import { useIsoSelection } from "@/contexts/IsoSelectionContext";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBaseDistros, setSelectedBaseDistros] = useState<string[]>([]);
  const [selectedDEs, setSelectedDEs] = useState<string[]>([]);
  const [selectedArchitectures, setSelectedArchitectures] = useState<string[]>([]);
  const [selectedDistroId, setSelectedDistroId] = useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const { toggleSelection, isSelected, selectedCount } = useIsoSelection();

  const { data: distributions, isLoading } = useQuery<DistributionWithLatestRelease[]>({
    queryKey: ["/api/distributions"],
  });

  const { data: selectedDistroDetails, isLoading: isLoadingDetails } = useQuery<DistributionWithReleases>({
    queryKey: ["/api/distributions", selectedDistroId],
    enabled: selectedDistroId !== null,
  });

  const trackDownloadMutation = useMutation({
    mutationFn: async (distroId: number) => {
      await apiRequest("POST", `/api/download-clicks/${distroId}`);
    },
  });

  const filteredDistributions = useMemo(() => {
    if (!distributions) return [];

    return distributions.filter((distro) => {
      // Text Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = distro.name.toLowerCase().includes(query);
        const matchesDesc = distro.description.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      // Faceted Filters
      if (selectedBaseDistros.length > 0 && distro.baseDistro && !selectedBaseDistros.includes(distro.baseDistro)) {
        return false;
      }
      if (selectedDEs.length > 0) {
        const hasMatchingDE = distro.desktopEnvironments.some((de) => selectedDEs.includes(de));
        if (!hasMatchingDE) return false;
      }
      if (selectedArchitectures.length > 0) {
        const hasMatchingArch = distro.availableArchitectures.some((arch) => selectedArchitectures.includes(arch));
        if (!hasMatchingArch) return false;
      }
      return true;
    });
  }, [distributions, searchQuery, selectedBaseDistros, selectedDEs, selectedArchitectures]);

  const formatFileSize = (size: string | null) => {
    if (!size) return "Unknown size";
    return size;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside
            className={`
              flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden
              ${isFilterOpen ? 'lg:w-64 opacity-100 mb-6 lg:mb-0' : 'lg:w-0 opacity-0 h-0 lg:h-auto mb-0'}
            `}
          >
            <div className="w-full lg:w-64 sticky top-24 space-y-6">
              <FilterSidebar
                selectedBaseDistros={selectedBaseDistros}
                setSelectedBaseDistros={setSelectedBaseDistros}
                selectedDEs={selectedDEs}
                setSelectedDEs={setSelectedDEs}
                selectedArchitectures={selectedArchitectures}
                setSelectedArchitectures={setSelectedArchitectures}
              />
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="gap-2 text-muted-foreground hover:text-foreground"
                title={isFilterOpen ? "Collapse Filters" : "Expand Filters"}
              >
                {isFilterOpen ? <PanelLeftClose className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                <span className="text-sm font-medium">
                  {isFilterOpen ? "Hide Filters" : "Show Filters"}
                </span>
              </Button>
            </div>
            {/* Bento Hero Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="md:col-span-2 rounded-xl bg-card border border-border p-8 flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 transition-transform duration-500 group-hover:scale-110" />

                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4 relative z-10">
                  Find Your Perfect <br />
                  <span className="text-primary">Linux Distro</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-lg mb-8 relative z-10">
                  Explore our curated database of distributions. Fast, secure, and tailored to your needs.
                </p>
                <div className="flex bg-muted/50 rounded-lg p-1 w-fit relative z-10">
                  <Button variant="default" size="lg" className="shadow-lg hover:shadow-primary/25 transition-all">
                    Start Exploring
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-xl bg-card border border-border p-6 h-full flex flex-col justify-between hover:border-primary/50 transition-colors cursor-pointer group">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">Trending Now</h3>
                      <TrendingDown className="w-5 h-5 text-primary group-hover:text-primary/80" />
                    </div>
                    <p className="text-muted-foreground text-sm">Most viewed this week</p>
                  </div>
                  <div className="space-y-3 mt-4">
                    {distributions?.slice(0, 3).map(d => (
                      <div key={d.id} className="flex items-center gap-3">
                        <Badge variant="secondary" className="w-6 h-6 flex items-center justify-center p-0 rounded-full text-xs">#{d.id}</Badge>
                        <span className="font-medium">{d.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="p-6">
                    <div className="flex items-start gap-4">
                      <Skeleton className="w-16 h-16 rounded-md" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full mt-4" />
                    <Skeleton className="h-4 w-2/3 mt-2" />
                  </Card>
                ))}
              </div>
            ) : filteredDistributions.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-dashed border-border bg-card/50">
                <p className="text-muted-foreground">No distributions match your filters.</p>
                <Button
                  variant="ghost"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedBaseDistros([]);
                    setSelectedDEs([]);
                    setSelectedArchitectures([]);
                  }}
                  data-testid="button-clear-filters-empty"
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredDistributions.map((distro) => (
                  <div
                    key={distro.id}
                    className="bento-card group hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-pointer relative overflow-hidden"
                    onClick={() => setSelectedDistroId(distro.id)}
                    data-testid={`card-distro-${distro.id}`}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="w-5 h-5 text-muted-foreground" />
                    </div>

                    <div className="flex items-start gap-4 mb-4">
                      <DistroLogo
                        distroName={distro.name}
                        logoUrl={distro.logoUrl}
                        size={56}
                        className="w-14 h-14"
                      />

                      <div className="flex-1 min-w-0 pt-1">
                        <h3
                          className="font-bold text-xl text-foreground mb-1 truncate tracking-tight"
                          data-testid={`text-distro-name-${distro.id}`}
                        >
                          {distro.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          {distro.baseDistro && (
                            <Badge variant="secondary" className="text-xs font-mono" data-testid={`badge-base-${distro.id}`}>
                              {distro.baseDistro}
                            </Badge>
                          )}
                          {distro.latestVersion && (
                            <Badge
                              variant={distro.isLatestLts ? "default" : "outline"}
                              className={distro.isLatestLts ? "text-xs bg-green-600/90 hover:bg-green-600" : "text-xs"}
                              data-testid={`badge-version-${distro.id}`}
                            >
                              v{distro.latestVersion}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <p
                      className="text-sm text-muted-foreground mt-2 line-clamp-2 flex-1 leading-relaxed"
                      data-testid={`text-distro-desc-${distro.id}`}
                    >
                      {distro.description}
                    </p>

                    <div className="mt-6 flex items-center gap-2 flex-wrap">
                      {distro.desktopEnvironments.slice(0, 3).map((de) => (
                        <div key={de} className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                          {de}
                        </div>
                      ))}
                      {distro.desktopEnvironments.length > 3 && (
                        <div className="text-xs text-muted-foreground pl-1">
                          +{distro.desktopEnvironments.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      <Dialog open={selectedDistroId !== null} onOpenChange={(open) => !open && setSelectedDistroId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-download">
          {isLoadingDetails ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : selectedDistroDetails ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <DistroLogo
                    distroName={selectedDistroDetails.name}
                    logoUrl={selectedDistroDetails.logoUrl}
                    size={40}
                    className="w-10 h-10"
                  />
                  <div>
                    <DialogTitle data-testid="dialog-title">{selectedDistroDetails.name}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Link href={`/distro/${selectedDistroDetails.id}`}>
                        <a className="text-sm text-primary hover:underline flex items-center gap-1">
                          View Full Details <ExternalLink className="w-3 h-3" />
                        </a>
                      </Link>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {selectedDistroDetails.releases && selectedDistroDetails.releases.length > 0 ? (
                  selectedDistroDetails.releases
                    .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())
                    .slice(0, 3)
                    .map((release) => (
                      <div key={release.id} className="border rounded-md p-4 space-y-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold font-mono" data-testid={`text-version-${release.id}`}>
                              v{release.versionNumber}
                            </span>
                            {release.isLts && (
                              <Badge variant="default" className="bg-green-600" data-testid={`badge-lts-${release.id}`}>
                                LTS
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(release.releaseDate).toLocaleDateString()}
                          </span>
                        </div>

                        {release.downloads && release.downloads.length > 0 ? (
                          <div className="space-y-3">
                            {release.downloads
                              .filter((dl) =>
                                selectedArchitectures.length === 0 || selectedArchitectures.includes(dl.architecture)
                              )
                              .map((download) => (
                                <div
                                  key={download.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/50 rounded-md"
                                >
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <Badge variant="outline" className="font-mono text-xs">
                                      {download.architecture}
                                    </Badge>
                                    {download.downloadSize && (
                                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                                        <HardDrive className="w-3 h-3" />
                                        {formatFileSize(download.downloadSize)}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Button
                                      size="sm"
                                      asChild
                                      data-testid={`button-download-iso-${download.id}`}
                                      onClick={() => {
                                        if (selectedDistroId) {
                                          trackDownloadMutation.mutate(selectedDistroId);
                                        }
                                      }}
                                    >
                                      <a href={download.isoUrl} target="_blank" rel="noopener noreferrer">
                                        <Download className="w-4 h-4 mr-1" />
                                        ISO
                                      </a>
                                    </Button>
                                    {download.torrentUrl && (
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        asChild
                                        data-testid={`button-download-torrent-${download.id}`}
                                      >
                                        <a href={download.torrentUrl} target="_blank" rel="noopener noreferrer">
                                          <Magnet className="w-4 h-4 mr-1" />
                                          Torrent
                                        </a>
                                      </Button>
                                    )}
                                    {download.isoUrl && !download.isoUrl.includes('placeholder') && (
                                      <Button
                                        size="sm"
                                        variant={isSelected(download.id) ? "default" : "outline"}
                                        className={isSelected(download.id) ? "bg-green-600 dark:bg-green-600" : ""}
                                        onClick={() => toggleSelection({
                                          downloadId: download.id,
                                          distroName: selectedDistroDetails.name,
                                          version: release.versionNumber,
                                          architecture: download.architecture,
                                          isoUrl: download.isoUrl,
                                          downloadSize: download.downloadSize,
                                        })}
                                        data-testid={`button-add-ventoy-${download.id}`}
                                      >
                                        {isSelected(download.id) ? (
                                          <>
                                            <Check className="w-4 h-4 mr-1" />
                                            Added
                                          </>
                                        ) : (
                                          <>
                                            <Plus className="w-4 h-4 mr-1" />
                                            Ventoy
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}

                            {release.downloads.some((dl) => dl.checksum) && (
                              <details className="text-sm">
                                <summary className="cursor-pointer text-muted-foreground flex items-center gap-1">
                                  <Shield className="w-3 h-3" />
                                  View checksums
                                </summary>
                                <div className="mt-2 space-y-1 pl-4">
                                  {release.downloads.map((dl) =>
                                    dl.checksum ? (
                                      <div key={`checksum-${dl.id}`} className="font-mono text-xs text-muted-foreground break-all">
                                        <span className="font-semibold">{dl.architecture}:</span> {dl.checksum}
                                      </div>
                                    ) : null
                                  )}
                                </div>
                              </details>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-3 py-4">
                            <p className="text-sm text-muted-foreground text-center">
                              No direct download links available for this release.
                            </p>
                            <Button
                              variant="default"
                              size="sm"
                              asChild
                              data-testid={`button-check-website-${release.id}`}
                            >
                              <a href={selectedDistroDetails.websiteUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Check Website for Downloads
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                ) : (
                  <p className="text-muted-foreground">No releases available.</p>
                )}

                <div className="flex items-center gap-2 pt-4 border-t">
                  <Button variant="outline" size="sm" asChild data-testid="button-visit-website">
                    <a href={selectedDistroDetails.websiteUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Visit Website
                    </a>
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {selectedCount > 0 && (
        <Link href="/ventoy">
          <div
            className="fixed bottom-6 right-6 z-50"
            data-testid="fab-ventoy"
          >
            <Button className="bg-green-600 shadow-lg gap-2">
              <Usb className="w-4 h-4" />
              {selectedCount} ISO{selectedCount > 1 ? "s" : ""} Selected
            </Button>
          </div>
        </Link>
      )}
    </div>
  );
}

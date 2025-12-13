import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Download, ExternalLink, Magnet, Filter, X, HardDrive, Shield } from "lucide-react";
import type { DistributionWithLatestRelease, DistributionWithReleases, ReleaseWithDownloads } from "@shared/schema";

const BASE_DISTROS = ["Debian", "Arch", "Ubuntu", "Independent", "Fedora", "RHEL"];
const DESKTOP_ENVIRONMENTS = ["GNOME", "KDE Plasma", "Xfce", "Cinnamon", "MATE", "LXQt", "Budgie"];
const ARCHITECTURES = ["amd64", "arm64"];

export default function IsoBrowser() {
  const [selectedBaseDistros, setSelectedBaseDistros] = useState<string[]>([]);
  const [selectedDEs, setSelectedDEs] = useState<string[]>([]);
  const [selectedArchitectures, setSelectedArchitectures] = useState<string[]>([]);
  const [selectedDistroId, setSelectedDistroId] = useState<number | null>(null);

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
  }, [distributions, selectedBaseDistros, selectedDEs, selectedArchitectures]);

  const toggleFilter = (value: string, selected: string[], setSelected: (val: string[]) => void) => {
    if (selected.includes(value)) {
      setSelected(selected.filter((v) => v !== value));
    } else {
      setSelected([...selected, value]);
    }
  };

  const clearFilters = () => {
    setSelectedBaseDistros([]);
    setSelectedDEs([]);
    setSelectedArchitectures([]);
  };

  const hasActiveFilters = selectedBaseDistros.length > 0 || selectedDEs.length > 0 || selectedArchitectures.length > 0;

  const getLatestRelease = (distro: DistributionWithReleases): ReleaseWithDownloads | null => {
    if (!distro.releases || distro.releases.length === 0) return null;
    return distro.releases.sort((a, b) => 
      new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
    )[0];
  };

  const formatFileSize = (size: string | null) => {
    if (!size) return "Unknown size";
    return size;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-xl font-bold">Distro Finder</h1>
            <span className="text-muted-foreground text-sm">
              {filteredDistributions.length} distributions
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-lg">Filters</h2>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    data-testid="button-clear-filters"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-3">Base Distribution</h3>
                  <div className="space-y-2">
                    {BASE_DISTROS.map((base) => (
                      <div key={base} className="flex items-center gap-2">
                        <Checkbox
                          id={`base-${base}`}
                          checked={selectedBaseDistros.includes(base)}
                          onCheckedChange={() => toggleFilter(base, selectedBaseDistros, setSelectedBaseDistros)}
                          data-testid={`checkbox-base-${base.toLowerCase()}`}
                        />
                        <Label
                          htmlFor={`base-${base}`}
                          className="text-sm cursor-pointer"
                        >
                          {base}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-3">Desktop Environment</h3>
                  <div className="space-y-2">
                    {DESKTOP_ENVIRONMENTS.map((de) => (
                      <div key={de} className="flex items-center gap-2">
                        <Checkbox
                          id={`de-${de}`}
                          checked={selectedDEs.includes(de)}
                          onCheckedChange={() => toggleFilter(de, selectedDEs, setSelectedDEs)}
                          data-testid={`checkbox-de-${de.toLowerCase().replace(/\s+/g, "-")}`}
                        />
                        <Label
                          htmlFor={`de-${de}`}
                          className="text-sm cursor-pointer"
                        >
                          {de}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-3">Architecture</h3>
                  <div className="space-y-2">
                    {ARCHITECTURES.map((arch) => (
                      <div key={arch} className="flex items-center gap-2">
                        <Checkbox
                          id={`arch-${arch}`}
                          checked={selectedArchitectures.includes(arch)}
                          onCheckedChange={() => toggleFilter(arch, selectedArchitectures, setSelectedArchitectures)}
                          data-testid={`checkbox-arch-${arch}`}
                        />
                        <Label
                          htmlFor={`arch-${arch}`}
                          className="text-sm cursor-pointer"
                        >
                          {arch}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main className="flex-1">
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
              <div className="text-center py-12">
                <p className="text-muted-foreground">No distributions match your filters.</p>
                <Button
                  variant="ghost"
                  className="mt-4"
                  onClick={clearFilters}
                  data-testid="button-clear-filters-empty"
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredDistributions.map((distro) => (
                  <Card
                    key={distro.id}
                    className="p-6 hover-elevate cursor-pointer transition-all duration-200 h-full flex flex-col"
                    onClick={() => setSelectedDistroId(distro.id)}
                    data-testid={`card-distro-${distro.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {distro.logoUrl ? (
                          <img
                            src={distro.logoUrl}
                            alt={`${distro.name} logo`}
                            className="w-12 h-12 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              e.currentTarget.parentElement!.innerHTML = `<span class="text-2xl font-bold text-muted-foreground">${distro.name.charAt(0)}</span>`;
                            }}
                          />
                        ) : (
                          <span className="text-2xl font-bold text-muted-foreground">
                            {distro.name.charAt(0)}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-bold text-lg text-foreground mb-1 truncate"
                          data-testid={`text-distro-name-${distro.id}`}
                        >
                          {distro.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          {distro.baseDistro && (
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-base-${distro.id}`}>
                              {distro.baseDistro}
                            </Badge>
                          )}
                          {distro.latestVersion && (
                            <Badge 
                              variant={distro.isLatestLts ? "default" : "outline"} 
                              className={distro.isLatestLts ? "text-xs bg-green-600" : "text-xs"}
                              data-testid={`badge-version-${distro.id}`}
                            >
                              v{distro.latestVersion}{distro.isLatestLts ? " LTS" : ""}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <p
                      className="text-sm text-muted-foreground mt-4 line-clamp-2 flex-1"
                      data-testid={`text-distro-desc-${distro.id}`}
                    >
                      {distro.description}
                    </p>

                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                      {distro.desktopEnvironments.slice(0, 2).map((de) => (
                        <Badge key={de} variant="outline" className="text-xs">
                          {de}
                        </Badge>
                      ))}
                      {distro.desktopEnvironments.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{distro.desktopEnvironments.length - 2}
                        </Badge>
                      )}
                    </div>
                  </Card>
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
                  <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {selectedDistroDetails.logoUrl ? (
                      <img
                        src={selectedDistroDetails.logoUrl}
                        alt={`${selectedDistroDetails.name} logo`}
                        className="w-10 h-10 object-contain"
                      />
                    ) : (
                      <span className="text-xl font-bold text-muted-foreground">
                        {selectedDistroDetails.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <DialogTitle data-testid="dialog-title">{selectedDistroDetails.name}</DialogTitle>
                    <DialogDescription>{selectedDistroDetails.description}</DialogDescription>
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
                          <p className="text-sm text-muted-foreground">No downloads available for this release.</p>
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
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Terminal, AlertTriangle, CheckCircle, ExternalLink, RefreshCw, Save } from "lucide-react";
import { Link } from "wouter";

type BrokenDownload = {
  id: number;
  releaseId: number;
  architecture: string;
  isoUrl: string | null;
  torrentUrl: string | null;
  distroName: string;
  versionNumber: string;
};

function EditableRow({ download }: { download: BrokenDownload }) {
  const { toast } = useToast();
  const [isoUrl, setIsoUrl] = useState(download.isoUrl || "");
  const [torrentUrl, setTorrentUrl] = useState(download.torrentUrl || "");

  const updateMutation = useMutation({
    mutationFn: async (data: { isoUrl: string; torrentUrl?: string }) => {
      return apiRequest("PATCH", `/api/admin/downloads/${download.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/broken-downloads"] });
      toast({
        title: "Success",
        description: `Updated download link for ${download.distroName} ${download.versionNumber}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update download",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!isoUrl.trim()) {
      toast({
        title: "Error",
        description: "ISO URL is required",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({
      isoUrl: isoUrl.trim(),
      torrentUrl: torrentUrl.trim() || undefined,
    });
  };

  return (
    <div
      className="p-4 border border-border rounded-md space-y-4"
      data-testid={`broken-download-${download.id}`}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="font-medium text-foreground" data-testid={`text-distro-name-${download.id}`}>
            {download.distroName}
          </span>
          <Badge variant="secondary" data-testid={`badge-version-${download.id}`}>
            {download.versionNumber}
          </Badge>
          <Badge variant="outline" data-testid={`badge-arch-${download.id}`}>
            {download.architecture}
          </Badge>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={updateMutation.isPending}
          data-testid={`button-save-${download.id}`}
        >
          {updateMutation.isPending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Current ISO URL (broken)</label>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded flex-1 overflow-x-auto">
              {download.isoUrl || "(empty)"}
            </code>
            {download.isoUrl && (
              <a
                href={download.isoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">New ISO URL</label>
          <Input
            value={isoUrl}
            onChange={(e) => setIsoUrl(e.target.value)}
            placeholder="https://..."
            data-testid={`input-iso-url-${download.id}`}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">New Torrent URL (optional)</label>
          <Input
            value={torrentUrl}
            onChange={(e) => setTorrentUrl(e.target.value)}
            placeholder="magnet:?... or https://..."
            data-testid={`input-torrent-url-${download.id}`}
          />
        </div>
      </div>
    </div>
  );
}

export default function BrokenLinks() {
  const { data: brokenDownloads = [], isLoading, refetch } = useQuery<BrokenDownload[]>({
    queryKey: ["/api/admin/broken-downloads"],
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
                <Terminal className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-serif font-bold text-xl text-foreground">
                Admin Dashboard
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/admin/add-release">
                <Button variant="outline" size="sm" data-testid="link-add-release">
                  Add Release
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2" data-testid="text-page-title">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Broken Download Links
                </CardTitle>
                <CardDescription>
                  Fix invalid, empty, or placeholder download URLs
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                data-testid="button-refresh"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))}
              </div>
            ) : brokenDownloads.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground" data-testid="text-no-broken">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-medium">All download links are valid</p>
                <p className="text-sm">No broken or placeholder links found</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground" data-testid="text-broken-count">
                  Found {brokenDownloads.length} broken download{brokenDownloads.length !== 1 ? "s" : ""}
                </p>
                {brokenDownloads.map((download) => (
                  <EditableRow key={download.id} download={download} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

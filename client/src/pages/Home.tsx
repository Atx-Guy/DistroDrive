import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { DistributionGrid } from "@/components/DistributionGrid";
import { NewsFeed } from "@/components/NewsFeed";
import { Terminal, TrendingUp } from "lucide-react";
import type { Distribution, News } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: distributions = [], isLoading, error } = useQuery<Distribution[]>({
    queryKey: ["/api/distributions/search", debouncedQuery],
    queryFn: async () => {
      const url = debouncedQuery 
        ? `/api/distributions/search?q=${encodeURIComponent(debouncedQuery)}`
        : "/api/distributions";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch distributions");
      return res.json();
    },
  });

  const { data: news = [] } = useQuery<News[]>({
    queryKey: ["/api/news"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <Terminal className="w-6 h-6 text-primary" />
            <h2 className="font-serif font-bold text-2xl text-foreground">
              Direct Download Links for Linux Distributions
            </h2>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Quick access to ISO downloads, torrents, and checksums for various Linux distributions and their releases.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2 mb-6">
              <h3 className="font-serif font-semibold text-xl text-foreground">
                {searchQuery ? `Search Results` : "All Distributions"}
              </h3>
              {!isLoading && (
                <span className="text-sm text-muted-foreground">
                  ({distributions.length} {distributions.length === 1 ? "distribution" : "distributions"})
                </span>
              )}
            </div>
            
            <DistributionGrid 
              distributions={distributions}
              isLoading={isLoading}
              error={error as Error | null}
              searchQuery={searchQuery}
            />
          </div>

          <aside className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-serif font-semibold text-lg text-foreground">Latest News</h3>
              </div>
              <NewsFeed news={news} compact />
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <Terminal className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Linux Distro Directory</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Providing quick access to Linux distribution downloads
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

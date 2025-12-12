import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { NewsFeed } from "@/components/NewsFeed";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, Rss } from "lucide-react";
import type { News } from "@shared/schema";

function NewsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="w-10 h-10 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <div className="flex gap-4 mt-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function NewsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: news = [], isLoading, error } = useQuery<News[]>({
    queryKey: ["/api/news"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Newspaper className="w-6 h-6 text-primary" />
            <h1 className="font-serif font-bold text-2xl text-foreground">
              Linux News
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Stay up to date with the latest news and announcements from the Linux community.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {isLoading && <NewsSkeleton />}
            
            {error && (
              <Card className="p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <Newspaper className="w-16 h-16 text-destructive mb-4" />
                  <h3 className="font-serif font-bold text-xl text-foreground mb-2">
                    Failed to load news
                  </h3>
                  <p className="text-muted-foreground max-w-md">
                    We couldn't fetch the news feed. Please check your connection and try again.
                  </p>
                </div>
              </Card>
            )}
            
            {!isLoading && !error && (
              <NewsFeed news={news} />
            )}
          </div>

          <aside className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <div className="flex items-center gap-2 mb-4">
                <Rss className="w-5 h-5 text-accent" />
                <h3 className="font-serif font-semibold text-lg text-foreground">About</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                News aggregated from major Linux distributions and community sources.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Articles</span>
                  <span className="font-mono text-foreground" data-testid="text-news-count">{news.length}</span>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}

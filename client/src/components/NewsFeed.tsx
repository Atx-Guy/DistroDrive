import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { ExternalLink, Calendar, Newspaper } from "lucide-react";
import type { News } from "@shared/schema";

interface NewsFeedProps {
  news: News[];
  compact?: boolean;
}

export function NewsFeed({ news, compact = false }: NewsFeedProps) {
  if (news.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <Newspaper className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No news available</p>
        </div>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {news.slice(0, 5).map((item) => (
          <a
            key={item.id}
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
            data-testid={`link-news-${item.id}`}
          >
            <Card className="p-4 hover-elevate active-elevate-2 cursor-pointer transition-all">
              <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-2" data-testid={`text-news-title-${item.id}`}>
                {item.title}
              </h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span data-testid={`text-news-date-${item.id}`}>{format(new Date(item.publishedAt), "MMM d, yyyy")}</span>
                <ExternalLink className="w-3 h-3 ml-auto" />
              </div>
            </Card>
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {news.map((item) => (
        <a
          key={item.id}
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          data-testid={`link-news-${item.id}`}
        >
          <Card className="p-6 hover-elevate active-elevate-2 cursor-pointer transition-all">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Newspaper className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground mb-2 line-clamp-2" data-testid={`text-news-title-${item.id}`}>
                  {item.title}
                </h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span data-testid={`text-news-date-${item.id}`}>{format(new Date(item.publishedAt), "MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4" />
                    <span className="truncate max-w-[200px]">
                      {item.sourceUrl.replace(/^https?:\/\//, '').split('/')[0]}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </a>
      ))}
    </div>
  );
}

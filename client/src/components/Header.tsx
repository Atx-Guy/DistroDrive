import { Link, useLocation } from "wouter";
import { Search, Terminal, Newspaper, Home, HardDrive, Sparkles, Scale, Usb } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsoSelection } from "@/contexts/IsoSelectionContext";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function Header({ searchQuery, onSearchChange }: HeaderProps) {
  const [location] = useLocation();
  const { selectedCount } = useIsoSelection();

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <Link href="/" data-testid="link-home-logo">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
                <Terminal className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-serif font-bold text-lg text-foreground leading-tight">
                  Linux Distro
                </h1>
                <p className="text-xs text-muted-foreground -mt-0.5">Directory</p>
              </div>
            </div>
          </Link>

          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search distributions..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 bg-background border-border"
                data-testid="input-search"
              />
            </div>
          </div>

          <nav className="flex items-center gap-1 flex-wrap">
            <Link href="/">
              <Button 
                variant={location === "/" ? "secondary" : "ghost"} 
                size="sm"
                data-testid="link-nav-home"
              >
                <Home className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </Link>
            <Link href="/iso-browser">
              <Button 
                variant={location === "/iso-browser" ? "secondary" : "ghost"} 
                size="sm"
                data-testid="link-nav-iso"
              >
                <HardDrive className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">ISO Library</span>
              </Button>
            </Link>
            <Link href="/matcher">
              <Button 
                variant={location === "/matcher" ? "secondary" : "ghost"} 
                size="sm"
                data-testid="link-nav-matcher"
              >
                <Sparkles className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Distro Matcher</span>
              </Button>
            </Link>
            <Link href="/compare">
              <Button 
                variant={location === "/compare" ? "secondary" : "ghost"} 
                size="sm"
                data-testid="link-nav-compare"
              >
                <Scale className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Compare</span>
              </Button>
            </Link>
            <Link href="/ventoy">
              <Button 
                variant={location === "/ventoy" ? "secondary" : "ghost"} 
                size="sm"
                data-testid="link-nav-ventoy"
              >
                <Usb className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Ventoy Builder</span>
                {selectedCount > 0 && (
                  <Badge variant="default" className="ml-1 bg-green-600 text-xs">
                    {selectedCount}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link href="/news">
              <Button 
                variant={location === "/news" ? "secondary" : "ghost"} 
                size="sm"
                data-testid="link-nav-news"
              >
                <Newspaper className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">News</span>
              </Button>
            </Link>
          </nav>
        </div>

        <div className="md:hidden mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search distributions..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-background border-border"
              data-testid="input-search-mobile"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

import { Link, useLocation } from "wouter";
import { Search, Terminal, Usb, Sparkles, Scale, Newspaper } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useIsoSelection } from "@/contexts/IsoSelectionContext";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import React from "react";

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

export function Header({
  searchQuery = "",
  onSearchChange = () => { },
}: HeaderProps) {
  const [location] = useLocation();
  const { selectedCount } = useIsoSelection();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto flex h-16 items-center px-6 gap-6 justify-between">
        {/* Logo */}
        <Link href="/">
          <a className="flex items-center gap-2 font-bold cursor-pointer hover:opacity-80 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Terminal className="h-5 w-5" />
            </div>
            <span className="hidden leading-tight font-serif text-lg sm:inline-block">
              DistroDrive
            </span>
          </a>
        </Link>

        {/* Navigation - Mega Menus */}
        <div className="hidden md:flex flex-1 justify-center">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent">Distributions</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                    <li className="row-span-3">
                      <NavigationMenuLink asChild>
                        <a
                          className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted to-muted/50 p-6 no-underline outline-none focus:shadow-md"
                          href="/"
                        >
                          <Terminal className="h-6 w-6" />
                          <div className="mb-2 mt-4 text-lg font-medium">
                            Browse All
                          </div>
                          <p className="text-sm leading-tight text-muted-foreground">
                            Explore our comprehensive database of Linux distributions.
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                    <ListItem href="/?base=Debian" title="Debian Based">
                      Stable, solid, and widely used base for many distros.
                    </ListItem>
                    <ListItem href="/?base=Arch" title="Arch Based">
                      Rolling release, bleeding edge, for enthusiasts.
                    </ListItem>
                    <ListItem href="/?base=RedHat" title="RPM Based">
                      Enterprise grade stability and standards.
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent">Tools</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
                    <ListItem href="/compare" title="Compare Distros">
                      Compare specifications side-by-side.
                    </ListItem>
                    <ListItem href="/matcher" title="Distro Matcher">
                      Find the perfect distro with our quiz.
                    </ListItem>
                    <ListItem href="/ventoy" title="Ventoy Builder">
                      Build a multic-boot USB drive.
                    </ListItem>
                    <ListItem href="/admin/broken-links" title="Link Checker">
                      Admin tool to verify healthy downloads.
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link href="/news">
                  <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), "bg-transparent cursor-pointer")}>
                    News
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Right Side: Search & Actions */}
        <div className="flex items-center gap-4 flex-1 md:flex-none justify-end">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="h-9 w-full pl-9 bg-muted/50 border-muted focus-visible:ring-1 focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <Link href="/ventoy">
            <div className="relative hidden sm:block">
              <a className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                "bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2",
                "cursor-pointer"
              )}>
                <Usb className="mr-2 h-4 w-4" />
                Builder
              </a>
              {selectedCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white shadow-sm ring-1 ring-background">
                  {selectedCount}
                </span>
              )}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}

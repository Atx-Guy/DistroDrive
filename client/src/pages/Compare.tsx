import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Terminal, Home, HardDrive, Sparkles, Newspaper, Scale, ChevronsUpDown, Check, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DistributionWithSpecs } from "@shared/schema";

const SPEC_ROWS = [
  { key: "packageManager", label: "Package Manager" },
  { key: "initSystem", label: "Init System" },
  { key: "releaseModel", label: "Release Model" },
  { key: "kernelVersion", label: "Kernel Version" },
  { key: "desktopEnvironments", label: "Desktop Environments" },
  { key: "baseDistro", label: "Base Distro" },
  { key: "license", label: "License" },
] as const;

function DistroCombobox({
  distributions,
  value,
  onChange,
  placeholder,
  testId,
}: {
  distributions: DistributionWithSpecs[];
  value: string | null;
  onChange: (name: string | null) => void;
  placeholder: string;
  testId: string;
}) {
  const [open, setOpen] = useState(false);

  const selectedDistro = distributions.find(
    (d) => d.name.toLowerCase() === value?.toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          data-testid={testId}
        >
          {selectedDistro ? selectedDistro.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 z-[100]">
        <Command
          filter={(value, search) => {
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <CommandInput placeholder="Search distributions..." data-testid={`${testId}-search`} />
          <CommandList>
            <CommandEmpty>No distribution found.</CommandEmpty>
            <CommandGroup>
              {distributions.map((distro) => (
                <CommandItem
                  key={distro.id}
                  value={distro.name}
                  onSelect={() => {
                    onChange(distro.name.toLowerCase());
                    setOpen(false);
                  }}
                  data-testid={`${testId}-option-${distro.id}`}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.toLowerCase() === distro.name.toLowerCase()
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {distro.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function getSpecValue(
  distro: DistributionWithSpecs | null,
  key: string
): string {
  if (!distro) return "-";
  
  if (key === "desktopEnvironments") {
    return distro.desktopEnvironments.length > 0
      ? distro.desktopEnvironments.join(", ")
      : "-";
  }
  
  if (key === "baseDistro") {
    return distro.baseDistro || "-";
  }
  
  if (distro.technicalSpecs) {
    const value = distro.technicalSpecs[key as keyof typeof distro.technicalSpecs];
    return value?.toString() || "-";
  }
  
  return "-";
}

export default function Compare() {
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const d1Param = params.get("d1");
  const d2Param = params.get("d2");

  const [distro1, setDistro1] = useState<string | null>(null);
  const [distro2, setDistro2] = useState<string | null>(null);
  const [initializedFromUrl, setInitializedFromUrl] = useState(false);

  const { data: distributions = [], isLoading } = useQuery<DistributionWithSpecs[]>({
    queryKey: ["/api/distributions/compare"],
  });

  useEffect(() => {
    if (!initializedFromUrl && distributions.length > 0) {
      if (d1Param) {
        const found = distributions.find(d => d.name.toLowerCase() === d1Param.toLowerCase());
        if (found) setDistro1(found.name.toLowerCase());
      }
      if (d2Param) {
        const found = distributions.find(d => d.name.toLowerCase() === d2Param.toLowerCase());
        if (found) setDistro2(found.name.toLowerCase());
      }
      setInitializedFromUrl(true);
    }
  }, [distributions, d1Param, d2Param, initializedFromUrl]);

  useEffect(() => {
    if (!initializedFromUrl) return;
    
    const newParams = new URLSearchParams();
    if (distro1) newParams.set("d1", distro1);
    if (distro2) newParams.set("d2", distro2);
    const newSearch = newParams.toString();
    const newUrl = newSearch ? `/compare?${newSearch}` : "/compare";
    if (location !== newUrl) {
      setLocation(newUrl, { replace: true });
    }
  }, [distro1, distro2, location, setLocation, initializedFromUrl]);

  const selectedDistro1 = distributions.find(
    (d) => d.name.toLowerCase() === distro1?.toLowerCase()
  );
  const selectedDistro2 = distributions.find(
    (d) => d.name.toLowerCase() === distro2?.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card border-border">
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

            <nav className="flex items-center gap-1 flex-wrap">
              <Link href="/">
                <Button variant="ghost" size="sm" data-testid="link-nav-home">
                  <Home className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Home</span>
                </Button>
              </Link>
              <Link href="/iso-browser">
                <Button variant="ghost" size="sm" data-testid="link-nav-iso">
                  <HardDrive className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">ISO Library</span>
                </Button>
              </Link>
              <Link href="/matcher">
                <Button variant="ghost" size="sm" data-testid="link-nav-matcher">
                  <Sparkles className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Distro Matcher</span>
                </Button>
              </Link>
              <Link href="/compare">
                <Button variant="secondary" size="sm" data-testid="link-nav-compare">
                  <Scale className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Compare</span>
                </Button>
              </Link>
              <Link href="/news">
                <Button variant="ghost" size="sm" data-testid="link-nav-news">
                  <Newspaper className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">News</span>
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
            Compare Distributions
          </h1>
          <p className="text-muted-foreground">
            Select two Linux distributions to compare their technical specifications side by side.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
            <Skeleton className="h-96" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">First Distribution</label>
                <DistroCombobox
                  distributions={distributions}
                  value={distro1}
                  onChange={setDistro1}
                  placeholder="Select a distribution..."
                  testId="combobox-distro1"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Second Distribution</label>
                <DistroCombobox
                  distributions={distributions}
                  value={distro2}
                  onChange={setDistro2}
                  placeholder="Select a distribution..."
                  testId="combobox-distro2"
                />
              </div>
            </div>

            {(selectedDistro1 || selectedDistro2) && (
              <Card className="overflow-hidden">
                <div className="grid grid-cols-3 border-b">
                  <div className="p-4 bg-muted/30 font-medium text-muted-foreground">
                    Specification
                  </div>
                  <div className="p-4 border-l flex flex-col items-center gap-3">
                    <Avatar className="w-12 h-12" data-testid="avatar-distro1">
                      <AvatarImage 
                        src={selectedDistro1?.logoUrl || undefined} 
                        alt={selectedDistro1 ? `${selectedDistro1.name} logo` : ""}
                        className="object-contain"
                        data-testid="img-distro1-logo"
                      />
                      <AvatarFallback className="text-lg font-semibold bg-muted">
                        {selectedDistro1?.name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-center" data-testid="text-distro1-name">
                      {selectedDistro1?.name || "Not selected"}
                    </span>
                  </div>
                  <div className="p-4 border-l flex flex-col items-center gap-3">
                    <Avatar className="w-12 h-12" data-testid="avatar-distro2">
                      <AvatarImage 
                        src={selectedDistro2?.logoUrl || undefined} 
                        alt={selectedDistro2 ? `${selectedDistro2.name} logo` : ""}
                        className="object-contain"
                        data-testid="img-distro2-logo"
                      />
                      <AvatarFallback className="text-lg font-semibold bg-muted">
                        {selectedDistro2?.name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-center" data-testid="text-distro2-name">
                      {selectedDistro2?.name || "Not selected"}
                    </span>
                  </div>
                </div>

                <Table>
                  <TableBody>
                    {SPEC_ROWS.map((row) => {
                      const val1 = getSpecValue(selectedDistro1 || null, row.key);
                      const val2 = getSpecValue(selectedDistro2 || null, row.key);
                      const isDifferent = selectedDistro1 && selectedDistro2 && val1 !== val2;

                      return (
                        <TableRow key={row.key} data-testid={`row-${row.key}`}>
                          <TableCell className="bg-muted/30 font-medium text-muted-foreground w-1/3">
                            <div className="flex items-center gap-2">
                              {row.label}
                              {isDifferent && (
                                <ArrowLeftRight className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "border-l w-1/3",
                              isDifferent && "font-semibold bg-yellow-500/10 dark:bg-yellow-400/10"
                            )}
                            data-testid={`cell-distro1-${row.key}`}
                          >
                            {val1}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "border-l w-1/3",
                              isDifferent && "font-semibold bg-yellow-500/10 dark:bg-yellow-400/10"
                            )}
                            data-testid={`cell-distro2-${row.key}`}
                          >
                            {val2}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}

            {!selectedDistro1 && !selectedDistro2 && (
              <Card className="p-12 text-center">
                <Scale className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Select Distributions to Compare</h2>
                <p className="text-muted-foreground">
                  Use the dropdowns above to select two Linux distributions and see how they compare.
                </p>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}

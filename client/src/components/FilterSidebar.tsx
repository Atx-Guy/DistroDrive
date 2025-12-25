
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const BASE_DISTROS = ["Debian", "Arch", "Ubuntu", "Independent", "Fedora", "RHEL"];
const DESKTOP_ENVIRONMENTS = ["GNOME", "KDE Plasma", "Xfce", "Cinnamon", "MATE", "LXQt", "Budgie"];
const ARCHITECTURES = ["amd64", "arm64"];

interface FilterSidebarProps {
    selectedBaseDistros: string[];
    setSelectedBaseDistros: (val: string[]) => void;
    selectedDEs: string[];
    setSelectedDEs: (val: string[]) => void;
    selectedArchitectures: string[];
    setSelectedArchitectures: (val: string[]) => void;
}

export function FilterSidebar({
    selectedBaseDistros,
    setSelectedBaseDistros,
    selectedDEs,
    setSelectedDEs,
    selectedArchitectures,
    setSelectedArchitectures,
}: FilterSidebarProps) {
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

    return (
        <div className="space-y-6">
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
    );
}

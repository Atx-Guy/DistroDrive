import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface SelectedDownload {
  downloadId: number;
  distroName: string;
  version: string;
  architecture: string;
  isoUrl: string;
  downloadSize: string | null;
}

interface IsoSelectionContextType {
  selectedDownloads: SelectedDownload[];
  toggleSelection: (download: SelectedDownload) => void;
  removeSelection: (downloadId: number) => void;
  clearSelection: () => void;
  isSelected: (downloadId: number) => boolean;
  selectedCount: number;
}

const IsoSelectionContext = createContext<IsoSelectionContextType | null>(null);

export function IsoSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedDownloads, setSelectedDownloads] = useState<SelectedDownload[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem("ventoy-selections");
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("ventoy-selections", JSON.stringify(selectedDownloads));
  }, [selectedDownloads]);

  const toggleSelection = (download: SelectedDownload) => {
    setSelectedDownloads(prev => {
      const exists = prev.find(d => d.downloadId === download.downloadId);
      if (exists) {
        return prev.filter(d => d.downloadId !== download.downloadId);
      }
      return [...prev, download];
    });
  };

  const removeSelection = (downloadId: number) => {
    setSelectedDownloads(prev => prev.filter(d => d.downloadId !== downloadId));
  };

  const clearSelection = () => setSelectedDownloads([]);
  
  const isSelected = (downloadId: number) => 
    selectedDownloads.some(d => d.downloadId === downloadId);

  return (
    <IsoSelectionContext.Provider value={{
      selectedDownloads,
      toggleSelection,
      removeSelection,
      clearSelection,
      isSelected,
      selectedCount: selectedDownloads.length
    }}>
      {children}
    </IsoSelectionContext.Provider>
  );
}

export function useIsoSelection() {
  const context = useContext(IsoSelectionContext);
  if (!context) throw new Error("useIsoSelection must be used within IsoSelectionProvider");
  return context;
}

export type { SelectedDownload };

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { updateDownloadUrlSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Seed database on startup
  await storage.seedDatabase();

  // Get all distributions with latest release info
  app.get("/api/distributions", async (req, res) => {
    try {
      const distros = await storage.getDistributionsWithLatestRelease();
      res.json(distros);
    } catch (error) {
      console.error("Error fetching distributions:", error);
      res.status(500).json({ error: "Failed to fetch distributions" });
    }
  });

  // Get all distributions with specs for comparison
  app.get("/api/distributions/compare", async (req, res) => {
    try {
      const distros = await storage.getDistributionsWithSpecs();
      res.json(distros);
    } catch (error) {
      console.error("Error fetching distributions for comparison:", error);
      res.status(500).json({ error: "Failed to fetch distributions for comparison" });
    }
  });

  // Search distributions
  app.get("/api/distributions/search", async (req, res) => {
    try {
      const query = (req.query.q as string) || "";
      const distros = await storage.searchDistributions(query);
      res.json(distros);
    } catch (error) {
      console.error("Error searching distributions:", error);
      res.status(500).json({ error: "Failed to search distributions" });
    }
  });

  // Get single distribution with releases
  app.get("/api/distributions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid distribution ID" });
      }
      const distro = await storage.getDistributionWithReleases(id);
      if (!distro) {
        return res.status(404).json({ error: "Distribution not found" });
      }
      res.json(distro);
    } catch (error) {
      console.error("Error fetching distribution:", error);
      res.status(500).json({ error: "Failed to fetch distribution" });
    }
  });

  // Get releases for a distribution
  app.get("/api/distributions/:id/releases", async (req, res) => {
    try {
      const distroId = parseInt(req.params.id);
      if (isNaN(distroId)) {
        return res.status(400).json({ error: "Invalid distribution ID" });
      }
      const releases = await storage.getReleasesByDistro(distroId);
      res.json(releases);
    } catch (error) {
      console.error("Error fetching releases:", error);
      res.status(500).json({ error: "Failed to fetch releases" });
    }
  });

  // Get all news
  app.get("/api/news", async (req, res) => {
    try {
      const newsItems = await storage.getNews();
      res.json(newsItems);
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // Record a download click
  app.post("/api/download-clicks/:distroId", async (req, res) => {
    try {
      const distroId = parseInt(req.params.distroId);
      if (isNaN(distroId)) {
        return res.status(400).json({ error: "Invalid distribution ID" });
      }
      await storage.recordDownloadClick(distroId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error recording download click:", error);
      res.status(500).json({ error: "Failed to record download click" });
    }
  });

  // Get top distros by download clicks
  app.get("/api/top-distros", async (req, res) => {
    try {
      const topDistros = await storage.getTopDistrosByClicks(10);
      res.json(topDistros);
    } catch (error) {
      console.error("Error fetching top distros:", error);
      res.status(500).json({ error: "Failed to fetch top distros" });
    }
  });

  // Get broken/invalid download links
  app.get("/api/admin/broken-downloads", async (req, res) => {
    try {
      const brokenDownloads = await storage.getBrokenDownloads();
      res.json(brokenDownloads);
    } catch (error) {
      console.error("Error fetching broken downloads:", error);
      res.status(500).json({ error: "Failed to fetch broken downloads" });
    }
  });

  // Update a download URL
  app.patch("/api/admin/downloads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid download ID" });
      }
      
      const parseResult = updateDownloadUrlSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: parseResult.error.flatten().fieldErrors 
        });
      }
      
      const { isoUrl, torrentUrl } = parseResult.data;
      const updated = await storage.updateDownloadUrl(id, isoUrl, torrentUrl || undefined);
      if (!updated) {
        return res.status(404).json({ error: "Download not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating download:", error);
      res.status(500).json({ error: "Failed to update download" });
    }
  });

  return httpServer;
}

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

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

  return httpServer;
}

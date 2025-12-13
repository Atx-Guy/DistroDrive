import { 
  distributions, releases, downloads, news, downloadClicks,
  type Distribution, type InsertDistribution,
  type Release, type InsertRelease,
  type Download, type InsertDownload,
  type News, type InsertNews,
  type DistributionWithReleases, type ReleaseWithDownloads,
  type DistributionWithLatestRelease,
  type TopDistro
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, desc, asc, sql, gte, count, or, isNull } from "drizzle-orm";

export type BrokenDownload = {
  id: number;
  releaseId: number;
  architecture: string;
  isoUrl: string | null;
  torrentUrl: string | null;
  distroName: string;
  versionNumber: string;
};

export interface IStorage {
  // Distributions
  getDistributions(): Promise<Distribution[]>;
  getDistributionsWithLatestRelease(): Promise<DistributionWithLatestRelease[]>;
  getDistribution(id: number): Promise<Distribution | undefined>;
  getDistributionWithReleases(id: number): Promise<DistributionWithReleases | undefined>;
  searchDistributions(query: string): Promise<Distribution[]>;
  createDistribution(data: InsertDistribution): Promise<Distribution>;
  
  // Releases
  getReleasesByDistro(distroId: number): Promise<ReleaseWithDownloads[]>;
  createRelease(data: InsertRelease): Promise<Release>;
  
  // Downloads
  getDownloadsByRelease(releaseId: number): Promise<Download[]>;
  createDownload(data: InsertDownload): Promise<Download>;
  getBrokenDownloads(): Promise<BrokenDownload[]>;
  updateDownloadUrl(id: number, isoUrl: string, torrentUrl?: string): Promise<Download | undefined>;
  
  // News
  getNews(): Promise<News[]>;
  createNews(data: InsertNews): Promise<News>;
  
  // Download clicks
  recordDownloadClick(distroId: number): Promise<void>;
  getTopDistrosByClicks(limit?: number): Promise<TopDistro[]>;
  
  // Seed data
  seedDatabase(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getDistributions(): Promise<Distribution[]> {
    return await db.select().from(distributions).orderBy(asc(distributions.name));
  }

  async getDistributionsWithLatestRelease(): Promise<DistributionWithLatestRelease[]> {
    const allDistributions = await this.getDistributions();
    const result: DistributionWithLatestRelease[] = [];

    for (const distro of allDistributions) {
      const distroReleases = await this.getReleasesByDistro(distro.id);
      
      let latestVersion: string | null = null;
      let isLatestLts = false;
      const architectureSet = new Set<string>();

      if (distroReleases.length > 0) {
        const sortedReleases = distroReleases.sort(
          (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
        );
        const latestRelease = sortedReleases[0];
        latestVersion = latestRelease.versionNumber;
        isLatestLts = latestRelease.isLts;

        for (const release of distroReleases) {
          for (const download of release.downloads) {
            architectureSet.add(download.architecture);
          }
        }
      }

      result.push({
        ...distro,
        latestVersion,
        isLatestLts,
        availableArchitectures: Array.from(architectureSet),
      });
    }

    return result;
  }

  async getDistribution(id: number): Promise<Distribution | undefined> {
    const [distro] = await db.select().from(distributions).where(eq(distributions.id, id));
    return distro || undefined;
  }

  async getDistributionWithReleases(id: number): Promise<DistributionWithReleases | undefined> {
    const distro = await this.getDistribution(id);
    if (!distro) return undefined;

    const distroReleases = await this.getReleasesByDistro(id);
    
    return {
      ...distro,
      releases: distroReleases,
    };
  }

  async searchDistributions(query: string): Promise<Distribution[]> {
    if (!query.trim()) {
      return this.getDistributions();
    }
    return await db.select()
      .from(distributions)
      .where(ilike(distributions.name, `%${query}%`))
      .orderBy(asc(distributions.name));
  }

  async createDistribution(data: InsertDistribution): Promise<Distribution> {
    const [distro] = await db.insert(distributions).values(data).returning();
    return distro;
  }

  async getReleasesByDistro(distroId: number): Promise<ReleaseWithDownloads[]> {
    const releasesData = await db.select()
      .from(releases)
      .where(eq(releases.distroId, distroId))
      .orderBy(desc(releases.releaseDate));

    const releasesWithDownloads: ReleaseWithDownloads[] = [];
    
    for (const release of releasesData) {
      const releaseDownloads = await this.getDownloadsByRelease(release.id);
      releasesWithDownloads.push({
        ...release,
        downloads: releaseDownloads,
      });
    }

    return releasesWithDownloads;
  }

  async createRelease(data: InsertRelease): Promise<Release> {
    const [release] = await db.insert(releases).values(data).returning();
    return release;
  }

  async getDownloadsByRelease(releaseId: number): Promise<Download[]> {
    return await db.select()
      .from(downloads)
      .where(eq(downloads.releaseId, releaseId));
  }

  async createDownload(data: InsertDownload): Promise<Download> {
    const [download] = await db.insert(downloads).values(data).returning();
    return download;
  }

  async getBrokenDownloads(): Promise<BrokenDownload[]> {
    const result = await db
      .select({
        id: downloads.id,
        releaseId: downloads.releaseId,
        architecture: downloads.architecture,
        isoUrl: downloads.isoUrl,
        torrentUrl: downloads.torrentUrl,
        distroName: distributions.name,
        versionNumber: releases.versionNumber,
      })
      .from(downloads)
      .innerJoin(releases, eq(downloads.releaseId, releases.id))
      .innerJoin(distributions, eq(releases.distroId, distributions.id))
      .where(
        or(
          isNull(downloads.isoUrl),
          eq(downloads.isoUrl, ''),
          sql`${downloads.isoUrl} LIKE '%placeholder%'`,
          sql`${downloads.isoUrl} LIKE '%example%'`,
          sql`${downloads.isoUrl} LIKE '%TODO%'`
        )
      )
      .orderBy(asc(distributions.name), asc(releases.versionNumber));

    return result;
  }

  async updateDownloadUrl(id: number, isoUrl: string, torrentUrl?: string): Promise<Download | undefined> {
    const updateData: { isoUrl: string; torrentUrl?: string } = { isoUrl };
    if (torrentUrl !== undefined) {
      updateData.torrentUrl = torrentUrl;
    }
    const [updated] = await db
      .update(downloads)
      .set(updateData)
      .where(eq(downloads.id, id))
      .returning();
    return updated || undefined;
  }

  async getNews(): Promise<News[]> {
    return await db.select()
      .from(news)
      .orderBy(desc(news.publishedAt));
  }

  async createNews(data: InsertNews): Promise<News> {
    const [newsItem] = await db.insert(news).values(data).returning();
    return newsItem;
  }

  async recordDownloadClick(distroId: number): Promise<void> {
    await db.insert(downloadClicks).values({ distroId });
  }

  async getTopDistrosByClicks(limit: number = 10): Promise<TopDistro[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db
      .select({
        distroId: downloadClicks.distroId,
        name: distributions.name,
        clickCount: count(downloadClicks.id),
      })
      .from(downloadClicks)
      .innerJoin(distributions, eq(downloadClicks.distroId, distributions.id))
      .where(gte(downloadClicks.clickedAt, thirtyDaysAgo))
      .groupBy(downloadClicks.distroId, distributions.name)
      .orderBy(desc(count(downloadClicks.id)))
      .limit(limit);

    return result.map(r => ({
      distroId: r.distroId,
      name: r.name,
      clickCount: Number(r.clickCount),
    }));
  }

  async seedDatabase(): Promise<void> {
    // Check if data already exists
    const existingDistros = await db.select().from(distributions).limit(1);
    if (existingDistros.length > 0) {
      return; // Already seeded
    }

    // Seed distributions
    const ubuntu = await this.createDistribution({
      name: "Ubuntu",
      description: "Ubuntu is a popular Linux distribution based on Debian. Known for its ease of use and regular release schedule, it's one of the most widely used desktop Linux distributions.",
      websiteUrl: "https://ubuntu.com",
      logoUrl: "https://assets.ubuntu.com/v1/29985a98-ubuntu-logo32.png",
      baseDistro: "Debian",
      desktopEnvironments: ["GNOME", "KDE Plasma", "Xfce", "MATE"],
    });

    const fedora = await this.createDistribution({
      name: "Fedora",
      description: "Fedora is a Linux distribution developed by the community-supported Fedora Project and sponsored by Red Hat. Features cutting-edge technology and a focus on innovation.",
      websiteUrl: "https://fedoraproject.org",
      logoUrl: "https://fedoraproject.org/assets/images/fedora-logo.png",
      baseDistro: "Independent",
      desktopEnvironments: ["GNOME", "KDE Plasma", "Xfce", "LXQt", "Cinnamon"],
    });

    const debian = await this.createDistribution({
      name: "Debian",
      description: "Debian is one of the oldest and most influential Linux distributions. Known for its stability and vast software repository, it serves as the foundation for many other distributions.",
      websiteUrl: "https://debian.org",
      logoUrl: "https://www.debian.org/logos/openlogo-100.png",
      baseDistro: "Independent",
      desktopEnvironments: ["GNOME", "KDE Plasma", "Xfce", "LXDE", "MATE", "Cinnamon"],
    });

    const arch = await this.createDistribution({
      name: "Arch Linux",
      description: "Arch Linux is a lightweight and flexible Linux distribution that tries to Keep It Simple. A rolling release distribution targeting experienced users.",
      websiteUrl: "https://archlinux.org",
      logoUrl: "https://archlinux.org/static/logos/archlinux-logo-dark-90dpi.png",
      baseDistro: "Independent",
      desktopEnvironments: ["Any (user choice)"],
    });

    const mint = await this.createDistribution({
      name: "Linux Mint",
      description: "Linux Mint is a community-driven Linux distribution based on Ubuntu. It strives to be a modern, elegant and comfortable operating system which is both powerful and easy to use.",
      websiteUrl: "https://linuxmint.com",
      logoUrl: "https://www.linuxmint.com/img/logo.png",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["Cinnamon", "MATE", "Xfce"],
    });

    // Seed releases for Ubuntu
    const ubuntu2404 = await this.createRelease({
      distroId: ubuntu.id,
      versionNumber: "24.04 LTS (Noble Numbat)",
      releaseDate: new Date("2024-04-25"),
      isLts: true,
    });

    // Seed downloads for Ubuntu 24.04
    await this.createDownload({
      releaseId: ubuntu2404.id,
      architecture: "amd64",
      isoUrl: "https://releases.ubuntu.com/noble/ubuntu-24.04.2-desktop-amd64.iso",
      torrentUrl: "https://releases.ubuntu.com/noble/ubuntu-24.04.2-desktop-amd64.iso.torrent",
      checksum: "sha256: See https://releases.ubuntu.com/noble/SHA256SUMS",
      downloadSize: "5.8 GB",
    });

    await this.createDownload({
      releaseId: ubuntu2404.id,
      architecture: "arm64",
      isoUrl: "https://cdimage.ubuntu.com/releases/24.04.2/release/ubuntu-24.04.2-live-server-arm64.iso",
      torrentUrl: "https://cdimage.ubuntu.com/releases/24.04.2/release/ubuntu-24.04.2-live-server-arm64.iso.torrent",
      checksum: "sha256: See https://cdimage.ubuntu.com/releases/24.04.2/release/SHA256SUMS",
      downloadSize: "2.6 GB",
    });

    // Seed releases for Fedora
    const fedora41 = await this.createRelease({
      distroId: fedora.id,
      versionNumber: "41",
      releaseDate: new Date("2024-10-24"),
      isLts: false,
    });

    await this.createDownload({
      releaseId: fedora41.id,
      architecture: "amd64",
      isoUrl: "https://dl.fedoraproject.org/pub/fedora/linux/releases/41/Workstation/x86_64/iso/Fedora-Workstation-Live-x86_64-41-1.4.iso",
      torrentUrl: "https://torrent.fedoraproject.org/torrents/Fedora-Workstation-Live-x86_64-41.torrent",
      checksum: "sha256: See https://dl.fedoraproject.org/pub/fedora/linux/releases/41/Workstation/x86_64/iso/",
      downloadSize: "2.3 GB",
    });

    await this.createDownload({
      releaseId: fedora41.id,
      architecture: "arm64",
      isoUrl: "https://dl.fedoraproject.org/pub/fedora/linux/releases/41/Server/aarch64/iso/Fedora-Server-netinst-aarch64-41-1.4.iso",
      torrentUrl: "https://torrent.fedoraproject.org/torrents/Fedora-Server-netinst-aarch64-41.torrent",
      checksum: "sha256: See https://dl.fedoraproject.org/pub/fedora/linux/releases/41/Server/aarch64/iso/",
      downloadSize: "900 MB",
    });

    // Seed releases for Debian
    const debian12 = await this.createRelease({
      distroId: debian.id,
      versionNumber: "12 (Bookworm)",
      releaseDate: new Date("2023-06-10"),
      isLts: true,
    });

    await this.createDownload({
      releaseId: debian12.id,
      architecture: "amd64",
      isoUrl: "https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/debian-12.9.0-amd64-netinst.iso",
      torrentUrl: "https://cdimage.debian.org/debian-cd/current/amd64/bt-cd/debian-12.9.0-amd64-netinst.iso.torrent",
      checksum: "sha256: See https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/SHA256SUMS",
      downloadSize: "660 MB",
    });

    await this.createDownload({
      releaseId: debian12.id,
      architecture: "arm64",
      isoUrl: "https://cdimage.debian.org/debian-cd/current/arm64/iso-cd/debian-12.9.0-arm64-netinst.iso",
      torrentUrl: "https://cdimage.debian.org/debian-cd/current/arm64/bt-cd/debian-12.9.0-arm64-netinst.iso.torrent",
      checksum: "sha256: See https://cdimage.debian.org/debian-cd/current/arm64/iso-cd/SHA256SUMS",
      downloadSize: "700 MB",
    });

    // Seed releases for Arch Linux
    const arch202412 = await this.createRelease({
      distroId: arch.id,
      versionNumber: "2024.12.01",
      releaseDate: new Date("2024-12-01"),
      isLts: false,
    });

    await this.createDownload({
      releaseId: arch202412.id,
      architecture: "amd64",
      isoUrl: "https://geo.mirror.pkgbuild.com/iso/2024.12.01/archlinux-2024.12.01-x86_64.iso",
      torrentUrl: "https://archlinux.org/releng/releases/2024.12.01/torrent/",
      checksum: "sha256: See https://archlinux.org/download/",
      downloadSize: "1.1 GB",
    });

    // Seed releases for Linux Mint
    const mint221 = await this.createRelease({
      distroId: mint.id,
      versionNumber: "22.1 (Xia)",
      releaseDate: new Date("2024-12-01"),
      isLts: true,
    });

    await this.createDownload({
      releaseId: mint221.id,
      architecture: "amd64",
      isoUrl: "https://mirrors.kernel.org/linuxmint/stable/22.1/linuxmint-22.1-cinnamon-64bit.iso",
      torrentUrl: "https://torrents.linuxmint.com/torrents/linuxmint-22.1-cinnamon-64bit.iso.torrent",
      checksum: "sha256: See https://linuxmint.com/edition.php?id=319",
      downloadSize: "2.9 GB",
    });

    // Seed news
    await this.createNews({
      title: "Ubuntu 24.04 LTS 'Noble Numbat' Released with Enhanced Security Features",
      sourceUrl: "https://ubuntu.com/blog/ubuntu-24-04-lts-noble-numbat",
      publishedAt: new Date("2024-04-25"),
    });

    await this.createNews({
      title: "Fedora 40 Brings GNOME 46 and Enhanced Container Support",
      sourceUrl: "https://fedoramagazine.org/announcing-fedora-40/",
      publishedAt: new Date("2024-04-23"),
    });

    await this.createNews({
      title: "Linux Mint 22 'Wilma' Now Available Based on Ubuntu 24.04",
      sourceUrl: "https://blog.linuxmint.com/?p=4630",
      publishedAt: new Date("2024-07-25"),
    });

    await this.createNews({
      title: "Arch Linux Introduces New Installer with Guided Installation",
      sourceUrl: "https://archlinux.org/news/arch-linux-installer-update/",
      publishedAt: new Date("2024-03-15"),
    });

    await this.createNews({
      title: "Debian 12.5 Point Release Available with Bug Fixes and Security Updates",
      sourceUrl: "https://www.debian.org/News/2024/20240210",
      publishedAt: new Date("2024-02-10"),
    });
  }
}

export const storage = new DatabaseStorage();

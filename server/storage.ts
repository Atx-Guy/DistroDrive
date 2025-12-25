import {
  distributions, releases, downloads, news, downloadClicks, technicalSpecs,
  type Distribution, type InsertDistribution,
  type Release, type InsertRelease,
  type Download, type InsertDownload,
  type News, type InsertNews,
  type DistributionWithReleases, type ReleaseWithDownloads,
  type DistributionWithLatestRelease,
  type TopDistro,
  type TechnicalSpecs, type DistributionWithSpecs
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, desc, asc, sql, gte, count, or, isNull, inArray } from "drizzle-orm";

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
  getDistributionsWithLatestRelease(filters?: { query?: string, architecture?: string }): Promise<DistributionWithLatestRelease[]>;
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

  // Compare distributions
  getDistributionsWithSpecs(): Promise<DistributionWithSpecs[]>;

  // Seed data
  seedDatabase(): Promise<void>;
  seedAdditionalDistros(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getDistributions(): Promise<Distribution[]> {
    return await db.select().from(distributions).orderBy(asc(distributions.name));
  }

  async getDistributionsWithLatestRelease(filters?: { query?: string, architecture?: string }): Promise<DistributionWithLatestRelease[]> {
    const allDistributions = await this.getDistributions();
    let filteredDistributions = allDistributions;

    // Filter by text query if provided (simulating searchDistributions within this method for unified results)
    if (filters?.query && filters.query.trim()) {
      const q = filters.query.trim().toLowerCase();
      filteredDistributions = allDistributions.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
      );
    }

    const result: DistributionWithLatestRelease[] = [];

    for (const distro of filteredDistributions) {
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

      const availableArchitectures = Array.from(architectureSet);

      // Filter by architecture if provided
      if (filters?.architecture && filters.architecture.trim()) {
        if (!availableArchitectures.includes(filters.architecture)) {
          continue;
        }
      }

      result.push({
        ...distro,
        latestVersion,
        isLatestLts,
        availableArchitectures,
      });
    }

    return result;
  }

  async getDistribution(id: number): Promise<Distribution | undefined> {
    const [distro] = await db.select().from(distributions).where(eq(distributions.id, id));
    return distro || undefined;
  }

  async getDistributionWithReleases(id: number): Promise<DistributionWithReleases | undefined> {
    const distro = await db.query.distributions.findFirst({
      where: eq(distributions.id, id),
      with: {
        releases: {
          orderBy: [desc(releases.releaseDate)],
          with: { downloads: true },
        },
      },
    });

    if (!distro) return undefined;

    return {
      ...distro,
      releases: distro.releases,
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
    return await db.query.releases.findMany({
      where: eq(releases.distroId, distroId),
      orderBy: [desc(releases.releaseDate)],
      with: { downloads: true },
    });
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

  async getDistributionsWithSpecs(): Promise<DistributionWithSpecs[]> {
    const result = await db
      .select({
        distribution: distributions,
        technicalSpecs: technicalSpecs,
      })
      .from(distributions)
      .leftJoin(technicalSpecs, eq(distributions.id, technicalSpecs.distroId))
      .orderBy(asc(distributions.name));

    return result.map(row => ({
      ...row.distribution,
      technicalSpecs: row.technicalSpecs,
    }));
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
      await this.seedAdditionalDistros();
      return;
    }

    // Seed all 50 distributions
    const ubuntu = await this.createDistribution({
      name: "Ubuntu",
      description: "Ubuntu is a popular Linux distribution based on Debian. Known for its ease of use and regular release schedule, it's one of the most widely used desktop Linux distributions.",
      websiteUrl: "https://ubuntu.com",
      logoUrl: "https://cdn.simpleicons.org/ubuntu",
      baseDistro: "Debian",
      desktopEnvironments: ["GNOME", "KDE Plasma", "Xfce", "MATE"],
    });

    const fedora = await this.createDistribution({
      name: "Fedora",
      description: "Fedora is a Linux distribution developed by the community-supported Fedora Project and sponsored by Red Hat. Features cutting-edge technology and a focus on innovation.",
      websiteUrl: "https://fedoraproject.org",
      logoUrl: "https://cdn.simpleicons.org/fedora",
      baseDistro: "Independent",
      desktopEnvironments: ["GNOME", "KDE Plasma", "Xfce", "LXQt", "Cinnamon"],
    });

    const debian = await this.createDistribution({
      name: "Debian",
      description: "Debian is one of the oldest and most influential Linux distributions. Known for its stability and vast software repository, it serves as the foundation for many other distributions.",
      websiteUrl: "https://debian.org",
      logoUrl: "https://cdn.simpleicons.org/debian",
      baseDistro: "Independent",
      desktopEnvironments: ["GNOME", "KDE Plasma", "Xfce", "LXDE", "MATE", "Cinnamon"],
    });

    const arch = await this.createDistribution({
      name: "Arch Linux",
      description: "Arch Linux is a lightweight and flexible Linux distribution that tries to Keep It Simple. A rolling release distribution targeting experienced users.",
      websiteUrl: "https://archlinux.org",
      logoUrl: "https://cdn.simpleicons.org/archlinux",
      baseDistro: "Independent",
      desktopEnvironments: ["Any (user choice)"],
    });

    const mint = await this.createDistribution({
      name: "Linux Mint",
      description: "Linux Mint is a community-driven Linux distribution based on Ubuntu. It strives to be a modern, elegant and comfortable operating system which is both powerful and easy to use.",
      websiteUrl: "https://linuxmint.com",
      logoUrl: "https://cdn.simpleicons.org/linuxmint",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["Cinnamon", "MATE", "Xfce"],
    });

    // Additional 45 distributions
    await this.createDistribution({
      name: "Pop!_OS",
      description: "Pop!_OS is a Linux distribution developed by System76 based on Ubuntu. Designed for creators, developers, and gamers with excellent hardware support and a tiling window manager.",
      websiteUrl: "https://pop.system76.com",
      logoUrl: "https://cdn.simpleicons.org/popos",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["COSMIC", "GNOME"],
    });

    await this.createDistribution({
      name: "openSUSE Tumbleweed",
      description: "openSUSE Tumbleweed is a rolling release distribution that provides the latest stable versions of all software. Perfect for developers and experienced users who want cutting-edge packages.",
      websiteUrl: "https://www.opensuse.org",
      logoUrl: "https://cdn.simpleicons.org/opensuse",
      baseDistro: "SUSE",
      desktopEnvironments: ["KDE Plasma", "GNOME", "Xfce"],
    });

    await this.createDistribution({
      name: "openSUSE Leap",
      description: "openSUSE Leap is a stable, enterprise-grade distribution that shares its codebase with SUSE Linux Enterprise. Ideal for users who want reliability with regular point releases.",
      websiteUrl: "https://www.opensuse.org",
      logoUrl: "https://cdn.simpleicons.org/opensuse",
      baseDistro: "SUSE",
      desktopEnvironments: ["KDE Plasma", "GNOME", "Xfce"],
    });

    await this.createDistribution({
      name: "Elementary OS",
      description: "Elementary OS is a beautifully designed Linux distribution focused on simplicity and elegance. Features the custom Pantheon desktop environment inspired by macOS.",
      websiteUrl: "https://elementary.io",
      logoUrl: "https://cdn.simpleicons.org/elementary",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["Pantheon"],
    });

    await this.createDistribution({
      name: "Zorin OS",
      description: "Zorin OS is designed to make Linux easy for Windows and macOS users. Features a familiar interface with multiple layout options and excellent compatibility.",
      websiteUrl: "https://zorin.com/os",
      logoUrl: "https://cdn.simpleicons.org/zorin",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["GNOME", "Xfce"],
    });

    await this.createDistribution({
      name: "MX Linux",
      description: "MX Linux is a midweight distribution based on Debian stable. Known for its efficiency, elegance, and extensive collection of custom tools and utilities.",
      websiteUrl: "https://mxlinux.org",
      logoUrl: "https://cdn.simpleicons.org/mxlinux",
      baseDistro: "Debian",
      desktopEnvironments: ["Xfce", "KDE Plasma", "Fluxbox"],
    });

    await this.createDistribution({
      name: "EndeavourOS",
      description: "EndeavourOS is a user-friendly Arch-based distribution. Provides a terminal-centric experience while remaining accessible to newcomers wanting to learn Arch.",
      websiteUrl: "https://endeavouros.com",
      logoUrl: "https://cdn.simpleicons.org/endeavouros",
      baseDistro: "Arch",
      desktopEnvironments: ["KDE Plasma", "GNOME", "Xfce", "i3", "Budgie", "Cinnamon"],
    });

    await this.createDistribution({
      name: "Garuda Linux",
      description: "Garuda Linux is a performance-focused Arch-based distribution optimized for gaming. Features BTRFS snapshots, performance tweaks, and beautiful theming out of the box.",
      websiteUrl: "https://garudalinux.org",
      logoUrl: "https://cdn.simpleicons.org/linux",
      baseDistro: "Arch",
      desktopEnvironments: ["KDE Plasma", "GNOME", "Xfce", "i3", "Sway"],
    });

    await this.createDistribution({
      name: "Solus",
      description: "Solus is an independently developed Linux distribution built from scratch. Home of the Budgie desktop environment with a focus on simplicity and elegance.",
      websiteUrl: "https://getsol.us",
      logoUrl: "https://cdn.simpleicons.org/solus",
      baseDistro: "Independent",
      desktopEnvironments: ["Budgie", "GNOME", "KDE Plasma", "MATE"],
    });

    await this.createDistribution({
      name: "Kali Linux",
      description: "Kali Linux is a Debian-based distribution designed for digital forensics and penetration testing. Includes hundreds of security tools pre-installed.",
      websiteUrl: "https://www.kali.org",
      logoUrl: "https://cdn.simpleicons.org/kalilinux",
      baseDistro: "Debian",
      desktopEnvironments: ["Xfce", "GNOME", "KDE Plasma"],
    });

    await this.createDistribution({
      name: "Kubuntu",
      description: "Kubuntu is an official Ubuntu flavor featuring the KDE Plasma desktop. Combines Ubuntu's reliability with KDE's powerful and customizable interface.",
      websiteUrl: "https://kubuntu.org",
      logoUrl: "https://cdn.simpleicons.org/kubuntu",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["KDE Plasma"],
    });

    await this.createDistribution({
      name: "Xubuntu",
      description: "Xubuntu is an official Ubuntu flavor with the Xfce desktop environment. Lightweight and elegant, perfect for older hardware or users who prefer simplicity.",
      websiteUrl: "https://xubuntu.org",
      logoUrl: "https://cdn.simpleicons.org/xubuntu",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["Xfce"],
    });

    await this.createDistribution({
      name: "Lubuntu",
      description: "Lubuntu is an official lightweight Ubuntu flavor using LXQt desktop. Designed for older computers and resource-constrained environments.",
      websiteUrl: "https://lubuntu.me",
      logoUrl: "https://cdn.simpleicons.org/lubuntu",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["LXQt"],
    });

    await this.createDistribution({
      name: "Ubuntu MATE",
      description: "Ubuntu MATE is an official Ubuntu flavor featuring the MATE desktop. Provides a traditional desktop experience with modern features and stability.",
      websiteUrl: "https://ubuntu-mate.org",
      logoUrl: "https://cdn.simpleicons.org/ubuntumate",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["MATE"],
    });

    await this.createDistribution({
      name: "Ubuntu Studio",
      description: "Ubuntu Studio is an official Ubuntu flavor optimized for creative professionals. Pre-configured for audio, video, graphics, and publishing workflows.",
      websiteUrl: "https://ubuntustudio.org",
      logoUrl: "https://cdn.simpleicons.org/linux",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["KDE Plasma"],
    });

    await this.createDistribution({
      name: "CentOS Stream",
      description: "CentOS Stream is a continuously delivered Linux distribution that tracks just ahead of Red Hat Enterprise Linux. Ideal for developers targeting RHEL.",
      websiteUrl: "https://www.centos.org",
      logoUrl: "https://cdn.simpleicons.org/centos",
      baseDistro: "RHEL",
      desktopEnvironments: ["GNOME"],
    });

    await this.createDistribution({
      name: "Rocky Linux",
      description: "Rocky Linux is an enterprise-grade Linux distribution designed to be 100% bug-for-bug compatible with Red Hat Enterprise Linux. Community-driven RHEL rebuild.",
      websiteUrl: "https://rockylinux.org",
      logoUrl: "https://cdn.simpleicons.org/rockylinux",
      baseDistro: "RHEL",
      desktopEnvironments: ["GNOME"],
    });

    await this.createDistribution({
      name: "AlmaLinux",
      description: "AlmaLinux is a free, enterprise-grade Linux distribution that is binary compatible with RHEL. Backed by CloudLinux with long-term support.",
      websiteUrl: "https://almalinux.org",
      logoUrl: "https://cdn.simpleicons.org/almalinux",
      baseDistro: "RHEL",
      desktopEnvironments: ["GNOME"],
    });

    await this.createDistribution({
      name: "Void Linux",
      description: "Void Linux is an independent rolling-release distribution with its own package manager (XBPS) and init system (runit). Minimalist and highly customizable.",
      websiteUrl: "https://voidlinux.org",
      logoUrl: "https://cdn.simpleicons.org/voidlinux",
      baseDistro: "Independent",
      desktopEnvironments: ["Any (user choice)"],
    });

    await this.createDistribution({
      name: "Gentoo",
      description: "Gentoo is a source-based Linux distribution built around the Portage package manager. Offers maximum customization and optimization for your hardware.",
      websiteUrl: "https://www.gentoo.org",
      logoUrl: "https://cdn.simpleicons.org/gentoo",
      baseDistro: "Independent",
      desktopEnvironments: ["Any (user choice)"],
    });

    await this.createDistribution({
      name: "Slackware",
      description: "Slackware is the oldest actively maintained Linux distribution. Known for its simplicity, stability, and Unix-like philosophy with minimal modifications.",
      websiteUrl: "http://www.slackware.com",
      logoUrl: "https://cdn.simpleicons.org/slackware",
      baseDistro: "Independent",
      desktopEnvironments: ["KDE Plasma", "Xfce"],
    });

    await this.createDistribution({
      name: "NixOS",
      description: "NixOS is a Linux distribution built on the Nix package manager. Features declarative configuration, atomic upgrades, and reproducible system builds.",
      websiteUrl: "https://nixos.org",
      logoUrl: "https://cdn.simpleicons.org/nixos",
      baseDistro: "Independent",
      desktopEnvironments: ["GNOME", "KDE Plasma", "Xfce"],
    });

    await this.createDistribution({
      name: "Tails",
      description: "Tails is a portable Linux distribution focused on privacy and anonymity. Routes all traffic through Tor and leaves no trace on the host computer.",
      websiteUrl: "https://tails.net",
      logoUrl: "https://cdn.simpleicons.org/tails",
      baseDistro: "Debian",
      desktopEnvironments: ["GNOME"],
    });

    await this.createDistribution({
      name: "Qubes OS",
      description: "Qubes OS is a security-focused desktop operating system using Xen-based virtualization. Isolates applications in separate virtual machines for maximum security.",
      websiteUrl: "https://www.qubes-os.org",
      logoUrl: "https://cdn.simpleicons.org/qubesos",
      baseDistro: "Independent",
      desktopEnvironments: ["Xfce"],
    });

    await this.createDistribution({
      name: "Parrot OS",
      description: "Parrot OS is a Debian-based distribution designed for security, development, and privacy. Includes comprehensive tools for penetration testing and forensics.",
      websiteUrl: "https://www.parrotsec.org",
      logoUrl: "https://cdn.simpleicons.org/linux",
      baseDistro: "Debian",
      desktopEnvironments: ["MATE", "KDE Plasma"],
    });

    await this.createDistribution({
      name: "Peppermint OS",
      description: "Peppermint OS is a lightweight Debian-based distribution focused on cloud computing and web applications. Fast and efficient with minimal resource usage.",
      websiteUrl: "https://peppermintos.com",
      logoUrl: "https://cdn.simpleicons.org/linux",
      baseDistro: "Debian",
      desktopEnvironments: ["Xfce"],
    });

    await this.createDistribution({
      name: "antiX",
      description: "antiX is a fast, lightweight Debian-based distribution designed for older computers. Systemd-free with multiple lightweight window managers available.",
      websiteUrl: "https://antixlinux.com",
      logoUrl: "https://cdn.simpleicons.org/linux",
      baseDistro: "Debian",
      desktopEnvironments: ["IceWM", "Fluxbox", "JWM"],
    });

    await this.createDistribution({
      name: "Bodhi Linux",
      description: "Bodhi Linux is a lightweight Ubuntu-based distribution featuring the Moksha desktop environment. Minimalist by design with a focus on user choice.",
      websiteUrl: "https://www.bodhilinux.com",
      logoUrl: "/bodhi-logo.png",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["Moksha"],
    });

    await this.createDistribution({
      name: "Deepin",
      description: "Deepin is a Debian-based distribution featuring the beautiful Deepin Desktop Environment (DDE). Known for its elegant design and user-friendly experience.",
      websiteUrl: "https://www.deepin.org",
      logoUrl: "https://cdn.simpleicons.org/deepin",
      baseDistro: "Debian",
      desktopEnvironments: ["DDE"],
    });

    await this.createDistribution({
      name: "KDE neon",
      description: "KDE neon is an Ubuntu-based distribution that provides the latest KDE Plasma desktop and applications. Perfect for users who want cutting-edge KDE software.",
      websiteUrl: "https://neon.kde.org",
      logoUrl: "https://cdn.simpleicons.org/kdeneon",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["KDE Plasma"],
    });

    await this.createDistribution({
      name: "LMDE",
      description: "Linux Mint Debian Edition (LMDE) is a version of Linux Mint based directly on Debian instead of Ubuntu. Provides the Mint experience with a Debian foundation.",
      websiteUrl: "https://linuxmint.com",
      logoUrl: "https://cdn.simpleicons.org/linuxmint",
      baseDistro: "Debian",
      desktopEnvironments: ["Cinnamon"],
    });

    await this.createDistribution({
      name: "Mageia",
      description: "Mageia is a community-driven Linux distribution forked from Mandriva Linux. Features excellent hardware detection and a user-friendly control center.",
      websiteUrl: "https://www.mageia.org",
      logoUrl: "https://cdn.simpleicons.org/linux",
      baseDistro: "Independent",
      desktopEnvironments: ["KDE Plasma", "GNOME", "Xfce"],
    });

    await this.createDistribution({
      name: "PCLinuxOS",
      description: "PCLinuxOS is an independent rolling-release distribution known for its out-of-the-box usability. Features excellent hardware support and multimedia capabilities.",
      websiteUrl: "https://www.pclinuxos.com",
      logoUrl: "https://cdn.simpleicons.org/linux",
      baseDistro: "Independent",
      desktopEnvironments: ["KDE Plasma", "MATE", "Xfce"],
    });

    await this.createDistribution({
      name: "Puppy Linux",
      description: "Puppy Linux is an extremely lightweight distribution designed to run entirely in RAM. Perfect for old computers or as a portable rescue system.",
      websiteUrl: "https://puppylinux-woof-ce.github.io",
      logoUrl: "https://cdn.simpleicons.org/linux",
      baseDistro: "Independent",
      desktopEnvironments: ["JWM", "Openbox"],
    });

    await this.createDistribution({
      name: "SparkyLinux",
      description: "SparkyLinux is a lightweight Debian-based distribution available in stable and rolling release versions. Offers various desktop environments for different use cases.",
      websiteUrl: "https://sparkylinux.org",
      logoUrl: "https://cdn.simpleicons.org/linux",
      baseDistro: "Debian",
      desktopEnvironments: ["LXQt", "KDE Plasma", "Xfce", "MATE"],
    });

    await this.createDistribution({
      name: "Artix Linux",
      description: "Artix Linux is an Arch-based distribution that uses alternative init systems instead of systemd. Supports OpenRC, runit, and s6 init systems.",
      websiteUrl: "https://artixlinux.org",
      logoUrl: "https://cdn.simpleicons.org/artixlinux",
      baseDistro: "Arch",
      desktopEnvironments: ["KDE Plasma", "GNOME", "Xfce", "LXQt"],
    });

    await this.createDistribution({
      name: "Vanilla OS",
      description: "Vanilla OS is an immutable Ubuntu-based distribution designed for reliability and security. Features atomic updates and containerized application support.",
      websiteUrl: "https://vanillaos.org",
      logoUrl: "https://cdn.simpleicons.org/linux",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["GNOME"],
    });

    await this.createDistribution({
      name: "Nobara",
      description: "Nobara is a Fedora-based distribution optimized for gaming and content creation. Includes gaming-specific patches, drivers, and pre-configured optimizations.",
      websiteUrl: "https://nobaraproject.org",
      logoUrl: "https://cdn.simpleicons.org/nobaralinux",
      baseDistro: "Fedora",
      desktopEnvironments: ["KDE Plasma", "GNOME"],
    });

    await this.createDistribution({
      name: "Fedora Silverblue",
      description: "Fedora Silverblue is an immutable desktop operating system based on Fedora. Uses rpm-ostree for atomic updates and Flatpak for applications.",
      websiteUrl: "https://fedoraproject.org/silverblue",
      logoUrl: "https://cdn.simpleicons.org/fedora",
      baseDistro: "Fedora",
      desktopEnvironments: ["GNOME"],
    });

    await this.createDistribution({
      name: "Clear Linux",
      description: "Clear Linux is an Intel-developed distribution optimized for performance and security. Features aggressive compiler optimizations and a unique stateless design.",
      websiteUrl: "https://clearlinux.org",
      logoUrl: "https://cdn.simpleicons.org/linux",
      baseDistro: "Independent",
      desktopEnvironments: ["GNOME", "KDE Plasma", "Xfce"],
    });

    await this.createDistribution({
      name: "Alpine Linux",
      description: "Alpine Linux is a security-oriented, lightweight distribution based on musl libc and BusyBox. Popular for containers, servers, and embedded systems.",
      websiteUrl: "https://www.alpinelinux.org",
      logoUrl: "https://cdn.simpleicons.org/alpinelinux",
      baseDistro: "Independent",
      desktopEnvironments: ["Xfce", "GNOME"],
    });

    await this.createDistribution({
      name: "Raspberry Pi OS",
      description: "Raspberry Pi OS is the official operating system for Raspberry Pi computers. Debian-based and optimized for the Raspberry Pi hardware platform.",
      websiteUrl: "https://www.raspberrypi.com/software",
      logoUrl: "https://cdn.simpleicons.org/raspberrypi",
      baseDistro: "Debian",
      desktopEnvironments: ["Pixel", "KDE Plasma"],
    });

    await this.createDistribution({
      name: "Armbian",
      description: "Armbian is a Debian and Ubuntu-based distribution optimized for ARM single-board computers. Supports hundreds of different ARM development boards.",
      websiteUrl: "https://www.armbian.com",
      logoUrl: "https://cdn.simpleicons.org/linux",
      baseDistro: "Debian",
      desktopEnvironments: ["Xfce", "GNOME", "Cinnamon"],
    });

    await this.createDistribution({
      name: "Asahi Linux",
      description: "Asahi Linux is a project to port Linux to Apple Silicon Macs. Provides excellent support for M1, M2, and M3 Apple hardware.",
      websiteUrl: "https://asahilinux.org",
      logoUrl: "https://cdn.simpleicons.org/asahilinux",
      baseDistro: "Arch",
      desktopEnvironments: ["KDE Plasma", "GNOME"],
    });

    await this.createDistribution({
      name: "Manjaro",
      description: "Manjaro is a user-friendly Arch-based distribution with a focus on accessibility. Provides Arch's rolling release model with added stability and ease of use.",
      websiteUrl: "https://manjaro.org",
      logoUrl: "https://cdn.simpleicons.org/manjaro",
      baseDistro: "Arch",
      desktopEnvironments: ["KDE Plasma", "GNOME", "Xfce"],
    });

    // Seed releases for Ubuntu
    const ubuntu2404 = await this.createRelease({
      distroId: ubuntu.id,
      versionNumber: "24.04.3 LTS (Noble Numbat)",
      releaseDate: new Date("2024-04-25"), // Release date of base, or update to .3 date? Keeping base.
      isLts: true,
    });

    // Seed downloads for Ubuntu 24.04
    await this.createDownload({
      releaseId: ubuntu2404.id,
      architecture: "amd64",
      isoUrl: "https://releases.ubuntu.com/noble/ubuntu-24.04.3-desktop-amd64.iso",
      torrentUrl: "https://releases.ubuntu.com/noble/ubuntu-24.04.3-desktop-amd64.iso.torrent",
      checksum: "sha256: See https://releases.ubuntu.com/noble/SHA256SUMS",
      downloadSize: "5.8 GB",
    });

    await this.createDownload({
      releaseId: ubuntu2404.id,
      architecture: "arm64",
      isoUrl: "https://cdimage.ubuntu.com/releases/24.04.3/release/ubuntu-24.04.3-desktop-arm64.iso",
      torrentUrl: "https://cdimage.ubuntu.com/releases/24.04.3/release/ubuntu-24.04.3-desktop-arm64.iso.torrent",
      checksum: "sha256: See https://cdimage.ubuntu.com/releases/24.04.3/release/SHA256SUMS",
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
    const debian13 = await this.createRelease({
      distroId: debian.id,
      versionNumber: "13 (Trixie)",
      releaseDate: new Date("2025-06-10"), // Estimated/Simulated
      isLts: true,
    });

    await this.createDownload({
      releaseId: debian13.id,
      architecture: "amd64",
      isoUrl: "https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/debian-13.2.0-amd64-netinst.iso",
      torrentUrl: "https://cdimage.debian.org/debian-cd/current/amd64/bt-cd/debian-13.2.0-amd64-netinst.iso.torrent",
      checksum: "sha256: See https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/SHA256SUMS",
      downloadSize: "660 MB",
    });

    await this.createDownload({
      releaseId: debian13.id,
      architecture: "arm64",
      isoUrl: "https://cdimage.debian.org/debian-cd/current/arm64/iso-cd/debian-13.2.0-arm64-netinst.iso",
      torrentUrl: "https://cdimage.debian.org/debian-cd/current/arm64/bt-cd/debian-13.2.0-arm64-netinst.iso.torrent",
      checksum: "sha256: See https://cdimage.debian.org/debian-cd/current/arm64/iso-cd/SHA256SUMS",
      downloadSize: "700 MB",
    });

    // Seed releases for Arch Linux
    const arch202512 = await this.createRelease({
      distroId: arch.id,
      versionNumber: "2025.12.01",
      releaseDate: new Date("2025-12-01"),
      isLts: false,
    });

    await this.createDownload({
      releaseId: arch202512.id,
      architecture: "amd64",
      isoUrl: "https://geo.mirror.pkgbuild.com/iso/2025.12.01/archlinux-2025.12.01-x86_64.iso",
      torrentUrl: "https://archlinux.org/releng/releases/2025.12.01/torrent/",
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

  async seedAdditionalDistros(): Promise<void> {
    const names = ["Bazzite", "Bluefin", "CachyOS", "Rhino Linux", "ChimeraOS", "Whonix", "Oracle Linux", "Nitrux", "KaOS", "Ultramarine", "Pop!_OS", "openSUSE Tumbleweed", "openSUSE Leap", "Elementary OS", "Zorin OS", "MX Linux", "EndeavourOS", "Garuda Linux", "Solus", "Kali Linux"];
    await db.delete(distributions).where(inArray(distributions.name, names));

    // 1. Bazzite
    const bazzite = await this.createDistribution({
      name: "Bazzite",
      description: "Bazzite is a custom image built upon Fedora Atomic Desktops that brings the best of Linux gaming to all your devices - including the Steam Deck and other handhelds. Features a SteamOS-like experience.",
      websiteUrl: "https://bazzite.gg",
      logoUrl: "https://cdn.simpleicons.org/linux",
      baseDistro: "Fedora",
      desktopEnvironments: ["KDE Plasma", "GNOME"],
    });

    const bazzite39 = await this.createRelease({
      distroId: bazzite.id,
      versionNumber: "Fedora 39",
      releaseDate: new Date("2024-01-01"),
      isLts: false,
    });

    await this.createDownload({
      releaseId: bazzite39.id,
      architecture: "amd64",
      isoUrl: "https://download.bazzite.gg/bazzite-stable-amd64.iso", // Generic stable guess, verify if fails
      torrentUrl: null,
      downloadSize: "3.2 GB",
    });

    // 2. Bluefin
    const bluefin = await this.createDistribution({
      name: "Bluefin",
      description: "Bluefin is a custom image of Fedora Silverblue. It's designed to be a reliable, cloud-native desktop experience for developers and enthusiasts. Includes built-in devcontainers and flatpaks.",
      websiteUrl: "https://projectbluefin.io",
      logoUrl: "https://avatars.githubusercontent.com/u/120286780?s=200&v=4",
      baseDistro: "Fedora",
      desktopEnvironments: ["GNOME"],
    });

    const bluefin39 = await this.createRelease({
      distroId: bluefin.id,
      versionNumber: "dx",
      releaseDate: new Date("2024-02-15"),
      isLts: false,
    });

    await this.createDownload({
      releaseId: bluefin39.id,
      architecture: "amd64",
      isoUrl: "https://download.projectbluefin.io/bluefin-stable-x86_64.iso",
      torrentUrl: null,
      downloadSize: "3.5 GB",
    });

    // 3. CachyOS
    const cachyos = await this.createDistribution({
      name: "CachyOS",
      description: "CachyOS is an Arch-based distribution optimized for speed, security, and ease of use. Features x86-64-v3 optimizations and a custom kernel scheduler for enhanced performance.",
      websiteUrl: "https://cachyos.org",
      logoUrl: "https://cdn.simpleicons.org/linux",
      baseDistro: "Arch",
      desktopEnvironments: ["KDE Plasma", "GNOME", "Xfce", "Hyprland"],
    });

    const cachyosRelease = await this.createRelease({
      distroId: cachyos.id,
      versionNumber: "251129",
      releaseDate: new Date("2025-11-29"),
      isLts: false,
    });

    await this.createDownload({
      releaseId: cachyosRelease.id,
      architecture: "amd64",
      isoUrl: "https://sourceforge.net/projects/cachyos-arch/files/ISO/kde/251129/cachyos-kde-linux-251129.iso/download",
      torrentUrl: null,
      downloadSize: "2.8 GB",
    });

    // 4. Rhino Linux
    const rhino = await this.createDistribution({
      name: "Rhino Linux",
      description: "Rhino Linux is a rolling-release distribution based on Ubuntu. It uses a custom package manager wrapper (pacstall) and the Unicorn desktop interface.",
      websiteUrl: "https://rhinolinux.org",
      logoUrl: "https://avatars.githubusercontent.com/u/102556553?s=200&v=4",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["Unicorn (Xfce)"],
    });

    const rhinoRelease = await this.createRelease({
      distroId: rhino.id,
      versionNumber: "2024.1",
      releaseDate: new Date("2024-03-01"),
      isLts: false,
    });

    await this.createDownload({
      releaseId: rhinoRelease.id,
      architecture: "amd64",
      isoUrl: "https://sourceforge.net/projects/rhino-linux-builder/files/2025.4/Rhino-Linux-2025.4-amd64.iso/download",
      torrentUrl: null,
      downloadSize: "2.5 GB",
    });

    // 5. ChimeraOS
    const chimera = await this.createDistribution({
      name: "ChimeraOS",
      description: "ChimeraOS is a Linux distribution that provides a console-like gaming experience for your PC. It boots directly into Steam Big Picture mode and supports games from other stores.",
      websiteUrl: "https://chimeraos.org",
      logoUrl: "https://cdn.simpleicons.org/linux",
      baseDistro: "Arch",
      desktopEnvironments: ["GNOME (Steam BPM)"],
    });

    const chimeraRelease = await this.createRelease({
      distroId: chimera.id,
      versionNumber: "2024.01.20",
      releaseDate: new Date("2024-01-20"),
      isLts: false,
    });

    await this.createDownload({
      releaseId: chimeraRelease.id,
      architecture: "amd64",
      isoUrl: "https://github.com/ChimeraOS/install-media/releases/download/2025-02-13_7e927cf/chimeraos-2025.02.13-x86_64.iso",
      torrentUrl: null,
      downloadSize: "1.2 GB",
    });

    // 6. Whonix
    const whonix = await this.createDistribution({
      name: "Whonix",
      description: "Whonix is a desktop operating system designed for advanced security and privacy. It forces all connections through Tor and isolates the workstation from the network gateway.",
      websiteUrl: "https://www.whonix.org",
      logoUrl: "https://cdn.simpleicons.org/linux",
      baseDistro: "Debian",
      desktopEnvironments: ["Xfce"],
    });

    const whonixRelease = await this.createRelease({
      distroId: whonix.id,
      versionNumber: "18.0.8.7",
      releaseDate: new Date("2025-11-28"),
      isLts: true,
    });

    await this.createDownload({
      releaseId: whonixRelease.id,
      architecture: "amd64",
      isoUrl: "https://download.whonix.org/ova/18.0.8.7/Whonix-LXQt-18.0.8.7.Intel_AMD64.ova",
      torrentUrl: null,
      downloadSize: "2.1 GB",
    });

    // 7. Oracle Linux
    const oracle = await this.createDistribution({
      name: "Oracle Linux",
      description: "Oracle Linux is an enterprise-class Linux distribution supported by Oracle. It provides 100% application binary compatibility with Red Hat Enterprise Linux.",
      websiteUrl: "https://www.oracle.com/linux",
      logoUrl: "https://cdn.simpleicons.org/linux",
      baseDistro: "RHEL",
      desktopEnvironments: ["GNOME"],
    });

    const oracle9 = await this.createRelease({
      distroId: oracle.id,
      versionNumber: "9.3",
      releaseDate: new Date("2023-11-15"),
      isLts: true,
    });

    await this.createDownload({
      releaseId: oracle9.id,
      architecture: "amd64",
      isoUrl: "https://yum.oracle.com/ISOS/OracleLinux/OL9/u3/x86_64/OracleLinux-R9-U3-x86_64-dvd.iso",
      torrentUrl: null,
      downloadSize: "9.6 GB",
    });

    // 8. Nitrux
    const nitrux = await this.createDistribution({
      name: "Nitrux",
      description: "Nitrux is a Debian-based Linux distribution directly based on the unstable branch. It features the NX Desktop, built on top of KDE Plasma, with a focus on aesthetics and usability.",
      websiteUrl: "https://nxos.org",
      logoUrl: "https://cdn.simpleicons.org/linux",
      baseDistro: "Debian",
      desktopEnvironments: ["NX Desktop"],
    });

    const nitruxRelease = await this.createRelease({
      distroId: nitrux.id,
      versionNumber: "5.0.0",
      releaseDate: new Date("2025-11-13"),
      isLts: false,
    });

    await this.createDownload({
      releaseId: nitruxRelease.id,
      architecture: "amd64",
      isoUrl: "https://sourceforge.net/projects/nitruxos/files/latest/download",
      torrentUrl: null,
      downloadSize: "3.1 GB",
    });

    // 9. KaOS
    const kaos = await this.createDistribution({
      name: "KaOS",
      description: "KaOS is an independent Linux distribution focused on Qt and KDE. It is a rolling release built from scratch, providing a highly integrated Plasma experience.",
      websiteUrl: "https://kaosx.us",
      logoUrl: "https://cdn.simpleicons.org/linux",
      baseDistro: "Independent",
      desktopEnvironments: ["KDE Plasma"],
    });

    const kaosRelease = await this.createRelease({
      distroId: kaos.id,
      versionNumber: "2024.03",
      releaseDate: new Date("2024-03-24"),
      isLts: false,
    });

    await this.createDownload({
      releaseId: kaosRelease.id,
      architecture: "amd64",
      isoUrl: "https://sourceforge.net/projects/kaosx/files/ISO/KaOS-2024.03-x86_64.iso/download",
      torrentUrl: null,
      downloadSize: "3.0 GB",
    });

    // 10. Ultramarine Linux
    const ultramarine = await this.createDistribution({
      name: "Ultramarine",
      description: "Ultramarine Linux is a Fedora-based distribution designed to be usable out of the box. It includes RPM Fusion and codecs by default, making it a great choice for beginners.",
      websiteUrl: "https://ultramarine-linux.org",
      logoUrl: "https://cdn.simpleicons.org/linux",
      baseDistro: "Fedora",
      desktopEnvironments: ["Budgie", "GNOME", "KDE Plasma", "Pantheon"],
    });

    const ultramarine39 = await this.createRelease({
      distroId: ultramarine.id,
      versionNumber: "40",
      releaseDate: new Date("2025-05-20"),
      isLts: false,
    });

    await this.createDownload({
      releaseId: ultramarine39.id,
      architecture: "amd64",
      isoUrl: "https://images.fyralabs.com/ultramarine/40/Ultramarine-Budgie-Live-x86_64-40.iso",
      torrentUrl: null,
      downloadSize: "2.3 GB",
    });
  }
}

export const storage = new DatabaseStorage();

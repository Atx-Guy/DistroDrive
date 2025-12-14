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
  
  // Compare distributions
  getDistributionsWithSpecs(): Promise<DistributionWithSpecs[]>;
  
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
      return; // Already seeded
    }

    // Seed all 50 distributions
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

    // Additional 45 distributions
    await this.createDistribution({
      name: "Pop!_OS",
      description: "Pop!_OS is a Linux distribution developed by System76 based on Ubuntu. Designed for creators, developers, and gamers with excellent hardware support and a tiling window manager.",
      websiteUrl: "https://pop.system76.com",
      logoUrl: "https://placehold.co/400x400?text=P",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["COSMIC", "GNOME"],
    });

    await this.createDistribution({
      name: "openSUSE Tumbleweed",
      description: "openSUSE Tumbleweed is a rolling release distribution that provides the latest stable versions of all software. Perfect for developers and experienced users who want cutting-edge packages.",
      websiteUrl: "https://www.opensuse.org",
      logoUrl: "https://placehold.co/400x400?text=O",
      baseDistro: "SUSE",
      desktopEnvironments: ["KDE Plasma", "GNOME", "Xfce"],
    });

    await this.createDistribution({
      name: "openSUSE Leap",
      description: "openSUSE Leap is a stable, enterprise-grade distribution that shares its codebase with SUSE Linux Enterprise. Ideal for users who want reliability with regular point releases.",
      websiteUrl: "https://www.opensuse.org",
      logoUrl: "https://placehold.co/400x400?text=O",
      baseDistro: "SUSE",
      desktopEnvironments: ["KDE Plasma", "GNOME", "Xfce"],
    });

    await this.createDistribution({
      name: "Elementary OS",
      description: "Elementary OS is a beautifully designed Linux distribution focused on simplicity and elegance. Features the custom Pantheon desktop environment inspired by macOS.",
      websiteUrl: "https://elementary.io",
      logoUrl: "https://placehold.co/400x400?text=E",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["Pantheon"],
    });

    await this.createDistribution({
      name: "Zorin OS",
      description: "Zorin OS is designed to make Linux easy for Windows and macOS users. Features a familiar interface with multiple layout options and excellent compatibility.",
      websiteUrl: "https://zorin.com/os",
      logoUrl: "https://placehold.co/400x400?text=Z",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["GNOME", "Xfce"],
    });

    await this.createDistribution({
      name: "MX Linux",
      description: "MX Linux is a midweight distribution based on Debian stable. Known for its efficiency, elegance, and extensive collection of custom tools and utilities.",
      websiteUrl: "https://mxlinux.org",
      logoUrl: "https://placehold.co/400x400?text=M",
      baseDistro: "Debian",
      desktopEnvironments: ["Xfce", "KDE Plasma", "Fluxbox"],
    });

    await this.createDistribution({
      name: "EndeavourOS",
      description: "EndeavourOS is a user-friendly Arch-based distribution. Provides a terminal-centric experience while remaining accessible to newcomers wanting to learn Arch.",
      websiteUrl: "https://endeavouros.com",
      logoUrl: "https://placehold.co/400x400?text=E",
      baseDistro: "Arch",
      desktopEnvironments: ["KDE Plasma", "GNOME", "Xfce", "i3", "Budgie", "Cinnamon"],
    });

    await this.createDistribution({
      name: "Garuda Linux",
      description: "Garuda Linux is a performance-focused Arch-based distribution optimized for gaming. Features BTRFS snapshots, performance tweaks, and beautiful theming out of the box.",
      websiteUrl: "https://garudalinux.org",
      logoUrl: "https://placehold.co/400x400?text=G",
      baseDistro: "Arch",
      desktopEnvironments: ["KDE Plasma", "GNOME", "Xfce", "i3", "Sway"],
    });

    await this.createDistribution({
      name: "Solus",
      description: "Solus is an independently developed Linux distribution built from scratch. Home of the Budgie desktop environment with a focus on simplicity and elegance.",
      websiteUrl: "https://getsol.us",
      logoUrl: "https://placehold.co/400x400?text=S",
      baseDistro: "Independent",
      desktopEnvironments: ["Budgie", "GNOME", "KDE Plasma", "MATE"],
    });

    await this.createDistribution({
      name: "Kali Linux",
      description: "Kali Linux is a Debian-based distribution designed for digital forensics and penetration testing. Includes hundreds of security tools pre-installed.",
      websiteUrl: "https://www.kali.org",
      logoUrl: "https://placehold.co/400x400?text=K",
      baseDistro: "Debian",
      desktopEnvironments: ["Xfce", "GNOME", "KDE Plasma"],
    });

    await this.createDistribution({
      name: "Kubuntu",
      description: "Kubuntu is an official Ubuntu flavor featuring the KDE Plasma desktop. Combines Ubuntu's reliability with KDE's powerful and customizable interface.",
      websiteUrl: "https://kubuntu.org",
      logoUrl: "https://placehold.co/400x400?text=K",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["KDE Plasma"],
    });

    await this.createDistribution({
      name: "Xubuntu",
      description: "Xubuntu is an official Ubuntu flavor with the Xfce desktop environment. Lightweight and elegant, perfect for older hardware or users who prefer simplicity.",
      websiteUrl: "https://xubuntu.org",
      logoUrl: "https://placehold.co/400x400?text=X",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["Xfce"],
    });

    await this.createDistribution({
      name: "Lubuntu",
      description: "Lubuntu is an official lightweight Ubuntu flavor using LXQt desktop. Designed for older computers and resource-constrained environments.",
      websiteUrl: "https://lubuntu.me",
      logoUrl: "https://placehold.co/400x400?text=L",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["LXQt"],
    });

    await this.createDistribution({
      name: "Ubuntu MATE",
      description: "Ubuntu MATE is an official Ubuntu flavor featuring the MATE desktop. Provides a traditional desktop experience with modern features and stability.",
      websiteUrl: "https://ubuntu-mate.org",
      logoUrl: "https://placehold.co/400x400?text=U",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["MATE"],
    });

    await this.createDistribution({
      name: "Ubuntu Studio",
      description: "Ubuntu Studio is an official Ubuntu flavor optimized for creative professionals. Pre-configured for audio, video, graphics, and publishing workflows.",
      websiteUrl: "https://ubuntustudio.org",
      logoUrl: "https://placehold.co/400x400?text=U",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["KDE Plasma"],
    });

    await this.createDistribution({
      name: "CentOS Stream",
      description: "CentOS Stream is a continuously delivered Linux distribution that tracks just ahead of Red Hat Enterprise Linux. Ideal for developers targeting RHEL.",
      websiteUrl: "https://www.centos.org",
      logoUrl: "https://placehold.co/400x400?text=C",
      baseDistro: "RHEL",
      desktopEnvironments: ["GNOME"],
    });

    await this.createDistribution({
      name: "Rocky Linux",
      description: "Rocky Linux is an enterprise-grade Linux distribution designed to be 100% bug-for-bug compatible with Red Hat Enterprise Linux. Community-driven RHEL rebuild.",
      websiteUrl: "https://rockylinux.org",
      logoUrl: "https://placehold.co/400x400?text=R",
      baseDistro: "RHEL",
      desktopEnvironments: ["GNOME"],
    });

    await this.createDistribution({
      name: "AlmaLinux",
      description: "AlmaLinux is a free, enterprise-grade Linux distribution that is binary compatible with RHEL. Backed by CloudLinux with long-term support.",
      websiteUrl: "https://almalinux.org",
      logoUrl: "https://placehold.co/400x400?text=A",
      baseDistro: "RHEL",
      desktopEnvironments: ["GNOME"],
    });

    await this.createDistribution({
      name: "Void Linux",
      description: "Void Linux is an independent rolling-release distribution with its own package manager (XBPS) and init system (runit). Minimalist and highly customizable.",
      websiteUrl: "https://voidlinux.org",
      logoUrl: "https://placehold.co/400x400?text=V",
      baseDistro: "Independent",
      desktopEnvironments: ["Any (user choice)"],
    });

    await this.createDistribution({
      name: "Gentoo",
      description: "Gentoo is a source-based Linux distribution built around the Portage package manager. Offers maximum customization and optimization for your hardware.",
      websiteUrl: "https://www.gentoo.org",
      logoUrl: "https://placehold.co/400x400?text=G",
      baseDistro: "Independent",
      desktopEnvironments: ["Any (user choice)"],
    });

    await this.createDistribution({
      name: "Slackware",
      description: "Slackware is the oldest actively maintained Linux distribution. Known for its simplicity, stability, and Unix-like philosophy with minimal modifications.",
      websiteUrl: "http://www.slackware.com",
      logoUrl: "https://placehold.co/400x400?text=S",
      baseDistro: "Independent",
      desktopEnvironments: ["KDE Plasma", "Xfce"],
    });

    await this.createDistribution({
      name: "NixOS",
      description: "NixOS is a Linux distribution built on the Nix package manager. Features declarative configuration, atomic upgrades, and reproducible system builds.",
      websiteUrl: "https://nixos.org",
      logoUrl: "https://placehold.co/400x400?text=N",
      baseDistro: "Independent",
      desktopEnvironments: ["GNOME", "KDE Plasma", "Xfce"],
    });

    await this.createDistribution({
      name: "Tails",
      description: "Tails is a portable Linux distribution focused on privacy and anonymity. Routes all traffic through Tor and leaves no trace on the host computer.",
      websiteUrl: "https://tails.net",
      logoUrl: "https://placehold.co/400x400?text=T",
      baseDistro: "Debian",
      desktopEnvironments: ["GNOME"],
    });

    await this.createDistribution({
      name: "Qubes OS",
      description: "Qubes OS is a security-focused desktop operating system using Xen-based virtualization. Isolates applications in separate virtual machines for maximum security.",
      websiteUrl: "https://www.qubes-os.org",
      logoUrl: "https://placehold.co/400x400?text=Q",
      baseDistro: "Independent",
      desktopEnvironments: ["Xfce"],
    });

    await this.createDistribution({
      name: "Parrot OS",
      description: "Parrot OS is a Debian-based distribution designed for security, development, and privacy. Includes comprehensive tools for penetration testing and forensics.",
      websiteUrl: "https://www.parrotsec.org",
      logoUrl: "https://placehold.co/400x400?text=P",
      baseDistro: "Debian",
      desktopEnvironments: ["MATE", "KDE Plasma"],
    });

    await this.createDistribution({
      name: "Peppermint OS",
      description: "Peppermint OS is a lightweight Debian-based distribution focused on cloud computing and web applications. Fast and efficient with minimal resource usage.",
      websiteUrl: "https://peppermintos.com",
      logoUrl: "https://placehold.co/400x400?text=P",
      baseDistro: "Debian",
      desktopEnvironments: ["Xfce"],
    });

    await this.createDistribution({
      name: "antiX",
      description: "antiX is a fast, lightweight Debian-based distribution designed for older computers. Systemd-free with multiple lightweight window managers available.",
      websiteUrl: "https://antixlinux.com",
      logoUrl: "https://placehold.co/400x400?text=A",
      baseDistro: "Debian",
      desktopEnvironments: ["IceWM", "Fluxbox", "JWM"],
    });

    await this.createDistribution({
      name: "Bodhi Linux",
      description: "Bodhi Linux is a lightweight Ubuntu-based distribution featuring the Moksha desktop environment. Minimalist by design with a focus on user choice.",
      websiteUrl: "https://www.bodhilinux.com",
      logoUrl: "https://placehold.co/400x400?text=B",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["Moksha"],
    });

    await this.createDistribution({
      name: "Deepin",
      description: "Deepin is a Debian-based distribution featuring the beautiful Deepin Desktop Environment (DDE). Known for its elegant design and user-friendly experience.",
      websiteUrl: "https://www.deepin.org",
      logoUrl: "https://placehold.co/400x400?text=D",
      baseDistro: "Debian",
      desktopEnvironments: ["DDE"],
    });

    await this.createDistribution({
      name: "KDE neon",
      description: "KDE neon is an Ubuntu-based distribution that provides the latest KDE Plasma desktop and applications. Perfect for users who want cutting-edge KDE software.",
      websiteUrl: "https://neon.kde.org",
      logoUrl: "https://placehold.co/400x400?text=K",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["KDE Plasma"],
    });

    await this.createDistribution({
      name: "LMDE",
      description: "Linux Mint Debian Edition (LMDE) is a version of Linux Mint based directly on Debian instead of Ubuntu. Provides the Mint experience with a Debian foundation.",
      websiteUrl: "https://linuxmint.com",
      logoUrl: "https://placehold.co/400x400?text=L",
      baseDistro: "Debian",
      desktopEnvironments: ["Cinnamon"],
    });

    await this.createDistribution({
      name: "Mageia",
      description: "Mageia is a community-driven Linux distribution forked from Mandriva Linux. Features excellent hardware detection and a user-friendly control center.",
      websiteUrl: "https://www.mageia.org",
      logoUrl: "https://placehold.co/400x400?text=M",
      baseDistro: "Independent",
      desktopEnvironments: ["KDE Plasma", "GNOME", "Xfce"],
    });

    await this.createDistribution({
      name: "PCLinuxOS",
      description: "PCLinuxOS is an independent rolling-release distribution known for its out-of-the-box usability. Features excellent hardware support and multimedia capabilities.",
      websiteUrl: "https://www.pclinuxos.com",
      logoUrl: "https://placehold.co/400x400?text=P",
      baseDistro: "Independent",
      desktopEnvironments: ["KDE Plasma", "MATE", "Xfce"],
    });

    await this.createDistribution({
      name: "Puppy Linux",
      description: "Puppy Linux is an extremely lightweight distribution designed to run entirely in RAM. Perfect for old computers or as a portable rescue system.",
      websiteUrl: "https://puppylinux-woof-ce.github.io",
      logoUrl: "https://placehold.co/400x400?text=P",
      baseDistro: "Independent",
      desktopEnvironments: ["JWM", "Openbox"],
    });

    await this.createDistribution({
      name: "SparkyLinux",
      description: "SparkyLinux is a lightweight Debian-based distribution available in stable and rolling release versions. Offers various desktop environments for different use cases.",
      websiteUrl: "https://sparkylinux.org",
      logoUrl: "https://placehold.co/400x400?text=S",
      baseDistro: "Debian",
      desktopEnvironments: ["LXQt", "KDE Plasma", "Xfce", "MATE"],
    });

    await this.createDistribution({
      name: "Artix Linux",
      description: "Artix Linux is an Arch-based distribution that uses alternative init systems instead of systemd. Supports OpenRC, runit, and s6 init systems.",
      websiteUrl: "https://artixlinux.org",
      logoUrl: "https://placehold.co/400x400?text=A",
      baseDistro: "Arch",
      desktopEnvironments: ["KDE Plasma", "GNOME", "Xfce", "LXQt"],
    });

    await this.createDistribution({
      name: "Vanilla OS",
      description: "Vanilla OS is an immutable Ubuntu-based distribution designed for reliability and security. Features atomic updates and containerized application support.",
      websiteUrl: "https://vanillaos.org",
      logoUrl: "https://placehold.co/400x400?text=V",
      baseDistro: "Ubuntu",
      desktopEnvironments: ["GNOME"],
    });

    await this.createDistribution({
      name: "Nobara",
      description: "Nobara is a Fedora-based distribution optimized for gaming and content creation. Includes gaming-specific patches, drivers, and pre-configured optimizations.",
      websiteUrl: "https://nobaraproject.org",
      logoUrl: "https://placehold.co/400x400?text=N",
      baseDistro: "Fedora",
      desktopEnvironments: ["KDE Plasma", "GNOME"],
    });

    await this.createDistribution({
      name: "Fedora Silverblue",
      description: "Fedora Silverblue is an immutable desktop operating system based on Fedora. Uses rpm-ostree for atomic updates and Flatpak for applications.",
      websiteUrl: "https://fedoraproject.org/silverblue",
      logoUrl: "https://placehold.co/400x400?text=F",
      baseDistro: "Fedora",
      desktopEnvironments: ["GNOME"],
    });

    await this.createDistribution({
      name: "Clear Linux",
      description: "Clear Linux is an Intel-developed distribution optimized for performance and security. Features aggressive compiler optimizations and a unique stateless design.",
      websiteUrl: "https://clearlinux.org",
      logoUrl: "https://placehold.co/400x400?text=C",
      baseDistro: "Independent",
      desktopEnvironments: ["GNOME", "KDE Plasma", "Xfce"],
    });

    await this.createDistribution({
      name: "Alpine Linux",
      description: "Alpine Linux is a security-oriented, lightweight distribution based on musl libc and BusyBox. Popular for containers, servers, and embedded systems.",
      websiteUrl: "https://www.alpinelinux.org",
      logoUrl: "https://placehold.co/400x400?text=A",
      baseDistro: "Independent",
      desktopEnvironments: ["Xfce", "GNOME"],
    });

    await this.createDistribution({
      name: "Raspberry Pi OS",
      description: "Raspberry Pi OS is the official operating system for Raspberry Pi computers. Debian-based and optimized for the Raspberry Pi hardware platform.",
      websiteUrl: "https://www.raspberrypi.com/software",
      logoUrl: "https://placehold.co/400x400?text=R",
      baseDistro: "Debian",
      desktopEnvironments: ["Pixel", "KDE Plasma"],
    });

    await this.createDistribution({
      name: "Armbian",
      description: "Armbian is a Debian and Ubuntu-based distribution optimized for ARM single-board computers. Supports hundreds of different ARM development boards.",
      websiteUrl: "https://www.armbian.com",
      logoUrl: "https://placehold.co/400x400?text=A",
      baseDistro: "Debian",
      desktopEnvironments: ["Xfce", "GNOME", "Cinnamon"],
    });

    await this.createDistribution({
      name: "Asahi Linux",
      description: "Asahi Linux is a project to port Linux to Apple Silicon Macs. Provides excellent support for M1, M2, and M3 Apple hardware.",
      websiteUrl: "https://asahilinux.org",
      logoUrl: "https://placehold.co/400x400?text=A",
      baseDistro: "Arch",
      desktopEnvironments: ["KDE Plasma", "GNOME"],
    });

    await this.createDistribution({
      name: "Manjaro",
      description: "Manjaro is a user-friendly Arch-based distribution with a focus on accessibility. Provides Arch's rolling release model with added stability and ease of use.",
      websiteUrl: "https://manjaro.org",
      logoUrl: "https://placehold.co/400x400?text=M",
      baseDistro: "Arch",
      desktopEnvironments: ["KDE Plasma", "GNOME", "Xfce"],
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

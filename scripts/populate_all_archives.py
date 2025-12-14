#!/usr/bin/env python3
"""
Complete Historical Archive Population Script

This script populates the database with ALL historical versions of major Linux distributions
by scraping official archive mirrors.

Usage:
    python scripts/populate_all_archives.py
"""

import os
import re
import sys
import asyncio
from datetime import datetime
from urllib.parse import urljoin, urlparse

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("Error: psycopg2 package not installed")
    sys.exit(1)

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("Error: playwright package not installed")
    sys.exit(1)

TIMEOUT = 30000

# Complete archive configurations for ALL distributions
ARCHIVE_CONFIGS = {
    'Ubuntu': {
        'archives': [
            'http://old-releases.ubuntu.com/releases/',
            'https://releases.ubuntu.com/',
        ],
        'version_pattern': r'^(\d+\.\d+(\.\d+)?)\/?$',
        'iso_subfolders': ['', 'release/'],
        'iso_pattern': r'ubuntu-.*-desktop-amd64\.iso$|ubuntu-.*-live-server-amd64\.iso$',
    },
    'Fedora': {
        'archives': [
            'https://archives.fedoraproject.org/pub/archive/fedora/linux/releases/',
            'https://download.fedoraproject.org/pub/fedora/linux/releases/',
        ],
        'version_pattern': r'^(\d+)\/?$',
        'iso_subfolders': ['Workstation/x86_64/iso/', 'Server/x86_64/iso/', 'Everything/x86_64/iso/'],
        'iso_pattern': r'\.iso$',
    },
    'Debian': {
        'archives': [
            'https://cdimage.debian.org/cdimage/archive/',
        ],
        'version_pattern': r'^(\d+\.\d+\.\d+)\/?$',
        'iso_subfolders': ['amd64/iso-cd/', 'amd64/iso-dvd/'],
        'iso_pattern': r'debian-.*-amd64-.*\.iso$',
    },
    'Linux Mint': {
        'archives': [
            'https://mirrors.kernel.org/linuxmint/stable/',
        ],
        'version_pattern': r'^(\d+(\.\d+)?)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'linuxmint-.*-cinnamon-64bit\.iso$|linuxmint-.*-mate-64bit\.iso$',
    },
    'Arch Linux': {
        'archives': [
            'https://archive.archlinux.org/iso/',
        ],
        'version_pattern': r'^(\d{4}\.\d{2}\.\d{2})\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'archlinux-.*-x86_64\.iso$',
    },
    'Manjaro': {
        'archives': [
            'https://download.manjaro.org/kde/',
            'https://download.manjaro.org/gnome/',
            'https://download.manjaro.org/xfce/',
        ],
        'version_pattern': r'^(\d+\.\d+(\.\d+)?)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'manjaro-.*\.iso$',
    },
    'openSUSE Leap': {
        'archives': [
            'https://download.opensuse.org/distribution/leap/',
        ],
        'version_pattern': r'^(\d+\.\d+)\/?$',
        'iso_subfolders': ['iso/'],
        'iso_pattern': r'openSUSE-Leap-.*-DVD-x86_64.*\.iso$',
    },
    'Alpine Linux': {
        'archives': [
            'https://dl-cdn.alpinelinux.org/alpine/',
        ],
        'version_pattern': r'^v(\d+\.\d+)\/?$',
        'iso_subfolders': ['releases/x86_64/'],
        'iso_pattern': r'alpine-standard-.*-x86_64\.iso$|alpine-extended-.*-x86_64\.iso$',
    },
    'Rocky Linux': {
        'archives': [
            'https://download.rockylinux.org/pub/rocky/',
        ],
        'version_pattern': r'^(\d+(\.\d+)?)\/?$',
        'iso_subfolders': ['isos/x86_64/'],
        'iso_pattern': r'Rocky-.*-x86_64-dvd\.iso$|Rocky-.*-x86_64-minimal\.iso$',
    },
    'AlmaLinux': {
        'archives': [
            'https://repo.almalinux.org/almalinux/',
        ],
        'version_pattern': r'^(\d+(\.\d+)?)\/?$',
        'iso_subfolders': ['isos/x86_64/'],
        'iso_pattern': r'AlmaLinux-.*-x86_64-dvd\.iso$|AlmaLinux-.*-x86_64-minimal\.iso$',
    },
    'CentOS Stream': {
        'archives': [
            'https://mirrors.centos.org/mirrorlist?path=/9-stream/BaseOS/x86_64/iso/',
        ],
        'version_pattern': r'^(\d+)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'CentOS-Stream-.*\.iso$',
    },
    'Pop!_OS': {
        'archives': [
            'https://iso.pop-os.org/',
        ],
        'version_pattern': r'^(\d+\.\d+)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'pop-os.*\.iso$',
    },
    'Zorin OS': {
        'archives': [
            'https://zorinos.com/download/',
        ],
        'version_pattern': r'^(\d+)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'Zorin-OS-.*\.iso$',
    },
    'Elementary OS': {
        'archives': [
            'https://elementary.io/',
        ],
        'version_pattern': r'^(\d+(\.\d+)?)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'elementaryos-.*\.iso$',
    },
    'MX Linux': {
        'archives': [
            'https://sourceforge.net/projects/mx-linux/files/Final/',
        ],
        'version_pattern': r'^MX-(\d+(\.\d+)?)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'MX-.*\.iso$',
    },
    'EndeavourOS': {
        'archives': [
            'https://mirror.alpix.eu/endeavouros/iso/',
        ],
        'version_pattern': r'^(\d{4}\.\d{2}\.\d{2})\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'endeavouros.*\.iso$',
    },
    'Garuda Linux': {
        'archives': [
            'https://iso.builds.garudalinux.org/iso/',
        ],
        'version_pattern': r'^(\d+)\/?$',
        'iso_subfolders': ['garuda/'],
        'iso_pattern': r'garuda.*\.iso$',
    },
    'Solus': {
        'archives': [
            'https://mirrors.rit.edu/solus/images/',
        ],
        'version_pattern': r'^(\d+(\.\d+)?)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'Solus-.*\.iso$',
    },
    'Kali Linux': {
        'archives': [
            'https://cdimage.kali.org/',
        ],
        'version_pattern': r'^kali-(\d{4}\.\d+)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'kali-linux-.*-installer-amd64\.iso$',
    },
    'Void Linux': {
        'archives': [
            'https://repo-default.voidlinux.org/live/',
        ],
        'version_pattern': r'^(\d{8})\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'void-live-x86_64.*\.iso$',
    },
    'Gentoo': {
        'archives': [
            'https://distfiles.gentoo.org/releases/amd64/autobuilds/',
        ],
        'version_pattern': r'^(\d{8}T\d+Z)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'install-amd64-minimal.*\.iso$',
    },
    'NixOS': {
        'archives': [
            'https://releases.nixos.org/',
        ],
        'version_pattern': r'^nixos-(\d+\.\d+)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'nixos-.*\.iso$',
    },
    'Slackware': {
        'archives': [
            'https://mirrors.slackware.com/slackware/',
        ],
        'version_pattern': r'^slackware64-(\d+\.\d+)\/?$',
        'iso_subfolders': ['iso/'],
        'iso_pattern': r'slackware64-.*-install-dvd\.iso$',
    },
    'Tails': {
        'archives': [
            'https://tails.net/torrents/files/',
        ],
        'version_pattern': r'^tails-amd64-(\d+\.\d+)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'tails-amd64-.*\.iso$',
    },
    'Qubes OS': {
        'archives': [
            'https://mirrors.edge.kernel.org/qubes/iso/',
        ],
        'version_pattern': r'^Qubes-R(\d+\.\d+)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'Qubes-.*\.iso$',
    },
    'Parrot OS': {
        'archives': [
            'https://download.parrot.sh/parrot/iso/',
        ],
        'version_pattern': r'^(\d+\.\d+)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'Parrot-.*\.iso$',
    },
    'antiX': {
        'archives': [
            'https://sourceforge.net/projects/antix-linux/files/Final/',
        ],
        'version_pattern': r'^antiX-(\d+(\.\d+)?)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'antiX-.*\.iso$',
    },
    'Bodhi Linux': {
        'archives': [
            'https://sourceforge.net/projects/bodhilinux/files/',
        ],
        'version_pattern': r'^(\d+\.\d+\.\d+)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'bodhi-.*\.iso$',
    },
    'Deepin': {
        'archives': [
            'https://cdimage.deepin.com/releases/',
        ],
        'version_pattern': r'^(\d+(\.\d+)?)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'deepin-.*\.iso$',
    },
    'KDE neon': {
        'archives': [
            'https://files.kde.org/neon/images/user/',
        ],
        'version_pattern': r'^(\d{8}-\d+)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'neon-user-.*\.iso$',
    },
    'LMDE': {
        'archives': [
            'https://mirrors.kernel.org/linuxmint/debian/',
        ],
        'version_pattern': r'^lmde-(\d+)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'lmde-.*\.iso$',
    },
    'Mageia': {
        'archives': [
            'https://mirrors.kernel.org/mageia/iso/',
        ],
        'version_pattern': r'^(\d+)\/?$',
        'iso_subfolders': ['x86_64/'],
        'iso_pattern': r'Mageia-.*-x86_64\.iso$',
    },
    'PCLinuxOS': {
        'archives': [
            'https://ftp.nluug.nl/pub/os/Linux/distr/pclinuxos/pclinuxos/iso/',
        ],
        'version_pattern': r'^(\d{4}\.\d{2})\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'pclinuxos.*\.iso$',
    },
    'Puppy Linux': {
        'archives': [
            'https://distro.ibiblio.org/puppylinux/puppy-fossa/',
        ],
        'version_pattern': r'^(\d+)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'fossapup.*\.iso$',
    },
    'SparkyLinux': {
        'archives': [
            'https://sourceforge.net/projects/sparkylinux/files/',
        ],
        'version_pattern': r'^(\d+(\.\d+)?)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'sparkylinux-.*\.iso$',
    },
    'Peppermint OS': {
        'archives': [
            'https://peppermintos.com/iso/',
        ],
        'version_pattern': r'^(\d+)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'Peppermint.*\.iso$',
    },
    'Artix Linux': {
        'archives': [
            'https://iso.artixlinux.org/',
        ],
        'version_pattern': r'^(\d{8})\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'artix-.*\.iso$',
    },
    'Vanilla OS': {
        'archives': [
            'https://github.com/Vanilla-OS/live-iso/releases/',
        ],
        'version_pattern': r'^(\d+\.\d+)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'vanillaos-.*\.iso$',
    },
    'Nobara': {
        'archives': [
            'https://nobaraproject.org/download-nobara/',
        ],
        'version_pattern': r'^(\d+)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'Nobara-.*\.iso$',
    },
    'Fedora Silverblue': {
        'archives': [
            'https://download.fedoraproject.org/pub/fedora/linux/releases/',
        ],
        'version_pattern': r'^(\d+)\/?$',
        'iso_subfolders': ['Silverblue/x86_64/iso/'],
        'iso_pattern': r'Fedora-Silverblue-.*\.iso$',
    },
    'Clear Linux': {
        'archives': [
            'https://cdn.download.clearlinux.org/releases/',
        ],
        'version_pattern': r'^(\d+)\/?$',
        'iso_subfolders': ['clear/'],
        'iso_pattern': r'clear-.*\.iso$',
    },
    'Armbian': {
        'archives': [
            'https://dl.armbian.com/',
        ],
        'version_pattern': r'^(\d+\.\d+(\.\d+)?)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'Armbian.*\.img\.xz$',
    },
    'Raspberry Pi OS': {
        'archives': [
            'https://downloads.raspberrypi.com/raspios_armhf/images/',
        ],
        'version_pattern': r'^raspios_armhf-(\d{4}-\d{2}-\d{2})\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'.*\.img\.xz$',
    },
    'Asahi Linux': {
        'archives': [
            'https://github.com/AsahiLinux/asahi-installer/releases/',
        ],
        'version_pattern': r'^v(\d+\.\d+)\/?$',
        'iso_subfolders': [''],
        'iso_pattern': r'asahi-.*$',
    },
}


def get_db_connection():
    """Get PostgreSQL database connection."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL required")
        sys.exit(1)
    try:
        return psycopg2.connect(db_url)
    except Exception as e:
        print(f"Database connection error: {e}")
        sys.exit(1)


def get_distro_by_name(conn, name):
    """Get distribution by name."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM distributions WHERE LOWER(name) = LOWER(%s)", (name,))
        return cur.fetchone()


def get_existing_releases(conn, distro_id):
    """Get existing releases for a distro."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT r.*, 
                   (SELECT COUNT(*) FROM downloads d WHERE d.release_id = r.id AND d.iso_url IS NOT NULL AND d.iso_url != '' AND d.iso_url NOT LIKE '%placeholder%') as download_count
            FROM releases r 
            WHERE r.distro_id = %s 
            ORDER BY r.release_date DESC
        """, (distro_id,))
        return cur.fetchall()


def create_release(conn, distro_id, version, release_date=None, is_lts=False):
    """Create a release record."""
    if release_date is None:
        release_date = datetime.now()
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Check if exists
        cur.execute("""
            SELECT * FROM releases WHERE distro_id = %s AND version_number = %s
        """, (distro_id, version))
        existing = cur.fetchone()
        if existing:
            return existing
        
        cur.execute("""
            INSERT INTO releases (distro_id, version_number, release_date, is_lts)
            VALUES (%s, %s, %s, %s)
            RETURNING *
        """, (distro_id, version, release_date, is_lts))
        conn.commit()
        return cur.fetchone()


def create_download(conn, release_id, architecture, iso_url, download_size=None):
    """Create or update a download record."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT * FROM downloads WHERE release_id = %s AND architecture = %s
        """, (release_id, architecture))
        existing = cur.fetchone()
        
        if existing:
            if iso_url and not iso_url.endswith('placeholder'):
                cur.execute("""
                    UPDATE downloads SET iso_url = %s, download_size = %s WHERE id = %s
                """, (iso_url, download_size, existing['id']))
                conn.commit()
            return existing
        
        cur.execute("""
            INSERT INTO downloads (release_id, architecture, iso_url, download_size)
            VALUES (%s, %s, %s, %s)
            RETURNING *
        """, (release_id, architecture, iso_url, download_size))
        conn.commit()
        return cur.fetchone()


def detect_architecture(url):
    """Detect architecture from URL."""
    url_lower = url.lower()
    if any(x in url_lower for x in ['aarch64', 'arm64']):
        return 'arm64'
    elif any(x in url_lower for x in ['x86_64', 'amd64', 'x64']):
        return 'x86_64'
    elif 'i386' in url_lower or 'i686' in url_lower:
        return 'i386'
    return 'x86_64'


def parse_date_from_version(version_str, distro_name):
    """Parse a date from version string based on distro naming conventions."""
    # YYYYMMDD format (Arch, Artix, EndeavourOS)
    if re.match(r'^\d{8}$', version_str):
        try:
            return datetime.strptime(version_str, '%Y%m%d')
        except:
            pass
    
    # YYYY.MM.DD format
    if re.match(r'^\d{4}\.\d{2}\.\d{2}$', version_str):
        try:
            return datetime.strptime(version_str, '%Y.%m.%d')
        except:
            pass
    
    # YYYY.MM format
    if re.match(r'^\d{4}\.\d{2}$', version_str):
        try:
            return datetime.strptime(version_str + '.01', '%Y.%m.%d')
        except:
            pass
    
    # YYYY-MM-DD format
    if re.match(r'^\d{4}-\d{2}-\d{2}$', version_str):
        try:
            return datetime.strptime(version_str, '%Y-%m-%d')
        except:
            pass
    
    return datetime.now()


def is_lts_version(version_str, distro_name):
    """Check if version is LTS based on distro conventions."""
    distro_lower = distro_name.lower()
    
    # Ubuntu LTS: XX.04 where XX is even
    if 'ubuntu' in distro_lower:
        match = re.match(r'^(\d+)\.04', version_str)
        if match and int(match.group(1)) % 2 == 0:
            return True
    
    # Linux Mint: Major version ending in 0 or 5
    if 'mint' in distro_lower:
        match = re.match(r'^(\d+)', version_str)
        if match and int(match.group(1)) % 2 == 1:  # Mint LTS follows Ubuntu LTS
            return True
    
    return False


async def scrape_archive_directory(page, base_url, config, distro_name):
    """Scrape archive directory for all version folders."""
    versions_found = []
    
    try:
        print(f"  Navigating to: {base_url}")
        await page.goto(base_url, wait_until="networkidle", timeout=TIMEOUT)
        await asyncio.sleep(1)
        
        # Find all anchor links
        anchors = await page.locator("a[href]").all()
        version_pattern = re.compile(config['version_pattern'])
        
        for anchor in anchors:
            try:
                href = await anchor.get_attribute("href")
                if not href:
                    continue
                href = href.strip().rstrip('/')
                
                # Check if it matches version pattern
                match = version_pattern.match(href + '/')
                if match:
                    version = match.group(1)
                    full_url = urljoin(base_url, href + '/')
                    versions_found.append({
                        'version': version,
                        'url': full_url
                    })
            except Exception:
                continue
        
        print(f"    Found {len(versions_found)} version folders")
        
    except Exception as e:
        print(f"    Error scraping {base_url}: {e}")
    
    return versions_found


async def find_iso_in_version_folder(page, version_url, config, version):
    """Find ISO files in a version folder."""
    iso_files = []
    iso_pattern = re.compile(config['iso_pattern'], re.IGNORECASE)
    
    subfolders = config.get('iso_subfolders', [''])
    
    for subfolder in subfolders:
        try:
            check_url = urljoin(version_url, subfolder)
            response = await page.goto(check_url, wait_until="networkidle", timeout=15000)
            
            if not response or response.status != 200:
                continue
            
            anchors = await page.locator("a[href]").all()
            
            for anchor in anchors:
                try:
                    href = await anchor.get_attribute("href")
                    if not href:
                        continue
                    
                    if iso_pattern.search(href):
                        full_url = urljoin(check_url, href)
                        arch = detect_architecture(full_url)
                        iso_files.append({
                            'url': full_url,
                            'architecture': arch,
                            'filename': href.split('/')[-1]
                        })
                except Exception:
                    continue
            
            if iso_files:
                break  # Found ISOs, no need to check more subfolders
                
        except Exception:
            continue
    
    return iso_files


async def populate_distro_archive(page, conn, distro_name, config):
    """Populate all historical versions for a distribution."""
    print(f"\n{'='*60}")
    print(f"Processing: {distro_name}")
    print(f"{'='*60}")
    
    # Get distro from database
    distro = get_distro_by_name(conn, distro_name)
    if not distro:
        print(f"  Distribution not found in database: {distro_name}")
        return 0
    
    distro_id = distro['id']
    existing_releases = get_existing_releases(conn, distro_id)
    existing_versions = {r['version_number'] for r in existing_releases}
    
    print(f"  Existing releases: {len(existing_releases)}")
    
    all_versions = []
    
    # Scrape each archive URL
    for archive_url in config['archives']:
        versions = await scrape_archive_directory(page, archive_url, config, distro_name)
        all_versions.extend(versions)
    
    # Remove duplicates
    seen_versions = set()
    unique_versions = []
    for v in all_versions:
        if v['version'] not in seen_versions:
            seen_versions.add(v['version'])
            unique_versions.append(v)
    
    print(f"  Total unique versions found: {len(unique_versions)}")
    
    # Process each version
    new_releases = 0
    for version_info in unique_versions:
        version = version_info['version']
        version_url = version_info['url']
        
        # Skip if already exists with valid downloads
        if version in existing_versions:
            existing = [r for r in existing_releases if r['version_number'] == version]
            if existing and existing[0].get('download_count', 0) > 0:
                continue
        
        print(f"  Processing version: {version}")
        
        # Find ISO files
        iso_files = await find_iso_in_version_folder(page, version_url, config, version)
        
        if iso_files:
            # Create release
            release_date = parse_date_from_version(version, distro_name)
            is_lts = is_lts_version(version, distro_name)
            release = create_release(conn, distro_id, version, release_date, is_lts)
            
            if release:
                print(f"    Created release: {version} (LTS: {is_lts})")
                new_releases += 1
                
                # Create downloads (max 2 per arch)
                archs_added = set()
                for iso in iso_files[:4]:
                    arch = iso['architecture']
                    if arch not in archs_added:
                        archs_added.add(arch)
                        create_download(conn, release['id'], arch, iso['url'])
                        print(f"      Added download: {arch} - {iso['filename'][:50]}...")
        else:
            print(f"    No ISO files found for version {version}")
    
    print(f"  New releases added: {new_releases}")
    return new_releases


async def main():
    """Main function to populate all archives."""
    print("="*60)
    print("Complete Historical Archive Population")
    print("="*60)
    
    conn = get_db_connection()
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        )
        page = await context.new_page()
        
        total_new = 0
        
        # Process priority distributions first
        priority_distros = [
            'Ubuntu', 'Fedora', 'Debian', 'Linux Mint', 'Arch Linux',
            'Manjaro', 'openSUSE Leap', 'Alpine Linux', 'Rocky Linux',
            'AlmaLinux', 'Pop!_OS', 'Zorin OS', 'MX Linux', 'EndeavourOS'
        ]
        
        for distro_name in priority_distros:
            if distro_name in ARCHIVE_CONFIGS:
                try:
                    new_count = await populate_distro_archive(
                        page, conn, distro_name, ARCHIVE_CONFIGS[distro_name]
                    )
                    total_new += new_count
                except Exception as e:
                    print(f"  Error processing {distro_name}: {e}")
        
        # Process remaining distributions
        for distro_name, config in ARCHIVE_CONFIGS.items():
            if distro_name not in priority_distros:
                try:
                    new_count = await populate_distro_archive(page, conn, distro_name, config)
                    total_new += new_count
                except Exception as e:
                    print(f"  Error processing {distro_name}: {e}")
        
        await browser.close()
    
    conn.close()
    
    print("\n" + "="*60)
    print(f"COMPLETE: Added {total_new} new releases")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(main())

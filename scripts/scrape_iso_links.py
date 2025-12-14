#!/usr/bin/env python3
"""
ISO Link Scraper using Playwright

This script uses Playwright to scrape JavaScript-rendered download pages
for ISO links and updates the PostgreSQL database.

Usage:
    python scripts/scrape_iso_links.py

Requirements:
    pip install playwright psycopg2-binary
    playwright install chromium
"""

import os
import re
import sys
import asyncio
from urllib.parse import urljoin, urlparse
from datetime import datetime

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("Error: psycopg2 package not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

try:
    from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
except ImportError:
    print("Error: playwright package not installed. Run: pip install playwright && playwright install chromium")
    sys.exit(1)

TIMEOUT = 45000
NAVIGATION_TIMEOUT = 30000

# Known archive URLs for major distributions
KNOWN_ARCHIVE_URLS = {
    'ubuntu': [
        'http://old-releases.ubuntu.com/releases/',
        'https://releases.ubuntu.com/',
    ],
    'fedora': [
        'https://archives.fedoraproject.org/pub/archive/fedora/linux/releases/',
        'https://download.fedoraproject.org/pub/fedora/linux/releases/',
    ],
    'debian': [
        'https://cdimage.debian.org/cdimage/archive/',
        'https://cdimage.debian.org/debian-cd/',
    ],
    'linux mint': [
        'https://mirrors.kernel.org/linuxmint/stable/',
        'https://mirror.rackspace.com/linuxmint/stable/',
    ],
    'manjaro': [
        'https://download.manjaro.org/',
    ],
    'arch linux': [
        'https://archive.archlinux.org/iso/',
    ],
}

# Regex pattern to match version folders like 24.04/, 23.10/, 41/, 12.5/
VERSION_FOLDER_PATTERN = re.compile(r'^(\d+(\.\d+){0,2})/?$')


def get_db_connection():
    """Get PostgreSQL database connection from DATABASE_URL."""
    db_url = os.environ.get("DATABASE_URL")
    
    if not db_url:
        print("Error: DATABASE_URL environment variable required")
        sys.exit(1)
    
    try:
        conn = psycopg2.connect(db_url)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)


def get_distros_without_downloads(conn):
    """Get all distributions that have no downloads."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT d.id, d.name, d.website_url
            FROM distributions d
            WHERE NOT EXISTS (
                SELECT 1 FROM releases r
                INNER JOIN downloads dl ON dl.release_id = r.id
                WHERE r.distro_id = d.id
            )
            ORDER BY d.name
        """)
        return cur.fetchall()


def get_latest_release_for_distro(conn, distro_id):
    """Get the latest release for a distribution."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT * FROM releases 
            WHERE distro_id = %s 
            ORDER BY release_date DESC 
            LIMIT 1
        """, (distro_id,))
        return cur.fetchone()


def create_release_for_distro(conn, distro_id, version="latest", release_date=None, is_lts=False):
    """Create a placeholder release for a distribution."""
    if release_date is None:
        release_date = datetime.now()
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Check if this version already exists
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


def get_all_releases_for_distro(conn, distro_id):
    """Get all releases for a distribution."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT * FROM releases 
            WHERE distro_id = %s 
            ORDER BY release_date DESC
        """, (distro_id,))
        return cur.fetchall()


def get_distro_by_name(conn, name):
    """Get a distribution by name (case-insensitive)."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT * FROM distributions WHERE LOWER(name) = LOWER(%s)
        """, (name,))
        return cur.fetchone()


def truncate_url_to_parent(url):
    """Truncate a URL to its parent directory.
    
    Example: https://mirror.example.com/pub/linux/distro/24.04/iso/
         -> https://mirror.example.com/pub/linux/distro/
    """
    parsed = urlparse(url)
    path_parts = parsed.path.rstrip('/').split('/')
    
    # Remove last 1-2 path segments to get to version listing
    if len(path_parts) > 2:
        # Try removing last segment first
        parent_path = '/'.join(path_parts[:-1]) + '/'
        return f"{parsed.scheme}://{parsed.netloc}{parent_path}"
    return None


def is_version_folder(name):
    """Check if a folder name looks like a version number."""
    name = name.strip('/')
    return VERSION_FOLDER_PATTERN.match(name) is not None


def parse_version_string(version_str):
    """Parse a version string into comparable tuple."""
    parts = version_str.strip('/').split('.')
    try:
        return tuple(int(p) for p in parts)
    except ValueError:
        return (0,)


def detect_architecture(url):
    """Detect architecture from URL."""
    url_lower = url.lower()
    if any(x in url_lower for x in ['aarch64', 'arm64']):
        return 'arm64'
    elif any(x in url_lower for x in ['x86_64', 'amd64', 'x64']):
        return 'amd64'
    elif 'i386' in url_lower or 'i686' in url_lower:
        return 'i386'
    return 'amd64'


def insert_download(conn, release_id, architecture, iso_url, is_torrent=False):
    """Insert a download record."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id FROM downloads 
            WHERE release_id = %s AND architecture = %s
        """, (release_id, architecture))
        
        existing = cur.fetchone()
        
        if existing:
            if is_torrent:
                cur.execute("""
                    UPDATE downloads SET torrent_url = %s WHERE id = %s
                """, (iso_url, existing[0]))
            else:
                cur.execute("""
                    UPDATE downloads SET iso_url = %s WHERE id = %s
                """, (iso_url, existing[0]))
            print(f"      Updated existing download record")
        else:
            if is_torrent:
                cur.execute("""
                    INSERT INTO downloads (release_id, architecture, iso_url, torrent_url)
                    VALUES (%s, %s, %s, %s)
                """, (release_id, architecture, '', iso_url))
            else:
                cur.execute("""
                    INSERT INTO downloads (release_id, architecture, iso_url)
                    VALUES (%s, %s, %s)
                """, (release_id, architecture, iso_url))
            print(f"      Created new download record")
        
        conn.commit()
        return True


async def is_directory_listing(page):
    """Detect if the current page is an Apache/Nginx directory listing."""
    try:
        html = await page.content()
        html_lower = html.lower()
        
        indicators = [
            'index of',
            '<pre>',
            'last modified',
            'parent directory',
            'name</a>',
            '[dir]',
            'directory listing',
            '<th>name</th>',
            '<th>last modified</th>',
            '<th>size</th>',
        ]
        
        matches = sum(1 for ind in indicators if ind in html_lower)
        return matches >= 2
        
    except Exception:
        return False


async def parse_directory_listing(page, base_url):
    """Parse a directory listing page and return files sorted by date (newest first)."""
    files = []
    
    try:
        rows = await page.locator("tr, pre a").all()
        
        for row in rows:
            try:
                text = await row.inner_text()
                
                href_elem = row.locator("a[href]").first if await row.locator("a").count() > 0 else row
                href = await href_elem.get_attribute("href") if href_elem else None
                
                if not href:
                    continue
                    
                if not href.lower().endswith('.iso') and not href.lower().endswith('.torrent'):
                    continue
                
                date_match = re.search(r'(\d{4}-\d{2}-\d{2})', text)
                file_date = date_match.group(1) if date_match else '1970-01-01'
                
                full_url = urljoin(base_url, href)
                file_type = 'torrent' if href.lower().endswith('.torrent') else 'iso'
                
                files.append({
                    'url': full_url,
                    'type': file_type,
                    'date': file_date,
                    'filename': href.split('/')[-1]
                })
                
            except Exception:
                continue
        
        anchors = await page.locator("a[href]").all()
        existing_urls = {f['url'] for f in files}
        
        for anchor in anchors:
            try:
                href = await anchor.get_attribute("href")
                if not href:
                    continue
                    
                href = href.strip()
                full_url = urljoin(base_url, href)
                
                if full_url in existing_urls:
                    continue
                    
                if href.lower().endswith('.iso'):
                    parent_text = ""
                    try:
                        parent = anchor.locator("..")
                        parent_text = await parent.inner_text()
                    except:
                        pass
                    
                    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', parent_text)
                    file_date = date_match.group(1) if date_match else '1970-01-01'
                    
                    files.append({
                        'url': full_url,
                        'type': 'iso',
                        'date': file_date,
                        'filename': href.split('/')[-1]
                    })
                    
                elif href.lower().endswith('.torrent'):
                    files.append({
                        'url': full_url,
                        'type': 'torrent',
                        'date': '1970-01-01',
                        'filename': href.split('/')[-1]
                    })
                    
            except Exception:
                continue
        
        files.sort(key=lambda x: x['date'], reverse=True)
        
    except Exception as e:
        print(f"      Error parsing directory listing: {e}")
    
    return files


async def scrape_page_for_links(page, base_url):
    """Scrape current page for ISO and magnet links."""
    links = []
    
    if await is_directory_listing(page):
        print("      [Directory Mode] Detected file index page")
        dir_files = await parse_directory_listing(page, base_url)
        
        for f in dir_files:
            if f['type'] == 'iso':
                links.append({'url': f['url'], 'type': 'iso'})
            elif f['type'] == 'torrent':
                links.append({'url': f['url'], 'type': 'magnet'})
        
        if links:
            print(f"      [Directory Mode] Found {len(links)} files, sorted by date")
            return links
    
    try:
        anchors = await page.locator("a[href]").all()
        
        for anchor in anchors:
            try:
                href = await anchor.get_attribute("href")
                if not href:
                    continue
                
                href = href.strip()
                
                if href.lower().endswith('.iso'):
                    full_url = urljoin(base_url, href)
                    if full_url not in [l['url'] for l in links]:
                        links.append({'url': full_url, 'type': 'iso'})
                
                elif 'magnet:' in href.lower():
                    if href not in [l['url'] for l in links]:
                        links.append({'url': href, 'type': 'magnet'})
                        
            except Exception:
                continue
                
    except Exception as e:
        print(f"      Error scraping links: {e}")
    
    return links


async def find_download_page_link(page, distro_name):
    """Find and click a download page link."""
    download_patterns = [
        f"text=/download/i",
        f"text=/get {distro_name}/i",
        f"text=/get/i",
        f"a:has-text('Download')",
        f"a:has-text('Get')",
        f"a:has-text('ISO')",
        f"a[href*='download']",
        f"a[href*='get']",
    ]
    
    for pattern in download_patterns:
        try:
            locator = page.locator(pattern).first
            if await locator.count() > 0:
                is_visible = await locator.is_visible()
                if is_visible:
                    href = await locator.get_attribute("href")
                    if href and not href.startswith('#') and not href.startswith('javascript:'):
                        return locator
        except Exception:
            continue
    
    return None


async def find_archive_links(page, base_url):
    """Find links to archive/old releases pages."""
    archive_patterns = [
        "a:has-text('Old Releases')",
        "a:has-text('Archive')",
        "a:has-text('Previous')",
        "a:has-text('Past Releases')",
        "a:has-text('Older')",
        "a:has-text('All Releases')",
        "a:has-text('Release History')",
        "a[href*='archive']",
        "a[href*='old']",
        "a[href*='releases']",
        "a[href*='previous']",
    ]
    
    for pattern in archive_patterns:
        try:
            locator = page.locator(pattern).first
            if await locator.count() > 0:
                is_visible = await locator.is_visible()
                if is_visible:
                    href = await locator.get_attribute("href")
                    if href and not href.startswith('#') and not href.startswith('javascript:'):
                        full_url = urljoin(base_url, href)
                        return full_url
        except Exception:
            continue
    
    return None


def extract_version_from_filename(filename):
    """Extract version number from ISO filename."""
    patterns = [
        r'(\d+\.\d+\.\d+)',  # 24.04.1
        r'(\d+\.\d+)',        # 24.04
        r'(\d{4}\.\d{2})',    # 2024.12
        r'-(\d+)-',           # -41-
    ]
    for pattern in patterns:
        match = re.search(pattern, filename)
        if match:
            return match.group(1)
    return None


async def scrape_archive_page(page, archive_url, distro_id, conn):
    """Scrape an archive page for older ISO releases."""
    releases_found = []
    
    try:
        print(f"    Checking archive: {archive_url}")
        await page.goto(archive_url, wait_until="networkidle", timeout=NAVIGATION_TIMEOUT)
        await asyncio.sleep(1)
        
        # Look for ISO links with version info
        anchors = await page.locator("a[href]").all()
        iso_files = []
        
        for anchor in anchors:
            try:
                href = await anchor.get_attribute("href")
                if not href:
                    continue
                href = href.strip()
                
                if href.lower().endswith('.iso'):
                    full_url = urljoin(archive_url, href)
                    filename = href.split('/')[-1]
                    version = extract_version_from_filename(filename)
                    
                    if version:
                        iso_files.append({
                            'url': full_url,
                            'version': version,
                            'filename': filename,
                            'architecture': detect_architecture(full_url)
                        })
            except Exception:
                continue
        
        # Group by version and create releases
        versions_seen = {}
        for iso in iso_files:
            ver = iso['version']
            if ver not in versions_seen:
                versions_seen[ver] = []
            versions_seen[ver].append(iso)
        
        # Create releases for up to 3 older versions
        version_list = sorted(versions_seen.keys(), reverse=True)[:4]
        
        for version in version_list[1:4]:  # Skip latest, take next 3
            isos = versions_seen[version]
            
            # Create release
            release = create_release_for_distro(conn, distro_id, version)
            if release:
                print(f"      Created/found release: {version}")
                releases_found.append(release)
                
                # Add downloads
                for iso in isos[:2]:  # Max 2 architectures
                    insert_download(conn, release['id'], iso['architecture'], iso['url'])
        
    except Exception as e:
        print(f"    Archive scrape error: {e}")
    
    return releases_found


async def scrape_archive_directory(page, archive_url, distro_id, conn):
    """
    Scrape an archive directory listing for version folders and ISO files.
    
    This function:
    1. Navigates to the archive URL (directory listing page)
    2. Finds all anchor links that match version folder pattern (e.g., "24.04/", "23.10/", "41/")
    3. Sorts versions descending, takes top 3-4 versions
    4. For each version folder, navigates in and looks for .iso files
    5. Creates release records and download entries
    
    Returns count of releases found.
    """
    releases_found = 0
    
    try:
        print(f"    Navigating to archive: {archive_url}")
        await page.goto(archive_url, wait_until="networkidle", timeout=NAVIGATION_TIMEOUT)
        await asyncio.sleep(1)
        
        # Check if it's a directory listing
        if not await is_directory_listing(page):
            print(f"    Not a directory listing, skipping")
            return 0
        
        # Find all version folder links
        anchors = await page.locator("a[href]").all()
        version_folders = []
        
        for anchor in anchors:
            try:
                href = await anchor.get_attribute("href")
                if not href:
                    continue
                href = href.strip()
                
                # Check if this looks like a version folder
                if is_version_folder(href):
                    version_folders.append({
                        'href': href,
                        'version': href.strip('/'),
                        'version_tuple': parse_version_string(href)
                    })
            except Exception:
                continue
        
        if not version_folders:
            print(f"    No version folders found")
            return 0
        
        # Sort by version descending and take top 4
        version_folders.sort(key=lambda x: x['version_tuple'], reverse=True)
        top_versions = version_folders[:4]
        
        print(f"    Found {len(version_folders)} version folders, processing top {len(top_versions)}")
        
        # Process each version folder (skip the latest, take next 3 for "previous versions")
        for i, vf in enumerate(top_versions[1:4]):  # Skip index 0 (latest), take next 3
            version = vf['version']
            folder_url = urljoin(archive_url, vf['href'])
            
            print(f"      Processing version {version}...")
            
            try:
                await page.goto(folder_url, wait_until="networkidle", timeout=NAVIGATION_TIMEOUT)
                await asyncio.sleep(0.5)
                
                # Look for ISO files - might be directly here or in subfolders
                iso_files = await find_iso_files_in_directory(page, folder_url)
                
                if not iso_files:
                    # Try common subfolders - includes nested paths for distros like Fedora
                    subfolders = [
                        'desktop/', 'server/', 'live/', 'iso/', 'isos/', 
                        'workstation/', 'cloud/', 'spins/',
                        # Fedora-style nested paths
                        'Workstation/x86_64/iso/', 'Server/x86_64/iso/',
                        'Workstation/aarch64/iso/', 'Server/aarch64/iso/',
                        'Everything/x86_64/iso/', 'Spins/x86_64/',
                        # More generic nested paths
                        'x86_64/', 'amd64/', 'current/', 'images/',
                    ]
                    for subfolder in subfolders:
                        subfolder_url = urljoin(folder_url.rstrip('/') + '/', subfolder)
                        try:
                            response = await page.goto(subfolder_url, wait_until="networkidle", timeout=10000)
                            if response and response.status == 200:
                                iso_files = await find_iso_files_in_directory(page, subfolder_url)
                                if iso_files:
                                    print(f"        Found ISOs in {subfolder}")
                                    break
                        except Exception:
                            continue
                
                if iso_files:
                    # Create release record
                    release = create_release_for_distro(conn, distro_id, version)
                    if release:
                        print(f"        Created/found release: {version}")
                        releases_found += 1
                        
                        # Add downloads (max 2 per architecture)
                        archs_added = set()
                        for iso in iso_files[:4]:  # Max 4 ISOs per version
                            arch = iso['architecture']
                            if arch in archs_added:
                                continue
                            archs_added.add(arch)
                            insert_download(conn, release['id'], arch, iso['url'])
                else:
                    print(f"        No ISO files found for version {version}")
                    
            except Exception as e:
                print(f"        Error processing version {version}: {e}")
                continue
        
        # Go back to the archive root for further processing
        await page.goto(archive_url, wait_until="networkidle", timeout=NAVIGATION_TIMEOUT)
        
    except Exception as e:
        print(f"    Archive directory scrape error: {e}")
    
    return releases_found


async def find_iso_files_in_directory(page, base_url):
    """Find ISO files in the current directory listing."""
    iso_files = []
    
    try:
        anchors = await page.locator("a[href]").all()
        
        for anchor in anchors:
            try:
                href = await anchor.get_attribute("href")
                if not href:
                    continue
                href = href.strip()
                
                if href.lower().endswith('.iso'):
                    full_url = urljoin(base_url, href)
                    filename = href.split('/')[-1]
                    
                    iso_files.append({
                        'url': full_url,
                        'filename': filename,
                        'architecture': detect_architecture(full_url)
                    })
            except Exception:
                continue
        
    except Exception as e:
        print(f"        Error finding ISO files: {e}")
    
    return iso_files


async def scrape_distro_archives(browser, distro_name, conn):
    """
    Scrape archive URLs for a specific distribution.
    
    Looks up the distro by name, checks if it's in KNOWN_ARCHIVE_URLS,
    and tries each known archive URL to find older releases.
    
    Returns list of results.
    """
    results = []
    
    # Look up the distro
    distro = get_distro_by_name(conn, distro_name)
    if not distro:
        print(f"Distribution '{distro_name}' not found in database")
        return results
    
    distro_id = distro['id']
    distro_key = distro_name.lower()
    
    print(f"\nProcessing archives for: {distro_name} (ID: {distro_id})")
    print("-" * 50)
    
    # Check if we have known archive URLs for this distro
    if distro_key not in KNOWN_ARCHIVE_URLS:
        print(f"  No known archive URLs for '{distro_name}'")
        print(f"  Available distros: {', '.join(KNOWN_ARCHIVE_URLS.keys())}")
        return results
    
    archive_urls = KNOWN_ARCHIVE_URLS[distro_key]
    print(f"  Found {len(archive_urls)} known archive URLs")
    
    # Create browser context
    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    page = await context.new_page()
    page.set_default_timeout(TIMEOUT)
    
    total_releases = 0
    
    try:
        for archive_url in archive_urls:
            print(f"\n  Trying archive: {archive_url}")
            
            try:
                releases_found = await scrape_archive_directory(page, archive_url, distro_id, conn)
                total_releases += releases_found
                
                if releases_found > 0:
                    print(f"    Successfully found {releases_found} releases")
                    results.append({
                        'distro': distro_name,
                        'archive_url': archive_url,
                        'releases_found': releases_found
                    })
                    
                    # If we found releases, we can stop trying other URLs
                    if releases_found >= 2:
                        print(f"    Sufficient releases found, stopping")
                        break
                        
            except Exception as e:
                print(f"    Error with archive URL: {e}")
                continue
                
    finally:
        await context.close()
    
    print(f"\n  Total releases found: {total_releases}")
    return results


async def scrape_single_distro_archives(distro_name):
    """
    Entry point for scraping archives of a single distribution.
    Called when using --distro command line argument.
    """
    print("=" * 60)
    print(f"ISO Archive Scraper - {distro_name}")
    print("=" * 60)
    print()
    
    conn = get_db_connection()
    print("Connected to PostgreSQL database")
    
    async with async_playwright() as p:
        print("Launching browser...")
        browser = await p.chromium.launch(
            headless=True,
            executable_path='/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium'
        )
        
        try:
            results = await scrape_distro_archives(browser, distro_name, conn)
            
            print("\n")
            print("=" * 60)
            print("SUMMARY")
            print("=" * 60)
            
            if results:
                total_releases = sum(r['releases_found'] for r in results)
                print(f"Total releases added: {total_releases}")
                for r in results:
                    print(f"  - {r['archive_url']}: {r['releases_found']} releases")
            else:
                print("No releases found")
                
        finally:
            await browser.close()
    
    conn.close()
    print("\nDone!")


async def scrape_distro(browser, distro, conn):
    """Scrape a single distribution for ISO links."""
    distro_id = distro['id']
    distro_name = distro['name']
    website_url = distro['website_url']
    
    print(f"\nProcessing: {distro_name}")
    print("-" * 50)
    
    if not website_url:
        print("  No website URL, skipping")
        return []
    
    if not website_url.startswith('http'):
        website_url = 'https://' + website_url
    
    release = get_latest_release_for_distro(conn, distro_id)
    if not release:
        print("  No release found, creating placeholder...")
        release = create_release_for_distro(conn, distro_id)
        if not release:
            print("  Failed to create release, skipping")
            return []
    
    print(f"  Release ID: {release['id']}, Version: {release['version_number']}")
    
    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    page = await context.new_page()
    page.set_default_timeout(TIMEOUT)
    
    all_links = []
    
    try:
        print(f"  Navigating to: {website_url}")
        try:
            await page.goto(website_url, wait_until="networkidle", timeout=NAVIGATION_TIMEOUT)
        except PlaywrightTimeout:
            print("  Page load timeout, continuing with partial load...")
            await asyncio.sleep(2)
        except Exception as e:
            print(f"  Navigation error: {e}")
            await context.close()
            return []
        
        await asyncio.sleep(1)
        
        current_url = page.url
        links = await scrape_page_for_links(page, current_url)
        all_links.extend(links)
        print(f"  Found {len(links)} links on main page")
        
        if len([l for l in all_links if l['type'] == 'iso']) < 2:
            print("  Looking for download page link...")
            download_link = await find_download_page_link(page, distro_name)
            
            if download_link:
                try:
                    print("  Clicking download link...")
                    await download_link.click()
                    await page.wait_for_load_state("networkidle", timeout=NAVIGATION_TIMEOUT)
                    await asyncio.sleep(1)
                    
                    current_url = page.url
                    links = await scrape_page_for_links(page, current_url)
                    for link in links:
                        if link['url'] not in [l['url'] for l in all_links]:
                            all_links.append(link)
                    print(f"  Found {len(links)} additional links on download page")
                    
                except Exception as e:
                    print(f"  Error navigating to download page: {e}")
        
        download_urls = [
            f"{website_url.rstrip('/')}/download",
            f"{website_url.rstrip('/')}/downloads",
            f"{website_url.rstrip('/')}/download.html",
            f"{website_url.rstrip('/')}/get",
        ]
        
        if len([l for l in all_links if l['type'] == 'iso']) < 2:
            for url in download_urls:
                if len([l for l in all_links if l['type'] == 'iso']) >= 2:
                    break
                    
                try:
                    print(f"  Trying: {url}")
                    await page.goto(url, wait_until="networkidle", timeout=NAVIGATION_TIMEOUT)
                    await asyncio.sleep(1)
                    
                    links = await scrape_page_for_links(page, page.url)
                    for link in links:
                        if link['url'] not in [l['url'] for l in all_links]:
                            all_links.append(link)
                    
                    if links:
                        print(f"  Found {len(links)} links")
                        
                except Exception:
                    continue
        
        # Look for archive/old releases page
        print("  Looking for archive/old releases...")
        archive_url = await find_archive_links(page, website_url)
        if archive_url:
            await scrape_archive_page(page, archive_url, distro_id, conn)
        else:
            # Try common archive URLs
            archive_urls = [
                f"{website_url.rstrip('/')}/releases",
                f"{website_url.rstrip('/')}/archive",
                f"{website_url.rstrip('/')}/old-releases",
                f"{website_url.rstrip('/')}/downloads/archive",
            ]
            for url in archive_urls:
                try:
                    response = await page.goto(url, wait_until="networkidle", timeout=10000)
                    if response and response.status == 200:
                        await scrape_archive_page(page, url, distro_id, conn)
                        break
                except Exception:
                    continue
        
    except Exception as e:
        print(f"  Error processing {distro_name}: {e}")
    finally:
        await context.close()
    
    iso_links = [l for l in all_links if l['type'] == 'iso']
    magnet_links = [l for l in all_links if l['type'] == 'magnet']
    
    print(f"  Total: {len(iso_links)} ISO links, {len(magnet_links)} magnet links")
    
    results = []
    
    for link in iso_links[:3]:
        url = link['url']
        architecture = detect_architecture(url)
        print(f"    Saving: {url[:70]}... ({architecture})")
        
        try:
            success = insert_download(conn, release['id'], architecture, url, is_torrent=False)
            if success:
                results.append({
                    'distro': distro_name,
                    'type': 'iso',
                    'architecture': architecture,
                    'url': url
                })
        except Exception as e:
            print(f"    Error saving: {e}")
    
    for link in magnet_links[:2]:
        url = link['url']
        architecture = detect_architecture(url)
        print(f"    Saving magnet: {url[:50]}... ({architecture})")
        
        try:
            success = insert_download(conn, release['id'], architecture, url, is_torrent=True)
            if success:
                results.append({
                    'distro': distro_name,
                    'type': 'magnet',
                    'architecture': architecture,
                    'url': url[:50]
                })
        except Exception as e:
            print(f"    Error saving magnet: {e}")
    
    return results


async def main():
    print("=" * 60)
    print("ISO Link Scraper (Playwright Edition)")
    print("=" * 60)
    print()
    
    conn = get_db_connection()
    print("Connected to PostgreSQL database")
    
    distros = get_distros_without_downloads(conn)
    print(f"Found {len(distros)} distributions without downloads")
    print()
    
    if not distros:
        print("All distributions already have downloads!")
        conn.close()
        return
    
    all_results = []
    failed_distros = []
    
    async with async_playwright() as p:
        print("Launching browser...")
        browser = await p.chromium.launch(
            headless=True,
            executable_path='/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium'
        )
        
        for i, distro in enumerate(distros):
            print(f"\n[{i+1}/{len(distros)}]", end="")
            
            try:
                results = await scrape_distro(browser, distro, conn)
                all_results.extend(results)
                
                if not results:
                    failed_distros.append(distro['name'])
                    
            except Exception as e:
                print(f"  Critical error: {e}")
                failed_distros.append(distro['name'])
            
            await asyncio.sleep(0.5)
        
        await browser.close()
    
    conn.close()
    
    print("\n")
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    successful = len(distros) - len(failed_distros)
    print(f"Processed: {len(distros)} distributions")
    print(f"Successful: {successful} ({100*successful//len(distros) if distros else 0}%)")
    print(f"Failed: {len(failed_distros)}")
    
    if all_results:
        print(f"\nTotal downloads added: {len(all_results)}")
        print("\nSuccessfully scraped:")
        scraped_distros = set(r['distro'] for r in all_results)
        for name in sorted(scraped_distros):
            count = len([r for r in all_results if r['distro'] == name])
            print(f"  - {name}: {count} links")
    
    if failed_distros:
        print(f"\nFailed to find downloads for:")
        for name in failed_distros[:20]:
            print(f"  - {name}")
        if len(failed_distros) > 20:
            print(f"  ... and {len(failed_distros) - 20} more")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Scrape ISO download links from distribution websites")
    parser.add_argument('--distro', help='Scrape archives for specific distro (e.g., "Ubuntu", "Fedora")')
    args = parser.parse_args()
    
    if args.distro:
        asyncio.run(scrape_single_distro_archives(args.distro))
    else:
        asyncio.run(main())

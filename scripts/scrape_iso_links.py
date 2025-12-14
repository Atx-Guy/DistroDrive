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
    asyncio.run(main())

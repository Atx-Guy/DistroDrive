#!/usr/bin/env python3
"""
ISO Link Scraper and Validator

This script scrapes download pages for ISO links, verifies they return 200 OK,
and updates the PostgreSQL database with valid URLs.

Usage:
    python scripts/scrape_iso_links.py

Requirements:
    pip install requests beautifulsoup4 psycopg2-binary

Environment Variables Required:
    DATABASE_URL - PostgreSQL connection string
"""

import os
import re
import sys
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("Error: psycopg2 package not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

TIMEOUT = 30


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
    """Get distributions that don't have any downloads (via releases)."""
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


def create_release_for_distro(conn, distro_id, version="latest"):
    """Create a placeholder release for a distribution."""
    from datetime import datetime
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            INSERT INTO releases (distro_id, version_number, release_date, is_lts)
            VALUES (%s, %s, %s, false)
            RETURNING *
        """, (distro_id, version, datetime.now()))
        conn.commit()
        return cur.fetchone()


def scrape_iso_links(url, distro_name):
    """Scrape a page for ISO download links using heuristics."""
    print(f"  Fetching {url}...")
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"  Error fetching page: {e}")
        return []
    
    soup = BeautifulSoup(response.text, 'html.parser')
    iso_links = []
    
    download_keywords = ['download', 'iso', 'amd64', 'x86_64', 'get', 'x64', '64-bit', '64bit']
    distro_lower = distro_name.lower().split()[0]
    download_keywords.append(distro_lower)
    
    for link in soup.find_all('a', href=True):
        href = link['href']
        link_text = link.get_text(strip=True).lower()
        
        full_url = urljoin(url, href)
        
        if full_url.lower().endswith('.iso'):
            if full_url not in iso_links:
                iso_links.append(full_url)
                print(f"    Found direct .iso link: {full_url[:80]}...")
            continue
        
        has_download_keyword = any(kw in link_text for kw in download_keywords)
        has_iso_in_href = '.iso' in href.lower() or 'iso' in href.lower()
        has_arch_in_href = any(arch in href.lower() for arch in ['amd64', 'x86_64', 'x64', 'arm64', 'aarch64'])
        
        if has_download_keyword and (has_iso_in_href or has_arch_in_href):
            if full_url not in iso_links and full_url.startswith('http'):
                iso_links.append(full_url)
                print(f"    Found potential link: {full_url[:80]}...")
    
    if len(iso_links) < 3:
        download_page_patterns = ['/download', '/get', '/iso', '/releases']
        for link in soup.find_all('a', href=True):
            href = link['href']
            full_url = urljoin(url, href)
            
            if any(pattern in href.lower() for pattern in download_page_patterns):
                if full_url != url and full_url.startswith('http'):
                    print(f"  Following download page link: {full_url[:60]}...")
                    try:
                        sub_response = requests.get(full_url, headers=HEADERS, timeout=TIMEOUT)
                        sub_soup = BeautifulSoup(sub_response.text, 'html.parser')
                        
                        for sub_link in sub_soup.find_all('a', href=True):
                            sub_href = sub_link['href']
                            sub_full_url = urljoin(full_url, sub_href)
                            
                            if sub_full_url.lower().endswith('.iso'):
                                if sub_full_url not in iso_links:
                                    iso_links.append(sub_full_url)
                                    print(f"    Found .iso from subpage: {sub_full_url[:80]}...")
                    except Exception as e:
                        print(f"    Error following link: {e}")
                    
                    if len(iso_links) >= 5:
                        break
    
    print(f"  Found {len(iso_links)} potential ISO links")
    return iso_links


def verify_link(url):
    """Verify that a URL returns 200 OK (using HEAD request)."""
    try:
        response = requests.head(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
        if response.status_code == 200:
            return True
        if response.status_code == 405:
            response = requests.get(url, headers=HEADERS, timeout=TIMEOUT, stream=True, allow_redirects=True)
            return response.status_code == 200
        return False
    except requests.RequestException:
        try:
            response = requests.get(url, headers=HEADERS, timeout=TIMEOUT, stream=True, allow_redirects=True)
            return response.status_code == 200
        except requests.RequestException:
            return False


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


def insert_download(conn, release_id, architecture, iso_url):
    """Insert a download record."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id FROM downloads 
            WHERE release_id = %s AND architecture = %s
        """, (release_id, architecture))
        
        existing = cur.fetchone()
        
        if existing:
            cur.execute("""
                UPDATE downloads SET iso_url = %s WHERE id = %s
            """, (iso_url, existing[0]))
            print(f"    Updated existing download record")
        else:
            cur.execute("""
                INSERT INTO downloads (release_id, architecture, iso_url)
                VALUES (%s, %s, %s)
            """, (release_id, architecture, iso_url))
            print(f"    Created new download record")
        
        conn.commit()
        return True


def main():
    print("=" * 60)
    print("ISO Link Scraper and Validator")
    print("=" * 60)
    print()
    
    conn = get_db_connection()
    print("Connected to PostgreSQL database")
    print()
    
    distros = get_distros_without_downloads(conn)
    print(f"Found {len(distros)} distributions with releases but no downloads")
    print()
    
    if not distros:
        print("All distributions with releases already have downloads.")
        print("Run the admin dashboard to add new releases, then run this script again.")
        conn.close()
        return
    
    results = []
    
    for distro in distros:
        distro_id = distro['id']
        distro_name = distro['name']
        website_url = distro['website_url']
        
        print(f"Processing: {distro_name}")
        print("-" * 40)
        
        if not website_url:
            print(f"  No website URL found, skipping")
            print()
            continue
        
        release = get_latest_release_for_distro(conn, distro_id)
        if not release:
            print(f"  No releases found, creating placeholder release...")
            release = create_release_for_distro(conn, distro_id)
            if not release:
                print(f"  Failed to create release, skipping")
                print()
                continue
        
        print(f"  Distro ID: {distro_id}, Release ID: {release['id']}, Version: {release['version_number']}")
        
        iso_links = scrape_iso_links(website_url, distro_name)
        
        if not iso_links:
            download_urls = [
                f"{website_url.rstrip('/')}/download",
                f"{website_url.rstrip('/')}/downloads",
                f"{website_url.rstrip('/')}/get",
            ]
            for download_url in download_urls:
                print(f"  Trying alternate URL: {download_url}")
                iso_links = scrape_iso_links(download_url, distro_name)
                if iso_links:
                    break
        
        valid_links = []
        for link in iso_links[:10]:
            if not link.lower().endswith('.iso'):
                continue
            
            print(f"  Verifying: {link[:80]}...")
            if verify_link(link):
                architecture = detect_architecture(link)
                print(f"    Valid! Architecture: {architecture}")
                valid_links.append({"url": link, "architecture": architecture})
                
                if len(valid_links) >= 2:
                    break
            else:
                print(f"    Invalid (not 200 OK)")
        
        for link_info in valid_links:
            success = insert_download(
                conn,
                release['id'],
                link_info['architecture'],
                link_info['url']
            )
            if success:
                results.append({
                    "distro": distro_name,
                    "architecture": link_info['architecture'],
                    "url": link_info['url']
                })
        
        print()
    
    conn.close()
    
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Successfully updated {len(results)} download links:")
    for r in results:
        print(f"  - {r['distro']} ({r['architecture']}): {r['url'][:60]}...")
    
    if not results:
        print("  No links were updated. This could be because:")
        print("  - The download pages use JavaScript to load links")
        print("  - The ISO links are behind multiple redirects")
        print("  - The patterns need to be updated")
        print()
        print("You may need to manually add links using the admin dashboard.")


if __name__ == "__main__":
    main()

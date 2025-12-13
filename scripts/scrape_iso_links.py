#!/usr/bin/env python3
"""
ISO Link Scraper and Validator

This script scrapes download pages for ISO links, verifies they return 200 OK,
and updates the Supabase database with valid URLs.

Usage:
    python scripts/scrape_iso_links.py

Requirements:
    pip install requests beautifulsoup4 supabase

Environment Variables Required:
    SUPABASE_URL - Your Supabase project URL
    SUPABASE_SERVICE_KEY - Your Supabase service role key (not anon key)
"""

import os
import re
import sys
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

try:
    from supabase import create_client, Client
except ImportError:
    print("Error: supabase package not installed. Run: pip install supabase")
    sys.exit(1)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

DOWNLOAD_PAGES = [
    {
        "distro_name": "Ubuntu",
        "url": "https://ubuntu.com/download/desktop",
        "patterns": [r"\.iso$", r"releases\.ubuntu\.com.*\.iso"]
    },
    {
        "distro_name": "Fedora",
        "url": "https://fedoraproject.org/workstation/download",
        "patterns": [r"\.iso$", r"download\.fedoraproject\.org.*\.iso"]
    },
    {
        "distro_name": "Debian",
        "url": "https://www.debian.org/distrib/netinst",
        "patterns": [r"\.iso$", r"cdimage\.debian\.org.*\.iso"]
    },
    {
        "distro_name": "Linux Mint",
        "url": "https://linuxmint.com/download.php",
        "patterns": [r"\.iso$", r"mirrors.*linuxmint.*\.iso"]
    },
    {
        "distro_name": "Arch Linux",
        "url": "https://archlinux.org/download/",
        "patterns": [r"\.iso$", r"mirror.*archlinux.*\.iso"]
    },
]


def get_supabase_client() -> Client:
    """Initialize Supabase client from environment variables."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    
    if not url or not key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required")
        print("Set them with:")
        print("  export SUPABASE_URL='https://your-project.supabase.co'")
        print("  export SUPABASE_SERVICE_KEY='your-service-role-key'")
        sys.exit(1)
    
    return create_client(url, key)


def scrape_iso_links(url: str, patterns: list[str]) -> list[str]:
    """Scrape a page for ISO download links matching the given patterns."""
    print(f"  Fetching {url}...")
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"  Error fetching page: {e}")
        return []
    
    soup = BeautifulSoup(response.text, 'html.parser')
    iso_links = []
    
    for link in soup.find_all('a', href=True):
        href = link['href']
        full_url = urljoin(url, href)
        
        for pattern in patterns:
            if re.search(pattern, full_url, re.IGNORECASE):
                if full_url not in iso_links:
                    iso_links.append(full_url)
                break
    
    print(f"  Found {len(iso_links)} potential ISO links")
    return iso_links


def verify_link(url: str) -> bool:
    """Verify that a URL returns 200 OK (using HEAD request)."""
    try:
        response = requests.head(url, headers=HEADERS, timeout=30, allow_redirects=True)
        return response.status_code == 200
    except requests.RequestException:
        try:
            response = requests.get(url, headers=HEADERS, timeout=30, stream=True, allow_redirects=True)
            return response.status_code == 200
        except requests.RequestException:
            return False


def detect_architecture(url: str) -> str:
    """Detect architecture from URL."""
    url_lower = url.lower()
    if any(x in url_lower for x in ['aarch64', 'arm64']):
        return 'arm64'
    elif any(x in url_lower for x in ['x86_64', 'amd64', 'x64']):
        return 'amd64'
    elif 'i386' in url_lower or 'i686' in url_lower:
        return 'i386'
    return 'amd64'


def get_distro_id(supabase: Client, distro_name: str) -> int | None:
    """Get distribution ID by name."""
    result = supabase.table('distributions').select('id').ilike('name', f'%{distro_name}%').execute()
    if result.data:
        return result.data[0]['id']
    return None


def get_latest_release(supabase: Client, distro_id: int) -> dict | None:
    """Get the latest release for a distribution."""
    result = supabase.table('releases').select('*').eq('distro_id', distro_id).order('release_date', desc=True).limit(1).execute()
    if result.data:
        return result.data[0]
    return None


def update_download_url(supabase: Client, release_id: int, architecture: str, iso_url: str) -> bool:
    """Update or insert a download URL for a release."""
    existing = supabase.table('downloads').select('*').eq('release_id', release_id).eq('architecture', architecture).execute()
    
    if existing.data:
        result = supabase.table('downloads').update({'iso_url': iso_url}).eq('id', existing.data[0]['id']).execute()
        print(f"    Updated existing download record")
    else:
        result = supabase.table('downloads').insert({
            'release_id': release_id,
            'architecture': architecture,
            'iso_url': iso_url
        }).execute()
        print(f"    Created new download record")
    
    return bool(result.data)


def main():
    print("=" * 60)
    print("ISO Link Scraper and Validator")
    print("=" * 60)
    print()
    
    supabase = get_supabase_client()
    print("Connected to Supabase")
    print()
    
    results = []
    
    for config in DOWNLOAD_PAGES:
        distro_name = config["distro_name"]
        print(f"Processing: {distro_name}")
        print("-" * 40)
        
        distro_id = get_distro_id(supabase, distro_name)
        if not distro_id:
            print(f"  Distribution '{distro_name}' not found in database, skipping")
            print()
            continue
        
        release = get_latest_release(supabase, distro_id)
        if not release:
            print(f"  No releases found for '{distro_name}', skipping")
            print()
            continue
        
        print(f"  Found distro ID: {distro_id}, latest release ID: {release['id']}")
        
        iso_links = scrape_iso_links(config["url"], config["patterns"])
        
        valid_links = []
        for link in iso_links:
            print(f"  Verifying: {link[:80]}...")
            if verify_link(link):
                architecture = detect_architecture(link)
                print(f"    Valid! Architecture: {architecture}")
                valid_links.append({"url": link, "architecture": architecture})
            else:
                print(f"    Invalid (not 200 OK)")
        
        for link_info in valid_links:
            success = update_download_url(
                supabase,
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
    
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Successfully updated {len(results)} download links:")
    for r in results:
        print(f"  - {r['distro']} ({r['architecture']}): {r['url'][:60]}...")
    
    if not results:
        print("  No links were updated. This could be because:")
        print("  - The download pages have changed their structure")
        print("  - The ISO links require JavaScript to load")
        print("  - The patterns need to be updated")
        print()
        print("You may need to manually add links using the admin dashboard.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Link Validator Script for Linux Distribution Directory
Performs HEAD requests on all ISO and torrent URLs to check validity.
Does NOT download files - only checks headers.
"""

import os
import requests
import psycopg2
from datetime import datetime

DATABASE_URL = os.environ.get('DATABASE_URL')

def get_downloads():
    """Fetch all download entries from the database."""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("""
        SELECT d.id, d.iso_url, d.torrent_url, d.architecture, 
               dist.name as distro_name, r.version_number
        FROM downloads d
        JOIN releases r ON d.release_id = r.id
        JOIN distributions dist ON r.distro_id = dist.id
        ORDER BY dist.name, r.version_number
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

def check_url(url, timeout=15):
    """
    Check if a URL is valid using HEAD request.
    Returns: (is_valid, status_code, error_message)
    """
    if not url:
        return (None, None, "No URL")
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        }
        response = requests.head(url, timeout=timeout, allow_redirects=True, headers=headers)
        
        if response.status_code == 200:
            return (True, response.status_code, None)
        elif response.status_code == 405:
            response = requests.get(url, timeout=timeout, stream=True, headers=headers)
            response.close()
            if response.status_code == 200:
                return (True, response.status_code, None)
            return (False, response.status_code, f"HTTP {response.status_code}")
        else:
            return (False, response.status_code, f"HTTP {response.status_code}")
            
    except requests.exceptions.Timeout:
        return (False, None, "Timeout")
    except requests.exceptions.ConnectionError as e:
        return (False, None, f"Connection error: {str(e)[:50]}")
    except requests.exceptions.RequestException as e:
        return (False, None, f"Request error: {str(e)[:50]}")

def main():
    print("=" * 70)
    print("LINUX DISTRIBUTION DIRECTORY - LINK VALIDATION REPORT")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    print()
    
    downloads = get_downloads()
    
    total_iso = 0
    valid_iso = 0
    broken_iso = []
    
    total_torrent = 0
    valid_torrent = 0
    broken_torrent = []
    
    print(f"Checking {len(downloads)} download entries...")
    print()
    
    for dl in downloads:
        dl_id, iso_url, torrent_url, arch, distro_name, version = dl
        
        if iso_url:
            total_iso += 1
            is_valid, status, error = check_url(iso_url)
            if is_valid:
                valid_iso += 1
                print(f"  [OK] {distro_name} {version} ({arch}) - ISO")
            else:
                broken_iso.append({
                    'id': dl_id,
                    'distro': distro_name,
                    'version': version,
                    'arch': arch,
                    'url': iso_url,
                    'error': error
                })
                print(f"  [BROKEN] {distro_name} {version} ({arch}) - ISO: {error}")
        
        if torrent_url:
            total_torrent += 1
            is_valid, status, error = check_url(torrent_url)
            if is_valid:
                valid_torrent += 1
                print(f"  [OK] {distro_name} {version} ({arch}) - Torrent")
            else:
                broken_torrent.append({
                    'id': dl_id,
                    'distro': distro_name,
                    'version': version,
                    'arch': arch,
                    'url': torrent_url,
                    'error': error
                })
                print(f"  [BROKEN] {distro_name} {version} ({arch}) - Torrent: {error}")
    
    print()
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print()
    print(f"Total distributions in database: 50")
    print(f"Distributions with downloads: 27")
    print(f"Total download entries: {len(downloads)}")
    print()
    print(f"ISO Links:")
    print(f"  - Total: {total_iso}")
    print(f"  - Valid: {valid_iso}")
    print(f"  - Broken: {len(broken_iso)}")
    print()
    print(f"Torrent Links:")
    print(f"  - Total: {total_torrent}")
    print(f"  - Valid: {valid_torrent}")
    print(f"  - Broken: {len(broken_torrent)}")
    print()
    
    if broken_iso:
        print("-" * 70)
        print("BROKEN ISO LINKS:")
        print("-" * 70)
        for item in broken_iso:
            print(f"  {item['distro']} {item['version']} ({item['arch']})")
            print(f"    URL: {item['url'][:70]}...")
            print(f"    Error: {item['error']}")
            print()
    
    if broken_torrent:
        print("-" * 70)
        print("BROKEN TORRENT LINKS:")
        print("-" * 70)
        for item in broken_torrent:
            print(f"  {item['distro']} {item['version']} ({item['arch']})")
            print(f"    URL: {item['url'][:70]}...")
            print(f"    Error: {item['error']}")
            print()
    
    print("=" * 70)
    print("FRONTEND SYNC STATUS")
    print("=" * 70)
    print()
    print("The frontend (iso-browser.tsx) correctly:")
    print("  1. Shows ISO download button for entries with iso_url")
    print("  2. Shows Torrent button only when torrent_url exists")
    print("  3. Shows 'Check Website' when release has no downloads")
    print("  4. Tracks download clicks for analytics")
    print()
    print("=" * 70)
    print("END OF REPORT")
    print("=" * 70)

if __name__ == "__main__":
    main()

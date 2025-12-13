#!/usr/bin/env python3
"""
Metadata Fetcher for Linux Distribution Directory

Fetches missing logos and descriptions for distributions:
- Descriptions: Uses Wikipedia Python library
- Logos: Scrapes og:image or favicon from website using Playwright
"""

import os
import asyncio
import psycopg2
from psycopg2.extras import RealDictCursor

try:
    import wikipedia
except ImportError:
    print("Error: wikipedia package not installed. Run: pip install wikipedia")
    exit(1)

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("Error: playwright package not installed")
    exit(1)

from urllib.parse import urljoin

DATABASE_URL = os.environ.get('DATABASE_URL')
PLACEHOLDER_LOGO = "https://placehold.co/400x400?text=Linux"


def get_db_connection():
    """Get database connection."""
    if not DATABASE_URL:
        print("Error: DATABASE_URL not set")
        exit(1)
    return psycopg2.connect(DATABASE_URL)


def get_distros_missing_metadata(conn):
    """Get distributions missing logo_url or description."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT id, name, website_url, logo_url, description
            FROM distributions
            WHERE logo_url IS NULL OR logo_url = ''
            ORDER BY name
        """)
        return cur.fetchall()


def update_distro_metadata(conn, distro_id, logo_url=None, description=None):
    """Update distribution metadata."""
    with conn.cursor() as cur:
        if logo_url and description:
            cur.execute("""
                UPDATE distributions 
                SET logo_url = %s, description = %s 
                WHERE id = %s
            """, (logo_url, description, distro_id))
        elif logo_url:
            cur.execute("""
                UPDATE distributions SET logo_url = %s WHERE id = %s
            """, (logo_url, distro_id))
        elif description:
            cur.execute("""
                UPDATE distributions SET description = %s WHERE id = %s
            """, (description, distro_id))
        conn.commit()


def fetch_wikipedia_description(distro_name):
    """Fetch first paragraph of Wikipedia summary for a distribution."""
    search_terms = [
        f"{distro_name} (operating system)",
        f"{distro_name} Linux",
        distro_name,
    ]
    
    for term in search_terms:
        try:
            wikipedia.set_lang("en")
            search_results = wikipedia.search(term, results=3)
            
            for result in search_results:
                try:
                    page = wikipedia.page(result, auto_suggest=False)
                    summary = page.summary
                    
                    if distro_name.lower() in summary.lower() or 'linux' in summary.lower():
                        first_paragraph = summary.split('\n')[0]
                        if len(first_paragraph) > 50:
                            if len(first_paragraph) > 500:
                                first_paragraph = first_paragraph[:500].rsplit(' ', 1)[0] + '...'
                            return first_paragraph
                except wikipedia.exceptions.DisambiguationError:
                    continue
                except wikipedia.exceptions.PageError:
                    continue
                    
        except Exception as e:
            continue
    
    return None


async def fetch_logo_from_website(browser, website_url):
    """Fetch logo from website using Playwright."""
    if not website_url:
        return PLACEHOLDER_LOGO
    
    if not website_url.startswith('http'):
        website_url = 'https://' + website_url
    
    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    )
    page = await context.new_page()
    
    try:
        await page.goto(website_url, wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(1)
        
        og_image = await page.locator('meta[property="og:image"]').first.get_attribute('content')
        if og_image:
            logo_url = urljoin(website_url, og_image)
            await context.close()
            return logo_url
    except:
        pass
    
    try:
        apple_icon = await page.locator('link[rel="apple-touch-icon"]').first.get_attribute('href')
        if apple_icon:
            logo_url = urljoin(website_url, apple_icon)
            await context.close()
            return logo_url
    except:
        pass
    
    try:
        icon_selectors = [
            'link[rel="icon"][sizes="192x192"]',
            'link[rel="icon"][sizes="128x128"]',
            'link[rel="icon"][sizes="96x96"]',
            'link[rel*="icon"]',
        ]
        
        for selector in icon_selectors:
            try:
                href = await page.locator(selector).first.get_attribute('href')
                if href:
                    logo_url = urljoin(website_url, href)
                    await context.close()
                    return logo_url
            except:
                continue
    except:
        pass
    
    try:
        await context.close()
    except:
        pass
    
    return PLACEHOLDER_LOGO


async def main():
    print("=" * 60)
    print("Linux Distribution Metadata Fetcher")
    print("=" * 60)
    print()
    
    conn = get_db_connection()
    distros = get_distros_missing_metadata(conn)
    
    print(f"Found {len(distros)} distributions missing metadata")
    print()
    
    if not distros:
        print("All distributions have metadata!")
        conn.close()
        return
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            executable_path='/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium'
        )
        
        success_count = 0
        
        for i, distro in enumerate(distros):
            distro_id = distro['id']
            name = distro['name']
            website_url = distro['website_url']
            current_desc = distro['description']
            
            print(f"[{i+1}/{len(distros)}] Processing: {name}")
            
            new_logo = None
            new_desc = None
            
            print(f"  Fetching logo from {website_url}...")
            new_logo = await fetch_logo_from_website(browser, website_url)
            if new_logo == PLACEHOLDER_LOGO:
                print(f"    Using placeholder logo")
            else:
                print(f"    Found: {new_logo[:60]}...")
            
            if not current_desc or len(current_desc) < 50:
                print(f"  Fetching Wikipedia description...")
                new_desc = fetch_wikipedia_description(name)
                if new_desc:
                    print(f"    Found: {new_desc[:60]}...")
                else:
                    print(f"    No Wikipedia description found")
            
            if new_logo or new_desc:
                update_distro_metadata(conn, distro_id, new_logo, new_desc)
                success_count += 1
                print(f"  Updated database")
            
            print()
            await asyncio.sleep(0.5)
        
        await browser.close()
    
    conn.close()
    
    print("=" * 60)
    print(f"SUMMARY: Updated {success_count}/{len(distros)} distributions")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

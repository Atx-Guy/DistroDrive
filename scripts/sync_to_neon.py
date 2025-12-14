#!/usr/bin/env python3
"""
Sync all data from development database to Neon database
"""

import os
import sys

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("Error: psycopg2 not installed")
    sys.exit(1)

DEV_DB = os.environ.get('DATABASE_URL')
NEON_DB = "postgresql://neondb_owner:npg_ZEkqRsca4U3H@ep-cold-base-a46x0aeo-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

def main():
    if not DEV_DB:
        print("Error: DATABASE_URL not set")
        sys.exit(1)
    
    print("Connecting to development database...")
    dev_conn = psycopg2.connect(DEV_DB)
    dev_cur = dev_conn.cursor(cursor_factory=RealDictCursor)
    
    print("Connecting to Neon database...")
    neon_conn = psycopg2.connect(NEON_DB)
    neon_cur = neon_conn.cursor()
    
    print("\n" + "="*50)
    print("Clearing existing data in Neon...")
    neon_cur.execute("DELETE FROM download_clicks")
    neon_cur.execute("DELETE FROM downloads")
    neon_cur.execute("DELETE FROM releases")
    neon_cur.execute("DELETE FROM news")
    neon_cur.execute("DELETE FROM technical_specs")
    neon_cur.execute("DELETE FROM distributions")
    neon_conn.commit()
    
    print("\nTransferring distributions...")
    dev_cur.execute("SELECT * FROM distributions ORDER BY id")
    distros = dev_cur.fetchall()
    for d in distros:
        neon_cur.execute("""
            INSERT INTO distributions (id, name, description, website_url, logo_url, base_distro, desktop_environments)
            OVERRIDING SYSTEM VALUE
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (d['id'], d['name'], d['description'], d['website_url'], d['logo_url'], d['base_distro'], d['desktop_environments']))
    neon_conn.commit()
    print(f"  Transferred {len(distros)} distributions")
    
    print("\nTransferring technical specs...")
    dev_cur.execute("SELECT * FROM technical_specs ORDER BY id")
    specs = dev_cur.fetchall()
    for s in specs:
        neon_cur.execute("""
            INSERT INTO technical_specs (id, distro_id, package_manager, init_system, release_model, kernel_version, license)
            OVERRIDING SYSTEM VALUE
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (s['id'], s['distro_id'], s['package_manager'], s['init_system'], s['release_model'], s['kernel_version'], s['license']))
    neon_conn.commit()
    print(f"  Transferred {len(specs)} technical specs")
    
    print("\nTransferring releases...")
    dev_cur.execute("SELECT * FROM releases ORDER BY id")
    releases = dev_cur.fetchall()
    for r in releases:
        neon_cur.execute("""
            INSERT INTO releases (id, distro_id, version_number, release_date, is_lts)
            OVERRIDING SYSTEM VALUE
            VALUES (%s, %s, %s, %s, %s)
        """, (r['id'], r['distro_id'], r['version_number'], r['release_date'], r['is_lts']))
    neon_conn.commit()
    print(f"  Transferred {len(releases)} releases")
    
    print("\nTransferring downloads...")
    dev_cur.execute("SELECT * FROM downloads ORDER BY id")
    downloads = dev_cur.fetchall()
    for dl in downloads:
        neon_cur.execute("""
            INSERT INTO downloads (id, release_id, architecture, iso_url, torrent_url, checksum, download_size)
            OVERRIDING SYSTEM VALUE
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (dl['id'], dl['release_id'], dl['architecture'], dl['iso_url'], dl['torrent_url'], dl['checksum'], dl['download_size']))
    neon_conn.commit()
    print(f"  Transferred {len(downloads)} downloads")
    
    print("\nTransferring news...")
    dev_cur.execute("SELECT * FROM news ORDER BY id")
    news_items = dev_cur.fetchall()
    for n in news_items:
        neon_cur.execute("""
            INSERT INTO news (id, title, source_url, published_at)
            OVERRIDING SYSTEM VALUE
            VALUES (%s, %s, %s, %s)
        """, (n['id'], n['title'], n['source_url'], n['published_at']))
    neon_conn.commit()
    print(f"  Transferred {len(news_items)} news items")
    
    print("\nResetting sequences...")
    neon_cur.execute("SELECT setval('distributions_id_seq', (SELECT MAX(id) FROM distributions))")
    neon_cur.execute("SELECT setval('technical_specs_id_seq', (SELECT MAX(id) FROM technical_specs))")
    neon_cur.execute("SELECT setval('releases_id_seq', (SELECT MAX(id) FROM releases))")
    neon_cur.execute("SELECT setval('downloads_id_seq', (SELECT MAX(id) FROM downloads))")
    neon_cur.execute("SELECT setval('news_id_seq', (SELECT MAX(id) FROM news))")
    neon_conn.commit()
    
    dev_cur.close()
    dev_conn.close()
    neon_cur.close()
    neon_conn.close()
    
    print("\n" + "="*50)
    print("SYNC COMPLETE!")
    print(f"  Distributions: {len(distros)}")
    print(f"  Technical Specs: {len(specs)}")
    print(f"  Releases: {len(releases)}")
    print(f"  Downloads: {len(downloads)}")
    print(f"  News: {len(news_items)}")

if __name__ == '__main__':
    main()

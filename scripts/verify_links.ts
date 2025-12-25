
import fs from 'fs';
import path from 'path';

async function verifyLinks() {
    console.log('Starting verification of download links & logos (Regex Extraction mode)...');

    const storagePath = path.join(process.cwd(), 'server', 'storage.ts');
    const content = fs.readFileSync(storagePath, 'utf-8');

    // Regex to find isoUrl: "..."
    const isoRegex = /isoUrl:\s*"([^"]+)"/g;
    // Regex to find logoUrl: "..."
    const logoRegex = /logoUrl:\s*"([^"]+)"/g;

    let match;
    const urls = new Set<string>();

    // Extract ISOs
    while ((match = isoRegex.exec(content)) !== null) {
        const url = match[1];
        if (url && !url.includes('placehold') && !url.includes('example') && !url.includes('TODO')) {
            urls.add(url);
        }
    }

    // Extract Logos
    while ((match = logoRegex.exec(content)) !== null) {
        const url = match[1];
        if (url && !url.includes('placehold') && !url.includes('example')) {
            urls.add(url);
        }
    }

    console.log(`Found ${urls.size} unique URLs to check.`);
    let brokenCount = 0;

    for (const url of urls) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            const res = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
                headers: { 'User-Agent': 'Mozilla/5.0' } // Some assets servers block empty UA
            });
            clearTimeout(timeout);

            if (res.ok) {
                console.log(`[OK] ${url}`);
            } else {
                // Retry with GET
                try {
                    const controller2 = new AbortController();
                    const timeout2 = setTimeout(() => controller2.abort(), 8000);
                    const res2 = await fetch(url, {
                        method: 'GET',
                        headers: { 'User-Agent': 'Mozilla/5.0', Range: 'bytes=0-10' },
                        signal: controller2.signal
                    });
                    clearTimeout(timeout2);
                    if (res2.ok || res2.status === 206) {
                        console.log(`[OK-GET] ${url}`);
                    } else {
                        console.error(`[FAIL] ${res.status} - ${url}`);
                        brokenCount++;
                    }
                } catch (err) {
                    console.error(`[FAIL] ${res.status}/ERR - ${url}`);
                    brokenCount++;
                }
            }
        } catch (err: any) {
            console.error(`[FAIL-NET] ${err.message} - ${url}`);
            brokenCount++;
        }
    }

    console.log(`Verification complete. Broken: ${brokenCount}`);
}

verifyLinks().catch(console.error);

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    let targetUrl = searchParams.get('url');

    if (!targetUrl) {
        return NextResponse.json({ title: '', error: 'URL is required' }, { status: 400 });
    }

    // Ensure the URL has a protocol, otherwise fetch will fail
    if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000); // 6 second timeout

        // Use headers that mimic a real browser to bypass basic bot protection
        const res = await fetch(targetUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
            },
        });

        clearTimeout(timeout);

        if (!res.ok) {
            console.warn(`Failed to fetch ${targetUrl}: ${res.status} ${res.statusText}`);
            return NextResponse.json({ title: '' });
        }

        // Get the final URL (in case of redirects)
        const html = await res.text();

        // Extract title
        const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        let rawTitle = match ? match[1].trim() : '';

        // Clean up extra whitespace
        rawTitle = rawTitle.replace(/\s+/g, ' ');

        // Decode HTML entities
        const decoded = rawTitle
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&#x27;/g, "'");

        return NextResponse.json({ title: decoded });
    } catch (error) {
        console.error(`Error fetching title for ${targetUrl}:`, error.message);
        return NextResponse.json({ title: '' });
    }
}
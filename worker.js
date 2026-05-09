// YT Thumbnail Proxy Worker
// Deploy: Cloudflare Workers → yt-thumb-proxy.YOUR-SUBDOMAIN.workers.dev
// Only allows YouTube thumbnail domains for safety

const ALLOWED_HOSTS = [
  'img.youtube.com',
  'i.ytimg.com',
  'i1.ytimg.com',
  'i2.ytimg.com',
  'i3.ytimg.com',
  'i4.ytimg.com',
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const imageUrl = url.searchParams.get('url');

    // No URL param
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Missing ?url= parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Only allow YouTube thumbnail hosts
    if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
      return new Response(JSON.stringify({ error: 'Host not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Fetch the image
    try {
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; YTThumbDownloader/1.0)',
          'Referer': 'https://www.youtube.com/',
        },
      });

      if (!imageResponse.ok) {
        return new Response(JSON.stringify({ error: 'Image not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      // Get filename from query param or generate one
      const filename = url.searchParams.get('filename') || 'thumbnail.jpg';

      // Return image with download headers
      const responseHeaders = {
        'Content-Type': imageResponse.headers.get('Content-Type') || 'image/jpeg',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=86400',
        ...CORS_HEADERS,
      };

      return new Response(imageResponse.body, {
        status: 200,
        headers: responseHeaders,
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: 'Fetch failed', detail: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
  },
};

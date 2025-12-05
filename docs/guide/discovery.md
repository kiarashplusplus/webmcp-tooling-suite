# Discovery

Discovery is how AI agents find your feed. This guide covers the standard locations and methods for making your feed discoverable.

## Feed Formats & Tooling Status

| Format | Status | Tooling Support |
|--------|--------|----------------|
| **LLMFeed JSON** (`.json`) | ✅ Recommended | Full validation, signing, monitoring |
| **llm.txt** (`.txt`) | 🚧 Coming Soon | Discovery only (parsing in progress) |

## Well-Known Locations

### LLMFeed JSON (Recommended ✅)

For full tooling support, place your JSON feed at:

```
https://example.com/.well-known/llmfeed.json
https://example.com/llmfeed.json
```

### llm.txt (Human-Readable 🚧)

For human readers and LLMs that prefer markdown:

```
https://example.com/.well-known/llm.txt
https://example.com/llm.txt
```

::: tip Best Practice
Serve **both formats**: LLMFeed JSON for machine consumption with full tooling, and llm.txt for human readers. Our tools will crawl and validate the JSON format.
:::

### Custom Location via robots.txt

Specify custom locations in your `robots.txt`:

```
User-agent: *
Allow: /

# LLMFeed Discovery
LLMFeed: /api/llmfeed.json
LLMFeed: /api/llm.txt
```

Multiple `LLMFeed` directives are allowed for different feed formats.

## Content Types

Serve your feed with the appropriate content type:

| Format | Content-Type |
|--------|--------------|
| JSON | `application/json` |
| Plain text | `text/plain` |

Example response headers:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=3600
X-LLMFeed-Version: 1.0
```

## Discovery Methods

### Method 1: Direct URL

Agents request the well-known URLs directly:

```typescript
async function discoverFeed(domain: string) {
  // Prefer JSON for tooling, fall back to llm.txt
  const urls = [
    `https://${domain}/.well-known/llmfeed.json`,
    `https://${domain}/llmfeed.json`,
    `https://${domain}/.well-known/llm.txt`,  // llm.txt support coming soon
    `https://${domain}/llm.txt`
  ]
  
  for (const url of urls) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        // JSON feeds get full tooling support
        if (url.endsWith('.json')) {
          return await response.json()
        }
        // llm.txt parsing coming soon
        return await response.text()
      }
    } catch {
      continue
    }
  }
  
  return null
}
```

### Method 2: robots.txt

Agents parse `robots.txt` for `LLMFeed` directives:

```typescript
async function discoverFromRobots(domain: string) {
  const robotsUrl = `https://${domain}/robots.txt`
  const response = await fetch(robotsUrl)
  const text = await response.text()
  
  const feedUrls = []
  for (const line of text.split('\n')) {
    if (line.toLowerCase().startsWith('llmfeed:')) {
      const path = line.split(':').slice(1).join(':').trim()
      feedUrls.push(new URL(path, `https://${domain}`).href)
    }
  }
  
  return feedUrls
}
```

### Method 3: HTML Meta Tags

Include discovery hints in your HTML:

```html
<head>
  <!-- LLMFeed JSON (recommended for tooling) -->
  <link rel="llmfeed" href="/llmfeed.json" type="application/json">
  
  <!-- llm.txt (for human readers) -->
  <link rel="llmfeed" href="/llm.txt" type="text/plain">
</head>
```

### Method 4: HTTP Headers

Include a `Link` header:

```http
Link: </.well-known/llmfeed.json>; rel="llmfeed"; type="application/json"
```

## The LLMFeed Directory

The public directory aggregates feeds from across the web, making discovery easier.

### Registering Your Feed

1. **Via Web Interface**

   Visit the [LLMFeed Playground](https://kiarashplusplus.github.io/webmcp-tooling-suite/) and use the "Submit Feed" feature.

2. **Via API**

   ```bash
   curl -X POST https://api.llmfeed.dev/directory/submit \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com/.well-known/llm.txt"}'
   ```

3. **Via GitHub**

   Open a PR to add your feed to the directory repository.

### Directory Benefits

- **Centralized discovery** - Agents can query one endpoint
- **Health monitoring** - Automatic availability tracking
- **Validation status** - Pre-validated feeds with trust indicators
- **Search** - Find feeds by capability or category

### Querying the Directory

```typescript
// Search by capability
const feeds = await fetch('https://api.llmfeed.dev/directory/search?capability=search')
  .then(r => r.json())

// Get all feeds for a domain
const domainFeeds = await fetch('https://api.llmfeed.dev/directory/domain/example.com')
  .then(r => r.json())

// Get feed metadata
const metadata = await fetch('https://api.llmfeed.dev/directory/feed/example.com')
  .then(r => r.json())
```

## Opt-Out Mechanisms

If you don't want AI agents crawling your feed, you can opt out:

### robots.txt

```
User-agent: LLMFeedBot
Disallow: /

User-agent: *
Disallow: /llm.txt
```

### Meta Tags

```html
<meta name="llmfeed-optout" content="true">
```

### Feed-Level

```json
{
  "meta": {
    "optOut": true,
    "optOutReason": "Feed deprecated, use v2 instead"
  }
}
```

## Caching & Freshness

### Cache Headers

Set appropriate cache headers:

```http
Cache-Control: public, max-age=3600
ETag: "abc123"
Last-Modified: Fri, 05 Dec 2025 10:00:00 GMT
```

### Conditional Requests

Support `If-None-Match` and `If-Modified-Since`:

```http
GET /.well-known/llm.txt HTTP/1.1
If-None-Match: "abc123"
If-Modified-Since: Fri, 05 Dec 2025 10:00:00 GMT
```

Response for unchanged content:

```http
HTTP/1.1 304 Not Modified
```

### Update Frequency

Include freshness hints in your feed:

```json
{
  "meta": {
    "refreshInterval": "1h",
    "lastUpdated": "2025-12-05T10:00:00Z"
  }
}
```

## SEO for AI

Help search engines and AI crawlers find your feed:

### Sitemap

Include your feed in `sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/.well-known/llm.txt</loc>
    <lastmod>2025-12-05</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### Schema.org Markup

Add structured data to your HTML:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebAPI",
  "name": "My Service API",
  "description": "API for AI agent integration",
  "documentation": "https://example.com/.well-known/llm.txt",
  "provider": {
    "@type": "Organization",
    "name": "Example Corp"
  }
}
</script>
```

## Multi-Environment Discovery

Support different feeds for different environments:

### Staging vs Production

```
# Production
https://example.com/.well-known/llm.txt

# Staging
https://staging.example.com/.well-known/llm.txt
```

### Versioned Feeds

```
https://example.com/.well-known/llm.txt      # Latest
https://example.com/.well-known/llm-v1.txt   # Version 1
https://example.com/.well-known/llm-v2.txt   # Version 2
```

## Best Practices

### 1. Use HTTPS

Always serve feeds over HTTPS:

```
✅ https://example.com/.well-known/llm.txt
❌ http://example.com/.well-known/llm.txt
```

### 2. Support CORS

Enable CORS for browser-based agents:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
```

### 3. Provide Redirects

If you move your feed, set up redirects:

```http
HTTP/1.1 301 Moved Permanently
Location: https://example.com/.well-known/llm.txt
```

### 4. Monitor Discovery

Track discovery requests in your analytics:

```typescript
app.get('/.well-known/llm.txt', (req, res) => {
  analytics.track('feed_discovery', {
    userAgent: req.headers['user-agent'],
    referer: req.headers['referer']
  })
  
  res.json(feed)
})
```

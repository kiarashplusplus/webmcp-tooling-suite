# LLMFeed CORS Proxy

A Cloudflare Worker that proxies requests to external LLMFeed JSON files, adding appropriate CORS headers to allow browser-based access.

## Purpose

Browsers block cross-origin requests to external domains due to CORS policies. This worker acts as a proxy, fetching the requested LLMFeed JSON file and returning it with proper CORS headers.

## Security Features

- Only allows requests to HTTPS URLs
- Only proxies `.json` files
- Validates that responses are valid JSON
- Blocks requests to private/internal IP ranges
- Allows only specific origins (configurable)

## Deployment

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### Steps

1. **Login to Cloudflare:**
   ```bash
   npx wrangler login
   ```

2. **Install dependencies:**
   ```bash
   cd workers/cors-proxy
   npm install
   ```

3. **Deploy the worker:**
   ```bash
   npm run deploy
   ```

4. **Note your worker URL:**
   After deployment, you'll get a URL like:
   ```
   https://llmfeed-cors-proxy.<your-subdomain>.workers.dev
   ```

5. **Add to GitHub Secrets:**
   Add `VITE_CORS_PROXY_URL` secret with your worker URL.

## Configuration

Edit `src/index.ts` to customize allowed origins:

```typescript
const ALLOWED_ORIGINS = [
  'https://yourusername.github.io',
  'http://localhost:5173',
];
```

## Usage

The proxy expects a `url` query parameter with the URL to fetch:

```
GET /?url=https://example.com/.well-known/llmfeed.json
```

### Example Response Headers

```
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
Content-Type: application/json
```

## Local Development

```bash
npm run dev
```

This starts a local server at `http://localhost:8787`.

## Error Responses

| Status | Message | Cause |
|--------|---------|-------|
| 400 | Missing 'url' query parameter | No URL provided |
| 400 | Only HTTPS URLs are allowed | HTTP URL provided |
| 400 | URL must point to a .json file | Non-JSON URL |
| 400 | Invalid URL | Malformed URL |
| 403 | Access to private networks is not allowed | Private IP detected |
| 403 | Origin not allowed | Request from unauthorized origin |
| 500 | Invalid JSON response | Target didn't return valid JSON |
| 502 | Failed to fetch from target URL | Network error |

## Rate Limiting

Consider adding rate limiting for production use. Cloudflare Workers support this via:
- [Rate Limiting Rules](https://developers.cloudflare.com/waf/rate-limiting-rules/)
- Custom implementation with KV or Durable Objects

## License

MIT

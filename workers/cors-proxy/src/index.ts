/**
 * Cloudflare Worker CORS Proxy for LLMFeed Analyzer
 * 
 * Proxies requests to fetch LLMFeed JSON files from any domain,
 * adding appropriate CORS headers to allow browser access.
 * 
 * Usage: GET /?url=https://example.com/.well-known/mcp.llmfeed.json
 * 
 * Security:
 * - Only allows fetching .json files
 * - Rate limited by Cloudflare
 * - Validates URL format
 */

export interface Env {
  // Optional: Add rate limiting KV or D1 binding
}

export const ALLOWED_ORIGINS = [
  'https://kiarashplusplus.github.io',
  'http://localhost:5000',
  'http://localhost:5173',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5173',
]

// CORS headers helper
export function corsHeaders(origin: string): HeadersInit {
  const allowOrigin = ALLOWED_ORIGINS.some(o => origin.startsWith(o)) ? origin : ALLOWED_ORIGINS[0]
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

/**
 * Validate a target URL for proxying
 */
export interface UrlValidationResult {
  valid: boolean
  error?: string
  parsedUrl?: URL
  isPemRequest?: boolean
}

export function validateTargetUrl(targetUrl: string): UrlValidationResult {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(targetUrl)
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }

  // Security: Only allow HTTPS (except for localhost)
  if (parsedUrl.protocol !== 'https:' && !parsedUrl.hostname.includes('localhost')) {
    return { valid: false, error: 'Only HTTPS URLs are allowed' }
  }

  // Security: Only allow specific file types
  const isJsonFile = parsedUrl.pathname.endsWith('.json')
  const isPemFile = parsedUrl.pathname.endsWith('.pem')
  const isWellKnown = parsedUrl.pathname.includes('.well-known')
  const isLLMFeed = parsedUrl.pathname.includes('llmfeed')
  const isPublicKey = parsedUrl.pathname.includes('public') || parsedUrl.pathname.includes('key')
  
  if (!isJsonFile && !isPemFile && !isWellKnown && !isLLMFeed && !isPublicKey) {
    return { valid: false, error: 'Only .json, .pem files or .well-known paths are allowed' }
  }

  // Security: Block private IP ranges
  const hostname = parsedUrl.hostname
  if (isPrivateIp(hostname)) {
    return { valid: false, error: 'Private IP addresses are not allowed' }
  }

  const isPemRequest = isPemFile || isPublicKey

  return { valid: true, parsedUrl, isPemRequest }
}

/**
 * Check if a hostname is a private IP address
 */
export function isPrivateIp(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('172.16.') ||
    hostname === '0.0.0.0'
  )
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || ALLOWED_ORIGINS[0]

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      })
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    const url = new URL(request.url)
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', service: 'llmfeed-cors-proxy' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    // Get the target URL from query parameter
    const targetUrl = url.searchParams.get('url')

    if (!targetUrl) {
      return new Response(JSON.stringify({ 
        error: 'Missing url parameter',
        usage: 'GET /?url=https://example.com/.well-known/mcp.llmfeed.json'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    // Validate the target URL
    const validation = validateTargetUrl(targetUrl)
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    const { parsedUrl, isPemRequest } = validation

    try {
      // Fetch the target URL
      const response = await fetch(targetUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'LLMFeed-Analyzer-Proxy/1.0 (+https://github.com/kiarashplusplus/webmcp-tooling-suite)',
        },
        // Follow redirects
        redirect: 'follow',
      })

      if (!response.ok) {
        return new Response(JSON.stringify({ 
          error: `Upstream server returned ${response.status}`,
          status: response.status,
          statusText: response.statusText
        }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        })
      }

      // Get the response body
      const body = await response.text()
      
      // Only validate JSON for JSON requests
      if (!isPemRequest) {
        try {
          JSON.parse(body)
        } catch {
          return new Response(JSON.stringify({ 
            error: 'Response is not valid JSON' 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
          })
        }
      }

      // Return the proxied response with CORS headers
      const contentType = isPemRequest ? 'text/plain' : 'application/json'
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
          'X-Proxied-From': parsedUrl!.origin,
          ...corsHeaders(origin),
        },
      })

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch from upstream',
        details: message
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }
  },
}

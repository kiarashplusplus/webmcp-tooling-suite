/**
 * CORS Proxy Worker Test Suite
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Constants matching those in index.ts
const ALLOWED_ORIGINS = [
  'https://kiarashplusplus.github.io',
  'http://localhost:5000',
  'http://localhost:5173',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5173',
]

// Helper function to generate CORS headers (mirrors implementation)
function corsHeaders(origin: string): Record<string, string> {
  const allowOrigin = ALLOWED_ORIGINS.some(o => origin.startsWith(o)) ? origin : ALLOWED_ORIGINS[0]
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

// URL validation logic
function validateTargetUrl(targetUrl: string): { valid: boolean; error?: string; parsedUrl?: URL } {
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
  if (
    hostname === 'localhost' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('172.16.') ||
    hostname === '0.0.0.0'
  ) {
    return { valid: false, error: 'Private IP addresses are not allowed' }
  }

  return { valid: true, parsedUrl }
}

describe('CORS Headers', () => {
  it('should return allowed origin for main domain', () => {
    const headers = corsHeaders('https://kiarashplusplus.github.io')
    expect(headers['Access-Control-Allow-Origin']).toBe('https://kiarashplusplus.github.io')
  })

  it('should return allowed origin for localhost:5000', () => {
    const headers = corsHeaders('http://localhost:5000')
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5000')
  })

  it('should return allowed origin for localhost:5173', () => {
    const headers = corsHeaders('http://localhost:5173')
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173')
  })

  it('should return default origin for unknown origin', () => {
    const headers = corsHeaders('https://evil.com')
    expect(headers['Access-Control-Allow-Origin']).toBe(ALLOWED_ORIGINS[0])
  })

  it('should include correct methods', () => {
    const headers = corsHeaders('https://kiarashplusplus.github.io')
    expect(headers['Access-Control-Allow-Methods']).toBe('GET, OPTIONS')
  })

  it('should include Content-Type in allowed headers', () => {
    const headers = corsHeaders('https://kiarashplusplus.github.io')
    expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type')
  })

  it('should set max-age for preflight caching', () => {
    const headers = corsHeaders('https://kiarashplusplus.github.io')
    expect(headers['Access-Control-Max-Age']).toBe('86400')
  })
})

describe('URL Validation', () => {
  describe('URL Format Validation', () => {
    it('should reject invalid URL format', () => {
      const result = validateTargetUrl('not-a-valid-url')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid URL format')
    })

    it('should accept valid HTTPS URL', () => {
      const result = validateTargetUrl('https://example.com/.well-known/mcp.llmfeed.json')
      expect(result.valid).toBe(true)
    })
  })

  describe('HTTPS Enforcement', () => {
    it('should reject HTTP URLs for non-localhost', () => {
      const result = validateTargetUrl('http://example.com/feed.json')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Only HTTPS URLs are allowed')
    })

    it('should accept HTTPS URLs', () => {
      const result = validateTargetUrl('https://example.com/feed.json')
      expect(result.valid).toBe(true)
    })
  })

  describe('File Type Restrictions', () => {
    it('should allow .json files', () => {
      const result = validateTargetUrl('https://example.com/feed.json')
      expect(result.valid).toBe(true)
    })

    it('should allow .pem files', () => {
      const result = validateTargetUrl('https://example.com/public.pem')
      expect(result.valid).toBe(true)
    })

    it('should allow .well-known paths', () => {
      const result = validateTargetUrl('https://example.com/.well-known/mcp.llmfeed.json')
      expect(result.valid).toBe(true)
    })

    it('should allow paths containing llmfeed', () => {
      const result = validateTargetUrl('https://example.com/api/llmfeed/data')
      expect(result.valid).toBe(true)
    })

    it('should allow paths containing public', () => {
      const result = validateTargetUrl('https://example.com/public/key')
      expect(result.valid).toBe(true)
    })

    it('should allow paths containing key', () => {
      const result = validateTargetUrl('https://example.com/crypto/key')
      expect(result.valid).toBe(true)
    })

    it('should reject HTML files', () => {
      const result = validateTargetUrl('https://example.com/index.html')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('.json')
    })

    it('should reject arbitrary paths', () => {
      const result = validateTargetUrl('https://example.com/api/secret')
      expect(result.valid).toBe(false)
    })

    it('should reject JS files', () => {
      const result = validateTargetUrl('https://example.com/app.js')
      expect(result.valid).toBe(false)
    })
  })

  describe('Private IP Blocking', () => {
    it('should block localhost', () => {
      const result = validateTargetUrl('https://localhost/feed.json')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Private IP addresses are not allowed')
    })

    it('should block 127.0.0.1', () => {
      const result = validateTargetUrl('https://127.0.0.1/feed.json')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Private IP addresses are not allowed')
    })

    it('should block 127.x.x.x range', () => {
      const result = validateTargetUrl('https://127.1.2.3/feed.json')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Private IP addresses are not allowed')
    })

    it('should block 10.x.x.x range', () => {
      const result = validateTargetUrl('https://10.0.0.1/feed.json')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Private IP addresses are not allowed')
    })

    it('should block 192.168.x.x range', () => {
      const result = validateTargetUrl('https://192.168.1.1/feed.json')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Private IP addresses are not allowed')
    })

    it('should block 172.16.x.x range', () => {
      const result = validateTargetUrl('https://172.16.0.1/feed.json')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Private IP addresses are not allowed')
    })

    it('should block 0.0.0.0', () => {
      const result = validateTargetUrl('https://0.0.0.0/feed.json')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Private IP addresses are not allowed')
    })

    it('should allow public IPs', () => {
      const result = validateTargetUrl('https://8.8.8.8/feed.json')
      expect(result.valid).toBe(true)
    })

    it('should allow public domains', () => {
      const result = validateTargetUrl('https://example.com/feed.json')
      expect(result.valid).toBe(true)
    })
  })
})

describe('Request Validation Edge Cases', () => {
  it('should handle URL with query parameters', () => {
    const result = validateTargetUrl('https://example.com/feed.json?version=1')
    expect(result.valid).toBe(true)
  })

  it('should handle URL with fragment', () => {
    const result = validateTargetUrl('https://example.com/feed.json#section')
    expect(result.valid).toBe(true)
  })

  it('should handle URL with port', () => {
    const result = validateTargetUrl('https://example.com:8443/feed.json')
    expect(result.valid).toBe(true)
  })

  it('should handle URL with subdomain', () => {
    const result = validateTargetUrl('https://api.example.com/feed.json')
    expect(result.valid).toBe(true)
  })

  it('should handle deeply nested paths', () => {
    const result = validateTargetUrl('https://example.com/a/b/c/d/feed.json')
    expect(result.valid).toBe(true)
  })

  it('should handle URL-encoded characters', () => {
    const result = validateTargetUrl('https://example.com/feed%20file.json')
    expect(result.valid).toBe(true)
  })

  it('should handle international domain names', () => {
    const result = validateTargetUrl('https://例え.jp/feed.json')
    expect(result.valid).toBe(true)
  })
})

describe('Content Type Detection', () => {
  it('should identify PEM file requests', () => {
    const url = new URL('https://example.com/public.pem')
    const isPemFile = url.pathname.endsWith('.pem')
    expect(isPemFile).toBe(true)
  })

  it('should identify JSON file requests', () => {
    const url = new URL('https://example.com/feed.json')
    const isJsonFile = url.pathname.endsWith('.json')
    expect(isJsonFile).toBe(true)
  })

  it('should identify public key requests', () => {
    const url = new URL('https://example.com/public/key')
    const isPublicKey = url.pathname.includes('public') || url.pathname.includes('key')
    expect(isPublicKey).toBe(true)
  })
})

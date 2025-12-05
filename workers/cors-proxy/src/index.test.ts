/**
 * CORS Proxy Worker Test Suite
 * 
 * Tests the exported helper functions from index.ts
 */

import { describe, it, expect } from 'vitest'
import { 
  corsHeaders, 
  validateTargetUrl, 
  isPrivateIp, 
  ALLOWED_ORIGINS 
} from './index'

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

  it('should handle origin with subpath', () => {
    const headers = corsHeaders('https://kiarashplusplus.github.io/webmcp-tooling-suite')
    expect(headers['Access-Control-Allow-Origin']).toBe('https://kiarashplusplus.github.io/webmcp-tooling-suite')
  })
})

describe('isPrivateIp', () => {
  it('should identify localhost as private', () => {
    expect(isPrivateIp('localhost')).toBe(true)
  })

  it('should identify 127.0.0.1 as private', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true)
  })

  it('should identify 127.x.x.x range as private', () => {
    expect(isPrivateIp('127.1.2.3')).toBe(true)
  })

  it('should identify 10.x.x.x range as private', () => {
    expect(isPrivateIp('10.0.0.1')).toBe(true)
    expect(isPrivateIp('10.255.255.255')).toBe(true)
  })

  it('should identify 192.168.x.x range as private', () => {
    expect(isPrivateIp('192.168.1.1')).toBe(true)
    expect(isPrivateIp('192.168.0.254')).toBe(true)
  })

  it('should identify 172.16.x.x range as private', () => {
    expect(isPrivateIp('172.16.0.1')).toBe(true)
  })

  it('should identify 0.0.0.0 as private', () => {
    expect(isPrivateIp('0.0.0.0')).toBe(true)
  })

  it('should allow public IPs', () => {
    expect(isPrivateIp('8.8.8.8')).toBe(false)
    expect(isPrivateIp('1.1.1.1')).toBe(false)
    expect(isPrivateIp('93.184.216.34')).toBe(false)
  })

  it('should allow public domains', () => {
    expect(isPrivateIp('example.com')).toBe(false)
    expect(isPrivateIp('api.github.com')).toBe(false)
  })
})

describe('validateTargetUrl', () => {
  describe('URL Format Validation', () => {
    it('should reject invalid URL format', () => {
      const result = validateTargetUrl('not-a-valid-url')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid URL format')
    })

    it('should accept valid HTTPS URL', () => {
      const result = validateTargetUrl('https://example.com/.well-known/mcp.llmfeed.json')
      expect(result.valid).toBe(true)
      expect(result.parsedUrl).toBeDefined()
    })

    it('should parse URL correctly', () => {
      const result = validateTargetUrl('https://example.com/feed.json')
      expect(result.parsedUrl?.hostname).toBe('example.com')
      expect(result.parsedUrl?.pathname).toBe('/feed.json')
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

    it('should allow HTTP for localhost (but blocked by private IP)', () => {
      // Note: This tests the protocol check, but will fail private IP check
      const result = validateTargetUrl('http://localhost/feed.json')
      expect(result.error).toBe('Private IP addresses are not allowed')
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
      expect(result.isPemRequest).toBe(true)
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
      expect(result.isPemRequest).toBe(true)
    })

    it('should allow paths containing key', () => {
      const result = validateTargetUrl('https://example.com/crypto/key')
      expect(result.valid).toBe(true)
      expect(result.isPemRequest).toBe(true)
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

  it('should handle domain with many levels', () => {
    const result = validateTargetUrl('https://a.b.c.example.com/feed.json')
    expect(result.valid).toBe(true)
  })
})

describe('isPemRequest detection', () => {
  it('should mark .pem files as pem requests', () => {
    const result = validateTargetUrl('https://example.com/public.pem')
    expect(result.isPemRequest).toBe(true)
  })

  it('should mark public paths as pem requests', () => {
    const result = validateTargetUrl('https://example.com/public/ed25519')
    expect(result.isPemRequest).toBe(true)
  })

  it('should mark key paths as pem requests', () => {
    const result = validateTargetUrl('https://example.com/ed25519-key')
    expect(result.isPemRequest).toBe(true)
  })

  it('should not mark .json files as pem requests', () => {
    const result = validateTargetUrl('https://example.com/feed.json')
    expect(result.isPemRequest).toBe(false)
  })

  it('should not mark .well-known json as pem request', () => {
    const result = validateTargetUrl('https://example.com/.well-known/mcp.llmfeed.json')
    expect(result.isPemRequest).toBe(false)
  })
})

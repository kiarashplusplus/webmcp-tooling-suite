/**
 * Directory Worker Test Suite
 * 
 * Tests the exported helper functions from index.ts
 */

import { describe, it, expect } from 'vitest'
import {
  corsHeaders,
  rowToFeed,
  validateFeedUrl,
  extractBearerToken,
  generateFeedId,
  calculatePagination,
  normalizePaginationParams,
  buildSearchPattern,
  isValidFeedType,
  ALLOWED_ORIGINS,
  VALID_FEED_TYPES,
  type Feed,
} from './index'

describe('CORS Headers', () => {
  const FRONTEND_URL = 'https://example.com'

  it('should echo allowed origin for main GitHub Pages domain', () => {
    const headers = corsHeaders('https://kiarashplusplus.github.io', FRONTEND_URL)
    expect(headers['Access-Control-Allow-Origin']).toBe('https://kiarashplusplus.github.io')
    expect(headers['Access-Control-Allow-Credentials']).toBe('true')
  })

  it('should echo allowed origin for localhost:5000', () => {
    const headers = corsHeaders('http://localhost:5000', FRONTEND_URL)
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5000')
    expect(headers['Access-Control-Allow-Credentials']).toBe('true')
  })

  it('should echo allowed origin for localhost:5173', () => {
    const headers = corsHeaders('http://localhost:5173', FRONTEND_URL)
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173')
    expect(headers['Access-Control-Allow-Credentials']).toBe('true')
  })

  it('should echo allowed origin for localhost:5174', () => {
    const headers = corsHeaders('http://localhost:5174', FRONTEND_URL)
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5174')
    expect(headers['Access-Control-Allow-Credentials']).toBe('true')
  })

  it('should echo frontend URL when provided in env', () => {
    const headers = corsHeaders(FRONTEND_URL, FRONTEND_URL)
    expect(headers['Access-Control-Allow-Origin']).toBe(FRONTEND_URL)
    expect(headers['Access-Control-Allow-Credentials']).toBe('true')
  })

  it('should return wildcard for unknown origins', () => {
    const headers = corsHeaders('https://evil.com', FRONTEND_URL)
    expect(headers['Access-Control-Allow-Origin']).toBe('*')
    expect(headers['Access-Control-Allow-Credentials']).toBe('false')
  })

  it('should return wildcard for null origin', () => {
    const headers = corsHeaders(null, FRONTEND_URL)
    expect(headers['Access-Control-Allow-Origin']).toBe('*')
    expect(headers['Access-Control-Allow-Credentials']).toBe('false')
  })

  it('should include correct HTTP methods', () => {
    const headers = corsHeaders('https://kiarashplusplus.github.io', FRONTEND_URL)
    expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST, DELETE, OPTIONS')
  })

  it('should allow Content-Type and Authorization headers', () => {
    const headers = corsHeaders('https://kiarashplusplus.github.io', FRONTEND_URL)
    expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type, Authorization')
  })

  it('should work without frontend URL', () => {
    const headers = corsHeaders('http://localhost:5000')
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5000')
  })

  it('should handle subpaths of allowed origins', () => {
    const headers = corsHeaders('https://kiarashplusplus.github.io/webmcp-tooling-suite', FRONTEND_URL)
    expect(headers['Access-Control-Allow-Origin']).toBe('https://kiarashplusplus.github.io/webmcp-tooling-suite')
  })
})

describe('extractBearerToken', () => {
  it('should extract Bearer token from Authorization header', () => {
    const token = extractBearerToken('Bearer abc123xyz')
    expect(token).toBe('abc123xyz')
  })

  it('should return null for non-Bearer authorization', () => {
    const token = extractBearerToken('Basic dXNlcjpwYXNz')
    expect(token).toBeNull()
  })

  it('should return null for null header', () => {
    const token = extractBearerToken(null)
    expect(token).toBeNull()
  })

  it('should handle missing Bearer prefix', () => {
    const token = extractBearerToken('abc123xyz')
    expect(token).toBeNull()
  })

  it('should handle empty string', () => {
    const token = extractBearerToken('')
    expect(token).toBeNull()
  })

  it('should handle Bearer with no token', () => {
    const token = extractBearerToken('Bearer ')
    expect(token).toBe('')
  })
})

describe('validateFeedUrl', () => {
  it('should validate correct URLs', () => {
    const result = validateFeedUrl('https://example.com/.well-known/mcp.llmfeed.json')
    expect(result.valid).toBe(true)
    expect(result.domain).toBe('example.com')
  })

  it('should extract domain correctly', () => {
    const result = validateFeedUrl('https://api.github.com/feed.json')
    expect(result.valid).toBe(true)
    expect(result.domain).toBe('api.github.com')
  })

  it('should reject invalid URLs', () => {
    const result = validateFeedUrl('not-a-valid-url')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Invalid URL')
  })

  it('should accept HTTP URLs (not enforcing HTTPS in directory)', () => {
    const result = validateFeedUrl('http://example.com/feed.json')
    expect(result.valid).toBe(true)
    expect(result.domain).toBe('example.com')
  })

  it('should handle URLs with port numbers', () => {
    const result = validateFeedUrl('https://example.com:8443/feed.json')
    expect(result.valid).toBe(true)
    expect(result.domain).toBe('example.com')
  })

  it('should handle URLs with query parameters', () => {
    const result = validateFeedUrl('https://example.com/feed.json?v=1')
    expect(result.valid).toBe(true)
    expect(result.domain).toBe('example.com')
  })
})

describe('rowToFeed', () => {
  const baseRow = {
    id: 'test-id',
    url: 'https://example.com/feed.json',
    domain: 'example.com',
    title: 'Test Feed',
    description: 'A test feed',
    feed_type: 'mcp',
    capabilities_count: 5,
    version: '1.0.0',
    score: 85,
    signature_valid: 1,
    gist_raw_url: 'https://gist.github.com/...',
    gist_html_url: 'https://gist.github.com/...',
    submitted_by: 'testuser',
    submitted_at: 1700000000000,
    last_validated: 1700100000000,
    is_curated: 1,
    is_active: 1,
  }

  it('should convert database row to Feed object', () => {
    const feed = rowToFeed(baseRow)
    expect(feed.id).toBe('test-id')
    expect(feed.url).toBe('https://example.com/feed.json')
    expect(feed.domain).toBe('example.com')
    expect(feed.title).toBe('Test Feed')
    expect(feed.description).toBe('A test feed')
    expect(feed.feed_type).toBe('mcp')
    expect(feed.capabilities_count).toBe(5)
    expect(feed.signature_valid).toBe(true)
    expect(feed.is_curated).toBe(true)
    expect(feed.is_active).toBe(true)
  })

  it('should handle null values correctly', () => {
    const rowWithNulls = {
      ...baseRow,
      title: null,
      description: null,
      version: null,
      score: null,
      gist_raw_url: null,
      gist_html_url: null,
      submitted_by: null,
      last_validated: null,
    }
    const feed = rowToFeed(rowWithNulls)
    expect(feed.title).toBeNull()
    expect(feed.description).toBeNull()
    expect(feed.version).toBeNull()
    expect(feed.score).toBeNull()
  })

  it('should convert boolean fields from integers', () => {
    const rowWithFalseValues = {
      ...baseRow,
      signature_valid: 0,
      is_curated: 0,
      is_active: 0,
    }
    const feed = rowToFeed(rowWithFalseValues)
    expect(feed.signature_valid).toBe(false)
    expect(feed.is_curated).toBe(false)
    expect(feed.is_active).toBe(false)
  })
})

describe('generateFeedId', () => {
  it('should generate ID from domain and timestamp', () => {
    const id = generateFeedId('example.com', 1700000000000)
    expect(id).toBe('example-com-1700000000000')
  })

  it('should handle subdomains correctly', () => {
    const id = generateFeedId('api.example.com', 1700000000000)
    expect(id).toBe('api-example-com-1700000000000')
  })

  it('should use current timestamp when not provided', () => {
    const before = Date.now()
    const id = generateFeedId('example.com')
    const after = Date.now()

    const parts = id.split('-')
    const timestamp = parseInt(parts[parts.length - 1], 10)
    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(after)
  })
})

describe('calculatePagination', () => {
  it('should calculate hasMore correctly', () => {
    const result = calculatePagination(100, 10, 0)
    expect(result.hasMore).toBe(true)
    expect(result.nextOffset).toBe(10)
  })

  it('should detect no more results', () => {
    const result = calculatePagination(10, 10, 0)
    expect(result.hasMore).toBe(false)
    expect(result.nextOffset).toBeNull()
  })

  it('should handle partial last page', () => {
    const result = calculatePagination(25, 10, 20)
    expect(result.hasMore).toBe(false)
    expect(result.nextOffset).toBeNull()
  })

  it('should handle exact page boundary', () => {
    const result = calculatePagination(30, 10, 20)
    expect(result.hasMore).toBe(false)
    expect(result.nextOffset).toBeNull()
  })
})

describe('normalizePaginationParams', () => {
  it('should limit max results per page to 100', () => {
    const result = normalizePaginationParams('500', '0')
    expect(result.limit).toBe(100)
  })

  it('should use default limit when not specified', () => {
    const result = normalizePaginationParams(null, null)
    expect(result.limit).toBe(50)
    expect(result.offset).toBe(0)
  })

  it('should parse string parameters', () => {
    const result = normalizePaginationParams('25', '50')
    expect(result.limit).toBe(25)
    expect(result.offset).toBe(50)
  })

  it('should handle negative values', () => {
    const result = normalizePaginationParams('-10', '-20')
    expect(result.limit).toBeGreaterThan(0)
    expect(result.offset).toBe(0)
  })

  it('should handle zero limit', () => {
    const result = normalizePaginationParams('0', '0')
    expect(result.limit).toBe(1)
    expect(result.offset).toBe(0)
  })
})

describe('buildSearchPattern', () => {
  it('should build search pattern for LIKE queries', () => {
    const pattern = buildSearchPattern('test')
    expect(pattern).toBe('%test%')
  })

  it('should escape special characters in search', () => {
    const pattern = buildSearchPattern('test%value')
    expect(pattern).toBe('%test\\%value%')
  })

  it('should escape underscore', () => {
    const pattern = buildSearchPattern('test_value')
    expect(pattern).toBe('%test\\_value%')
  })

  it('should handle empty string', () => {
    const pattern = buildSearchPattern('')
    expect(pattern).toBe('%%')
  })
})

describe('isValidFeedType', () => {
  it('should accept valid feed types', () => {
    expect(isValidFeedType('mcp')).toBe(true)
    expect(isValidFeedType('export')).toBe(true)
    expect(isValidFeedType('llm-index')).toBe(true)
  })

  it('should reject invalid feed types', () => {
    expect(isValidFeedType('invalid')).toBe(false)
    expect(isValidFeedType('')).toBe(false)
    expect(isValidFeedType('MCP')).toBe(false)
  })
})

describe('Constants', () => {
  it('should have correct allowed origins', () => {
    expect(ALLOWED_ORIGINS).toContain('https://kiarashplusplus.github.io')
    expect(ALLOWED_ORIGINS).toContain('http://localhost:5000')
    expect(ALLOWED_ORIGINS).toContain('http://localhost:5173')
    expect(ALLOWED_ORIGINS).toContain('http://localhost:5174')
  })

  it('should have correct valid feed types', () => {
    expect(VALID_FEED_TYPES).toContain('mcp')
    expect(VALID_FEED_TYPES).toContain('export')
    expect(VALID_FEED_TYPES).toContain('llm-index')
    expect(VALID_FEED_TYPES).toContain('llmstxt')
    expect(VALID_FEED_TYPES).toHaveLength(4)
  })
})

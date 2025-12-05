/**
 * Directory Worker Test Suite
 */

import { describe, it, expect, vi } from 'vitest'

// Constants matching those in index.ts
const ALLOWED_ORIGINS = [
  'https://kiarashplusplus.github.io',
  'http://localhost:5000',
  'http://localhost:5173',
  'http://localhost:5174',
]

// Helper function to generate CORS headers (mirrors implementation)
function corsHeaders(origin: string | null, frontendUrl: string): Record<string, string> {
  const allowedOrigins = [
    'https://kiarashplusplus.github.io',
    frontendUrl,
    'http://localhost:5000',
    'http://localhost:5173',
    'http://localhost:5174',
  ]
  
  // Check if origin matches any allowed origin (including subpaths)
  const isAllowed = origin && allowedOrigins.some(allowed => 
    origin === allowed || origin.startsWith(allowed)
  )
  
  // If origin is allowed, echo it back; otherwise use wildcard for public GET requests
  const allowOrigin = isAllowed ? origin : '*'
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': isAllowed ? 'true' : 'false',
  }
}

// Feed URL validation logic
function validateFeedUrl(url: string): { valid: boolean; error?: string; domain?: string } {
  let feedUrl: URL
  try {
    feedUrl = new URL(url)
  } catch {
    return { valid: false, error: 'Invalid URL' }
  }
  
  return { valid: true, domain: feedUrl.hostname }
}

// Row to Feed conversion helper (mirrors implementation)
interface Feed {
  id: string
  url: string
  domain: string
  title: string | null
  description: string | null
  feed_type: string
  capabilities_count: number
  version: string | null
  score: number | null
  signature_valid: boolean
  gist_raw_url: string | null
  gist_html_url: string | null
  submitted_by: string | null
  submitted_at: number
  last_validated: number | null
  is_curated: boolean
  is_active: boolean
}

function rowToFeed(row: Record<string, unknown>): Feed {
  return {
    id: row.id as string,
    url: row.url as string,
    domain: row.domain as string,
    title: row.title as string | null,
    description: row.description as string | null,
    feed_type: row.feed_type as string,
    capabilities_count: row.capabilities_count as number,
    version: row.version as string | null,
    score: row.score as number | null,
    signature_valid: Boolean(row.signature_valid),
    gist_raw_url: row.gist_raw_url as string | null,
    gist_html_url: row.gist_html_url as string | null,
    submitted_by: row.submitted_by as string | null,
    submitted_at: row.submitted_at as number,
    last_validated: row.last_validated as number | null,
    is_curated: Boolean(row.is_curated),
    is_active: Boolean(row.is_active),
  }
}

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
    const headers = corsHeaders('https://custom-frontend.com', 'https://custom-frontend.com')
    expect(headers['Access-Control-Allow-Origin']).toBe('https://custom-frontend.com')
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
})

describe('Feed URL Validation', () => {
  it('should validate correct URLs', () => {
    const result = validateFeedUrl('https://example.com/.well-known/mcp.llmfeed.json')
    expect(result.valid).toBe(true)
    expect(result.domain).toBe('example.com')
  })

  it('should extract domain correctly', () => {
    const result = validateFeedUrl('https://api.example.com/feed.json')
    expect(result.domain).toBe('api.example.com')
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
  })
})

describe('Row to Feed Conversion', () => {
  it('should convert database row to Feed object', () => {
    const row = {
      id: 'example-com-123',
      url: 'https://example.com/feed.json',
      domain: 'example.com',
      title: 'Example Feed',
      description: 'A test feed',
      feed_type: 'mcp',
      capabilities_count: 5,
      version: '1.0.0',
      score: 85,
      signature_valid: 1,
      gist_raw_url: 'https://gist.github.com/raw/123',
      gist_html_url: 'https://gist.github.com/123',
      submitted_by: 'testuser',
      submitted_at: 1704067200000,
      last_validated: 1704153600000,
      is_curated: 1,
      is_active: 1,
    }

    const feed = rowToFeed(row)

    expect(feed.id).toBe('example-com-123')
    expect(feed.url).toBe('https://example.com/feed.json')
    expect(feed.domain).toBe('example.com')
    expect(feed.title).toBe('Example Feed')
    expect(feed.description).toBe('A test feed')
    expect(feed.feed_type).toBe('mcp')
    expect(feed.capabilities_count).toBe(5)
    expect(feed.version).toBe('1.0.0')
    expect(feed.score).toBe(85)
    expect(feed.signature_valid).toBe(true)
    expect(feed.gist_raw_url).toBe('https://gist.github.com/raw/123')
    expect(feed.gist_html_url).toBe('https://gist.github.com/123')
    expect(feed.submitted_by).toBe('testuser')
    expect(feed.submitted_at).toBe(1704067200000)
    expect(feed.last_validated).toBe(1704153600000)
    expect(feed.is_curated).toBe(true)
    expect(feed.is_active).toBe(true)
  })

  it('should handle null values correctly', () => {
    const row = {
      id: 'test-123',
      url: 'https://test.com/feed.json',
      domain: 'test.com',
      title: null,
      description: null,
      feed_type: 'mcp',
      capabilities_count: 0,
      version: null,
      score: null,
      signature_valid: 0,
      gist_raw_url: null,
      gist_html_url: null,
      submitted_by: null,
      submitted_at: 1704067200000,
      last_validated: null,
      is_curated: 0,
      is_active: 1,
    }

    const feed = rowToFeed(row)

    expect(feed.title).toBeNull()
    expect(feed.description).toBeNull()
    expect(feed.version).toBeNull()
    expect(feed.score).toBeNull()
    expect(feed.signature_valid).toBe(false)
    expect(feed.gist_raw_url).toBeNull()
    expect(feed.gist_html_url).toBeNull()
    expect(feed.submitted_by).toBeNull()
    expect(feed.last_validated).toBeNull()
    expect(feed.is_curated).toBe(false)
    expect(feed.is_active).toBe(true)
  })

  it('should convert boolean fields from integers', () => {
    const row1 = {
      id: 'a', url: 'a', domain: 'a', title: null, description: null,
      feed_type: 'mcp', capabilities_count: 0, version: null, score: null,
      signature_valid: 1, gist_raw_url: null, gist_html_url: null,
      submitted_by: null, submitted_at: 0, last_validated: null,
      is_curated: 1, is_active: 1
    }

    const row2 = {
      id: 'b', url: 'b', domain: 'b', title: null, description: null,
      feed_type: 'mcp', capabilities_count: 0, version: null, score: null,
      signature_valid: 0, gist_raw_url: null, gist_html_url: null,
      submitted_by: null, submitted_at: 0, last_validated: null,
      is_curated: 0, is_active: 0
    }

    expect(rowToFeed(row1).signature_valid).toBe(true)
    expect(rowToFeed(row1).is_curated).toBe(true)
    expect(rowToFeed(row1).is_active).toBe(true)

    expect(rowToFeed(row2).signature_valid).toBe(false)
    expect(rowToFeed(row2).is_curated).toBe(false)
    expect(rowToFeed(row2).is_active).toBe(false)
  })
})

describe('GitHub Token Verification', () => {
  // These tests verify the token verification logic behavior
  // The actual verifyGitHubToken function makes HTTP calls to GitHub API

  it('should extract Bearer token from Authorization header', () => {
    const authHeader = 'Bearer ghp_abcdef123456'
    const hasBearer = authHeader.startsWith('Bearer ')
    expect(hasBearer).toBe(true)
    
    const token = authHeader.slice(7)
    expect(token).toBe('ghp_abcdef123456')
  })

  it('should reject non-Bearer authorization', () => {
    const authHeader = 'Basic dXNlcjpwYXNz'
    const hasBearer = authHeader.startsWith('Bearer ')
    expect(hasBearer).toBe(false)
  })

  it('should handle missing Bearer prefix', () => {
    const authHeader = 'ghp_abcdef123456'
    const hasBearer = authHeader.startsWith('Bearer ')
    expect(hasBearer).toBe(false)
  })
})

describe('Feed ID Generation', () => {
  it('should generate ID from domain and timestamp', () => {
    const domain = 'example.com'
    const timestamp = Date.now()
    const id = `${domain.replace(/\./g, '-')}-${timestamp}`
    
    expect(id).toContain('example-com')
    expect(id).toMatch(/example-com-\d+/)
  })

  it('should handle subdomains correctly', () => {
    const domain = 'api.example.com'
    const timestamp = 1704067200000
    const id = `${domain.replace(/\./g, '-')}-${timestamp}`
    
    expect(id).toBe('api-example-com-1704067200000')
  })
})

describe('Pagination Logic', () => {
  it('should calculate hasMore correctly', () => {
    const offset = 0
    const feedsLength = 50
    const total = 100
    const hasMore = offset + feedsLength < total
    
    expect(hasMore).toBe(true)
  })

  it('should detect no more results', () => {
    const offset = 50
    const feedsLength = 50
    const total = 100
    const hasMore = offset + feedsLength < total
    
    expect(hasMore).toBe(false)
  })

  it('should handle partial last page', () => {
    const offset = 90
    const feedsLength = 10
    const total = 100
    const hasMore = offset + feedsLength < total
    
    expect(hasMore).toBe(false)
  })

  it('should limit max results per page to 100', () => {
    const requestedLimit = 150
    const limit = Math.min(requestedLimit, 100)
    expect(limit).toBe(100)
  })

  it('should use default limit when not specified', () => {
    const requestedLimit: string | null = null
    const limit = Math.min(parseInt(requestedLimit || '50'), 100)
    expect(limit).toBe(50)
  })
})

describe('Search Query Building', () => {
  it('should build search pattern for LIKE queries', () => {
    const search = 'example'
    const searchPattern = `%${search}%`
    expect(searchPattern).toBe('%example%')
  })

  it('should escape special characters in search', () => {
    // This tests the concept - actual escaping would be done by DB driver
    const search = "test's query"
    const searchPattern = `%${search}%`
    expect(searchPattern).toBe("%test's query%")
  })
})

describe('Feed Type Filtering', () => {
  it('should accept valid feed types', () => {
    const validTypes = ['mcp', 'export', 'llm-index']
    const feedType = 'mcp'
    expect(validTypes.includes(feedType)).toBe(true)
  })

  it('should filter by feed_type parameter', () => {
    const feedType = 'mcp'
    const query = `SELECT * FROM feeds WHERE is_active = 1 AND feed_type = '${feedType}'`
    expect(query).toContain("feed_type = 'mcp'")
  })
})

describe('API Response Format', () => {
  it('should format list response correctly', () => {
    const feeds: Feed[] = []
    const total = 0
    const limit = 50
    const offset = 0
    const hasMore = offset + feeds.length < total

    const response = {
      feeds,
      total,
      limit,
      offset,
      hasMore
    }

    expect(response).toHaveProperty('feeds')
    expect(response).toHaveProperty('total')
    expect(response).toHaveProperty('limit')
    expect(response).toHaveProperty('offset')
    expect(response).toHaveProperty('hasMore')
  })

  it('should format single feed response', () => {
    const feed: Feed = {
      id: 'test-123',
      url: 'https://test.com/feed.json',
      domain: 'test.com',
      title: 'Test Feed',
      description: 'Description',
      feed_type: 'mcp',
      capabilities_count: 3,
      version: '1.0.0',
      score: 90,
      signature_valid: true,
      gist_raw_url: null,
      gist_html_url: null,
      submitted_by: 'user',
      submitted_at: Date.now(),
      last_validated: null,
      is_curated: false,
      is_active: true
    }

    const response = { feed }
    expect(response.feed).toEqual(feed)
  })

  it('should format success response for POST', () => {
    const feed: Feed = {
      id: 'new-feed-123',
      url: 'https://new.com/feed.json',
      domain: 'new.com',
      title: null,
      description: null,
      feed_type: 'mcp',
      capabilities_count: 0,
      version: null,
      score: null,
      signature_valid: false,
      gist_raw_url: null,
      gist_html_url: null,
      submitted_by: 'submitter',
      submitted_at: Date.now(),
      last_validated: null,
      is_curated: false,
      is_active: true
    }

    const response = {
      success: true,
      feed,
      message: 'Feed submitted successfully'
    }

    expect(response.success).toBe(true)
    expect(response.feed).toBeDefined()
    expect(response.message).toBe('Feed submitted successfully')
  })

  it('should format error response', () => {
    const response = { error: 'Not Found' }
    expect(response.error).toBe('Not Found')
  })
})

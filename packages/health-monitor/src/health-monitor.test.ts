/**
 * Health Monitor Test Suite
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryStorage } from './storage.js'
import { 
  crawlFeed, 
  discoverFeeds, 
  normalizeUrl, 
  generateFeedId,
  checkMetaOptOut 
} from './crawler.js'
import { generateReport } from './report.js'
import type { FeedSource, HealthCheck, ValidationResult, OutreachHistory } from './types.js'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('MemoryStorage', () => {
  let storage: MemoryStorage
  
  beforeEach(() => {
    storage = new MemoryStorage()
  })
  
  describe('Feed operations', () => {
    const testFeed: FeedSource = {
      id: 'test-feed-1',
      url: 'https://example.com/.well-known/mcp.llmfeed.json',
      domain: 'example.com',
      discoveredAt: Date.now(),
      optedOut: false,
    }
    
    it('should save and retrieve a feed', async () => {
      await storage.saveFeed(testFeed)
      const retrieved = await storage.getFeed('test-feed-1')
      expect(retrieved).toEqual(testFeed)
    })
    
    it('should return null for non-existent feed', async () => {
      const result = await storage.getFeed('nonexistent')
      expect(result).toBeNull()
    })
    
    it('should get all feeds', async () => {
      const feed2: FeedSource = { ...testFeed, id: 'test-feed-2', domain: 'example2.com' }
      await storage.saveFeed(testFeed)
      await storage.saveFeed(feed2)
      
      const all = await storage.getAllFeeds()
      expect(all).toHaveLength(2)
    })
    
    it('should delete a feed', async () => {
      await storage.saveFeed(testFeed)
      await storage.deleteFeed('test-feed-1')
      
      const result = await storage.getFeed('test-feed-1')
      expect(result).toBeNull()
    })
  })
  
  describe('Health check operations', () => {
    const feedId = 'test-feed-1'
    
    const createHealthCheck = (score: number): HealthCheck => ({
      timestamp: Date.now(),
      reachable: true,
      httpStatus: 200,
      responseTimeMs: 100,
      validation: {
        valid: true,
        score,
        errorCount: 0,
        warningCount: 0,
        issues: [],
        capabilitiesCount: 5,
      },
      errors: [],
    })
    
    it('should save and retrieve health checks', async () => {
      const check = createHealthCheck(85)
      await storage.saveHealthCheck(feedId, check)
      
      const history = await storage.getHealthHistory(feedId)
      expect(history).toHaveLength(1)
      expect(history[0].validation?.score).toBe(85)
    })
    
    it('should get latest health check', async () => {
      await storage.saveHealthCheck(feedId, createHealthCheck(70))
      await storage.saveHealthCheck(feedId, createHealthCheck(85))
      await storage.saveHealthCheck(feedId, createHealthCheck(90))
      
      const latest = await storage.getLatestHealthCheck(feedId)
      expect(latest?.validation?.score).toBe(90)
    })
    
    it('should limit health check history', async () => {
      await storage.saveHealthCheck(feedId, createHealthCheck(70))
      await storage.saveHealthCheck(feedId, createHealthCheck(80))
      await storage.saveHealthCheck(feedId, createHealthCheck(90))
      
      const limited = await storage.getHealthHistory(feedId, 2)
      expect(limited).toHaveLength(2)
      expect(limited[0].validation?.score).toBe(80)
      expect(limited[1].validation?.score).toBe(90)
    })
    
    it('should return null for non-existent latest check', async () => {
      const latest = await storage.getLatestHealthCheck('nonexistent')
      expect(latest).toBeNull()
    })
  })
  
  describe('Outreach history', () => {
    const feedId = 'test-feed-1'
    
    it('should save and retrieve outreach history', async () => {
      const outreach: OutreachHistory = {
        feedId,
        channel: 'github',
        timestamp: Date.now(),
        success: true,
        url: 'https://github.com/test/test/issues/1',
      }
      
      await storage.saveOutreachHistory(outreach)
      const history = await storage.getOutreachHistory(feedId)
      
      expect(history).toHaveLength(1)
      expect(history[0].channel).toBe('github')
    })
    
    it('should filter recent outreach by channel and time', async () => {
      const now = Date.now()
      
      await storage.saveOutreachHistory({
        feedId,
        channel: 'github',
        timestamp: now - 1000, // 1 second ago
        success: true,
      })
      
      await storage.saveOutreachHistory({
        feedId,
        channel: 'email',
        timestamp: now - 1000,
        success: true,
      })
      
      await storage.saveOutreachHistory({
        feedId,
        channel: 'github',
        timestamp: now - 100000, // 100 seconds ago
        success: true,
      })
      
      const recent = await storage.getRecentOutreach(feedId, 'github', 5000)
      expect(recent).toHaveLength(1)
    })
  })
  
  describe('Stats', () => {
    it('should calculate correct stats', async () => {
      const feed1: FeedSource = {
        id: 'feed-1',
        url: 'https://a.com/feed.json',
        domain: 'a.com',
        discoveredAt: Date.now(),
        optedOut: false,
      }
      
      const feed2: FeedSource = {
        id: 'feed-2',
        url: 'https://b.com/feed.json',
        domain: 'b.com',
        discoveredAt: Date.now(),
        optedOut: true,
        optOutReason: 'robots.txt',
      }
      
      await storage.saveFeed(feed1)
      await storage.saveFeed(feed2)
      
      await storage.saveHealthCheck('feed-1', {
        timestamp: Date.now(),
        reachable: true,
        httpStatus: 200,
        responseTimeMs: 150,
        validation: {
          valid: true,
          score: 85,
          errorCount: 0,
          warningCount: 1,
          issues: [{ type: 'warning', code: 'MISSING_FIELD', message: 'Missing optional field' }],
          capabilitiesCount: 3,
        },
        errors: [],
      })
      
      const stats = await storage.getStats()
      
      expect(stats.totalFeeds).toBe(2)
      expect(stats.optedOutFeeds).toBe(1)
      expect(stats.healthyFeeds).toBe(1)
      expect(stats.averageScore).toBe(85)
    })
  })
})

describe('Crawler utilities', () => {
  describe('normalizeUrl', () => {
    it('should add .well-known path to domain', () => {
      const result = normalizeUrl('example.com')
      expect(result).toBe('https://example.com/.well-known/mcp.llmfeed.json')
    })
    
    it('should add https:// to URL without protocol', () => {
      const result = normalizeUrl('example.com/feed.json')
      expect(result).toBe('https://example.com/feed.json')
    })
    
    it('should preserve existing https:// URLs', () => {
      const url = 'https://example.com/custom/feed.json'
      const result = normalizeUrl(url)
      expect(result).toBe(url)
    })
    
    it('should preserve http:// URLs (no automatic upgrade)', () => {
      const result = normalizeUrl('http://example.com/feed.json')
      expect(result).toBe('http://example.com/feed.json')
    })
  })
  
  describe('generateFeedId', () => {
    it('should generate consistent ID for same URL', () => {
      const url = 'https://example.com/.well-known/mcp.llmfeed.json'
      const id1 = generateFeedId(url)
      const id2 = generateFeedId(url)
      expect(id1).toBe(id2)
    })
    
    it('should generate different IDs for different URLs', () => {
      const id1 = generateFeedId('https://a.com/feed.json')
      const id2 = generateFeedId('https://b.com/feed.json')
      expect(id1).not.toBe(id2)
    })
  })
  
  describe('checkMetaOptOut', () => {
    it('should detect opt-out meta tag', () => {
      const html = `
        <html>
          <head>
            <meta name="llmfeed-monitor" content="noindex">
          </head>
          <body></body>
        </html>
      `
      const result = checkMetaOptOut(html)
      expect(result).toBe('Meta tag: llmfeed-monitor=noindex')
    })
    
    it('should detect noai meta tag', () => {
      const html = `
        <html>
          <head>
            <meta name="robots" content="noai">
          </head>
          <body></body>
        </html>
      `
      const result = checkMetaOptOut(html)
      expect(result).toBe('Meta tag: robots=noai')
    })
    
    it('should return null for no opt-out', () => {
      const html = `
        <html>
          <head>
            <title>Test</title>
          </head>
          <body></body>
        </html>
      `
      const result = checkMetaOptOut(html)
      expect(result).toBeNull()
    })
  })
})

describe('crawlFeed', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })
  
  it('should successfully crawl a valid feed', async () => {
    const validFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test Feed',
        origin: 'https://example.com',
        description: 'A test feed',
      },
      capabilities: [
        { name: 'test', type: 'tool', description: 'Test tool' },
      ],
    }
    
    // Mock robots.txt (no opt-out)
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('robots.txt')) {
        return Promise.resolve({
          ok: false,
          status: 404,
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(validFeed),
        text: () => Promise.resolve(JSON.stringify(validFeed)),
      })
    })
    
    const result = await crawlFeed('https://example.com/.well-known/mcp.llmfeed.json')
    
    expect(result.optedOut).toBe(false)
    expect(result.healthCheck.reachable).toBe(true)
    expect(result.healthCheck.httpStatus).toBe(200)
    expect(result.healthCheck.validation?.valid).toBe(true)
  })
  
  it('should handle fetch errors gracefully', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('robots.txt')) {
        return Promise.resolve({ ok: false, status: 404 })
      }
      return Promise.reject(new Error('Network error'))
    })
    
    const result = await crawlFeed('https://example.com/.well-known/mcp.llmfeed.json')
    
    expect(result.healthCheck.reachable).toBe(false)
    expect(result.healthCheck.errors).toContain('Fetch failed: Network error')
  })
  
  it('should handle HTTP errors', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('robots.txt')) {
        return Promise.resolve({ ok: false, status: 404 })
      }
      return Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })
    })
    
    const result = await crawlFeed('https://example.com/.well-known/mcp.llmfeed.json')
    
    expect(result.healthCheck.reachable).toBe(false)
    expect(result.healthCheck.httpStatus).toBe(500)
    expect(result.healthCheck.errors).toContain('HTTP 500: Internal Server Error')
  })
  
  it('should respect robots.txt opt-out', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('robots.txt')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve('User-agent: LLMFeed-Health-Monitor\nDisallow: /'),
        })
      }
      return Promise.resolve({ ok: true, status: 200 })
    })
    
    const result = await crawlFeed('https://example.com/.well-known/mcp.llmfeed.json')
    
    expect(result.optedOut).toBe(true)
    expect(result.optOutReason).toContain('robots.txt')
  })
  
  it('should handle invalid JSON', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('robots.txt')) {
        return Promise.resolve({ ok: false, status: 404 })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
        text: () => Promise.resolve('not valid json'),
      })
    })
    
    const result = await crawlFeed('https://example.com/.well-known/mcp.llmfeed.json')
    
    // Server responded (reachable=true), but JSON was invalid
    expect(result.healthCheck.reachable).toBe(true)
    expect(result.healthCheck.errors.some(e => e.includes('Invalid JSON'))).toBe(true)
  })
})

describe('discoverFeeds', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })
  
  it('should discover feeds from sitemap', async () => {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/.well-known/mcp.llmfeed.json</loc></url>
        <url><loc>https://example.com/about</loc></url>
      </urlset>
    `
    
    const validFeed = {
      feed_type: 'mcp',
      metadata: { title: 'Test', origin: 'https://example.com', description: 'Test' },
    }
    
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('sitemap')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(sitemap),
        })
      }
      if (url.includes('mcp.llmfeed.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: () => Promise.resolve(validFeed),
          text: () => Promise.resolve(JSON.stringify(validFeed)),
        })
      }
      return Promise.resolve({ ok: false, status: 404 })
    })
    
    const feeds = await discoverFeeds('https://example.com')
    
    // Should find the feed URL from sitemap
    expect(feeds.some(f => f.includes('llmfeed'))).toBe(true)
  })
})


describe('Report Generator', () => {
  it('should generate HTML report', () => {
    const feed: FeedSource = {
      id: 'test-feed',
      url: 'https://example.com/.well-known/mcp.llmfeed.json',
      domain: 'example.com',
      discoveredAt: Date.now(),
      optedOut: false,
    }
    
    const healthCheck: HealthCheck = {
      timestamp: Date.now(),
      reachable: true,
      httpStatus: 200,
      responseTimeMs: 100,
      validation: {
        valid: true,
        score: 85,
        errorCount: 0,
        warningCount: 1,
        issues: [],
        capabilitiesCount: 5,
      },
      errors: [],
    }
    
    const report = generateReport(feed, healthCheck)
    
    expect(report.html).toContain('<!DOCTYPE html>')
    expect(report.html).toContain('example.com')
    expect(report.html).toContain('85')
  })
  
  it('should generate JSON report', () => {
    const feed: FeedSource = {
      id: 'test-feed',
      url: 'https://example.com/.well-known/mcp.llmfeed.json',
      domain: 'example.com',
      discoveredAt: Date.now(),
      optedOut: false,
    }
    
    const healthCheck: HealthCheck = {
      timestamp: Date.now(),
      reachable: true,
      httpStatus: 200,
      responseTimeMs: 100,
      validation: {
        valid: true,
        score: 90,
        errorCount: 0,
        warningCount: 0,
        issues: [],
        capabilitiesCount: 3,
      },
      errors: [],
    }
    
    const report = generateReport(feed, healthCheck)
    
    expect(report.json).toBeDefined()
    expect(report.feed.domain).toBe('example.com')
    expect(report.healthCheck.validation?.score).toBe(90)
  })
})

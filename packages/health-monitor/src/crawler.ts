/**
 * Feed Crawler
 * 
 * Fetches and validates feeds, respecting opt-out signals
 */

import type {
  FeedSource,
  HealthCheck,
  ValidationResult,
  ValidationIssue,
  CrawlerConfig,
  GitHubRepo,
  ContactInfo,
  FeedMetadata,
} from './types.js'

const DEFAULT_USER_AGENT = 'LLMFeed-Health-Monitor/1.0 (+https://github.com/kiarashplusplus/webmcp-tooling-suite)'

export interface CrawlResult {
  feed: FeedSource
  healthCheck: HealthCheck
  optedOut: boolean
  optOutReason?: string
}

/**
 * Crawl a single feed URL
 */
export async function crawlFeed(
  url: string,
  config: Partial<CrawlerConfig> = {}
): Promise<CrawlResult> {
  const startTime = Date.now()
  const errors: string[] = []
  
  // Normalize URL
  const feedUrl = normalizeUrl(url)
  const domain = new URL(feedUrl).hostname
  const feedId = generateFeedId(feedUrl)
  
  // Check robots.txt opt-out
  const robotsOptOut = config.respectRobotsTxt !== false 
    ? await checkRobotsTxt(domain)
    : null
  
  if (robotsOptOut) {
    return {
      feed: createFeedSource(feedId, feedUrl, domain),
      healthCheck: createHealthCheck(startTime, false, undefined, undefined, [], ['Opted out via robots.txt']),
      optedOut: true,
      optOutReason: robotsOptOut,
    }
  }
  
  // Fetch the feed
  let response: Response
  let httpStatus: number | undefined
  let responseTimeMs: number | undefined
  
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 30000)
    
    response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': config.userAgent || DEFAULT_USER_AGENT,
        'Accept': 'application/json',
      },
    })
    
    clearTimeout(timeout)
    responseTimeMs = Date.now() - startTime
    httpStatus = response.status
    
    if (!response.ok) {
      errors.push(`HTTP ${response.status}: ${response.statusText}`)
      return {
        feed: createFeedSource(feedId, feedUrl, domain),
        healthCheck: createHealthCheck(startTime, false, httpStatus, responseTimeMs, [], errors),
        optedOut: false,
      }
    }
  } catch (err) {
    responseTimeMs = Date.now() - startTime
    const errorMsg = err instanceof Error ? err.message : String(err)
    errors.push(`Fetch failed: ${errorMsg}`)
    return {
      feed: createFeedSource(feedId, feedUrl, domain),
      healthCheck: createHealthCheck(startTime, false, httpStatus, responseTimeMs, [], errors),
      optedOut: false,
    }
  }
  
  // Parse JSON
  let feedJson: unknown
  try {
    feedJson = await response.json()
  } catch {
    errors.push('Invalid JSON response')
    return {
      feed: createFeedSource(feedId, feedUrl, domain),
      healthCheck: createHealthCheck(startTime, true, httpStatus, responseTimeMs, [], errors),
      optedOut: false,
    }
  }
  
  // Check for meta opt-out in feed
  const metaOptOut = checkFeedOptOut(feedJson)
  if (metaOptOut) {
    return {
      feed: createFeedSource(feedId, feedUrl, domain),
      healthCheck: createHealthCheck(startTime, true, httpStatus, responseTimeMs, [], ['Opted out via feed metadata']),
      optedOut: true,
      optOutReason: metaOptOut,
    }
  }
  
  // Validate the feed
  const validation = await validateFeed(feedJson, feedUrl)
  
  // Extract contact info and GitHub repo
  const contact = extractContactInfo(feedJson)
  const githubRepo = detectGitHubRepo(feedUrl, feedJson)
  const metadata = extractMetadata(feedJson)
  
  const feed: FeedSource = {
    id: feedId,
    url: feedUrl,
    domain,
    discoveredAt: Date.now(),
    githubRepo,
    contact,
    optedOut: false,
  }
  
  const healthCheck = createHealthCheck(
    startTime,
    true,
    httpStatus,
    responseTimeMs,
    validation.issues,
    errors,
    validation
  )
  
  return { feed, healthCheck, optedOut: false }
}

/**
 * Crawl multiple feeds concurrently
 */
export async function crawlFeeds(
  urls: string[],
  config: Partial<CrawlerConfig> = {}
): Promise<CrawlResult[]> {
  const maxConcurrency = config.maxConcurrency || 5
  const results: CrawlResult[] = []
  
  // Process in batches
  for (let i = 0; i < urls.length; i += maxConcurrency) {
    const batch = urls.slice(i, i + maxConcurrency)
    const batchResults = await Promise.all(
      batch.map(url => crawlFeed(url, config))
    )
    results.push(...batchResults)
  }
  
  return results
}

/**
 * Discover feeds from a domain (checks .well-known paths)
 */
export async function discoverFeeds(
  domain: string,
  config: Partial<CrawlerConfig> = {}
): Promise<string[]> {
  const wellKnownPaths = [
    '/.well-known/mcp.llmfeed.json',
    '/.well-known/llm-index.llmfeed.json',
    '/.well-known/export.llmfeed.json',
  ]
  
  const discovered: string[] = []
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`
  
  for (const path of wellKnownPaths) {
    const url = new URL(path, baseUrl).toString()
    try {
      // Use GET with small timeout - some servers don't handle HEAD properly
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': config.userAgent || DEFAULT_USER_AGENT,
        },
      })
      
      clearTimeout(timeout)
      
      if (response.ok) {
        // Always verify it's valid JSON by attempting to parse
        try {
          const text = await response.text()
          JSON.parse(text) // Throws if not valid JSON
          discovered.push(url)
        } catch {
          // Not valid JSON, skip silently
        }
      }
    } catch {
      // Ignore fetch errors for discovery
    }
  }
  
  return discovered
}

// ============================================
// Helper Functions (exported for testing)
// ============================================

export function normalizeUrl(url: string): string {
  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`
  }
  
  // Add .well-known path if it's just a domain
  const parsed = new URL(url)
  if (parsed.pathname === '/' || parsed.pathname === '') {
    parsed.pathname = '/.well-known/mcp.llmfeed.json'
  }
  
  return parsed.toString()
}

export function generateFeedId(url: string): string {
  // Create a stable ID from the URL
  const parsed = new URL(url)
  return `${parsed.hostname}${parsed.pathname}`.replace(/[^a-z0-9]/gi, '-').toLowerCase()
}

function createFeedSource(id: string, url: string, domain: string): FeedSource {
  return {
    id,
    url,
    domain,
    discoveredAt: Date.now(),
    optedOut: false,
  }
}

function createHealthCheck(
  startTime: number,
  reachable: boolean,
  httpStatus: number | undefined,
  responseTimeMs: number | undefined,
  issues: ValidationIssue[],
  errors: string[],
  validation?: ValidationResult
): HealthCheck {
  return {
    timestamp: startTime,
    reachable,
    httpStatus,
    responseTimeMs,
    validation,
    errors,
  }
}

async function checkRobotsTxt(domain: string): Promise<string | null> {
  try {
    const robotsUrl = `https://${domain}/robots.txt`
    const response = await fetch(robotsUrl, { 
      headers: { 'User-Agent': DEFAULT_USER_AGENT }
    })
    
    if (!response.ok) return null
    
    const text = await response.text()
    
    // Check for specific opt-out
    if (text.includes('User-agent: LLMFeed-Health-Monitor') || 
        text.includes('User-agent: llm-feed-bot')) {
      const lines = text.split('\n')
      let inOurSection = false
      for (const line of lines) {
        if (line.toLowerCase().includes('user-agent: llmfeed-health-monitor') ||
            line.toLowerCase().includes('user-agent: llm-feed-bot')) {
          inOurSection = true
        } else if (line.toLowerCase().startsWith('user-agent:')) {
          inOurSection = false
        } else if (inOurSection && line.toLowerCase().includes('disallow: /')) {
          return 'robots.txt: Disallow for LLMFeed-Health-Monitor'
        }
      }
    }
    
    return null
  } catch {
    return null
  }
}

export function checkFeedOptOut(feed: unknown): string | null {
  if (!feed || typeof feed !== 'object') return null
  
  const f = feed as Record<string, unknown>
  
  // Check metadata for opt-out
  const metadata = f.metadata as Record<string, unknown> | undefined
  if (metadata) {
    // Check for llm-feed-bot: noindex
    if (metadata['llm-feed-bot'] === 'noindex' || 
        metadata['health-monitor'] === 'noindex') {
      return 'Feed metadata: health-monitor=noindex'
    }
  }
  
  // Check for _meta block
  const meta = f._meta as Record<string, unknown> | undefined
  if (meta) {
    if (meta['llm-feed-bot'] === 'noindex' ||
        meta['health-monitor'] === 'noindex') {
      return 'Feed _meta: health-monitor=noindex'
    }
  }
  
  return null
}

/**
 * Check HTML meta tags for opt-out signals
 */
export function checkMetaOptOut(html: string): string | null {
  // Check for llmfeed-monitor meta tag
  const llmfeedMatch = html.match(/<meta[^>]*name=["']llmfeed-monitor["'][^>]*content=["']([^"']+)["']/i)
  if (llmfeedMatch && llmfeedMatch[1].toLowerCase().includes('noindex')) {
    return 'Meta tag: llmfeed-monitor=noindex'
  }
  
  // Check for robots noai meta tag
  const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i)
  if (robotsMatch && robotsMatch[1].toLowerCase().includes('noai')) {
    return 'Meta tag: robots=noai'
  }
  
  return null
}

async function validateFeed(feed: unknown, url: string): Promise<ValidationResult> {
  // Try to use the @25xcodes/llmfeed-validator if available
  try {
    // @ts-ignore - optional peer dependency
    const validator = await import('@25xcodes/llmfeed-validator')
    const result = await validator.validateLLMFeed(feed)
    return {
      valid: result.valid,
      score: result.score || 0,
      errorCount: result.errors?.length || 0,
      warningCount: result.warnings?.length || 0,
      signatureValid: result.signatureValid,
      issues: [
        ...(result.errors || []).map((e: { code?: string; message: string }) => ({
          type: 'error' as const,
          code: e.code || 'VALIDATION_ERROR',
          message: e.message,
        })),
        ...(result.warnings || []).map((w: { code?: string; message: string }) => ({
          type: 'warning' as const,
          code: w.code || 'VALIDATION_WARNING',
          message: w.message,
        })),
      ],
      capabilitiesCount: (feed as Record<string, unknown[]>).capabilities?.length || 0,
      metadata: extractMetadata(feed),
    }
  } catch {
    // Fallback to basic validation
    return basicValidation(feed)
  }
}

function basicValidation(feed: unknown): ValidationResult {
  const issues: ValidationIssue[] = []
  
  if (!feed || typeof feed !== 'object') {
    issues.push({
      type: 'error',
      code: 'INVALID_JSON',
      message: 'Feed is not a valid JSON object',
    })
    return {
      valid: false,
      score: 0,
      errorCount: 1,
      warningCount: 0,
      issues,
      capabilitiesCount: 0,
    }
  }
  
  const f = feed as Record<string, unknown>
  
  // Check required fields
  if (!f.feed_type) {
    issues.push({
      type: 'error',
      code: 'MISSING_FEED_TYPE',
      message: 'Missing required field: feed_type',
      suggestion: 'Add "feed_type": "mcp" to your feed',
    })
  }
  
  if (!f.metadata) {
    issues.push({
      type: 'error',
      code: 'MISSING_METADATA',
      message: 'Missing required field: metadata',
      suggestion: 'Add a metadata block with title, description, and origin',
    })
  } else {
    const meta = f.metadata as Record<string, unknown>
    if (!meta.origin) {
      issues.push({
        type: 'warning',
        code: 'MISSING_ORIGIN',
        message: 'Missing metadata.origin field',
        suggestion: 'Add "origin": "https://yourdomain.com" to metadata',
      })
    }
  }
  
  if (!f.capabilities || !Array.isArray(f.capabilities)) {
    issues.push({
      type: 'warning',
      code: 'MISSING_CAPABILITIES',
      message: 'No capabilities array found',
    })
  }
  
  const errorCount = issues.filter(i => i.type === 'error').length
  const warningCount = issues.filter(i => i.type === 'warning').length
  
  // Calculate basic score
  let score = 100
  score -= errorCount * 25
  score -= warningCount * 10
  score = Math.max(0, score)
  
  return {
    valid: errorCount === 0,
    score,
    errorCount,
    warningCount,
    issues,
    capabilitiesCount: Array.isArray(f.capabilities) ? f.capabilities.length : 0,
    metadata: extractMetadata(feed),
  }
}

function extractContactInfo(feed: unknown): ContactInfo | undefined {
  if (!feed || typeof feed !== 'object') return undefined
  
  const f = feed as Record<string, unknown>
  const metadata = f.metadata as Record<string, unknown> | undefined
  
  const contact: ContactInfo = {}
  
  if (metadata) {
    if (typeof metadata.email === 'string') contact.email = metadata.email
    if (typeof metadata.twitter === 'string') contact.twitter = metadata.twitter
    if (typeof metadata.contact === 'string') contact.website = metadata.contact
    if (typeof metadata.author === 'object' && metadata.author) {
      const author = metadata.author as Record<string, unknown>
      if (typeof author.email === 'string') contact.email = author.email
      if (typeof author.twitter === 'string') contact.twitter = author.twitter
    }
  }
  
  return Object.keys(contact).length > 0 ? contact : undefined
}

function detectGitHubRepo(url: string, feed: unknown): GitHubRepo | undefined {
  // Check if URL is on github.io
  const parsed = new URL(url)
  if (parsed.hostname.endsWith('.github.io')) {
    const owner = parsed.hostname.replace('.github.io', '')
    // Default repo name is usually the username.github.io or first path segment
    const pathParts = parsed.pathname.split('/').filter(Boolean)
    const repo = pathParts[0] || `${owner}.github.io`
    return { owner, repo, feedPath: parsed.pathname }
  }
  
  // Check feed metadata for repo link
  if (feed && typeof feed === 'object') {
    const f = feed as Record<string, unknown>
    const metadata = f.metadata as Record<string, unknown> | undefined
    
    if (metadata) {
      const repoUrl = metadata.repository as string | undefined ||
                      metadata.github as string | undefined ||
                      metadata.source as string | undefined
      
      if (repoUrl && repoUrl.includes('github.com')) {
        const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
        if (match) {
          return { owner: match[1], repo: match[2].replace('.git', '') }
        }
      }
    }
  }
  
  return undefined
}

function extractMetadata(feed: unknown): FeedMetadata | undefined {
  if (!feed || typeof feed !== 'object') return undefined
  
  const f = feed as Record<string, unknown>
  const metadata = f.metadata as Record<string, unknown> | undefined
  
  if (!metadata) return undefined
  
  return {
    title: metadata.title as string | undefined,
    description: metadata.description as string | undefined,
    version: metadata.version as string | undefined,
    origin: metadata.origin as string | undefined,
  }
}

/**
 * @25xcodes/llmfeed-health-monitor
 * 
 * A comprehensive health monitoring system for the LLMFeed ecosystem.
 * Crawls feeds, tracks health history, and notifies feed owners of issues.
 * 
 * Features:
 * - Feed crawling with validation
 * - Opt-out detection (robots.txt, meta tags)
 * - Multi-channel notifications (GitHub, email, Twitter)
 * - HTML/JSON report generation
 * - SQLite/memory storage for history
 * - Cron-based scheduling
 * 
 * @example Basic Usage
 * ```typescript
 * import { crawlFeed, generateReport } from '@25xcodes/llmfeed-health-monitor'
 * 
 * const result = await crawlFeed('https://example.com/.well-known/mcp.llmfeed.json')
 * 
 * if (!result.optedOut) {
 *   const report = generateReport(result.feed, result.healthCheck)
 *   console.log(report.html) // Full HTML report
 * }
 * ```
 * 
 * @example Scheduled Monitoring
 * ```typescript
 * import { createScheduler, SQLiteStorage } from '@25xcodes/llmfeed-health-monitor'
 * 
 * const storage = new SQLiteStorage('./feeds.db')
 * await storage.init()
 * 
 * const scheduler = await createScheduler({
 *   schedule: '0 * * * *', // hourly
 *   monitor: {
 *     feeds: [{ url: 'https://example.com/.well-known/mcp.llmfeed.json' }],
 *     respectOptOut: true,
 *   },
 *   notifier: {
 *     githubToken: process.env.GITHUB_TOKEN,
 *     dryRun: false,
 *   },
 *   storage,
 *   onCrawl: (result) => console.log(`Crawled ${result.feed.url}`),
 * })
 * 
 * // Run immediately, then continue on schedule
 * await scheduler.run()
 * ```
 * 
 * @packageDocumentation
 */

// Core types
export type {
  FeedSource,
  HealthCheck,
  ValidationResult,
  ValidationIssue,
  GitHubRepo,
  ContactInfo,
  FeedMetadata,
  OutreachAction,
  OutreachHistory,
  NotificationChannel,
  MonitorConfig,
  CrawlerConfig,
  StorageAdapter,
  MonitorStats,
  RateLimitConfig,
} from './types.js'

// Crawler
export {
  crawlFeed,
  crawlFeeds,
  discoverFeeds,
  type CrawlResult,
} from './crawler.js'

// Notifier
export {
  sendNotification,
  selectBestChannel,
  shouldNotify,
  type NotifierConfig,
  type NotificationPayload,
} from './notifier.js'

// Report generator
export {
  generateReport,
  generateStatsReport,
  type ReportOptions,
  type FeedReport,
} from './report.js'

// Storage
export {
  MemoryStorage,
  SQLiteStorage,
  createStorage,
} from './storage.js'

// Scheduler
export {
  createScheduler,
  runOnce,
  type SchedulerConfig,
  type ScheduledJob,
} from './scheduler.js'

// Re-export validator if available
export async function validateFeed(feed: unknown, options?: { url?: string }) {
  try {
    const validator = await import('@25xcodes/llmfeed-validator')
    return validator.validateLLMFeed(feed)
  } catch {
    // Fallback validation
    const { crawlFeed } = await import('./crawler.js')
    if (options?.url) {
      const result = await crawlFeed(options.url)
      return result.healthCheck.validation
    }
    return { valid: false, error: 'No URL provided and validator not available' }
  }
}

// Version
export const VERSION = '1.0.0'

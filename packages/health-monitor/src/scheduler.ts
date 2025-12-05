/**
 * Scheduler
 * 
 * Cron-based scheduling for feed monitoring
 */

import type {
  FeedSource,
  MonitorConfig,
  StorageAdapter,
} from './types.js'
import { crawlFeed, type CrawlResult } from './crawler.js'
import { sendNotification, selectBestChannel, shouldNotify, type NotifierConfig } from './notifier.js'
import { generateReport, type FeedReport } from './report.js'

export interface SchedulerConfig {
  /** Cron schedule for crawling (default: "0 * * * *" - hourly) */
  schedule?: string
  /** Monitor configuration */
  monitor: MonitorConfig
  /** Notifier configuration */
  notifier?: NotifierConfig
  /** Storage adapter */
  storage: StorageAdapter
  /** Callback when a feed is crawled */
  onCrawl?: (result: CrawlResult, report?: FeedReport) => void | Promise<void>
  /** Callback when notification is sent */
  onNotify?: (feedId: string, channel: string, success: boolean) => void | Promise<void>
  /** Callback on error */
  onError?: (error: Error) => void | Promise<void>
}

export interface ScheduledJob {
  /** Stop the scheduled job */
  stop: () => void
  /** Run immediately */
  run: () => Promise<void>
  /** Get next scheduled run time */
  getNextRun: () => Date | null
  /** Check if job is running */
  isRunning: () => boolean
}

/**
 * Create a scheduled monitoring job
 */
export async function createScheduler(config: SchedulerConfig): Promise<ScheduledJob> {
  let cronJob: any = null
  let running = false
  let nextRun: Date | null = null
  
  const runCrawl = async () => {
    if (running) {
      console.log('[Scheduler] Skipping run - previous crawl still in progress')
      return
    }
    
    running = true
    console.log(`[Scheduler] Starting crawl at ${new Date().toISOString()}`)
    
    try {
      // Get all feeds to crawl
      const feeds = await config.storage.getAllFeeds()
      const feedUrls = feeds.filter(f => !f.optedOut).map(f => f.url)
      
      // Add any new URLs from monitor config
      const allUrls = [...new Set([
        ...feedUrls,
        ...(config.monitor.feeds?.map(f => f.url) || []),
      ])]
      
      console.log(`[Scheduler] Crawling ${allUrls.length} feeds`)
      
      for (const url of allUrls) {
        try {
          const result = await crawlFeed(url, {
            userAgent: config.monitor.userAgent,
            timeoutMs: config.monitor.timeoutMs,
            respectRobotsTxt: config.monitor.respectOptOut,
          })
          
          // Save feed and health check
          await config.storage.saveFeed(result.feed)
          await config.storage.saveHealthCheck(result.feed.id, result.healthCheck)
          
          // Generate report if there are issues
          let report: FeedReport | undefined
          if (!result.optedOut && result.healthCheck.validation) {
            report = generateReport(result.feed, result.healthCheck, {
              includePrLink: true,
            })
          }
          
          // Notify callback
          if (config.onCrawl) {
            await config.onCrawl(result, report)
          }
          
          // Send notification if needed
          if (
            config.notifier &&
            !result.optedOut &&
            shouldNotify(result.healthCheck, config.monitor.minScoreThreshold)
          ) {
            const channel = selectBestChannel(result.feed)
            if (channel) {
              const outreachHistory = await config.storage.getOutreachHistory(result.feed.id)
              const action = await sendNotification(
                {
                  feed: result.feed,
                  healthCheck: result.healthCheck,
                  channel,
                  reportUrl: report ? undefined : undefined, // TODO: Host report
                },
                config.notifier,
                outreachHistory
              )
              
              // Save outreach history
              await config.storage.saveOutreachHistory({
                feedId: result.feed.id,
                channel,
                timestamp: action.timestamp,
                success: action.success,
                response: action.response,
                messageId: action.messageId,
                url: action.url,
              })
              
              if (config.onNotify) {
                await config.onNotify(result.feed.id, channel, action.success)
              }
            }
          }
          
          // Rate limit between crawls
          await sleep(config.monitor.rateLimit?.delayBetweenRequests || 1000)
          
        } catch (err) {
          console.error(`[Scheduler] Error crawling ${url}:`, err)
          if (config.onError && err instanceof Error) {
            await config.onError(err)
          }
        }
      }
      
      console.log(`[Scheduler] Crawl complete at ${new Date().toISOString()}`)
      
    } catch (err) {
      console.error('[Scheduler] Crawl failed:', err)
      if (config.onError && err instanceof Error) {
        await config.onError(err)
      }
    } finally {
      running = false
    }
  }
  
  // Set up cron job if schedule provided
  const schedule = config.schedule || '0 * * * *' // Default: hourly
  
  try {
    // @ts-ignore - node-cron is optional
    const cron = await import('node-cron') as any
    
    if (!cron.validate(schedule)) {
      throw new Error(`Invalid cron schedule: ${schedule}`)
    }
    
    cronJob = cron.schedule(schedule, runCrawl, {
      scheduled: false, // Don't start automatically
    })
    
    // Calculate next run
    // @ts-ignore - cron-parser is optional
    const cronParser = await import('cron-parser') as any
    const interval = cronParser.parseExpression(schedule)
    nextRun = interval.next().toDate()
    
    // Start the job
    cronJob.start()
    console.log(`[Scheduler] Started with schedule: ${schedule}`)
    console.log(`[Scheduler] Next run: ${nextRun?.toISOString()}`)
    
  } catch (err) {
    console.warn('[Scheduler] Cron not available, running in manual mode only')
  }
  
  return {
    stop: () => {
      if (cronJob) {
        cronJob.stop()
        console.log('[Scheduler] Stopped')
      }
    },
    run: runCrawl,
    getNextRun: () => nextRun,
    isRunning: () => running,
  }
}

/**
 * Run a one-time crawl (no scheduling)
 */
export async function runOnce(config: Omit<SchedulerConfig, 'schedule'>): Promise<{
  results: CrawlResult[]
  reports: FeedReport[]
}> {
  const results: CrawlResult[] = []
  const reports: FeedReport[] = []
  
  // Get all feeds
  const feeds = await config.storage.getAllFeeds()
  const feedUrls = feeds.filter(f => !f.optedOut).map(f => f.url)
  
  // Add any new URLs from monitor config
  const allUrls = [...new Set([
    ...feedUrls,
    ...(config.monitor.feeds?.map(f => f.url) || []),
  ])]
  
  console.log(`[Monitor] Running one-time crawl of ${allUrls.length} feeds`)
  
  for (const url of allUrls) {
    try {
      const result = await crawlFeed(url, {
        userAgent: config.monitor.userAgent,
        timeoutMs: config.monitor.timeoutMs,
        respectRobotsTxt: config.monitor.respectOptOut,
      })
      
      results.push(result)
      
      // Save to storage
      await config.storage.saveFeed(result.feed)
      await config.storage.saveHealthCheck(result.feed.id, result.healthCheck)
      
      // Generate report
      if (!result.optedOut) {
        const report = generateReport(result.feed, result.healthCheck, {
          includePrLink: true,
        })
        reports.push(report)
      }
      
      // Rate limit
      await sleep(config.monitor.rateLimit?.delayBetweenRequests || 500)
      
    } catch (err) {
      console.error(`[Monitor] Error crawling ${url}:`, err)
      if (config.onError && err instanceof Error) {
        await config.onError(err)
      }
    }
  }
  
  console.log(`[Monitor] Crawl complete: ${results.length} feeds processed`)
  
  return { results, reports }
}

/**
 * Simple sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

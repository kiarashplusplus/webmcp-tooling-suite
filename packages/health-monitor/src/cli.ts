#!/usr/bin/env node
/**
 * LLMFeed Health Monitor CLI
 * 
 * Usage:
 *   llmfeed-health check <url>     Check a single feed
 *   llmfeed-health crawl <urls>    Crawl multiple feeds
 *   llmfeed-health monitor         Start scheduled monitoring
 *   llmfeed-health report <url>    Generate HTML report
 *   llmfeed-health stats           Show monitoring stats
 */

import { crawlFeed, crawlFeeds, discoverFeeds } from './crawler.js'
import { generateReport, generateStatsReport } from './report.js'
import { createStorage, MemoryStorage, SQLiteStorage } from './storage.js'
import { createScheduler, runOnce } from './scheduler.js'
import type { MonitorConfig, NotificationChannel } from './types.js'

const VERSION = '1.0.0'

interface CLIOptions {
  db?: string
  output?: string
  format?: 'json' | 'html' | 'text'
  schedule?: string
  github?: boolean
  email?: boolean
  twitter?: boolean
  dryRun?: boolean
  verbose?: boolean
}

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp()
    process.exit(0)
  }
  
  if (args[0] === '--version' || args[0] === '-v') {
    console.log(`llmfeed-health v${VERSION}`)
    process.exit(0)
  }
  
  const command = args[0]
  const restArgs = args.slice(1)
  const options = parseOptions(restArgs)
  
  try {
    switch (command) {
      case 'check':
        await cmdCheck(restArgs, options)
        break
      case 'crawl':
        await cmdCrawl(restArgs, options)
        break
      case 'discover':
        await cmdDiscover(restArgs, options)
        break
      case 'report':
        await cmdReport(restArgs, options)
        break
      case 'monitor':
        await cmdMonitor(restArgs, options)
        break
      case 'stats':
        await cmdStats(options)
        break
      default:
        console.error(`Unknown command: ${command}`)
        printHelp()
        process.exit(1)
    }
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err)
    if (options.verbose) {
      console.error(err)
    }
    process.exit(1)
  }
}

/**
 * Check a single feed URL
 */
async function cmdCheck(args: string[], options: CLIOptions) {
  const url = args.find(a => !a.startsWith('-'))
  if (!url) {
    console.error('Usage: llmfeed-health check <url>')
    process.exit(1)
  }
  
  console.log(`🔍 Checking ${url}...`)
  
  const result = await crawlFeed(url)
  
  if (result.optedOut) {
    console.log(`\n⚠️  Feed has opted out: ${result.optOutReason}`)
    process.exit(0)
  }
  
  const health = result.healthCheck
  const validation = health.validation
  
  console.log('\n📊 Results:')
  console.log(`   Reachable: ${health.reachable ? '✅' : '❌'}`)
  console.log(`   HTTP Status: ${health.httpStatus || 'N/A'}`)
  console.log(`   Response Time: ${health.responseTimeMs || 'N/A'}ms`)
  
  if (validation) {
    console.log(`   Valid: ${validation.valid ? '✅' : '❌'}`)
    console.log(`   Score: ${validation.score}/100`)
    console.log(`   Errors: ${validation.errorCount}`)
    console.log(`   Warnings: ${validation.warningCount}`)
    console.log(`   Capabilities: ${validation.capabilitiesCount}`)
    
    if (validation.signatureValid !== undefined) {
      console.log(`   Signature: ${validation.signatureValid ? '✅ Valid' : '⚠️ Invalid'}`)
    }
    
    if (validation.issues?.length) {
      console.log('\n🔧 Issues:')
      for (const issue of validation.issues) {
        const icon = issue.type === 'error' ? '❌' : '⚠️'
        console.log(`   ${icon} [${issue.code}] ${issue.message}`)
        if (issue.suggestion) {
          console.log(`      💡 ${issue.suggestion}`)
        }
      }
    }
  }
  
  if (health.errors?.length) {
    console.log('\n❌ Errors:')
    for (const err of health.errors) {
      console.log(`   - ${err}`)
    }
  }
  
  // Output JSON if requested
  if (options.format === 'json' || options.output?.endsWith('.json')) {
    const json = JSON.stringify({
      url: result.feed.url,
      domain: result.feed.domain,
      health: {
        reachable: health.reachable,
        httpStatus: health.httpStatus,
        responseTimeMs: health.responseTimeMs,
      },
      validation,
    }, null, 2)
    
    if (options.output) {
      const fs = await import('fs')
      fs.writeFileSync(options.output, json)
      console.log(`\n📄 Saved to ${options.output}`)
    } else {
      console.log('\n' + json)
    }
  }
  
  // Exit with error code if invalid
  process.exit(validation?.valid ? 0 : 1)
}

/**
 * Crawl multiple feed URLs
 */
async function cmdCrawl(args: string[], options: CLIOptions) {
  const urls = args.filter(a => !a.startsWith('-'))
  if (urls.length === 0) {
    console.error('Usage: llmfeed-health crawl <url1> <url2> ...')
    process.exit(1)
  }
  
  console.log(`🔍 Crawling ${urls.length} feeds...`)
  
  const results = await crawlFeeds(urls)
  
  let healthy = 0
  let unhealthy = 0
  let optedOut = 0
  
  for (const result of results) {
    const status = result.optedOut 
      ? '⏭️  (opted out)'
      : result.healthCheck.validation?.valid 
        ? '✅' 
        : '❌'
    
    console.log(`${status} ${result.feed.url}`)
    
    if (result.optedOut) optedOut++
    else if (result.healthCheck.validation?.valid) healthy++
    else unhealthy++
  }
  
  console.log(`\n📊 Summary: ${healthy} healthy, ${unhealthy} unhealthy, ${optedOut} opted out`)
  
  // Output JSON if requested
  if (options.format === 'json' || options.output?.endsWith('.json')) {
    const json = JSON.stringify(results.map(r => ({
      url: r.feed.url,
      domain: r.feed.domain,
      optedOut: r.optedOut,
      health: {
        reachable: r.healthCheck.reachable,
        score: r.healthCheck.validation?.score,
        valid: r.healthCheck.validation?.valid,
      },
    })), null, 2)
    
    if (options.output) {
      const fs = await import('fs')
      fs.writeFileSync(options.output, json)
      console.log(`📄 Saved to ${options.output}`)
    } else {
      console.log(json)
    }
  }
  
  process.exit(unhealthy > 0 ? 1 : 0)
}

/**
 * Discover feeds from a domain
 */
async function cmdDiscover(args: string[], options: CLIOptions) {
  const domain = args.find(a => !a.startsWith('-'))
  if (!domain) {
    console.error('Usage: llmfeed-health discover <domain>')
    process.exit(1)
  }
  
  console.log(`🔍 Discovering feeds on ${domain}...`)
  
  const feeds = await discoverFeeds(domain)
  
  if (feeds.length === 0) {
    console.log('No feeds found.')
    process.exit(0)
  }
  
  console.log(`\n📡 Found ${feeds.length} feed(s):`)
  for (const url of feeds) {
    console.log(`   - ${url}`)
  }
  
  if (options.format === 'json') {
    console.log(JSON.stringify(feeds, null, 2))
  }
}

/**
 * Generate an HTML report
 */
async function cmdReport(args: string[], options: CLIOptions) {
  const url = args.find(a => !a.startsWith('-'))
  if (!url) {
    console.error('Usage: llmfeed-health report <url> [--output <file>]')
    process.exit(1)
  }
  
  console.log(`🔍 Generating report for ${url}...`)
  
  const result = await crawlFeed(url)
  
  if (result.optedOut) {
    console.log(`⚠️  Feed has opted out: ${result.optOutReason}`)
    process.exit(0)
  }
  
  const report = generateReport(result.feed, result.healthCheck, {
    includePrLink: true,
    detailed: true,
  })
  
  const output = options.output || `report-${result.feed.domain}.html`
  const format = options.format || (output.endsWith('.json') ? 'json' : 'html')
  
  const fs = await import('fs')
  
  if (format === 'json') {
    fs.writeFileSync(output, JSON.stringify(report.json, null, 2))
  } else {
    fs.writeFileSync(output, report.html)
  }
  
  console.log(`📄 Report saved to ${output}`)
}

/**
 * Start scheduled monitoring
 */
async function cmdMonitor(args: string[], options: CLIOptions) {
  const urls = args.filter(a => !a.startsWith('-'))
  
  console.log('🔄 Starting LLMFeed Health Monitor...')
  
  // Set up storage
  const storage = options.db
    ? new SQLiteStorage(options.db)
    : new MemoryStorage()
  
  if (storage instanceof SQLiteStorage) {
    await storage.init()
    console.log(`📦 Using database: ${options.db}`)
  }
  
  // Add initial feeds
  for (const url of urls) {
    const result = await crawlFeed(url)
    await storage.saveFeed(result.feed)
    console.log(`   Added: ${url}`)
  }
  
  // Build monitor config
  const monitorConfig: MonitorConfig = {
    feeds: urls.map(url => ({ url })),
    schedule: options.schedule || '0 * * * *',
    respectOptOut: true,
    rateLimit: {
      maxPerDomain: 1,
      windowMs: 24 * 60 * 60 * 1000,
      delayBetweenRequests: 1000,
    },
  }
  
  // Build notifier config
  const notifierConfig = options.dryRun ? { dryRun: true } : {
    githubToken: process.env.GITHUB_TOKEN,
    dryRun: options.dryRun,
  }
  
  // Create scheduler
  const scheduler = await createScheduler({
    schedule: options.schedule,
    monitor: monitorConfig,
    notifier: notifierConfig,
    storage,
    onCrawl: (result, report) => {
      const status = result.optedOut 
        ? '⏭️' 
        : result.healthCheck.validation?.valid 
          ? '✅' 
          : '❌'
      console.log(`${status} ${result.feed.url} (score: ${result.healthCheck.validation?.score ?? 'N/A'})`)
    },
    onNotify: (feedId, channel, success) => {
      console.log(`📬 Notification to ${feedId} via ${channel}: ${success ? 'sent' : 'failed'}`)
    },
    onError: (error) => {
      console.error(`❌ Error: ${error.message}`)
    },
  })
  
  console.log(`\n📅 Schedule: ${options.schedule || '0 * * * *'}`)
  console.log(`⏰ Next run: ${scheduler.getNextRun()?.toISOString() || 'manual'}`)
  console.log('\nPress Ctrl+C to stop.\n')
  
  // Run initial crawl
  console.log('Running initial crawl...')
  await scheduler.run()
  
  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\n\nShutting down...')
    scheduler.stop()
    if (storage instanceof SQLiteStorage) {
      storage.close()
    }
    process.exit(0)
  })
}

/**
 * Show monitoring stats
 */
async function cmdStats(options: CLIOptions) {
  if (!options.db) {
    console.error('Usage: llmfeed-health stats --db <path>')
    process.exit(1)
  }
  
  const storage = new SQLiteStorage(options.db)
  await storage.init()
  
  const stats = await storage.getStats()
  const report = generateStatsReport(stats)
  
  if (options.format === 'json') {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log('\n📊 LLMFeed Health Monitor Stats')
    console.log('================================')
    console.log(`Total Feeds: ${stats.totalFeeds}`)
    console.log(`  ✅ Healthy: ${stats.healthyFeeds}`)
    console.log(`  ⚠️  Degraded: ${stats.degradedFeeds}`)
    console.log(`  ❌ Unhealthy: ${stats.unhealthyFeeds}`)
    console.log(`  ⏭️  Opted Out: ${stats.optedOutFeeds}`)
    console.log(`\nAverage Score: ${stats.averageScore}/100`)
    console.log(`Last Crawl: ${stats.lastCrawl ? new Date(stats.lastCrawl).toISOString() : 'Never'}`)
    
    if (Object.keys(stats.commonIssues).length > 0) {
      console.log('\nCommon Issues:')
      const sorted = Object.entries(stats.commonIssues).sort(([, a], [, b]) => b - a)
      for (const [code, count] of sorted.slice(0, 5)) {
        console.log(`  - ${code}: ${count} feeds`)
      }
    }
  }
  
  storage.close()
}

/**
 * Parse CLI options
 */
function parseOptions(args: string[]): CLIOptions {
  const options: CLIOptions = {}
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    if (arg === '--db' || arg === '-d') {
      options.db = args[++i]
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i]
    } else if (arg === '--format' || arg === '-f') {
      options.format = args[++i] as 'json' | 'html' | 'text'
    } else if (arg === '--schedule' || arg === '-s') {
      options.schedule = args[++i]
    } else if (arg === '--github') {
      options.github = true
    } else if (arg === '--email') {
      options.email = true
    } else if (arg === '--twitter') {
      options.twitter = true
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--verbose' || arg === '-V') {
      options.verbose = true
    }
  }
  
  return options
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
🔍 LLMFeed Health Monitor v${VERSION}

Usage: llmfeed-health <command> [options]

Commands:
  check <url>        Check a single feed's health
  crawl <urls...>    Crawl multiple feeds
  discover <domain>  Discover feeds on a domain
  report <url>       Generate HTML/JSON health report
  monitor <urls...>  Start scheduled monitoring
  stats              Show monitoring statistics

Options:
  --db, -d <path>      SQLite database path
  --output, -o <file>  Output file path
  --format, -f <fmt>   Output format: json, html, text
  --schedule, -s <cron> Cron schedule for monitoring
  --github             Enable GitHub issue notifications
  --email              Enable email notifications
  --twitter            Enable Twitter DM notifications
  --dry-run            Don't actually send notifications
  --verbose, -V        Verbose output
  --version, -v        Show version
  --help, -h           Show this help

Examples:
  llmfeed-health check https://25x.codes/.well-known/mcp.llmfeed.json
  llmfeed-health crawl feed1.json feed2.json --format json
  llmfeed-health report https://example.com -o report.html
  llmfeed-health monitor https://25x.codes --schedule "0 */6 * * *" --db feeds.db

Environment Variables:
  GITHUB_TOKEN     GitHub personal access token for creating issues
  SMTP_HOST        SMTP server host for email notifications
  SMTP_USER        SMTP username
  SMTP_PASS        SMTP password
  SMTP_FROM        Email sender address
  TWITTER_API_KEY  Twitter API key for DM notifications

More info: https://github.com/kiarashplusplus/webmcp-tooling-suite
`)
}

main()

# @25xcodes/llmfeed-health-monitor

A comprehensive health monitoring system for the LLMFeed ecosystem. Crawls feeds, tracks health history, and notifies feed owners about validation issues.

## Features

- 🔍 **Feed Crawling** - Validate feeds against the LLMFeed spec
- 📊 **Health Tracking** - SQLite storage for historical health data
- 🤖 **Smart Notifications** - GitHub issues, email, and Twitter DM support
- ⏰ **Scheduled Monitoring** - Cron-based crawl scheduling
- 🚫 **Opt-out Respect** - Honor robots.txt and feed metadata opt-outs
- 📝 **Report Generation** - Beautiful HTML and JSON reports
- 🔐 **Rate Limiting** - 1 message per domain per 24h by default

## Installation

```bash
npm install @25xcodes/llmfeed-health-monitor
```

## CLI Usage

```bash
# Check a single feed
npx llmfeed-health check https://example.com/.well-known/mcp.llmfeed.json

# Crawl multiple feeds
npx llmfeed-health crawl feed1.json feed2.json --format json

# Generate HTML report
npx llmfeed-health report https://example.com -o report.html

# Start scheduled monitoring
npx llmfeed-health monitor https://25x.codes --schedule "0 */6 * * *" --db feeds.db

# View stats
npx llmfeed-health stats --db feeds.db
```

## API Usage

### Basic Feed Check

```typescript
import { crawlFeed, generateReport } from '@25xcodes/llmfeed-health-monitor'

const result = await crawlFeed('https://example.com/.well-known/mcp.llmfeed.json')

console.log('Reachable:', result.healthCheck.reachable)
console.log('Score:', result.healthCheck.validation?.score)
console.log('Issues:', result.healthCheck.validation?.issues)

// Generate HTML report
if (!result.optedOut) {
  const report = generateReport(result.feed, result.healthCheck)
  console.log(report.html)
}
```

### Scheduled Monitoring with Notifications

```typescript
import { 
  createScheduler, 
  SQLiteStorage 
} from '@25xcodes/llmfeed-health-monitor'

// Set up SQLite storage
const storage = new SQLiteStorage('./feeds.db')
await storage.init()

// Create scheduler
const scheduler = await createScheduler({
  schedule: '0 * * * *', // Every hour
  monitor: {
    feeds: [
      { url: 'https://25x.codes/.well-known/mcp.llmfeed.json' },
      { url: 'https://example.com/.well-known/mcp.llmfeed.json' },
    ],
    respectOptOut: true,
    minScoreThreshold: 50, // Only notify if score < 50
  },
  notifier: {
    githubToken: process.env.GITHUB_TOKEN,
    dryRun: false, // Set to true for testing
  },
  storage,
  onCrawl: (result, report) => {
    console.log(`Crawled ${result.feed.url} - Score: ${result.healthCheck.validation?.score}`)
  },
  onNotify: (feedId, channel, success) => {
    console.log(`Notified ${feedId} via ${channel}: ${success ? '✅' : '❌'}`)
  },
})

// Run initial crawl
await scheduler.run()

// Scheduler will continue running on schedule
// Call scheduler.stop() to stop
```

### Custom Notification Channels

```typescript
import { sendNotification } from '@25xcodes/llmfeed-health-monitor'

// Send GitHub issue
const action = await sendNotification({
  feed: result.feed,
  healthCheck: result.healthCheck,
  channel: 'github',
  reportUrl: 'https://example.com/report.html',
}, {
  githubToken: process.env.GITHUB_TOKEN,
}, [])

console.log('Created issue:', action.url)
```

### Discover Feeds on a Domain

```typescript
import { discoverFeeds } from '@25xcodes/llmfeed-health-monitor'

const feeds = await discoverFeeds('example.com')
// Returns: ['https://example.com/.well-known/mcp.llmfeed.json', ...]
```

## Opt-out Mechanisms

Feed owners can opt out of health monitoring:

### 1. robots.txt

```txt
User-agent: LLMFeed-Health-Monitor
Disallow: /
```

### 2. Feed Metadata

```json
{
  "feed_type": "mcp",
  "_meta": {
    "health-monitor": "noindex"
  }
}
```

## Notification Channels

### GitHub Issues

Creates issues on detected GitHub repositories with:
- Issue breakdown (errors/warnings)
- Fix suggestions
- One-click PR link
- Opt-out instructions

Requires: `GITHUB_TOKEN` environment variable

### Email

Sends friendly emails with fix suggestions.

Requires SMTP configuration:
```typescript
{
  email: {
    host: 'smtp.example.com',
    port: 587,
    user: 'user@example.com',
    pass: 'password',
    from: 'LLMFeed Bot <bot@example.com>',
  }
}
```

### Twitter DM

Sends direct messages to feed owner's Twitter handle (if found in feed metadata).

Requires Twitter API credentials.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub PAT for creating issues |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | Email sender address |
| `TWITTER_API_KEY` | Twitter API key |
| `TWITTER_API_SECRET` | Twitter API secret |
| `TWITTER_ACCESS_TOKEN` | Twitter access token |
| `TWITTER_ACCESS_SECRET` | Twitter access token secret |

## Storage Adapters

### Memory Storage (default)
```typescript
import { MemoryStorage } from '@25xcodes/llmfeed-health-monitor'
const storage = new MemoryStorage()
```

### SQLite Storage
```typescript
import { SQLiteStorage } from '@25xcodes/llmfeed-health-monitor'
const storage = new SQLiteStorage('./feeds.db')
await storage.init()
```

## Bot Tone

The notification messages follow these principles:
- **Friendly, slightly chaotic, zero ego**
- Helpful suggestions, not demands
- Clear opt-out instructions
- Respect for feed owners' time

## Related Packages

- [`@25xcodes/llmfeed-validator`](https://www.npmjs.com/package/@25xcodes/llmfeed-validator) - Validate LLMFeed files
- [`@25xcodes/llmfeed-signer`](https://www.npmjs.com/package/@25xcodes/llmfeed-signer) - Sign feeds with Ed25519

## License

MIT - See [LICENSE](../LICENSE) for details.

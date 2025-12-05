# @25xcodes/llmfeed-health-monitor

Feed crawling, health tracking, and report generation for LLMFeed.

<div style="display: flex; gap: 0.5rem; margin: 1rem 0;">
  <a href="https://www.npmjs.com/package/@25xcodes/llmfeed-health-monitor">
    <img src="https://img.shields.io/npm/v/@25xcodes/llmfeed-health-monitor?color=cb3837" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/@25xcodes/llmfeed-health-monitor">
    <img src="https://img.shields.io/npm/dm/@25xcodes/llmfeed-health-monitor" alt="npm downloads">
  </a>
</div>

## Format Support

| Format | Crawling | Validation | Reports |
|--------|----------|------------|--------|
| **LLMFeed JSON** | ✅ Full | ✅ Full | ✅ Full |
| **llm.txt** | 🚧 Fetch only | 🚧 Coming | 🚧 Coming |

::: info Current Status
Health monitoring with full validation is available for **LLMFeed JSON** format. The crawler can fetch llm.txt files but validation and detailed reports require JSON feeds.
:::

## Features

- 🕷️ **Feed Crawling** - Fetch and validate feeds from URLs
- 📊 **Health Tracking** - Store and track feed health over time
- 📝 **Report Generation** - Generate HTML, JSON, and Markdown reports
- 💾 **Flexible Storage** - In-memory or custom storage backends
- ⏰ **Scheduling** - Run health checks on a schedule
- 🔔 **Notifications** - Alert on feed health changes

## Quick Start

```bash
npm install @25xcodes/llmfeed-health-monitor
```

```typescript
import { 
  crawlFeed, 
  generateReport, 
  MemoryStorage 
} from '@25xcodes/llmfeed-health-monitor'

const storage = new MemoryStorage()

// Crawl a LLMFeed JSON (full validation support)
const result = await crawlFeed('https://example.com/.well-known/llmfeed.json', storage)

console.log(result.status)           // 'healthy' | 'degraded' | 'unhealthy'
console.log(result.structureValid)   // Schema validity
console.log(result.signatureValid)   // Signature validity
console.log(result.responseTime)     // ms

// Generate a report
const report = await generateReport({
  storage,
  format: 'html',
  outputPath: './health-report.html'
})
```

## Core Functions

### `crawlFeed(url, storage?, options?)`

Crawl a single feed:

```typescript
import { crawlFeed, MemoryStorage } from '@25xcodes/llmfeed-health-monitor'

const storage = new MemoryStorage()

const result = await crawlFeed('https://example.com/llm.txt', storage, {
  timeout: 10000,        // Request timeout
  validateSignature: true,  // Verify signatures
  followRedirects: true  // Follow HTTP redirects
})

// Result structure
{
  url: 'https://example.com/llm.txt',
  status: 'healthy',
  crawledAt: '2024-03-20T14:30:00Z',
  responseTime: 245,
  httpStatus: 200,
  structureValid: true,
  signatureValid: true,
  feed: { ... },         // The parsed feed
  errors: [],            // Any errors encountered
  contentHash: 'sha256:...'
}
```

### `crawlFeeds(urls, storage?, options?)`

Crawl multiple feeds concurrently:

```typescript
import { crawlFeeds, MemoryStorage } from '@25xcodes/llmfeed-health-monitor'

const storage = new MemoryStorage()

const results = await crawlFeeds([
  'https://example.com/llm.txt',
  'https://another.com/.well-known/llm.txt'
], storage, {
  concurrency: 5,  // Max concurrent requests
  timeout: 10000
})
```

### `generateReport(options)`

Generate health reports:

```typescript
import { generateReport, MemoryStorage } from '@25xcodes/llmfeed-health-monitor'

const storage = new MemoryStorage()

// HTML report
const htmlReport = await generateReport({
  storage,
  format: 'html',
  outputPath: './report.html'
})

// JSON report
const jsonReport = await generateReport({
  storage,
  format: 'json',
  outputPath: './report.json'
})

// Markdown report
const mdReport = await generateReport({
  storage,
  format: 'markdown',
  outputPath: './report.md'
})
```

## Utility Functions

```typescript
import {
  normalizeUrl,
  generateFeedId,
  checkMetaOptOut,
  checkFeedOptOut
} from '@25xcodes/llmfeed-health-monitor'

// Normalize URLs for consistent storage
const normalized = normalizeUrl('example.com/llm.txt')
// => 'https://example.com/llm.txt'

// Generate stable feed IDs
const feedId = generateFeedId('https://example.com/llm.txt')

// Check for opt-out signals
const hasMetaOptOut = checkMetaOptOut(htmlContent)
const hasFeedOptOut = checkFeedOptOut(feedContent)
```

## Storage Backends

### MemoryStorage

Simple in-memory storage for testing and single runs:

```typescript
import { MemoryStorage } from '@25xcodes/llmfeed-health-monitor'

const storage = new MemoryStorage()

// Storage persists only during runtime
```

### Custom Storage

Implement the `FeedStorage` interface:

```typescript
import type { FeedStorage, CrawlResult } from '@25xcodes/llmfeed-health-monitor'

class CustomStorage implements FeedStorage {
  async save(result: CrawlResult): Promise<void> {
    // Save to your database
  }
  
  async get(feedId: string): Promise<CrawlResult | null> {
    // Retrieve from database
  }
  
  async getAll(): Promise<CrawlResult[]> {
    // Get all results
  }
  
  async getHistory(feedId: string, limit?: number): Promise<CrawlResult[]> {
    // Get historical results
  }
}
```

## CLI Usage

```bash
# Crawl a single feed
npx llmfeed-health crawl https://example.com/.well-known/llm.txt

# Crawl multiple feeds from a file
npx llmfeed-health crawl --file ./feeds.txt

# Generate reports
npx llmfeed-health report --format html --output ./report.html
npx llmfeed-health report --format json --output ./report.json

# Run continuous monitoring
npx llmfeed-health monitor --interval 5m --feeds ./feeds.txt
```

## Health Status

Feeds are classified into three health statuses:

| Status | Criteria |
|--------|----------|
| 🟢 **healthy** | HTTP 200, valid structure, valid signature (if present) |
| 🟡 **degraded** | HTTP 200 but validation warnings, slow response |
| 🔴 **unhealthy** | HTTP error, invalid structure, signature failure |

## Report Formats

### HTML Report

Beautiful, interactive HTML reports with:
- Summary statistics
- Health status per feed
- Response time graphs
- Error details
- Historical trends

### JSON Report

Machine-readable format for integration:

```json
{
  "generatedAt": "2024-03-20T14:30:00Z",
  "summary": {
    "total": 10,
    "healthy": 8,
    "degraded": 1,
    "unhealthy": 1
  },
  "feeds": [
    {
      "url": "https://example.com/llm.txt",
      "status": "healthy",
      "lastCrawled": "2024-03-20T14:25:00Z",
      "responseTime": 245
    }
  ]
}
```

### Markdown Report

Simple text format for documentation:

```markdown
# LLMFeed Health Report

Generated: 2024-03-20 14:30:00

## Summary

- Total Feeds: 10
- Healthy: 8
- Degraded: 1  
- Unhealthy: 1

## Feed Details

### https://example.com/llm.txt
- Status: 🟢 Healthy
- Response Time: 245ms
- Last Crawled: 2024-03-20 14:25:00
```

## Next Steps

- [Installation](/packages/health-monitor/installation) - Detailed installation guide
- [Crawling](/packages/health-monitor/crawling) - Complete crawling guide
- [Reports](/packages/health-monitor/reports) - Report customization
- [API Reference](/api/health-monitor) - Full API documentation

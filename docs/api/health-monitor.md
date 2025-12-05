# Health Monitor API

Complete API reference for `@25xcodes/llmfeed-health-monitor`.

::: info Format Support
Full health monitoring with validation is available for **LLMFeed JSON** format. The crawler can fetch llm.txt files but validation requires JSON feeds.
:::

## Functions

### crawlFeed

Crawl and validate a single feed.

```typescript
async function crawlFeed(
  url: string,
  storage?: FeedStorage,
  options?: CrawlOptions
): Promise<CrawlResult>
```

**Parameters:**
- `url` - Feed URL to crawl
- `storage` - Optional storage backend
- `options` - Crawl options

**Options:**

```typescript
interface CrawlOptions {
  timeout?: number           // Request timeout in ms (default: 10000)
  validateSignature?: boolean // Verify signatures (default: true)
  followRedirects?: boolean   // Follow redirects (default: true)
  userAgent?: string          // Custom User-Agent
}
```

**Returns:** `Promise<CrawlResult>`

```typescript
interface CrawlResult {
  url: string
  feedId: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  crawledAt: string
  responseTime: number
  httpStatus: number
  structureValid: boolean
  signatureValid: boolean
  feed: LLMFeed | null
  errors: string[]
  contentHash: string
}
```

**Example:**

```typescript
import { crawlFeed, MemoryStorage } from '@25xcodes/llmfeed-health-monitor'

const storage = new MemoryStorage()

// Crawl LLMFeed JSON (full validation support)
const result = await crawlFeed(
  'https://example.com/.well-known/llmfeed.json',
  storage,
  { timeout: 5000 }
)

console.log('Status:', result.status)
console.log('Response time:', result.responseTime, 'ms')
```

---

### crawlFeeds

Crawl multiple feeds concurrently.

```typescript
async function crawlFeeds(
  urls: string[],
  storage?: FeedStorage,
  options?: CrawlOptions & { concurrency?: number }
): Promise<CrawlResult[]>
```

**Parameters:**
- `urls` - Array of feed URLs
- `storage` - Optional storage backend
- `options` - Crawl options plus concurrency

**Example:**

```typescript
import { crawlFeeds, MemoryStorage } from '@25xcodes/llmfeed-health-monitor'

const storage = new MemoryStorage()

// Crawl multiple LLMFeed JSON files
const results = await crawlFeeds([
  'https://example1.com/llmfeed.json',
  'https://example2.com/llmfeed.json',
  'https://example3.com/llmfeed.json'
], storage, {
  concurrency: 3,
  timeout: 10000
})

for (const result of results) {
  console.log(`${result.url}: ${result.status}`)
}
```

---

### generateReport

Generate health reports in various formats.

```typescript
async function generateReport(options: ReportOptions): Promise<string>
```

**Options:**

```typescript
interface ReportOptions {
  storage: FeedStorage
  format: 'json' | 'html' | 'markdown'
  outputPath?: string
  title?: string
  includeHistory?: boolean
}
```

**Returns:** `Promise<string>` - The generated report content

**Example:**

```typescript
import { generateReport, MemoryStorage } from '@25xcodes/llmfeed-health-monitor'

const storage = new MemoryStorage()

// Generate HTML report
const html = await generateReport({
  storage,
  format: 'html',
  outputPath: './report.html',
  title: 'Daily Health Report'
})

// Generate JSON report
const json = await generateReport({
  storage,
  format: 'json'
})

const data = JSON.parse(json)
console.log('Healthy feeds:', data.summary.healthy)
```

---

## Utility Functions

### normalizeUrl

Normalize a feed URL for consistent storage.

```typescript
function normalizeUrl(url: string): string
```

**Example:**

```typescript
import { normalizeUrl } from '@25xcodes/llmfeed-health-monitor'

normalizeUrl('example.com/llmfeed.json')
// => 'https://example.com/llmfeed.json'

normalizeUrl('http://EXAMPLE.COM/llmfeed.json')
// => 'https://example.com/llmfeed.json'
```

---

### generateFeedId

Generate a stable ID for a feed URL.

```typescript
function generateFeedId(url: string): string
```

**Example:**

```typescript
import { generateFeedId } from '@25xcodes/llmfeed-health-monitor'

const id = generateFeedId('https://example.com/llmfeed.json')
// => 'example-com-llmfeed-json'
```

---

### checkMetaOptOut

Check HTML content for opt-out meta tags.

```typescript
function checkMetaOptOut(html: string): boolean
```

**Example:**

```typescript
import { checkMetaOptOut } from '@25xcodes/llmfeed-health-monitor'

const html = '<meta name="llmfeed-optout" content="true">'
const hasOptOut = checkMetaOptOut(html)  // true
```

---

### checkFeedOptOut

Check feed content for opt-out signals.

```typescript
function checkFeedOptOut(feed: unknown): boolean
```

**Example:**

```typescript
import { checkFeedOptOut } from '@25xcodes/llmfeed-health-monitor'

const feed = { meta: { optOut: true } }
const hasOptOut = checkFeedOptOut(feed)  // true
```

---

## Storage Classes

### MemoryStorage

In-memory storage for testing and single runs.

```typescript
class MemoryStorage implements FeedStorage {
  constructor()
  
  save(result: CrawlResult): Promise<void>
  get(feedId: string): Promise<CrawlResult | null>
  getAll(): Promise<CrawlResult[]>
  getHistory(feedId: string, limit?: number): Promise<CrawlResult[]>
  clear(): Promise<void>
}
```

**Example:**

```typescript
import { MemoryStorage } from '@25xcodes/llmfeed-health-monitor'

const storage = new MemoryStorage()

// Use with crawlFeed
await crawlFeed(url, storage)

// Get all results
const results = await storage.getAll()

// Get history for a specific feed
const history = await storage.getHistory('example-com-llm-txt', 10)

// Clear all data
await storage.clear()
```

---

### Custom Storage

Implement `FeedStorage` for custom backends.

```typescript
interface FeedStorage {
  save(result: CrawlResult): Promise<void>
  get(feedId: string): Promise<CrawlResult | null>
  getAll(): Promise<CrawlResult[]>
  getHistory(feedId: string, limit?: number): Promise<CrawlResult[]>
}
```

**Example: SQLite Storage**

```typescript
import type { FeedStorage, CrawlResult } from '@25xcodes/llmfeed-health-monitor'
import Database from 'better-sqlite3'

class SQLiteStorage implements FeedStorage {
  private db: Database.Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.init()
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS crawl_results (
        id INTEGER PRIMARY KEY,
        feed_id TEXT NOT NULL,
        url TEXT NOT NULL,
        status TEXT NOT NULL,
        crawled_at TEXT NOT NULL,
        data JSON NOT NULL
      )
    `)
  }

  async save(result: CrawlResult): Promise<void> {
    this.db.prepare(`
      INSERT INTO crawl_results (feed_id, url, status, crawled_at, data)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      result.feedId,
      result.url,
      result.status,
      result.crawledAt,
      JSON.stringify(result)
    )
  }

  async get(feedId: string): Promise<CrawlResult | null> {
    const row = this.db.prepare(`
      SELECT data FROM crawl_results
      WHERE feed_id = ?
      ORDER BY crawled_at DESC
      LIMIT 1
    `).get(feedId)
    
    return row ? JSON.parse(row.data) : null
  }

  async getAll(): Promise<CrawlResult[]> {
    const rows = this.db.prepare(`
      SELECT DISTINCT feed_id, data FROM crawl_results
      WHERE crawled_at = (
        SELECT MAX(crawled_at) FROM crawl_results c2
        WHERE c2.feed_id = crawl_results.feed_id
      )
    `).all()
    
    return rows.map(r => JSON.parse(r.data))
  }

  async getHistory(feedId: string, limit = 100): Promise<CrawlResult[]> {
    const rows = this.db.prepare(`
      SELECT data FROM crawl_results
      WHERE feed_id = ?
      ORDER BY crawled_at DESC
      LIMIT ?
    `).all(feedId, limit)
    
    return rows.map(r => JSON.parse(r.data))
  }
}
```

---

## Types

### CrawlResult

```typescript
interface CrawlResult {
  url: string
  feedId: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  crawledAt: string
  responseTime: number
  httpStatus: number
  structureValid: boolean
  signatureValid: boolean
  feed: LLMFeed | null
  errors: string[]
  contentHash: string
}
```

### CrawlOptions

```typescript
interface CrawlOptions {
  timeout?: number
  validateSignature?: boolean
  followRedirects?: boolean
  userAgent?: string
}
```

### ReportOptions

```typescript
interface ReportOptions {
  storage: FeedStorage
  format: 'json' | 'html' | 'markdown'
  outputPath?: string
  title?: string
  includeHistory?: boolean
}
```

### FeedStorage

```typescript
interface FeedStorage {
  save(result: CrawlResult): Promise<void>
  get(feedId: string): Promise<CrawlResult | null>
  getAll(): Promise<CrawlResult[]>
  getHistory(feedId: string, limit?: number): Promise<CrawlResult[]>
}
```

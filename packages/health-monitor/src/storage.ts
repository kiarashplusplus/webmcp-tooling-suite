/**
 * Storage Adapter
 * 
 * SQLite/D1 compatible storage for feed monitoring history
 */

import type {
  FeedSource,
  HealthCheck,
  OutreachHistory,
  StorageAdapter,
  MonitorStats,
} from './types.js'

/**
 * In-memory storage adapter for testing and simple use cases
 */
export class MemoryStorage implements StorageAdapter {
  private feeds: Map<string, FeedSource> = new Map()
  private healthChecks: Map<string, HealthCheck[]> = new Map()
  private outreachHistory: OutreachHistory[] = []
  
  async saveFeed(feed: FeedSource): Promise<void> {
    this.feeds.set(feed.id, feed)
  }
  
  async getFeed(id: string): Promise<FeedSource | null> {
    return this.feeds.get(id) || null
  }
  
  async getAllFeeds(): Promise<FeedSource[]> {
    return Array.from(this.feeds.values())
  }
  
  async deleteFeed(id: string): Promise<void> {
    this.feeds.delete(id)
    this.healthChecks.delete(id)
  }
  
  async saveHealthCheck(feedId: string, check: HealthCheck): Promise<void> {
    const checks = this.healthChecks.get(feedId) || []
    checks.push(check)
    // Keep last 100 checks per feed
    if (checks.length > 100) {
      checks.shift()
    }
    this.healthChecks.set(feedId, checks)
  }
  
  async getHealthHistory(feedId: string, limit?: number): Promise<HealthCheck[]> {
    const checks = this.healthChecks.get(feedId) || []
    return limit ? checks.slice(-limit) : checks
  }
  
  async getLatestHealthCheck(feedId: string): Promise<HealthCheck | null> {
    const checks = this.healthChecks.get(feedId) || []
    return checks[checks.length - 1] || null
  }
  
  async saveOutreachHistory(history: OutreachHistory): Promise<void> {
    this.outreachHistory.push(history)
  }
  
  async getOutreachHistory(feedId: string): Promise<OutreachHistory[]> {
    return this.outreachHistory.filter(h => h.feedId === feedId)
  }
  
  async getRecentOutreach(feedId: string, channel: string, withinMs: number): Promise<OutreachHistory[]> {
    const since = Date.now() - withinMs
    return this.outreachHistory.filter(
      h => h.feedId === feedId && h.channel === channel && h.timestamp > since
    )
  }
  
  async getStats(): Promise<MonitorStats> {
    const feeds = Array.from(this.feeds.values())
    let healthy = 0
    let degraded = 0
    let unhealthy = 0
    let optedOut = 0
    let totalScore = 0
    let scoreCount = 0
    const commonIssues: Record<string, number> = {}
    
    for (const feed of feeds) {
      if (feed.optedOut) {
        optedOut++
        continue
      }
      
      const latest = await this.getLatestHealthCheck(feed.id)
      if (!latest) continue
      
      const score = latest.validation?.score ?? 0
      totalScore += score
      scoreCount++
      
      if (score >= 80) healthy++
      else if (score >= 50) degraded++
      else unhealthy++
      
      // Count common issues
      for (const issue of latest.validation?.issues || []) {
        commonIssues[issue.code] = (commonIssues[issue.code] || 0) + 1
      }
    }
    
    return {
      totalFeeds: feeds.length,
      healthyFeeds: healthy,
      degradedFeeds: degraded,
      unhealthyFeeds: unhealthy,
      optedOutFeeds: optedOut,
      averageScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
      commonIssues,
      lastCrawl: Date.now(),
    }
  }
}

/**
 * SQLite storage adapter using better-sqlite3
 */
export class SQLiteStorage implements StorageAdapter {
  private db: any
  
  constructor(dbPath: string) {
    this.dbPath = dbPath
  }
  
  private dbPath: string
  
  async init(): Promise<void> {
    // Dynamic import for better-sqlite3
    // @ts-ignore - better-sqlite3 is optional
    const Database = (await import('better-sqlite3')).default
    this.db = new Database(this.dbPath)
    
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS feeds (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        domain TEXT NOT NULL,
        discovered_at INTEGER NOT NULL,
        github_owner TEXT,
        github_repo TEXT,
        github_feed_path TEXT,
        contact_email TEXT,
        contact_twitter TEXT,
        contact_website TEXT,
        opted_out INTEGER DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS health_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feed_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        reachable INTEGER NOT NULL,
        http_status INTEGER,
        response_time_ms INTEGER,
        validation_valid INTEGER,
        validation_score INTEGER,
        validation_error_count INTEGER,
        validation_warning_count INTEGER,
        validation_signature_valid INTEGER,
        validation_capabilities_count INTEGER,
        errors_json TEXT,
        issues_json TEXT,
        FOREIGN KEY (feed_id) REFERENCES feeds(id)
      );
      
      CREATE TABLE IF NOT EXISTS outreach_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feed_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        success INTEGER NOT NULL,
        response TEXT,
        message_id TEXT,
        url TEXT,
        FOREIGN KEY (feed_id) REFERENCES feeds(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_health_feed_time ON health_checks(feed_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_outreach_feed_channel ON outreach_history(feed_id, channel, timestamp);
    `)
  }
  
  async saveFeed(feed: FeedSource): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO feeds 
      (id, url, domain, discovered_at, github_owner, github_repo, github_feed_path, 
       contact_email, contact_twitter, contact_website, opted_out)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      feed.id,
      feed.url,
      feed.domain,
      feed.discoveredAt,
      feed.githubRepo?.owner,
      feed.githubRepo?.repo,
      feed.githubRepo?.feedPath,
      feed.contact?.email,
      feed.contact?.twitter,
      feed.contact?.website,
      feed.optedOut ? 1 : 0
    )
  }
  
  async getFeed(id: string): Promise<FeedSource | null> {
    const stmt = this.db.prepare('SELECT * FROM feeds WHERE id = ?')
    const row = stmt.get(id)
    if (!row) return null
    return this.rowToFeed(row)
  }
  
  async getAllFeeds(): Promise<FeedSource[]> {
    const stmt = this.db.prepare('SELECT * FROM feeds')
    const rows = stmt.all()
    return rows.map((row: any) => this.rowToFeed(row))
  }
  
  async deleteFeed(id: string): Promise<void> {
    this.db.prepare('DELETE FROM health_checks WHERE feed_id = ?').run(id)
    this.db.prepare('DELETE FROM outreach_history WHERE feed_id = ?').run(id)
    this.db.prepare('DELETE FROM feeds WHERE id = ?').run(id)
  }
  
  async saveHealthCheck(feedId: string, check: HealthCheck): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO health_checks 
      (feed_id, timestamp, reachable, http_status, response_time_ms,
       validation_valid, validation_score, validation_error_count, 
       validation_warning_count, validation_signature_valid, 
       validation_capabilities_count, errors_json, issues_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      feedId,
      check.timestamp,
      check.reachable ? 1 : 0,
      check.httpStatus,
      check.responseTimeMs,
      check.validation?.valid ? 1 : 0,
      check.validation?.score,
      check.validation?.errorCount,
      check.validation?.warningCount,
      check.validation?.signatureValid ? 1 : (check.validation?.signatureValid === false ? 0 : null),
      check.validation?.capabilitiesCount,
      JSON.stringify(check.errors || []),
      JSON.stringify(check.validation?.issues || [])
    )
  }
  
  async getHealthHistory(feedId: string, limit?: number): Promise<HealthCheck[]> {
    const sql = limit
      ? 'SELECT * FROM health_checks WHERE feed_id = ? ORDER BY timestamp DESC LIMIT ?'
      : 'SELECT * FROM health_checks WHERE feed_id = ? ORDER BY timestamp DESC'
    
    const stmt = this.db.prepare(sql)
    const rows = limit ? stmt.all(feedId, limit) : stmt.all(feedId)
    return rows.map((row: any) => this.rowToHealthCheck(row)).reverse()
  }
  
  async getLatestHealthCheck(feedId: string): Promise<HealthCheck | null> {
    const stmt = this.db.prepare(
      'SELECT * FROM health_checks WHERE feed_id = ? ORDER BY timestamp DESC LIMIT 1'
    )
    const row = stmt.get(feedId)
    if (!row) return null
    return this.rowToHealthCheck(row)
  }
  
  async saveOutreachHistory(history: OutreachHistory): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO outreach_history 
      (feed_id, channel, timestamp, success, response, message_id, url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      history.feedId,
      history.channel,
      history.timestamp,
      history.success ? 1 : 0,
      history.response,
      history.messageId,
      history.url
    )
  }
  
  async getOutreachHistory(feedId: string): Promise<OutreachHistory[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM outreach_history WHERE feed_id = ? ORDER BY timestamp DESC'
    )
    const rows = stmt.all(feedId)
    return rows.map((row: any) => this.rowToOutreachHistory(row))
  }
  
  async getRecentOutreach(feedId: string, channel: string, withinMs: number): Promise<OutreachHistory[]> {
    const since = Date.now() - withinMs
    const stmt = this.db.prepare(
      'SELECT * FROM outreach_history WHERE feed_id = ? AND channel = ? AND timestamp > ?'
    )
    const rows = stmt.all(feedId, channel, since)
    return rows.map((row: any) => this.rowToOutreachHistory(row))
  }
  
  async getStats(): Promise<MonitorStats> {
    const feeds = await this.getAllFeeds()
    let healthy = 0
    let degraded = 0
    let unhealthy = 0
    let optedOut = 0
    let totalScore = 0
    let scoreCount = 0
    const commonIssues: Record<string, number> = {}
    
    for (const feed of feeds) {
      if (feed.optedOut) {
        optedOut++
        continue
      }
      
      const latest = await this.getLatestHealthCheck(feed.id)
      if (!latest) continue
      
      const score = latest.validation?.score ?? 0
      totalScore += score
      scoreCount++
      
      if (score >= 80) healthy++
      else if (score >= 50) degraded++
      else unhealthy++
      
      for (const issue of latest.validation?.issues || []) {
        commonIssues[issue.code] = (commonIssues[issue.code] || 0) + 1
      }
    }
    
    // Get last crawl time
    const lastCrawlRow = this.db.prepare(
      'SELECT MAX(timestamp) as last FROM health_checks'
    ).get()
    
    return {
      totalFeeds: feeds.length,
      healthyFeeds: healthy,
      degradedFeeds: degraded,
      unhealthyFeeds: unhealthy,
      optedOutFeeds: optedOut,
      averageScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
      commonIssues,
      lastCrawl: lastCrawlRow?.last,
    }
  }
  
  private rowToFeed(row: any): FeedSource {
    const feed: FeedSource = {
      id: row.id,
      url: row.url,
      domain: row.domain,
      discoveredAt: row.discovered_at,
      optedOut: row.opted_out === 1,
    }
    
    if (row.github_owner && row.github_repo) {
      feed.githubRepo = {
        owner: row.github_owner,
        repo: row.github_repo,
        feedPath: row.github_feed_path,
      }
    }
    
    if (row.contact_email || row.contact_twitter || row.contact_website) {
      feed.contact = {}
      if (row.contact_email) feed.contact.email = row.contact_email
      if (row.contact_twitter) feed.contact.twitter = row.contact_twitter
      if (row.contact_website) feed.contact.website = row.contact_website
    }
    
    return feed
  }
  
  private rowToHealthCheck(row: any): HealthCheck {
    return {
      timestamp: row.timestamp,
      reachable: row.reachable === 1,
      httpStatus: row.http_status,
      responseTimeMs: row.response_time_ms,
      errors: JSON.parse(row.errors_json || '[]'),
      validation: row.validation_score !== null ? {
        valid: row.validation_valid === 1,
        score: row.validation_score,
        errorCount: row.validation_error_count,
        warningCount: row.validation_warning_count,
        signatureValid: row.validation_signature_valid === null ? undefined : row.validation_signature_valid === 1,
        capabilitiesCount: row.validation_capabilities_count,
        issues: JSON.parse(row.issues_json || '[]'),
      } : undefined,
    }
  }
  
  private rowToOutreachHistory(row: any): OutreachHistory {
    return {
      feedId: row.feed_id,
      channel: row.channel,
      timestamp: row.timestamp,
      success: row.success === 1,
      response: row.response,
      messageId: row.message_id,
      url: row.url,
    }
  }
  
  close(): void {
    if (this.db) {
      this.db.close()
    }
  }
}

/**
 * Create a storage adapter based on environment
 */
export function createStorage(options: {
  type: 'memory' | 'sqlite'
  path?: string
}): StorageAdapter {
  if (options.type === 'sqlite' && options.path) {
    return new SQLiteStorage(options.path)
  }
  return new MemoryStorage()
}

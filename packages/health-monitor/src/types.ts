/**
 * Feed Health Monitor Types
 * 
 * Core type definitions for the health monitoring system
 */

// ============================================
// Feed & Health Status Types
// ============================================

export interface FeedSource {
  /** Unique identifier for this feed */
  id: string
  /** Full URL to the feed */
  url: string
  /** Domain extracted from URL */
  domain: string
  /** When this feed was first discovered */
  discoveredAt: number
  /** Optional: GitHub repo if detected */
  githubRepo?: GitHubRepo
  /** Optional: Contact info extracted from feed metadata */
  contact?: ContactInfo
  /** Whether this feed has opted out of monitoring */
  optedOut: boolean
  /** Opt-out reason if applicable */
  optOutReason?: string
}

export interface GitHubRepo {
  owner: string
  repo: string
  /** Path to the feed file in the repo */
  feedPath?: string
}

export interface ContactInfo {
  /** Email from feed metadata */
  email?: string
  /** Twitter/X handle */
  twitter?: string
  /** Website contact URL */
  website?: string
}

export interface HealthCheck {
  /** Timestamp of this check */
  timestamp: number
  /** Whether the feed was reachable */
  reachable: boolean
  /** HTTP status code */
  httpStatus?: number
  /** Response time in ms */
  responseTimeMs?: number
  /** Validation result */
  validation?: ValidationResult
  /** Any errors encountered */
  errors: string[]
}

export interface ValidationResult {
  /** Overall validity */
  valid: boolean
  /** Security score 0-100 */
  score: number
  /** Number of errors */
  errorCount: number
  /** Number of warnings */
  warningCount: number
  /** Signature verification status */
  signatureValid?: boolean
  /** Detailed validation issues */
  issues: ValidationIssue[]
  /** Capabilities count */
  capabilitiesCount: number
  /** Feed metadata */
  metadata?: FeedMetadata
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info'
  code: string
  message: string
  path?: string
  suggestion?: string
}

export interface FeedMetadata {
  title?: string
  description?: string
  version?: string
  origin?: string
}

export interface FeedHealthStatus {
  /** The feed source */
  feed: FeedSource
  /** Current health status */
  status: 'healthy' | 'degraded' | 'broken' | 'unknown'
  /** Latest health check */
  latestCheck?: HealthCheck
  /** Historical checks (last N) */
  history: HealthCheck[]
  /** Uptime percentage (last 30 days) */
  uptimePercent: number
  /** Current security score */
  currentScore?: number
  /** Score trend: improving, declining, stable */
  scoreTrend: 'improving' | 'declining' | 'stable' | 'unknown'
  /** Days since last successful check */
  daysSinceHealthy?: number
  /** Has been notified about current issues */
  notified: boolean
  /** Last notification timestamp */
  lastNotifiedAt?: number
}

// ============================================
// Notification Types
// ============================================

export type NotificationChannel = 'github' | 'github-issue' | 'email' | 'twitter' | 'webhook'

export interface NotificationConfig {
  /** Channels to use, in priority order */
  channels: NotificationChannel[]
  /** GitHub token for opening issues */
  githubToken?: string
  /** Email configuration */
  email?: EmailConfig
  /** Twitter/X configuration */
  twitter?: TwitterConfig
  /** Webhook URL for custom integrations */
  webhookUrl?: string
  /** Rate limiting: max notifications per domain per day */
  maxPerDomainPerDay: number
  /** Don't notify feeds with score above this threshold */
  scoreThreshold: number
  /** Signature for messages (optional Ed25519 signing) */
  signMessages: boolean
  privateKeyPath?: string
}

export interface EmailConfig {
  from: string
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
}

export interface TwitterConfig {
  apiKey: string
  apiSecret: string
  accessToken: string
  accessSecret: string
  /** Only DM, don't public tweet */
  dmOnly: boolean
  /** Public shame threshold (only tweet if score below this AND >10k followers) */
  publicShameThreshold?: number
}

export interface NotificationResult {
  channel: NotificationChannel
  success: boolean
  messageId?: string
  error?: string
  timestamp: number
}

export interface OutreachMessage {
  /** Target feed */
  feedUrl: string
  /** Message subject/title */
  subject: string
  /** Message body (markdown) */
  body: string
  /** Tone: friendly, urgent, chaotic */
  tone: 'friendly' | 'urgent' | 'chaotic'
  /** Attached reports */
  attachments: ReportAttachment[]
  /** Fix commands/suggestions */
  fixCommands: string[]
  /** One-click fix PR (if GitHub) */
  fixPrUrl?: string
}

export interface ReportAttachment {
  type: 'html' | 'json' | 'text'
  filename: string
  content: string
}

// ============================================
// Crawler/Monitor Types
// ============================================

export interface CrawlerConfig {
  /** Feed sources to monitor */
  sources: FeedSourceConfig[]
  /** Check interval in minutes */
  checkIntervalMinutes: number
  /** Maximum concurrent checks */
  maxConcurrency: number
  /** Request timeout in ms */
  timeoutMs: number
  /** User agent string */
  userAgent: string
  /** Respect robots.txt */
  respectRobotsTxt: boolean
  /** Storage backend */
  storage: StorageConfig
}

export interface FeedSourceConfig {
  /** URL or domain to monitor */
  url: string
  /** Custom check interval (overrides default) */
  checkIntervalMinutes?: number
  /** Tags for grouping/filtering */
  tags?: string[]
}

export interface StorageConfig {
  type: 'memory' | 'file' | 'sqlite' | 'd1' | 'custom'
  /** File path for file/sqlite storage */
  path?: string
  /** D1 database binding name */
  d1Binding?: string
  /** Custom storage adapter */
  adapter?: StorageAdapter
}

export interface StorageAdapter {
  saveFeed(feed: FeedSource): Promise<void>
  getFeed(id: string): Promise<FeedSource | null>
  getAllFeeds(): Promise<FeedSource[]>
  deleteFeed?(id: string): Promise<void>
  saveHealthCheck(feedId: string, check: HealthCheck): Promise<void>
  getHealthHistory(feedId: string, limit?: number): Promise<HealthCheck[]>
  getLatestHealthCheck(feedId: string): Promise<HealthCheck | null>
  saveOutreachHistory(history: OutreachHistory): Promise<void>
  getOutreachHistory(feedId: string): Promise<OutreachHistory[]>
  getRecentOutreach(feedId: string, channel: string, withinMs: number): Promise<OutreachHistory[]>
  getStats(): Promise<MonitorStats>
}

// ============================================
// Report Types
// ============================================

export interface HealthReport {
  /** Report generation timestamp */
  generatedAt: number
  /** Summary statistics */
  summary: ReportSummary
  /** Individual feed statuses */
  feeds: FeedHealthStatus[]
  /** Leaderboards */
  leaderboards: Leaderboards
}

export interface ReportSummary {
  totalFeeds: number
  healthyFeeds: number
  degradedFeeds: number
  brokenFeeds: number
  averageScore: number
  averageUptime: number
}

export interface Leaderboards {
  /** Top improving feeds this week */
  mostImproved: LeaderboardEntry[]
  /** Feeds broken for longest */
  longestBroken: LeaderboardEntry[]
  /** Highest scoring feeds */
  topScores: LeaderboardEntry[]
  /** Lowest scoring feeds (shame list) */
  worstOffenders: LeaderboardEntry[]
}

export interface LeaderboardEntry {
  feedUrl: string
  domain: string
  score: number
  change?: number
  daysBroken?: number
}

// ============================================
// Bot Types
// ============================================

export interface BotConfig {
  /** Crawler configuration */
  crawler: CrawlerConfig
  /** Notification configuration */
  notifications: NotificationConfig
  /** Enable chaos mode features */
  chaosMode: boolean
  /** Leaderboard tweet schedule (cron) */
  leaderboardSchedule?: string
  /** Minimum followers for public shaming */
  publicShameMinFollowers: number
  /** Score threshold for public shaming */
  publicShameScoreThreshold: number
}

export interface BotRunResult {
  /** Timestamp of run */
  timestamp: number
  /** Feeds checked */
  feedsChecked: number
  /** New issues found */
  newIssuesFound: number
  /** Notifications sent */
  notificationsSent: NotificationResult[]
  /** Errors encountered */
  errors: string[]
}

// ============================================
// Additional Monitor Types (used by modules)
// ============================================

/** Outreach action result */
export interface OutreachAction {
  feedId: string
  channel: NotificationChannel
  timestamp: number
  type: 'notification'
  success: boolean
  response?: string
  messageId?: string
  url?: string
}

/** Outreach history record */
export interface OutreachHistory {
  feedId: string
  channel: string
  timestamp: number
  success: boolean
  response?: string
  messageId?: string
  url?: string
}

/** Monitor configuration */
export interface MonitorConfig {
  /** Feeds to monitor */
  feeds?: Array<{ url: string }>
  /** Cron schedule */
  schedule?: string
  /** Respect opt-out signals */
  respectOptOut?: boolean
  /** User agent string */
  userAgent?: string
  /** Request timeout */
  timeoutMs?: number
  /** Minimum score threshold for notifications */
  minScoreThreshold?: number
  /** Rate limiting config */
  rateLimit?: RateLimitConfig
}

/** Rate limiting configuration */
export interface RateLimitConfig {
  /** Max notifications per domain */
  maxPerDomain?: number
  /** Time window in ms */
  windowMs?: number
  /** Delay between requests in ms */
  delayBetweenRequests?: number
}

/** Monitor statistics */
export interface MonitorStats {
  totalFeeds: number
  healthyFeeds: number
  degradedFeeds: number
  unhealthyFeeds: number
  optedOutFeeds: number
  averageScore: number
  commonIssues: Record<string, number>
  lastCrawl?: number
}

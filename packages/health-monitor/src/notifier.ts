/**
 * Notification System
 * 
 * Multi-channel outreach for feed owners:
 * 1. GitHub Issues - Create issues on detected repos
 * 2. Email - Send friendly emails with fix suggestions
 * 3. Twitter/X DMs - For accounts with public DMs
 * 
 * Tone: "Friendly, slightly chaotic, zero ego"
 */

import type {
  NotificationChannel,
  OutreachAction,
  OutreachHistory,
  FeedSource,
  HealthCheck,
  ValidationResult,
  GitHubRepo,
  ContactInfo,
} from './types.js'

export interface NotifierConfig {
  /** GitHub Personal Access Token for creating issues */
  githubToken?: string
  /** Email configuration */
  email?: {
    host: string
    port: number
    user: string
    pass: string
    from: string
  }
  /** Twitter API credentials */
  twitter?: {
    apiKey: string
    apiSecret: string
    accessToken: string
    accessTokenSecret: string
  }
  /** Rate limit: max messages per domain in 24h (default: 1) */
  rateLimit?: number
  /** Dry run mode - don't actually send, just log */
  dryRun?: boolean
}

export interface NotificationPayload {
  feed: FeedSource
  healthCheck: HealthCheck
  channel: NotificationChannel
  reportUrl?: string
  fixPrUrl?: string
}

const MESSAGE_TEMPLATES = {
  github: {
    title: (feed: FeedSource) => 
      `🤖 LLMFeed Health Check: Your feed has some issues`,
    body: (feed: FeedSource, health: HealthCheck, reportUrl?: string) => `
Hey there! 👋

I'm the LLMFeed Health Monitor bot - I crawl the LLMFeed ecosystem to help keep feeds healthy and discoverable.

## What I Found

I checked your feed at \`${feed.url}\` and found a few things:

${formatIssuesForGitHub(health.validation)}

## Why This Matters

LLMFeed files help AI assistants discover and understand what your project can do. A healthy feed means:
- Better discoverability by AI tools
- Cleaner integration with MCP ecosystems  
- More trust with signed feeds

## Quick Fix

${health.validation?.issues?.some(i => i.suggestion) 
  ? `Here are some suggestions:\n${health.validation.issues.filter(i => i.suggestion).map(i => `- ${i.suggestion}`).join('\n')}`
  : 'Check out the [LLMFeed spec](https://llm-feed.org) for the full schema.'}

${reportUrl ? `📊 [View Full Health Report](${reportUrl})` : ''}

## Opt-out

Don't want these check-ins? No worries! Add this to your robots.txt:
\`\`\`
User-agent: LLMFeed-Health-Monitor
Disallow: /
\`\`\`

Or add \`"_meta": { "health-monitor": "noindex" }\` to your feed.

---
🔧 Sent by [LLMFeed Health Monitor](https://github.com/kiarashplusplus/webmcp-tooling-suite) | Score: ${health.validation?.score ?? 'N/A'}/100
`,
  },
  email: {
    subject: (feed: FeedSource) =>
      `🤖 Your LLMFeed has some issues - here's how to fix them`,
    body: (feed: FeedSource, health: HealthCheck, reportUrl?: string) => `
Hey!

I'm the LLMFeed Health Monitor - a friendly bot that helps keep the LLMFeed ecosystem healthy.

I crawled your feed at ${feed.url} and found some issues:

${formatIssuesForEmail(health.validation)}

QUICK FIXES:
${health.validation?.issues?.some(i => i.suggestion)
  ? health.validation.issues.filter(i => i.suggestion).map(i => `• ${i.suggestion}`).join('\n')
  : '• Check out https://llm-feed.org for the full spec'}

${reportUrl ? `View full report: ${reportUrl}` : ''}

---
Don't want these emails? Add "_meta": { "health-monitor": "noindex" } to your feed.

Cheers,
The LLMFeed Bot 🤖
`,
  },
  twitter: {
    dm: (feed: FeedSource, health: HealthCheck) =>
      `Hey! 👋 Your LLMFeed at ${truncate(feed.url, 50)} has ${health.validation?.errorCount || 0} issues. Quick fix: ${health.validation?.issues?.[0]?.suggestion || 'check llm-feed.org'}. Score: ${health.validation?.score ?? '?'}/100`,
  },
}

/**
 * Send notification through specified channel
 */
export async function sendNotification(
  payload: NotificationPayload,
  config: NotifierConfig,
  history: OutreachHistory[]
): Promise<OutreachAction> {
  const { feed, healthCheck, channel } = payload
  const timestamp = Date.now()
  
  // Check rate limit
  const recentOutreach = history.filter(
    h => h.feedId === feed.id && 
        h.channel === channel &&
        h.timestamp > timestamp - 24 * 60 * 60 * 1000
  )
  
  if (recentOutreach.length >= (config.rateLimit || 1)) {
    return {
      feedId: feed.id,
      channel,
      timestamp,
      type: 'notification',
      success: false,
      response: 'Rate limited: already contacted in last 24h',
    }
  }
  
  // Dry run mode
  if (config.dryRun) {
    console.log(`[DRY RUN] Would send ${channel} notification for ${feed.url}`)
    return {
      feedId: feed.id,
      channel,
      timestamp,
      type: 'notification',
      success: true,
      response: 'Dry run - notification not sent',
    }
  }
  
  switch (channel) {
    case 'github':
      return sendGitHubNotification(payload, config)
    case 'email':
      return sendEmailNotification(payload, config)
    case 'twitter':
      return sendTwitterNotification(payload, config)
    default:
      return {
        feedId: feed.id,
        channel,
        timestamp,
        type: 'notification',
        success: false,
        response: `Unknown channel: ${channel}`,
      }
  }
}

/**
 * Create GitHub issue with health report
 */
async function sendGitHubNotification(
  payload: NotificationPayload,
  config: NotifierConfig
): Promise<OutreachAction> {
  const { feed, healthCheck, reportUrl, fixPrUrl } = payload
  const timestamp = Date.now()
  
  if (!config.githubToken) {
    return {
      feedId: feed.id,
      channel: 'github',
      timestamp,
      type: 'notification',
      success: false,
      response: 'No GitHub token configured',
    }
  }
  
  if (!feed.githubRepo) {
    return {
      feedId: feed.id,
      channel: 'github',
      timestamp,
      type: 'notification',
      success: false,
      response: 'No GitHub repo detected for this feed',
    }
  }
  
  const { owner, repo } = feed.githubRepo
  const title = MESSAGE_TEMPLATES.github.title(feed)
  const body = MESSAGE_TEMPLATES.github.body(feed, healthCheck, reportUrl)
  
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'LLMFeed-Health-Monitor',
        },
        body: JSON.stringify({
          title,
          body,
          labels: ['llmfeed', 'bot'],
        }),
      }
    )
    
    if (!response.ok) {
      const error = await response.text()
      return {
        feedId: feed.id,
        channel: 'github',
        timestamp,
        type: 'notification',
        success: false,
        response: `GitHub API error: ${response.status} - ${error}`,
      }
    }
    
    const issue = await response.json() as { html_url: string; number: number }
    return {
      feedId: feed.id,
      channel: 'github',
      timestamp,
      type: 'notification',
      success: true,
      response: `Created issue #${issue.number}`,
      messageId: String(issue.number),
      url: issue.html_url,
    }
  } catch (err) {
    return {
      feedId: feed.id,
      channel: 'github',
      timestamp,
      type: 'notification',
      success: false,
      response: `Failed to create issue: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

/**
 * Send email notification with health report
 */
async function sendEmailNotification(
  payload: NotificationPayload,
  config: NotifierConfig
): Promise<OutreachAction> {
  const { feed, healthCheck, reportUrl } = payload
  const timestamp = Date.now()
  
  if (!config.email) {
    return {
      feedId: feed.id,
      channel: 'email',
      timestamp,
      type: 'notification',
      success: false,
      response: 'No email configuration',
    }
  }
  
  if (!feed.contact?.email) {
    return {
      feedId: feed.id,
      channel: 'email',
      timestamp,
      type: 'notification',
      success: false,
      response: 'No email address found for this feed',
    }
  }
  
  // Use nodemailer if available
  try {
    // @ts-ignore - nodemailer is optional
    const nodemailer = await import('nodemailer') as any
    const transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    })
    
    const subject = MESSAGE_TEMPLATES.email.subject(feed)
    const text = MESSAGE_TEMPLATES.email.body(feed, healthCheck, reportUrl)
    
    const info = await transporter.sendMail({
      from: config.email.from,
      to: feed.contact.email,
      subject,
      text,
    })
    
    return {
      feedId: feed.id,
      channel: 'email',
      timestamp,
      type: 'notification',
      success: true,
      response: `Email sent: ${info.messageId}`,
      messageId: info.messageId,
    }
  } catch (err) {
    return {
      feedId: feed.id,
      channel: 'email',
      timestamp,
      type: 'notification',
      success: false,
      response: `Failed to send email: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

/**
 * Send Twitter DM notification
 */
async function sendTwitterNotification(
  payload: NotificationPayload,
  config: NotifierConfig
): Promise<OutreachAction> {
  const { feed, healthCheck } = payload
  const timestamp = Date.now()
  
  if (!config.twitter) {
    return {
      feedId: feed.id,
      channel: 'twitter',
      timestamp,
      type: 'notification',
      success: false,
      response: 'No Twitter configuration',
    }
  }
  
  if (!feed.contact?.twitter) {
    return {
      feedId: feed.id,
      channel: 'twitter',
      timestamp,
      type: 'notification',
      success: false,
      response: 'No Twitter handle found for this feed',
    }
  }
  
  // Twitter API v2 DM implementation
  // Note: This requires elevated access and the recipient must follow the bot
  const message = MESSAGE_TEMPLATES.twitter.dm(feed, healthCheck)
  
  try {
    // First, look up user ID from handle
    const handle = feed.contact.twitter.replace('@', '')
    const userResponse = await fetch(
      `https://api.twitter.com/2/users/by/username/${handle}`,
      {
        headers: {
          'Authorization': `Bearer ${config.twitter.accessToken}`,
        },
      }
    )
    
    if (!userResponse.ok) {
      return {
        feedId: feed.id,
        channel: 'twitter',
        timestamp,
        type: 'notification',
        success: false,
        response: `Could not find Twitter user: ${handle}`,
      }
    }
    
    const userData = await userResponse.json() as { data: { id: string } }
    const userId = userData.data.id
    
    // Send DM
    const dmResponse = await fetch(
      'https://api.twitter.com/2/dm_conversations/with/' + userId + '/messages',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.twitter.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message,
        }),
      }
    )
    
    if (!dmResponse.ok) {
      const error = await dmResponse.text()
      return {
        feedId: feed.id,
        channel: 'twitter',
        timestamp,
        type: 'notification',
        success: false,
        response: `Twitter DM failed: ${error}`,
      }
    }
    
    const dmData = await dmResponse.json() as { data: { dm_event_id: string } }
    return {
      feedId: feed.id,
      channel: 'twitter',
      timestamp,
      type: 'notification',
      success: true,
      response: `DM sent to @${handle}`,
      messageId: dmData.data.dm_event_id,
    }
  } catch (err) {
    return {
      feedId: feed.id,
      channel: 'twitter',
      timestamp,
      type: 'notification',
      success: false,
      response: `Twitter error: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

// ============================================
// Helper Functions
// ============================================

function formatIssuesForGitHub(validation?: ValidationResult): string {
  if (!validation?.issues?.length) {
    return '✅ No critical issues found, but there might be room for improvement!'
  }
  
  const errors = validation.issues.filter(i => i.type === 'error')
  const warnings = validation.issues.filter(i => i.type === 'warning')
  
  let output = ''
  
  if (errors.length) {
    output += '### ❌ Errors\n\n'
    errors.forEach(e => {
      output += `- **${e.code}**: ${e.message}\n`
    })
    output += '\n'
  }
  
  if (warnings.length) {
    output += '### ⚠️ Warnings\n\n'
    warnings.forEach(w => {
      output += `- **${w.code}**: ${w.message}\n`
    })
    output += '\n'
  }
  
  output += `\n**Score**: ${validation.score}/100 | **Capabilities**: ${validation.capabilitiesCount || 0}`
  
  return output
}

function formatIssuesForEmail(validation?: ValidationResult): string {
  if (!validation?.issues?.length) {
    return '✓ No critical issues found!'
  }
  
  return validation.issues
    .map(i => `${i.type === 'error' ? '✗' : '!'} [${i.code}] ${i.message}`)
    .join('\n')
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

/**
 * Determine the best channel to use for a feed
 */
export function selectBestChannel(feed: FeedSource): NotificationChannel | null {
  // Prefer GitHub issues for GitHub-hosted feeds
  if (feed.githubRepo) return 'github'
  
  // Then email if available
  if (feed.contact?.email) return 'email'
  
  // Then Twitter
  if (feed.contact?.twitter) return 'twitter'
  
  return null
}

/**
 * Check if we should notify about this feed
 */
export function shouldNotify(
  healthCheck: HealthCheck,
  minScore?: number,
  requireErrors?: boolean
): boolean {
  // Don't notify for healthy feeds
  if (healthCheck.validation?.valid && (healthCheck.validation?.score || 0) >= 80) {
    return false
  }
  
  // Check minimum score threshold
  if (minScore !== undefined && (healthCheck.validation?.score || 0) >= minScore) {
    return false
  }
  
  // Check if errors are required
  if (requireErrors && !healthCheck.validation?.errorCount) {
    return false
  }
  
  return true
}

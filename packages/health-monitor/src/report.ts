/**
 * Report Generator
 * 
 * Generate HTML and JSON health reports for feeds
 * with fix suggestions and one-click PR links
 */

import type {
  FeedSource,
  HealthCheck,
  ValidationResult,
  ValidationIssue,
  MonitorStats,
} from './types.js'

export interface ReportOptions {
  /** Include one-click fix PR link */
  includePrLink?: boolean
  /** Base URL for the report hosting */
  baseUrl?: string
  /** Include detailed issue breakdowns */
  detailed?: boolean
}

export interface FeedReport {
  feed: FeedSource
  healthCheck: HealthCheck
  timestamp: number
  html: string
  json: object
  fixPrUrl?: string
}

/**
 * Generate a comprehensive report for a feed
 */
export function generateReport(
  feed: FeedSource,
  healthCheck: HealthCheck,
  options: ReportOptions = {}
): FeedReport {
  const timestamp = Date.now()
  const validation = healthCheck.validation
  
  // Generate fix PR URL if applicable
  let fixPrUrl: string | undefined
  if (options.includePrLink && feed.githubRepo && validation?.issues?.length) {
    fixPrUrl = generateFixPrUrl(feed, validation)
  }
  
  const json = generateJsonReport(feed, healthCheck, timestamp)
  const html = generateHtmlReport(feed, healthCheck, timestamp, options, fixPrUrl)
  
  return {
    feed,
    healthCheck,
    timestamp,
    html,
    json,
    fixPrUrl,
  }
}

/**
 * Generate JSON report data
 */
function generateJsonReport(
  feed: FeedSource,
  healthCheck: HealthCheck,
  timestamp: number
): object {
  return {
    report_version: '1.0',
    generated_at: new Date(timestamp).toISOString(),
    generator: 'LLMFeed Health Monitor',
    generator_url: 'https://github.com/kiarashplusplus/webmcp-tooling-suite',
    feed: {
      url: feed.url,
      domain: feed.domain,
      id: feed.id,
      github_repo: feed.githubRepo ? {
        owner: feed.githubRepo.owner,
        repo: feed.githubRepo.repo,
      } : null,
      contact: feed.contact,
    },
    health: {
      reachable: healthCheck.reachable,
      http_status: healthCheck.httpStatus,
      response_time_ms: healthCheck.responseTimeMs,
      errors: healthCheck.errors,
    },
    validation: healthCheck.validation ? {
      valid: healthCheck.validation.valid,
      score: healthCheck.validation.score,
      error_count: healthCheck.validation.errorCount,
      warning_count: healthCheck.validation.warningCount,
      signature_valid: healthCheck.validation.signatureValid,
      capabilities_count: healthCheck.validation.capabilitiesCount,
      issues: healthCheck.validation.issues,
    } : null,
    summary: {
      status: getOverallStatus(healthCheck),
      score: healthCheck.validation?.score ?? 0,
      action_required: (healthCheck.validation?.errorCount ?? 0) > 0,
    },
  }
}

/**
 * Generate HTML report
 */
function generateHtmlReport(
  feed: FeedSource,
  healthCheck: HealthCheck,
  timestamp: number,
  options: ReportOptions,
  fixPrUrl?: string
): string {
  const validation = healthCheck.validation
  const status = getOverallStatus(healthCheck)
  const statusEmoji = status === 'healthy' ? '✅' : status === 'degraded' ? '⚠️' : '❌'
  const statusColor = status === 'healthy' ? '#10b981' : status === 'degraded' ? '#f59e0b' : '#ef4444'
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LLMFeed Health Report - ${feed.domain}</title>
  <style>
    :root {
      --primary: #6366f1;
      --success: #10b981;
      --warning: #f59e0b;
      --error: #ef4444;
      --bg: #0f172a;
      --card: #1e293b;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --border: #334155;
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem;
    }
    
    .container { max-width: 800px; margin: 0 auto; }
    
    header {
      text-align: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }
    
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    
    .url {
      font-family: monospace;
      font-size: 0.9rem;
      color: var(--text-muted);
      word-break: break-all;
    }
    
    .score-ring {
      width: 120px;
      height: 120px;
      margin: 1.5rem auto;
      position: relative;
    }
    
    .score-ring svg {
      transform: rotate(-90deg);
    }
    
    .score-ring circle {
      fill: none;
      stroke-width: 8;
      stroke-linecap: round;
    }
    
    .score-ring .bg { stroke: var(--border); }
    .score-ring .progress { stroke: ${statusColor}; }
    
    .score-value {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 2rem;
      font-weight: bold;
    }
    
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      background: ${statusColor}20;
      color: ${statusColor};
      font-weight: 500;
    }
    
    .card {
      background: var(--card);
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    
    .card h2 {
      font-size: 1rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }
    
    .metric {
      text-align: center;
      padding: 1rem;
      background: var(--bg);
      border-radius: 0.5rem;
    }
    
    .metric-value {
      font-size: 1.5rem;
      font-weight: bold;
    }
    
    .metric-label {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    
    .issue {
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 0.75rem;
    }
    
    .issue-error {
      background: var(--error)15;
      border-left: 3px solid var(--error);
    }
    
    .issue-warning {
      background: var(--warning)15;
      border-left: 3px solid var(--warning);
    }
    
    .issue-code {
      font-family: monospace;
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    
    .issue-message {
      margin: 0.5rem 0;
    }
    
    .issue-suggestion {
      font-size: 0.9rem;
      color: var(--success);
    }
    
    .fix-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: var(--primary);
      color: white;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 500;
      margin-top: 1rem;
    }
    
    .fix-btn:hover { opacity: 0.9; }
    
    footer {
      text-align: center;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 0.8rem;
    }
    
    footer a { color: var(--primary); }
    
    code {
      background: var(--bg);
      padding: 0.2rem 0.4rem;
      border-radius: 0.25rem;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🔍 LLMFeed Health Report</h1>
      <div class="url">${escapeHtml(feed.url)}</div>
      
      <div class="score-ring">
        <svg width="120" height="120">
          <circle class="bg" cx="60" cy="60" r="52" />
          <circle class="progress" cx="60" cy="60" r="52" 
            stroke-dasharray="${(validation?.score ?? 0) * 3.27} 327"
          />
        </svg>
        <div class="score-value">${validation?.score ?? 0}</div>
      </div>
      
      <div class="status-badge">
        ${statusEmoji} ${status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    </header>
    
    <div class="card">
      <h2>📊 Metrics</h2>
      <div class="metrics">
        <div class="metric">
          <div class="metric-value">${healthCheck.reachable ? '✓' : '✗'}</div>
          <div class="metric-label">Reachable</div>
        </div>
        <div class="metric">
          <div class="metric-value">${healthCheck.httpStatus || 'N/A'}</div>
          <div class="metric-label">HTTP Status</div>
        </div>
        <div class="metric">
          <div class="metric-value">${healthCheck.responseTimeMs || 'N/A'}ms</div>
          <div class="metric-label">Response Time</div>
        </div>
        <div class="metric">
          <div class="metric-value">${validation?.capabilitiesCount ?? 0}</div>
          <div class="metric-label">Capabilities</div>
        </div>
      </div>
    </div>
    
    ${validation?.issues?.length ? `
    <div class="card">
      <h2>🔧 Issues Found</h2>
      ${validation.issues.map(issue => `
        <div class="issue issue-${issue.type}">
          <div class="issue-code">${escapeHtml(issue.code)}</div>
          <div class="issue-message">${escapeHtml(issue.message)}</div>
          ${issue.suggestion ? `<div class="issue-suggestion">💡 ${escapeHtml(issue.suggestion)}</div>` : ''}
        </div>
      `).join('')}
      
      ${fixPrUrl ? `
        <a href="${escapeHtml(fixPrUrl)}" class="fix-btn" target="_blank">
          🔧 Create Fix PR
        </a>
      ` : ''}
    </div>
    ` : `
    <div class="card">
      <h2>✅ All Clear!</h2>
      <p>No issues found. Your feed is looking great!</p>
    </div>
    `}
    
    ${healthCheck.errors?.length ? `
    <div class="card">
      <h2>❌ Errors</h2>
      ${healthCheck.errors.map(err => `
        <div class="issue issue-error">
          <div class="issue-message">${escapeHtml(err)}</div>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    ${validation?.signatureValid !== undefined ? `
    <div class="card">
      <h2>🔐 Signature</h2>
      <p>
        ${validation.signatureValid 
          ? '✅ Feed signature is valid and verified' 
          : '⚠️ Feed signature could not be verified'}
      </p>
    </div>
    ` : ''}
    
    <footer>
      Generated on ${new Date(timestamp).toISOString()}<br>
      <a href="https://github.com/kiarashplusplus/webmcp-tooling-suite">LLMFeed Health Monitor</a>
    </footer>
  </div>
</body>
</html>`
}

/**
 * Generate a one-click PR URL for GitHub
 * Uses the GitHub web editor to create a fix
 */
function generateFixPrUrl(feed: FeedSource, validation: ValidationResult): string {
  if (!feed.githubRepo) return ''
  
  const { owner, repo, feedPath } = feed.githubRepo
  const suggestions = validation.issues
    ?.filter(i => i.suggestion)
    .map(i => `- ${i.suggestion}`)
    .join('\n') || 'Fix LLMFeed validation issues'
  
  // Generate a URL that opens the file in GitHub's web editor
  // Remove leading slash from feedPath if present
  const path = (feedPath?.replace(/^\//, '') || '.well-known/mcp.llmfeed.json')
  const title = encodeURIComponent('Fix LLMFeed validation issues')
  const body = encodeURIComponent(`This PR addresses LLMFeed validation issues found by the Health Monitor:\n\n${suggestions}`)
  
  // Use GitHub's file edit interface
  return `https://github.com/${owner}/${repo}/edit/main/${path}?pr=1&title=${title}&body=${body}`
}

/**
 * Determine overall health status
 */
function getOverallStatus(healthCheck: HealthCheck): 'healthy' | 'degraded' | 'unhealthy' {
  if (!healthCheck.reachable) return 'unhealthy'
  
  const validation = healthCheck.validation
  if (!validation) return 'degraded'
  
  if (validation.errorCount && validation.errorCount > 0) return 'unhealthy'
  if (validation.score && validation.score >= 80) return 'healthy'
  if (validation.score && validation.score >= 50) return 'degraded'
  
  return 'unhealthy'
}

/**
 * Generate aggregate stats report for multiple feeds
 */
export function generateStatsReport(stats: MonitorStats): object {
  return {
    report_version: '1.0',
    generated_at: new Date().toISOString(),
    generator: 'LLMFeed Health Monitor',
    overview: {
      total_feeds: stats.totalFeeds,
      healthy_feeds: stats.healthyFeeds,
      degraded_feeds: stats.degradedFeeds,
      unhealthy_feeds: stats.unhealthyFeeds,
      opted_out_feeds: stats.optedOutFeeds,
      average_score: stats.averageScore,
      last_crawl: stats.lastCrawl ? new Date(stats.lastCrawl).toISOString() : null,
    },
    issues_summary: {
      common_errors: Object.entries(stats.commonIssues)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
    },
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

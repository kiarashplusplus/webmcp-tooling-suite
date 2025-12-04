/**
 * Badge Generator for WebMCP/LLMFeed
 * Generates SVG badges for embedding on sites
 */

export type BadgeType = 'verified' | 'signed' | 'curated' | 'llmfeed'

export interface BadgeConfig {
  type: BadgeType
  domain?: string
  score?: number
}

const BADGE_COLORS: Record<BadgeType, { bg: string; text: string; icon: string }> = {
  verified: { bg: '#22c55e', text: '#ffffff', icon: '✓' },
  signed: { bg: '#8b5cf6', text: '#ffffff', icon: '🔐' },
  curated: { bg: '#f59e0b', text: '#ffffff', icon: '⭐' },
  llmfeed: { bg: '#3b82f6', text: '#ffffff', icon: '🤖' }
}

const BADGE_LABELS: Record<BadgeType, string> = {
  verified: 'WebMCP Verified',
  signed: 'Ed25519 Signed',
  curated: 'Curated Feed',
  llmfeed: 'LLMFeed Enabled'
}

/**
 * Generate an SVG badge
 */
export function generateBadgeSVG(config: BadgeConfig): string {
  const { type, score } = config
  const colors = BADGE_COLORS[type]
  const label = BADGE_LABELS[type]
  
  const scoreText = score !== undefined ? ` ${score}/100` : ''
  const fullLabel = `${label}${scoreText}`
  
  // Calculate width based on text length (approximate)
  const labelWidth = fullLabel.length * 7 + 20
  const iconWidth = 24
  const totalWidth = labelWidth + iconWidth + 10
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${fullLabel}">
  <title>${fullLabel}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${iconWidth}" height="20" fill="#555"/>
    <rect x="${iconWidth}" width="${totalWidth - iconWidth}" height="20" fill="${colors.bg}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${iconWidth / 2}" y="14">${colors.icon}</text>
    <text x="${iconWidth + (totalWidth - iconWidth) / 2}" y="14">${fullLabel}</text>
  </g>
</svg>`
}

/**
 * Generate badge as a data URL for embedding
 */
export function generateBadgeDataURL(config: BadgeConfig): string {
  const svg = generateBadgeSVG(config)
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * Generate markdown embed code
 */
export function generateMarkdownEmbed(config: BadgeConfig & { feedUrl: string }): string {
  const { feedUrl, type } = config
  const label = BADGE_LABELS[type]
  const badgeUrl = `https://wellknownmcp.org/api/badge/${type}?url=${encodeURIComponent(feedUrl)}`
  
  return `[![${label}](${badgeUrl})](${feedUrl})`
}

/**
 * Generate HTML embed code
 */
export function generateHTMLEmbed(config: BadgeConfig & { feedUrl: string }): string {
  const { feedUrl, type } = config
  const label = BADGE_LABELS[type]
  const badgeUrl = `https://wellknownmcp.org/api/badge/${type}?url=${encodeURIComponent(feedUrl)}`
  
  return `<a href="${feedUrl}" target="_blank" rel="noopener">
  <img src="${badgeUrl}" alt="${label}" />
</a>`
}

/**
 * Generate all badge variants for a feed
 */
export function generateAllBadges(feedUrl: string, options: {
  isVerified?: boolean
  isSigned?: boolean
  isCurated?: boolean
  score?: number
}): {
  type: BadgeType
  svg: string
  dataUrl: string
  markdown: string
  html: string
}[] {
  const badges: {
    type: BadgeType
    svg: string
    dataUrl: string
    markdown: string
    html: string
  }[] = []
  
  if (options.isVerified) {
    const config: BadgeConfig = { type: 'verified', score: options.score }
    badges.push({
      type: 'verified',
      svg: generateBadgeSVG(config),
      dataUrl: generateBadgeDataURL(config),
      markdown: generateMarkdownEmbed({ ...config, feedUrl }),
      html: generateHTMLEmbed({ ...config, feedUrl })
    })
  }
  
  if (options.isSigned) {
    const config: BadgeConfig = { type: 'signed' }
    badges.push({
      type: 'signed',
      svg: generateBadgeSVG(config),
      dataUrl: generateBadgeDataURL(config),
      markdown: generateMarkdownEmbed({ ...config, feedUrl }),
      html: generateHTMLEmbed({ ...config, feedUrl })
    })
  }
  
  if (options.isCurated) {
    const config: BadgeConfig = { type: 'curated' }
    badges.push({
      type: 'curated',
      svg: generateBadgeSVG(config),
      dataUrl: generateBadgeDataURL(config),
      markdown: generateMarkdownEmbed({ ...config, feedUrl }),
      html: generateHTMLEmbed({ ...config, feedUrl })
    })
  }
  
  // Always include LLMFeed badge
  const llmfeedConfig: BadgeConfig = { type: 'llmfeed' }
  badges.push({
    type: 'llmfeed',
    svg: generateBadgeSVG(llmfeedConfig),
    dataUrl: generateBadgeDataURL(llmfeedConfig),
    markdown: generateMarkdownEmbed({ ...llmfeedConfig, feedUrl }),
    html: generateHTMLEmbed({ ...llmfeedConfig, feedUrl })
  })
  
  return badges
}

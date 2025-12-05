/**
 * LLMS.txt Parser Library
 * 
 * Parses and validates llms.txt files per the llmstxt.org specification.
 * The llms.txt format is a markdown-based file that helps LLMs understand
 * website content structure.
 * 
 * Specification: https://llmstxt.org
 */

// ============================================================================
// Types
// ============================================================================

export interface LLMSTxtDocument {
    /** H1 title (required) */
    title: string
    /** Optional summary/description from blockquote */
    summary?: string
    /** Organized sections with headings */
    sections: LLMSTxtSection[]
    /** All discovered links */
    links: LLMSTxtLink[]
    /** Original raw markdown */
    raw: string
    /** Source URL if fetched */
    sourceUrl?: string
    /** Whether this is llms-full.txt (complete docs) */
    isFull?: boolean
}

export interface LLMSTxtSection {
    /** Section H2/H3 heading */
    heading: string
    /** Section heading level (2 or 3) */
    level: number
    /** Optional section description text */
    content?: string
    /** Links within this section */
    links: LLMSTxtLink[]
}

export interface LLMSTxtLink {
    /** Link display text */
    title: string
    /** Link URL */
    url: string
    /** Optional parenthetical description */
    description?: string
    /** Parent section heading */
    section?: string
    /** Whether link is optional (marked with "Optional" or similar) */
    optional?: boolean
}

export interface LLMSTxtValidationResult {
    valid: boolean
    score: number
    errors: LLMSTxtValidationError[]
    warnings: LLMSTxtValidationWarning[]
}

export interface LLMSTxtValidationError {
    type: 'structure' | 'format' | 'content'
    field?: string
    message: string
    line?: number
}

export interface LLMSTxtValidationWarning {
    type: string
    message: string
    field?: string
    line?: number
}

// ============================================================================
// Parser
// ============================================================================

/**
 * Parse an llms.txt markdown string into structured data
 */
export function parseLLMSTxt(markdown: string): LLMSTxtDocument {
    const lines = markdown.split('\n')
    const document: LLMSTxtDocument = {
        title: '',
        sections: [],
        links: [],
        raw: markdown,
    }

    let currentSection: LLMSTxtSection | null = null
    let inBlockquote = false
    let blockquoteLines: string[] = []
    let foundTitle = false

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmedLine = line.trim()

        // Skip empty lines
        if (!trimmedLine) {
            if (inBlockquote) {
                inBlockquote = false
                document.summary = blockquoteLines.join(' ').trim()
                blockquoteLines = []
            }
            continue
        }

        // H1 Title (required, should be first heading)
        if (trimmedLine.startsWith('# ') && !foundTitle) {
            document.title = trimmedLine.slice(2).trim()
            foundTitle = true
            continue
        }

        // Blockquote (summary/description) - usually right after title
        if (trimmedLine.startsWith('>')) {
            inBlockquote = true
            blockquoteLines.push(trimmedLine.slice(1).trim())
            continue
        } else if (inBlockquote) {
            inBlockquote = false
            document.summary = blockquoteLines.join(' ').trim()
            blockquoteLines = []
        }

        // H2 Section heading
        if (trimmedLine.startsWith('## ')) {
            if (currentSection) {
                document.sections.push(currentSection)
            }
            currentSection = {
                heading: trimmedLine.slice(3).trim(),
                level: 2,
                links: [],
            }
            continue
        }

        // H3 Subsection heading
        if (trimmedLine.startsWith('### ')) {
            if (currentSection) {
                document.sections.push(currentSection)
            }
            currentSection = {
                heading: trimmedLine.slice(4).trim(),
                level: 3,
                links: [],
            }
            continue
        }

        // Parse links in format: - [Title](url): Description
        // or: - [Title](url) (Description)
        const linkMatch = trimmedLine.match(/^[-*]\s*\[([^\]]+)\]\(([^)]+)\)(?:\s*[:\-]?\s*(.*))?$/)
        if (linkMatch) {
            const [, title, url, description] = linkMatch
            const link: LLMSTxtLink = {
                title: title.trim(),
                url: url.trim(),
                description: description?.trim() || undefined,
                section: currentSection?.heading,
                optional: description?.toLowerCase().includes('optional') || false,
            }

            document.links.push(link)
            if (currentSection) {
                currentSection.links.push(link)
            }
            continue
        }

        // Plain text in a section (section description)
        if (currentSection && !trimmedLine.startsWith('-') && !trimmedLine.startsWith('*')) {
            if (currentSection.content) {
                currentSection.content += ' ' + trimmedLine
            } else {
                currentSection.content = trimmedLine
            }
        }
    }

    // Push final section
    if (currentSection) {
        document.sections.push(currentSection)
    }

    // Handle any remaining blockquote
    if (inBlockquote && blockquoteLines.length > 0) {
        document.summary = blockquoteLines.join(' ').trim()
    }

    return document
}

// ============================================================================
// Validator
// ============================================================================

/**
 * Validate an llms.txt document per the specification
 */
export function validateLLMSTxt(doc: LLMSTxtDocument): LLMSTxtValidationResult {
    const errors: LLMSTxtValidationError[] = []
    const warnings: LLMSTxtValidationWarning[] = []

    // Required: H1 title
    if (!doc.title) {
        errors.push({
            type: 'structure',
            field: 'title',
            message: 'Missing required H1 title. The file must start with a # Title.',
        })
    }

    // Recommended: Summary/description
    if (!doc.summary) {
        warnings.push({
            type: 'recommendation',
            field: 'summary',
            message: 'Missing summary blockquote. Consider adding a > description after the title.',
        })
    }

    // Recommended: At least one section
    if (doc.sections.length === 0) {
        warnings.push({
            type: 'recommendation',
            field: 'sections',
            message: 'No sections found. Consider organizing content with ## headings.',
        })
    }

    // Recommended: Links should have descriptions
    const linksWithoutDescription = doc.links.filter(l => !l.description)
    if (linksWithoutDescription.length > 0) {
        warnings.push({
            type: 'recommendation',
            field: 'links',
            message: `${linksWithoutDescription.length} link(s) missing descriptions. Consider adding context for each link.`,
        })
    }

    // Validate link URLs
    for (const link of doc.links) {
        try {
            new URL(link.url)
        } catch {
            // Try as relative URL
            if (!link.url.startsWith('/') && !link.url.startsWith('#')) {
                errors.push({
                    type: 'format',
                    field: `link[${link.title}]`,
                    message: `Invalid URL: "${link.url}" - must be absolute URL or start with /`,
                })
            }
        }
    }

    // Check for duplicate links
    const urlSet = new Set<string>()
    for (const link of doc.links) {
        if (urlSet.has(link.url)) {
            warnings.push({
                type: 'duplicate',
                field: `link[${link.url}]`,
                message: `Duplicate link URL: ${link.url}`,
            })
        }
        urlSet.add(link.url)
    }

    // Calculate score
    let score = 100
    score -= errors.length * 20
    score -= warnings.length * 5
    score = Math.max(0, Math.min(100, score))

    return {
        valid: errors.length === 0,
        score,
        errors,
        warnings,
    }
}

// ============================================================================
// Fetcher
// ============================================================================

/**
 * Well-known paths to check for llms.txt files
 */
const LLMS_TXT_PATHS = [
    '/llms.txt',
    '/llms-full.txt',
    '/.well-known/llms.txt',
]

/**
 * Fetch and parse llms.txt from a URL or domain
 */
export async function fetchLLMSTxt(
    urlOrDomain: string,
    options: {
        timeout?: number
        checkFull?: boolean
    } = {}
): Promise<LLMSTxtDocument> {
    const { timeout = 10000, checkFull = true } = options

    let targetUrl: URL

    // Parse input as URL or domain
    if (urlOrDomain.includes('://')) {
        targetUrl = new URL(urlOrDomain)
    } else {
        // Treat as domain
        const domain = urlOrDomain.replace(/^(https?:\/\/)?/, '').split('/')[0]
        targetUrl = new URL(`https://${domain}`)
    }

    // If URL already points to a .txt file, fetch directly
    if (urlOrDomain.endsWith('.txt')) {
        const response = await fetchWithTimeout(urlOrDomain, timeout)
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const markdown = await response.text()
        const doc = parseLLMSTxt(markdown)
        doc.sourceUrl = urlOrDomain
        doc.isFull = urlOrDomain.includes('full')
        return doc
    }

    // Try well-known paths
    const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`
    const errors: string[] = []

    for (const path of LLMS_TXT_PATHS) {
        const url = `${baseUrl}${path}`
        try {
            const response = await fetchWithTimeout(url, timeout)
            if (response.ok) {
                const markdown = await response.text()
                // Quick validation: check if it looks like markdown
                if (markdown.includes('#') || markdown.includes('[')) {
                    const doc = parseLLMSTxt(markdown)
                    doc.sourceUrl = url
                    doc.isFull = path.includes('full')
                    return doc
                }
            }
        } catch (err) {
            errors.push(`${path}: ${err}`)
        }
    }

    throw new Error(`No llms.txt file found. Tried:\n${errors.join('\n')}`)
}

/**
 * Discover all llms.txt files for a domain
 */
export async function discoverLLMSTxtFiles(
    domain: string,
    options: { timeout?: number } = {}
): Promise<{ url: string; type: 'standard' | 'full' }[]> {
    const { timeout = 10000 } = options
    const results: { url: string; type: 'standard' | 'full' }[] = []

    const cleanDomain = domain.replace(/^(https?:\/\/)?/, '').split('/')[0]
    const baseUrl = `https://${cleanDomain}`

    for (const path of LLMS_TXT_PATHS) {
        const url = `${baseUrl}${path}`
        try {
            const response = await fetchWithTimeout(url, timeout)
            if (response.ok) {
                const text = await response.text()
                // Minimal validation
                if (text.includes('#')) {
                    results.push({
                        url,
                        type: path.includes('full') ? 'full' : 'standard',
                    })
                }
            }
        } catch {
            // Ignore errors for discovery
        }
    }

    return results
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get the CORS proxy URL from environment variables or use default deployed worker.
 */
function getCorsProxyUrl(): string {
    // Vite exposes env vars via import.meta.env
    const proxyUrl = (import.meta as any).env?.VITE_CORS_PROXY_URL
    // Fallback to deployed Cloudflare worker
    return proxyUrl || 'https://llmfeed-cors-proxy.the-safe.workers.dev'
}


/**
 * Check if a URL is same-origin or localhost (no proxy needed)
 */
function isSameOriginOrLocal(url: string): boolean {
    try {
        const parsed = new URL(url)
        const current = typeof window !== 'undefined' ? window.location : null

        // Localhost always works without proxy
        if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
            return true
        }

        // Same origin
        if (current && parsed.origin === current.origin) {
            return true
        }

        return false
    } catch {
        return false
    }
}

async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
        const corsProxyUrl = getCorsProxyUrl()
        const needsProxy = typeof window !== 'undefined' && !isSameOriginOrLocal(url)

        let fetchUrl = url
        if (needsProxy && corsProxyUrl) {
            fetchUrl = `${corsProxyUrl}?url=${encodeURIComponent(url)}`
        }

        const response = await fetch(fetchUrl, {
            signal: controller.signal,
            headers: {
                'Accept': 'text/plain, text/markdown, */*',
            },
        })
        return response
    } finally {
        clearTimeout(timeoutId)
    }
}


/**
 * Estimate token count for the document (rough approximation)
 */
export function estimateTokens(doc: LLMSTxtDocument): {
    total: number
    bySection: { section: string; tokens: number }[]
} {
    const tokensPerChar = 0.25 // Rough approximation

    let total = Math.ceil(doc.raw.length * tokensPerChar)

    const bySection = doc.sections.map(section => ({
        section: section.heading,
        tokens: Math.ceil(
            ((section.content?.length || 0) +
                section.links.reduce((sum, l) => sum + l.title.length + (l.description?.length || 0), 0)
            ) * tokensPerChar
        ),
    }))

    return { total, bySection }
}

/**
 * Convert llms.txt document to a simple text format optimized for RAG
 */
export function toRAGFormat(doc: LLMSTxtDocument): string {
    const lines: string[] = []

    lines.push(`# ${doc.title}`)
    if (doc.summary) {
        lines.push(`${doc.summary}`)
    }
    lines.push('')

    for (const section of doc.sections) {
        lines.push(`## ${section.heading}`)
        if (section.content) {
            lines.push(section.content)
        }
        for (const link of section.links) {
            lines.push(`- ${link.title}: ${link.url}${link.description ? ` - ${link.description}` : ''}`)
        }
        lines.push('')
    }

    return lines.join('\n')
}

/**
 * Extract structured link data for embedding/indexing
 */
export function extractLinksForIndex(doc: LLMSTxtDocument): {
    id: string
    title: string
    url: string
    description: string
    section: string
    embedContent: string
}[] {
    return doc.links.map((link, idx) => ({
        id: `${doc.sourceUrl || 'local'}-link-${idx}`,
        title: link.title,
        url: link.url,
        description: link.description || '',
        section: link.section || '',
        embedContent: `${link.title}${link.description ? `: ${link.description}` : ''} (${link.section || 'General'})`,
    }))
}

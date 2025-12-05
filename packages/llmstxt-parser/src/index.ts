/**
 * @25xcodes/llmstxt-parser - LLMS.txt Parser and Validator
 *
 * A high-quality TypeScript library for parsing and validating llms.txt files
 * per the llmstxt.org specification.
 *
 * @see https://llmstxt.org
 * @packageDocumentation
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * A link extracted from an llms.txt file.
 *
 * Links follow the format: `- [Title](url): Description`
 * or `- [Title](url) (Description)`
 */
export interface LLMSTxtLink {
    /** Link display text */
    title: string
    /** Link URL (absolute or relative) */
    url: string
    /** Optional description text after the link */
    description?: string
    /** Parent section heading if within a section */
    section?: string
    /** Whether link is marked as optional */
    optional?: boolean
}

/**
 * A section within an llms.txt document.
 *
 * Sections are defined by H2 (`##`) or H3 (`###`) headings.
 */
export interface LLMSTxtSection {
    /** Section heading text (without the `##` or `###` prefix) */
    heading: string
    /** Heading level: 2 for `##`, 3 for `###` */
    level: 2 | 3
    /** Optional descriptive text within the section */
    content?: string
    /** Links contained within this section */
    links: LLMSTxtLink[]
}

/**
 * A parsed llms.txt document.
 *
 * The document structure follows the llmstxt.org specification:
 * - Required: H1 title
 * - Optional: Blockquote summary after title
 * - Optional: H2/H3 sections with links
 */
export interface LLMSTxtDocument {
    /** H1 title (required per spec) */
    title: string
    /** Optional summary from blockquote after title */
    summary?: string
    /** Organized sections with headings and links */
    sections: LLMSTxtSection[]
    /** All links in the document (flattened from sections) */
    links: LLMSTxtLink[]
    /** Original raw markdown content */
    raw: string
    /** Source URL if fetched remotely */
    sourceUrl?: string
    /** Whether this is llms-full.txt (complete documentation) */
    isFull?: boolean
}

/**
 * A validation error indicating the document violates the spec.
 */
export interface LLMSTxtValidationError {
    /** Error category */
    type: 'structure' | 'format' | 'content'
    /** Field or element that caused the error */
    field?: string
    /** Human-readable error message */
    message: string
    /** Line number where the error was detected (1-indexed) */
    line?: number
}

/**
 * A validation warning for recommended but not required improvements.
 */
export interface LLMSTxtValidationWarning {
    /** Warning category */
    type: 'recommendation' | 'duplicate' | 'accessibility'
    /** Human-readable warning message */
    message: string
    /** Field or element that triggered the warning */
    field?: string
    /** Line number where the warning was detected (1-indexed) */
    line?: number
}

/**
 * Result of validating an llms.txt document.
 */
export interface LLMSTxtValidationResult {
    /** Whether the document is valid (no errors) */
    valid: boolean
    /** Quality score from 0-100 */
    score: number
    /** Validation errors (spec violations) */
    errors: LLMSTxtValidationError[]
    /** Validation warnings (recommendations) */
    warnings: LLMSTxtValidationWarning[]
}

/**
 * Token estimation result for an llms.txt document.
 */
export interface TokenEstimate {
    /** Total estimated tokens for the entire document */
    total: number
    /** Token breakdown by section */
    bySection: Array<{
        section: string
        tokens: number
    }>
}

/**
 * Options for fetching llms.txt files.
 */
export interface FetchOptions {
    /** Request timeout in milliseconds (default: 10000) */
    timeout?: number
    /** Whether to also check for llms-full.txt (default: true) */
    checkFull?: boolean
    /** Optional CORS proxy URL for browser environments */
    corsProxy?: string
    /** Custom fetch function (default: globalThis.fetch) */
    fetch?: typeof globalThis.fetch
}

/**
 * Discovered llms.txt file.
 */
export interface DiscoveredFile {
    /** Full URL to the file */
    url: string
    /** Type: 'standard' for llms.txt, 'full' for llms-full.txt */
    type: 'standard' | 'full'
}

/**
 * Structured link data optimized for RAG/embedding systems.
 */
export interface RAGLinkEntry {
    /** Unique identifier for the link */
    id: string
    /** Link title */
    title: string
    /** Link URL */
    url: string
    /** Link description */
    description: string
    /** Parent section name */
    section: string
    /** Pre-formatted content for embedding */
    embedContent: string
}

// ============================================================================
// Well-Known Paths
// ============================================================================

/**
 * Standard paths to check for llms.txt files per the specification.
 */
export const LLMSTXT_PATHS = [
    '/llms.txt',
    '/llms-full.txt',
    '/.well-known/llms.txt',
] as const

// ============================================================================
// Parser
// ============================================================================

/**
 * Parse an llms.txt markdown string into a structured document.
 *
 * @param markdown - Raw markdown content of the llms.txt file
 * @returns Parsed document structure
 *
 * @example
 * ```typescript
 * import { parseLLMSTxt } from '@25xcodes/llmstxt-parser'
 *
 * const doc = parseLLMSTxt(`
 * # My Project
 *
 * > A brief description of the project.
 *
 * ## Documentation
 * - [Getting Started](https://example.com/docs/start): Quick start guide
 * - [API Reference](https://example.com/docs/api): Full API docs
 * `)
 *
 * console.log(doc.title)    // "My Project"
 * console.log(doc.summary)  // "A brief description of the project."
 * console.log(doc.links)    // [{ title: "Getting Started", ... }, ...]
 * ```
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

        // Skip empty lines (but handle blockquote termination)
        if (!trimmedLine) {
            if (inBlockquote && blockquoteLines.length > 0) {
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
        // or: * [Title](url) - Description
        const linkMatch = trimmedLine.match(
            /^[-*]\s*\[([^\]]+)\]\(([^)]+)\)(?:\s*[:\-]?\s*(.*))?$/
        )
        if (linkMatch) {
            const [, title, url, description] = linkMatch
            const link: LLMSTxtLink = {
                title: title.trim(),
                url: url.trim(),
                description: description?.trim() || undefined,
                section: currentSection?.heading,
                optional: description ? description.toLowerCase().includes('optional') : false,
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
 * Validate an llms.txt document per the llmstxt.org specification.
 *
 * @param doc - Parsed llms.txt document to validate
 * @returns Validation result with errors, warnings, and score
 *
 * @example
 * ```typescript
 * import { parseLLMSTxt, validateLLMSTxt } from '@25xcodes/llmstxt-parser'
 *
 * const doc = parseLLMSTxt(markdown)
 * const result = validateLLMSTxt(doc)
 *
 * if (result.valid) {
 *   console.log('Document is valid! Score:', result.score)
 * } else {
 *   console.log('Errors:', result.errors)
 * }
 * ```
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
        // Check if URL is valid (absolute, relative, or anchor)
        if (!isValidUrl(link.url)) {
            errors.push({
                type: 'format',
                field: `link[${link.title}]`,
                message: `Invalid URL: "${link.url}" - must be absolute URL, relative path starting with /, or anchor starting with #`,
            })
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

    // Calculate score (100 base, minus penalties)
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

/**
 * Check if a URL is valid (absolute, relative, or anchor).
 */
function isValidUrl(url: string): boolean {
    // Anchor links
    if (url.startsWith('#')) {
        return true
    }

    // Relative URLs
    if (url.startsWith('/')) {
        return true
    }

    // Absolute URLs
    try {
        new URL(url)
        return true
    } catch {
        return false
    }
}

// ============================================================================
// Fetcher
// ============================================================================

/**
 * Fetch and parse llms.txt from a URL or domain.
 *
 * Tries well-known paths in order:
 * 1. /llms.txt
 * 2. /llms-full.txt
 * 3. /.well-known/llms.txt
 *
 * @param urlOrDomain - Full URL to llms.txt file, or domain name to discover
 * @param options - Fetch options including timeout and CORS proxy
 * @returns Parsed llms.txt document
 *
 * @example
 * ```typescript
 * import { fetchLLMSTxt } from '@25xcodes/llmstxt-parser'
 *
 * // Fetch from a specific URL
 * const doc = await fetchLLMSTxt('https://example.com/llms.txt')
 *
 * // Or discover from a domain
 * const doc = await fetchLLMSTxt('example.com')
 *
 * // With CORS proxy for browser environments
 * const doc = await fetchLLMSTxt('example.com', {
 *   corsProxy: 'https://my-proxy.workers.dev'
 * })
 * ```
 */
export async function fetchLLMSTxt(
    urlOrDomain: string,
    options: FetchOptions = {}
): Promise<LLMSTxtDocument> {
    const {
        timeout = 10000,
        checkFull = true,
        corsProxy,
        fetch: customFetch = globalThis.fetch,
    } = options

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
        const response = await fetchWithTimeout(urlOrDomain, timeout, corsProxy, customFetch)
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const markdown = await response.text()
        try {
            const doc = parseLLMSTxt(markdown)
            doc.sourceUrl = urlOrDomain
            doc.isFull = urlOrDomain.includes('full')
            return doc
        } catch (parseError) {
            throw new Error(`Failed to parse llms.txt: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
        }
    }

    // Try well-known paths
    const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`
    const errors: string[] = []

    // Determine which paths to try
    const pathsToTry = checkFull
        ? LLMSTXT_PATHS
        : LLMSTXT_PATHS.filter(p => !p.includes('full'))

    for (const path of pathsToTry) {
        const url = `${baseUrl}${path}`
        try {
            const response = await fetchWithTimeout(url, timeout, corsProxy, customFetch)
            if (response.ok) {
                const markdown = await response.text()
                // Quick validation: check if it looks like markdown
                if (markdown.includes('#') || markdown.includes('[')) {
                    const doc = parseLLMSTxt(markdown)
                    doc.sourceUrl = url
                    doc.isFull = path.includes('full')
                    return doc
                } else {
                    errors.push(`${url}: Response is not valid llms.txt (no markdown content)`)
                }
            } else {
                errors.push(`${url}: HTTP ${response.status}`)
            }
        } catch (err) {
            errors.push(`${url}: ${err instanceof Error ? err.message : String(err)}`)
        }
    }

    throw new Error(`No llms.txt file found. Tried:\n${errors.join('\n')}`)
}

/**
 * Discover all llms.txt files available for a domain.
 *
 * @param domain - Domain name to check
 * @param options - Fetch options
 * @returns Array of discovered files with their URLs and types
 *
 * @example
 * ```typescript
 * import { discoverLLMSTxtFiles } from '@25xcodes/llmstxt-parser'
 *
 * const files = await discoverLLMSTxtFiles('example.com')
 * // [{ url: 'https://example.com/llms.txt', type: 'standard' }]
 * ```
 */
export async function discoverLLMSTxtFiles(
    domain: string,
    options: FetchOptions = {}
): Promise<DiscoveredFile[]> {
    const {
        timeout = 10000,
        corsProxy,
        fetch: customFetch = globalThis.fetch,
    } = options

    const results: DiscoveredFile[] = []
    const cleanDomain = domain.replace(/^(https?:\/\/)?/, '').split('/')[0]
    const baseUrl = `https://${cleanDomain}`

    for (const path of LLMSTXT_PATHS) {
        const url = `${baseUrl}${path}`
        try {
            const response = await fetchWithTimeout(url, timeout, corsProxy, customFetch)
            if (response.ok) {
                const text = await response.text()
                // Minimal validation: must contain markdown heading
                if (text.includes('#')) {
                    results.push({
                        url,
                        type: path.includes('full') ? 'full' : 'standard',
                    })
                }
            }
        } catch {
            // Ignore errors during discovery
        }
    }

    return results
}

/**
 * Internal fetch wrapper with timeout and optional CORS proxy.
 */
async function fetchWithTimeout(
    url: string,
    timeout: number,
    corsProxy?: string,
    customFetch: typeof globalThis.fetch = globalThis.fetch
): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
        let fetchUrl = url
        if (corsProxy) {
            fetchUrl = `${corsProxy}?url=${encodeURIComponent(url)}`
        }

        const response = await customFetch(fetchUrl, {
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

// ============================================================================
// Utilities
// ============================================================================

/**
 * Estimate token count for an llms.txt document.
 *
 * Uses a rough approximation of ~4 characters per token.
 *
 * @param doc - Parsed llms.txt document
 * @returns Token estimates for total and by section
 *
 * @example
 * ```typescript
 * import { parseLLMSTxt, estimateTokens } from '@25xcodes/llmstxt-parser'
 *
 * const doc = parseLLMSTxt(markdown)
 * const tokens = estimateTokens(doc)
 *
 * console.log(`Total tokens: ~${tokens.total}`)
 * tokens.bySection.forEach(s => {
 *   console.log(`  ${s.section}: ~${s.tokens}`)
 * })
 * ```
 */
export function estimateTokens(doc: LLMSTxtDocument): TokenEstimate {
    const TOKENS_PER_CHAR = 0.25 // Rough approximation (~4 chars per token)

    const total = Math.ceil(doc.raw.length * TOKENS_PER_CHAR)

    const bySection = doc.sections.map(section => ({
        section: section.heading,
        tokens: Math.ceil(
            (
                section.heading.length +
                (section.content?.length || 0) +
                section.links.reduce(
                    (sum, l) => sum + l.title.length + l.url.length + (l.description?.length || 0),
                    0
                )
            ) * TOKENS_PER_CHAR
        ),
    }))

    return { total, bySection }
}

/**
 * Convert llms.txt document to a simple text format optimized for RAG.
 *
 * @param doc - Parsed llms.txt document
 * @returns Plain text representation suitable for embedding
 *
 * @example
 * ```typescript
 * import { parseLLMSTxt, toRAGFormat } from '@25xcodes/llmstxt-parser'
 *
 * const doc = parseLLMSTxt(markdown)
 * const ragText = toRAGFormat(doc)
 *
 * // Use ragText for embedding or context injection
 * ```
 */
export function toRAGFormat(doc: LLMSTxtDocument): string {
    const lines: string[] = []

    lines.push(`# ${doc.title}`)
    if (doc.summary) {
        lines.push(doc.summary)
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
 * Extract structured link data optimized for embedding/indexing.
 *
 * @param doc - Parsed llms.txt document
 * @returns Array of link entries with pre-formatted embed content
 *
 * @example
 * ```typescript
 * import { parseLLMSTxt, extractLinksForIndex } from '@25xcodes/llmstxt-parser'
 *
 * const doc = parseLLMSTxt(markdown)
 * const links = extractLinksForIndex(doc)
 *
 * // Insert into vector database
 * for (const link of links) {
 *   await vectorDb.insert({
 *     id: link.id,
 *     content: link.embedContent,
 *     metadata: { url: link.url, section: link.section }
 *   })
 * }
 * ```
 */
export function extractLinksForIndex(doc: LLMSTxtDocument): RAGLinkEntry[] {
    return doc.links.map((link, idx) => ({
        id: `${doc.sourceUrl || 'local'}-link-${idx}`,
        title: link.title,
        url: link.url,
        description: link.description || '',
        section: link.section || '',
        embedContent: `${link.title}${link.description ? `: ${link.description}` : ''} (${link.section || 'General'})`,
    }))
}

/**
 * Parse and validate llms.txt content in one call.
 *
 * @param markdown - Raw markdown content
 * @returns Parsed document and validation result
 *
 * @example
 * ```typescript
 * import { parseAndValidate } from '@25xcodes/llmstxt-parser'
 *
 * const { document, validation } = parseAndValidate(markdown)
 *
 * if (!validation.valid) {
 *   console.error('Document has errors:', validation.errors)
 * }
 * ```
 */
export function parseAndValidate(markdown: string): {
    document: LLMSTxtDocument
    validation: LLMSTxtValidationResult
} {
    const document = parseLLMSTxt(markdown)
    const validation = validateLLMSTxt(document)
    return { document, validation }
}

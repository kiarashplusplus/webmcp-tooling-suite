/**
 * LLMS.txt Parser Test Suite
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    parseLLMSTxt,
    validateLLMSTxt,
    fetchLLMSTxt,
    discoverLLMSTxtFiles,
    estimateTokens,
    toRAGFormat,
    extractLinksForIndex,
    parseAndValidate,
    LLMSTXT_PATHS,
} from './index.js'

// ============================================================================
// Test Fixtures
// ============================================================================

const SIMPLE_LLMSTXT = `# Simple Project

> A simple project for testing.

## Documentation
- [Getting Started](https://example.com/docs/start): Quick start guide
- [API Reference](https://example.com/docs/api): Full API documentation
`

const FASTHTML_EXAMPLE = `# FastHTML

> FastHTML is a python library which brings together Starlette, Uvicorn, HTMX, and fastcore's \`FT\` "FastTags" into a library for creating server-rendered hypermedia applications.

Important notes:
- Although parts of its API are inspired by FastAPI, it is *not* compatible with FastAPI syntax and is not targeted at creating API services
- FastHTML is compatible with JS-native web components and any vanilla JS library, but not with React, Vue, or Svelte.

## Docs
- [FastHTML quick start](https://fastht.ml/docs/tutorials/quickstart_for_web_devs.html.md): A brief overview of many FastHTML features
- [HTMX reference](https://github.com/bigskysoftware/htmx/blob/master/www/content/reference.md): Brief description of all HTMX attributes, CSS classes, headers, events, extensions, js lib methods, and config options

## Examples
- [Todo list application](https://github.com/AnswerDotAI/fasthtml/blob/main/examples/adv_app.py): Detailed walk-thru of a complete CRUD app in FastHTML showing idiomatic use of FastHTML and HTMX patterns.

## Optional
- [Starlette full documentation](https://gist.githubusercontent.com/jph00/809e4a4808d4510be0e3dc9565e9cbd3/raw/starlette-sml.md): A subset of the Starlette documentation useful for FastHTML development. Optional.
`

const MINIMAL_LLMSTXT = `# Minimal

## Links
- [Link 1](https://example.com/1)
- [Link 2](https://example.com/2)
`

const EMPTY_LLMSTXT = ``

const NO_TITLE_LLMSTXT = `> Just a summary without a title.

## Section
- [Link](https://example.com)
`

const INVALID_URLS_LLMSTXT = `# Invalid URLs

## Links
- [Valid Absolute](https://example.com/valid)
- [Valid Relative](/relative/path)
- [Valid Anchor](#anchor)
- [Invalid](not-a-valid-url)
`

const DUPLICATE_LINKS_LLMSTXT = `# Duplicates

## Section 1
- [Link A](https://example.com/same)
- [Link B](https://example.com/different)

## Section 2
- [Link C](https://example.com/same)
`

const H3_SECTIONS_LLMSTXT = `# Project with Subsections

> Project description.

## Main Section

### Subsection A
- [Link A](https://example.com/a): Description A

### Subsection B
- [Link B](https://example.com/b): Description B
`

// ============================================================================
// Parser Tests
// ============================================================================

describe('parseLLMSTxt', () => {
    it('parses a simple llms.txt file', () => {
        const doc = parseLLMSTxt(SIMPLE_LLMSTXT)

        expect(doc.title).toBe('Simple Project')
        expect(doc.summary).toBe('A simple project for testing.')
        expect(doc.sections).toHaveLength(1)
        expect(doc.sections[0].heading).toBe('Documentation')
        expect(doc.links).toHaveLength(2)
        expect(doc.raw).toBe(SIMPLE_LLMSTXT)
    })

    it('parses the FastHTML example correctly', () => {
        const doc = parseLLMSTxt(FASTHTML_EXAMPLE)

        expect(doc.title).toBe('FastHTML')
        expect(doc.summary).toContain('FastHTML is a python library')
        expect(doc.sections).toHaveLength(3)
        expect(doc.sections.map(s => s.heading)).toEqual(['Docs', 'Examples', 'Optional'])
        expect(doc.links).toHaveLength(4)
    })

    it('parses links with descriptions', () => {
        const doc = parseLLMSTxt(SIMPLE_LLMSTXT)

        expect(doc.links[0]).toEqual({
            title: 'Getting Started',
            url: 'https://example.com/docs/start',
            description: 'Quick start guide',
            section: 'Documentation',
            optional: false,
        })
    })

    it('detects optional links', () => {
        const doc = parseLLMSTxt(FASTHTML_EXAMPLE)
        const optionalLink = doc.links.find(l => l.title === 'Starlette full documentation')

        expect(optionalLink?.optional).toBe(true)
    })

    it('parses H2 and H3 sections', () => {
        const doc = parseLLMSTxt(H3_SECTIONS_LLMSTXT)

        expect(doc.sections).toHaveLength(3)
        expect(doc.sections[0]).toMatchObject({ heading: 'Main Section', level: 2 })
        expect(doc.sections[1]).toMatchObject({ heading: 'Subsection A', level: 3 })
        expect(doc.sections[2]).toMatchObject({ heading: 'Subsection B', level: 3 })
    })

    it('handles missing summary', () => {
        const doc = parseLLMSTxt(MINIMAL_LLMSTXT)

        expect(doc.title).toBe('Minimal')
        expect(doc.summary).toBeUndefined()
    })

    it('handles empty content', () => {
        const doc = parseLLMSTxt(EMPTY_LLMSTXT)

        expect(doc.title).toBe('')
        expect(doc.sections).toHaveLength(0)
        expect(doc.links).toHaveLength(0)
    })

    it('handles multi-line blockquote summary', () => {
        const markdown = `# Title

> This is line one.
> This is line two.

## Section
`
        const doc = parseLLMSTxt(markdown)

        expect(doc.summary).toBe('This is line one. This is line two.')
    })

    it('associates links with their parent sections', () => {
        const doc = parseLLMSTxt(DUPLICATE_LINKS_LLMSTXT)

        const linkA = doc.links.find(l => l.title === 'Link A')
        const linkC = doc.links.find(l => l.title === 'Link C')

        expect(linkA?.section).toBe('Section 1')
        expect(linkC?.section).toBe('Section 2')
    })

    it('parses links with asterisk bullets', () => {
        const markdown = `# Title

## Section
* [Link with asterisk](https://example.com): Description
`
        const doc = parseLLMSTxt(markdown)

        expect(doc.links).toHaveLength(1)
        expect(doc.links[0].title).toBe('Link with asterisk')
    })

    it('parses section content (description text)', () => {
        const markdown = `# Title

## Section
This is the section description text.
More description here.
- [Link](https://example.com): Link description
`
        const doc = parseLLMSTxt(markdown)

        expect(doc.sections[0].content).toBe('This is the section description text. More description here.')
    })

    it('sets optional to false for links without description', () => {
        const doc = parseLLMSTxt(MINIMAL_LLMSTXT)

        // Links without description should have optional = false, not undefined
        expect(doc.links[0].optional).toBe(false)
        expect(doc.links[1].optional).toBe(false)
    })
})

// ============================================================================
// Validator Tests
// ============================================================================

describe('validateLLMSTxt', () => {
    it('validates a correct document', () => {
        const doc = parseLLMSTxt(SIMPLE_LLMSTXT)
        const result = validateLLMSTxt(doc)

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
        expect(result.score).toBeGreaterThan(80)
    })

    it('reports error for missing title', () => {
        const doc = parseLLMSTxt(NO_TITLE_LLMSTXT)
        const result = validateLLMSTxt(doc)

        expect(result.valid).toBe(false)
        expect(result.errors).toContainEqual(
            expect.objectContaining({
                type: 'structure',
                field: 'title',
            })
        )
    })

    it('reports warning for missing summary', () => {
        const doc = parseLLMSTxt(MINIMAL_LLMSTXT)
        const result = validateLLMSTxt(doc)

        expect(result.valid).toBe(true)
        expect(result.warnings).toContainEqual(
            expect.objectContaining({
                type: 'recommendation',
                field: 'summary',
            })
        )
    })

    it('reports error for invalid URLs', () => {
        const doc = parseLLMSTxt(INVALID_URLS_LLMSTXT)
        const result = validateLLMSTxt(doc)

        expect(result.valid).toBe(false)
        expect(result.errors).toContainEqual(
            expect.objectContaining({
                type: 'format',
                message: expect.stringContaining('not-a-valid-url'),
            })
        )
    })

    it('accepts valid relative URLs', () => {
        const doc = parseLLMSTxt(INVALID_URLS_LLMSTXT)
        const result = validateLLMSTxt(doc)

        // Should only have 1 error for the invalid URL
        expect(result.errors).toHaveLength(1)
    })

    it('accepts anchor links', () => {
        const markdown = `# Title

## Section
- [Anchor Link](#section-id): Links to anchor
`
        const doc = parseLLMSTxt(markdown)
        const result = validateLLMSTxt(doc)

        expect(result.errors).toHaveLength(0)
    })

    it('reports warning for duplicate URLs', () => {
        const doc = parseLLMSTxt(DUPLICATE_LINKS_LLMSTXT)
        const result = validateLLMSTxt(doc)

        expect(result.warnings).toContainEqual(
            expect.objectContaining({
                type: 'duplicate',
                message: expect.stringContaining('https://example.com/same'),
            })
        )
    })

    it('warns about links without descriptions', () => {
        const doc = parseLLMSTxt(MINIMAL_LLMSTXT)
        const result = validateLLMSTxt(doc)

        expect(result.warnings).toContainEqual(
            expect.objectContaining({
                type: 'recommendation',
                field: 'links',
                message: expect.stringContaining('missing descriptions'),
            })
        )
    })

    it('calculates score correctly', () => {
        // Perfect document
        const goodDoc = parseLLMSTxt(SIMPLE_LLMSTXT)
        const goodResult = validateLLMSTxt(goodDoc)
        expect(goodResult.score).toBeGreaterThanOrEqual(90)

        // Document with errors
        const badDoc = parseLLMSTxt(NO_TITLE_LLMSTXT)
        const badResult = validateLLMSTxt(badDoc)
        expect(badResult.score).toBeLessThan(goodResult.score)
    })

    it('score is bounded 0-100', () => {
        const doc = parseLLMSTxt(EMPTY_LLMSTXT)
        const result = validateLLMSTxt(doc)

        expect(result.score).toBeGreaterThanOrEqual(0)
        expect(result.score).toBeLessThanOrEqual(100)
    })
})

// ============================================================================
// Utility Tests
// ============================================================================

describe('estimateTokens', () => {
    it('estimates total tokens', () => {
        const doc = parseLLMSTxt(SIMPLE_LLMSTXT)
        const tokens = estimateTokens(doc)

        expect(tokens.total).toBeGreaterThan(0)
        expect(tokens.total).toBeLessThan(1000) // Sanity check
    })

    it('breaks down tokens by section', () => {
        const doc = parseLLMSTxt(FASTHTML_EXAMPLE)
        const tokens = estimateTokens(doc)

        expect(tokens.bySection).toHaveLength(3)
        expect(tokens.bySection[0].section).toBe('Docs')
        expect(tokens.bySection[0].tokens).toBeGreaterThan(0)
    })

    it('includes URLs in token estimation', () => {
        const shortUrlDoc = parseLLMSTxt(`# Test
## Section
- [Link](https://a.com): Desc
`)
        const longUrlDoc = parseLLMSTxt(`# Test
## Section
- [Link](https://very-long-domain-name.example.com/with/a/very/long/path/to/document.html): Desc
`)
        const shortTokens = estimateTokens(shortUrlDoc)
        const longTokens = estimateTokens(longUrlDoc)

        expect(longTokens.bySection[0].tokens).toBeGreaterThan(shortTokens.bySection[0].tokens)
    })
})

describe('toRAGFormat', () => {
    it('converts document to RAG format', () => {
        const doc = parseLLMSTxt(SIMPLE_LLMSTXT)
        const rag = toRAGFormat(doc)

        expect(rag).toContain('# Simple Project')
        expect(rag).toContain('A simple project for testing.')
        expect(rag).toContain('## Documentation')
        expect(rag).toContain('- Getting Started:')
    })

    it('includes URLs in output', () => {
        const doc = parseLLMSTxt(SIMPLE_LLMSTXT)
        const rag = toRAGFormat(doc)

        expect(rag).toContain('https://example.com/docs/start')
    })
})

describe('extractLinksForIndex', () => {
    it('extracts links with proper structure', () => {
        const doc = parseLLMSTxt(SIMPLE_LLMSTXT)
        const links = extractLinksForIndex(doc)

        expect(links).toHaveLength(2)
        expect(links[0]).toMatchObject({
            title: 'Getting Started',
            url: 'https://example.com/docs/start',
            description: 'Quick start guide',
            section: 'Documentation',
        })
    })

    it('generates unique IDs', () => {
        const doc = parseLLMSTxt(DUPLICATE_LINKS_LLMSTXT)
        doc.sourceUrl = 'https://example.com/llms.txt'
        const links = extractLinksForIndex(doc)

        const ids = links.map(l => l.id)
        const uniqueIds = new Set(ids)
        expect(uniqueIds.size).toBe(ids.length)
    })

    it('creates embedContent for each link', () => {
        const doc = parseLLMSTxt(SIMPLE_LLMSTXT)
        const links = extractLinksForIndex(doc)

        expect(links[0].embedContent).toContain('Getting Started')
        expect(links[0].embedContent).toContain('Quick start guide')
        expect(links[0].embedContent).toContain('Documentation')
    })
})

describe('parseAndValidate', () => {
    it('parses and validates in one call', () => {
        const { document, validation } = parseAndValidate(SIMPLE_LLMSTXT)

        expect(document.title).toBe('Simple Project')
        expect(validation.valid).toBe(true)
    })

    it('returns both document and validation errors', () => {
        const { document, validation } = parseAndValidate(NO_TITLE_LLMSTXT)

        expect(document.title).toBe('')
        expect(validation.valid).toBe(false)
        expect(validation.errors.length).toBeGreaterThan(0)
    })
})

// ============================================================================
// Fetcher Tests
// ============================================================================

describe('fetchLLMSTxt', () => {
    const mockFetch = vi.fn()

    beforeEach(() => {
        mockFetch.mockReset()
    })

    it('fetches and parses from direct URL', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            text: async () => SIMPLE_LLMSTXT,
        })

        const doc = await fetchLLMSTxt('https://example.com/llms.txt', {
            fetch: mockFetch,
        })

        expect(doc.title).toBe('Simple Project')
        expect(doc.sourceUrl).toBe('https://example.com/llms.txt')
        expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('discovers llms.txt from domain', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            text: async () => SIMPLE_LLMSTXT,
        })

        const doc = await fetchLLMSTxt('example.com', {
            fetch: mockFetch,
        })

        expect(doc.title).toBe('Simple Project')
        expect(doc.sourceUrl).toBe('https://example.com/llms.txt')
    })

    it('tries multiple paths if first fails', async () => {
        mockFetch
            .mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' })
            .mockResolvedValueOnce({
                ok: true,
                text: async () => SIMPLE_LLMSTXT,
            })

        const doc = await fetchLLMSTxt('example.com', {
            fetch: mockFetch,
        })

        expect(doc.title).toBe('Simple Project')
        expect(doc.sourceUrl).toBe('https://example.com/llms-full.txt')
        expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('throws if no llms.txt found', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' })

        await expect(fetchLLMSTxt('example.com', { fetch: mockFetch }))
            .rejects.toThrow('No llms.txt file found')
    })

    it('uses CORS proxy when provided', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            text: async () => SIMPLE_LLMSTXT,
        })

        await fetchLLMSTxt('https://example.com/llms.txt', {
            fetch: mockFetch,
            corsProxy: 'https://proxy.example.com',
        })

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('https://proxy.example.com?url='),
            expect.any(Object)
        )
    })

    it('sets isFull for llms-full.txt', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            text: async () => SIMPLE_LLMSTXT,
        })

        const doc = await fetchLLMSTxt('https://example.com/llms-full.txt', {
            fetch: mockFetch,
        })

        expect(doc.isFull).toBe(true)
    })
})

describe('discoverLLMSTxtFiles', () => {
    const mockFetch = vi.fn()

    beforeEach(() => {
        mockFetch.mockReset()
    })

    it('discovers available llms.txt files', async () => {
        mockFetch
            .mockResolvedValueOnce({ ok: true, text: async () => '# Standard' })
            .mockResolvedValueOnce({ ok: true, text: async () => '# Full' })
            .mockResolvedValueOnce({ ok: false })

        const files = await discoverLLMSTxtFiles('example.com', { fetch: mockFetch })

        expect(files).toHaveLength(2)
        expect(files[0]).toEqual({
            url: 'https://example.com/llms.txt',
            type: 'standard',
        })
        expect(files[1]).toEqual({
            url: 'https://example.com/llms-full.txt',
            type: 'full',
        })
    })

    it('returns empty array if no files found', async () => {
        mockFetch.mockResolvedValue({ ok: false })

        const files = await discoverLLMSTxtFiles('example.com', { fetch: mockFetch })

        expect(files).toHaveLength(0)
    })
})

// ============================================================================
// Constants Tests
// ============================================================================

describe('LLMSTXT_PATHS', () => {
    it('contains expected paths', () => {
        expect(LLMSTXT_PATHS).toContain('/llms.txt')
        expect(LLMSTXT_PATHS).toContain('/llms-full.txt')
        expect(LLMSTXT_PATHS).toContain('/.well-known/llms.txt')
    })
})

# @25xcodes/llmstxt-parser

[![npm version](https://img.shields.io/npm/v/@25xcodes/llmstxt-parser.svg)](https://www.npmjs.com/package/@25xcodes/llmstxt-parser)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A high-quality TypeScript library for parsing and validating [llms.txt](https://llmstxt.org) files.

## Features

- 🚀 **Zero dependencies** — Works in Node.js and browsers
- 📝 **Full TypeScript support** — Comprehensive type definitions
- ✅ **Validation** — Per the llmstxt.org specification
- 🔍 **Discovery** — Auto-discover llms.txt from well-known paths
- 🎯 **RAG-ready** — Utilities for embedding and indexing
- 📊 **Token estimation** — Approximate token counts for LLMs

## Installation

```bash
npm install @25xcodes/llmstxt-parser
```

## Quick Start

```typescript
import { parseLLMSTxt, validateLLMSTxt } from '@25xcodes/llmstxt-parser'

const markdown = `
# My Project

> A brief description of the project.

## Documentation
- [Getting Started](https://example.com/docs/start): Quick start guide
- [API Reference](https://example.com/docs/api): Full API docs
`

// Parse the document
const doc = parseLLMSTxt(markdown)
console.log(doc.title)    // "My Project"
console.log(doc.summary)  // "A brief description of the project."
console.log(doc.links)    // [{ title: "Getting Started", ... }, ...]

// Validate the document
const result = validateLLMSTxt(doc)
console.log(result.valid)  // true
console.log(result.score)  // 95
```

## API Reference

### Parsing

#### `parseLLMSTxt(markdown: string): LLMSTxtDocument`

Parse an llms.txt markdown string into a structured document.

```typescript
import { parseLLMSTxt } from '@25xcodes/llmstxt-parser'

const doc = parseLLMSTxt(markdown)

console.log(doc.title)     // H1 title (required)
console.log(doc.summary)   // Blockquote summary (optional)
console.log(doc.sections)  // Array of sections with links
console.log(doc.links)     // All links (flattened)
console.log(doc.raw)       // Original markdown
```

### Validation

#### `validateLLMSTxt(doc: LLMSTxtDocument): LLMSTxtValidationResult`

Validate a parsed document against the llmstxt.org specification.

```typescript
import { parseLLMSTxt, validateLLMSTxt } from '@25xcodes/llmstxt-parser'

const doc = parseLLMSTxt(markdown)
const result = validateLLMSTxt(doc)

if (!result.valid) {
  console.log('Errors:', result.errors)
  console.log('Warnings:', result.warnings)
}

console.log('Score:', result.score) // 0-100
```

#### `parseAndValidate(markdown: string)`

Parse and validate in one call.

```typescript
import { parseAndValidate } from '@25xcodes/llmstxt-parser'

const { document, validation } = parseAndValidate(markdown)
```

### Fetching

#### `fetchLLMSTxt(urlOrDomain: string, options?: FetchOptions): Promise<LLMSTxtDocument>`

Fetch and parse llms.txt from a URL or domain.

```typescript
import { fetchLLMSTxt } from '@25xcodes/llmstxt-parser'

// Fetch from a specific URL
const doc = await fetchLLMSTxt('https://example.com/llms.txt')

// Or discover from a domain (tries well-known paths)
const doc = await fetchLLMSTxt('example.com')

// With CORS proxy for browser environments
const doc = await fetchLLMSTxt('example.com', {
  corsProxy: 'https://my-cors-proxy.workers.dev'
})
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | `number` | `10000` | Request timeout in ms |
| `checkFull` | `boolean` | `true` | Also check for llms-full.txt |
| `corsProxy` | `string` | — | CORS proxy URL |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Custom fetch function |

#### `discoverLLMSTxtFiles(domain: string, options?: FetchOptions): Promise<DiscoveredFile[]>`

Discover all available llms.txt files for a domain.

```typescript
import { discoverLLMSTxtFiles } from '@25xcodes/llmstxt-parser'

const files = await discoverLLMSTxtFiles('example.com')
// [
//   { url: 'https://example.com/llms.txt', type: 'standard' },
//   { url: 'https://example.com/llms-full.txt', type: 'full' }
// ]
```

### Utilities

#### `estimateTokens(doc: LLMSTxtDocument): TokenEstimate`

Estimate token count for LLM context.

```typescript
import { parseLLMSTxt, estimateTokens } from '@25xcodes/llmstxt-parser'

const doc = parseLLMSTxt(markdown)
const tokens = estimateTokens(doc)

console.log(`Total: ~${tokens.total} tokens`)
tokens.bySection.forEach(s => {
  console.log(`  ${s.section}: ~${s.tokens}`)
})
```

#### `toRAGFormat(doc: LLMSTxtDocument): string`

Convert document to plain text format for RAG systems.

```typescript
import { parseLLMSTxt, toRAGFormat } from '@25xcodes/llmstxt-parser'

const doc = parseLLMSTxt(markdown)
const ragText = toRAGFormat(doc)

// Use for embedding or context injection
```

#### `extractLinksForIndex(doc: LLMSTxtDocument): RAGLinkEntry[]`

Extract structured link data for vector databases.

```typescript
import { parseLLMSTxt, extractLinksForIndex } from '@25xcodes/llmstxt-parser'

const doc = parseLLMSTxt(markdown)
const links = extractLinksForIndex(doc)

for (const link of links) {
  await vectorDb.insert({
    id: link.id,
    content: link.embedContent,
    metadata: { url: link.url, section: link.section }
  })
}
```

## Types

### `LLMSTxtDocument`

```typescript
interface LLMSTxtDocument {
  title: string           // H1 title (required)
  summary?: string        // Blockquote summary
  sections: LLMSTxtSection[]
  links: LLMSTxtLink[]    // All links (flattened)
  raw: string             // Original markdown
  sourceUrl?: string      // If fetched remotely
  isFull?: boolean        // If llms-full.txt
}
```

### `LLMSTxtSection`

```typescript
interface LLMSTxtSection {
  heading: string         // Section title
  level: 2 | 3            // H2 or H3
  content?: string        // Description text
  links: LLMSTxtLink[]    // Links in this section
}
```

### `LLMSTxtLink`

```typescript
interface LLMSTxtLink {
  title: string           // Link text
  url: string             // URL
  description?: string    // Description after link
  section?: string        // Parent section name
  optional?: boolean      // Marked as optional
}
```

### `LLMSTxtValidationResult`

```typescript
interface LLMSTxtValidationResult {
  valid: boolean          // No errors
  score: number           // 0-100
  errors: LLMSTxtValidationError[]
  warnings: LLMSTxtValidationWarning[]
}
```

## Well-Known Paths

The library checks these paths when discovering llms.txt:

```typescript
import { LLMSTXT_PATHS } from '@25xcodes/llmstxt-parser'

// ['/llms.txt', '/llms-full.txt', '/.well-known/llms.txt']
```

## llms.txt Specification

This library implements the [llmstxt.org](https://llmstxt.org) specification:

- **H1 Title** (required): `# Project Name`
- **Summary** (recommended): `> Brief description`
- **Sections** (optional): `## Section Name`
- **Links**: `- [Title](url): Description`

### Example llms.txt

```markdown
# FastHTML

> FastHTML is a python library for creating server-rendered hypermedia applications.

## Docs
- [Quick start](https://fastht.ml/docs/quickstart): Get started in 5 minutes
- [API Reference](https://fastht.ml/docs/api): Full API documentation

## Examples
- [Todo App](https://github.com/example/todo): Complete CRUD example

## Optional
- [Starlette docs](https://starlette.io): Underlying framework docs. Optional.
```

## License

MIT

# @25xcodes/llmstxt-parser

Parse and validate [llms.txt](https://llmstxt.org) files with RAG utilities.

[![npm version](https://img.shields.io/npm/v/@25xcodes/llmstxt-parser?color=6366f1)](https://www.npmjs.com/package/@25xcodes/llmstxt-parser)
[![npm downloads](https://img.shields.io/npm/dm/@25xcodes/llmstxt-parser?color=22c55e)](https://www.npmjs.com/package/@25xcodes/llmstxt-parser)

## Installation

```bash
npm install @25xcodes/llmstxt-parser
```

## Quick Start

```typescript
import { parseLLMSTxt, validateLLMSTxt, fetchLLMSTxt } from '@25xcodes/llmstxt-parser'

// Parse markdown content
const doc = parseLLMSTxt(`# My Project
> A brief description.

## Documentation
- [Getting Started](https://example.com/docs): Quick start guide
`)

console.log(doc.title)   // "My Project"
console.log(doc.summary) // "A brief description."
console.log(doc.links)   // [{ title: "Getting Started", ... }]

// Validate
const result = validateLLMSTxt(doc)
console.log(result.valid) // true
console.log(result.score) // 100

// Fetch from URL or domain
const remoteDdc = await fetchLLMSTxt('example.com')
```

## API Reference

### `parseLLMSTxt(markdown: string): LLMSTxtDocument`

Parse llms.txt markdown into a structured document.

**Parameters:**
- `markdown` - Raw markdown content

**Returns:** `LLMSTxtDocument` with title, summary, sections, and links.

### `validateLLMSTxt(doc: LLMSTxtDocument): LLMSTxtValidationResult`

Validate a parsed document per the llmstxt.org specification.

**Returns:** Validation result with:
- `valid` - Whether document passes validation
- `score` - Quality score (0-100)
- `errors` - Spec violations
- `warnings` - Recommendations

### `fetchLLMSTxt(urlOrDomain: string, options?): Promise<LLMSTxtDocument>`

Fetch and parse llms.txt from a URL or domain.

Tries well-known paths in order:
1. `/llms.txt`
2. `/llms-full.txt`
3. `/.well-known/llms.txt`

**Options:**
- `timeout` - Request timeout in ms (default: 10000)
- `checkFull` - Also check for llms-full.txt (default: true)
- `corsProxy` - CORS proxy URL for browser environments

### `discoverLLMSTxtFiles(domain: string, options?): Promise<DiscoveredFile[]>`

Discover all llms.txt files available for a domain.

### `estimateTokens(doc: LLMSTxtDocument): TokenEstimate`

Estimate token count (~4 chars per token).

### `toRAGFormat(doc: LLMSTxtDocument): string`

Convert to plain text format optimized for RAG/embedding.

### `extractLinksForIndex(doc: LLMSTxtDocument): RAGLinkEntry[]`

Extract structured link data for vector database indexing.

### `parseAndValidate(markdown: string): { document, validation }`

Parse and validate in one call.

## Types

```typescript
interface LLMSTxtDocument {
  title: string
  summary?: string
  sections: LLMSTxtSection[]
  links: LLMSTxtLink[]
  raw: string
  sourceUrl?: string
  isFull?: boolean
}

interface LLMSTxtLink {
  title: string
  url: string
  description?: string
  section?: string
  optional?: boolean
}

interface LLMSTxtValidationResult {
  valid: boolean
  score: number
  errors: LLMSTxtValidationError[]
  warnings: LLMSTxtValidationWarning[]
}
```

## Browser Usage

For browser environments, use the `corsProxy` option:

```typescript
const doc = await fetchLLMSTxt('example.com', {
  corsProxy: 'https://your-cors-proxy.workers.dev'
})
```

## Features

- ✅ Zero runtime dependencies
- ✅ Full TypeScript support
- ✅ Dual ESM/CJS exports
- ✅ Works in Node.js and browsers
- ✅ Quality scoring per llmstxt.org spec
- ✅ RAG utilities for AI workflows

## Source Code

[View on GitHub](https://github.com/kiarashplusplus/webmcp-tooling-suite/tree/main/packages/llmstxt-parser)

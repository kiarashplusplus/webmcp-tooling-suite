# LLMS.txt Parser API

API reference for `@25xcodes/llmstxt-parser` - parse, validate, and transform llms.txt files.

## Functions

### parseLLMSTxt

```typescript
function parseLLMSTxt(markdown: string): LLMSTxtDocument
```

Parse llms.txt markdown content into a structured document.

**Parameters:**
- `markdown` - Raw markdown content following the llmstxt.org spec

**Returns:** Parsed `LLMSTxtDocument`

**Example:**
```typescript
import { parseLLMSTxt } from '@25xcodes/llmstxt-parser'

const doc = parseLLMSTxt(`# My Project
> A brief description of the project.

## Documentation
- [Getting Started](https://example.com/docs): Quick start guide
- [API Reference](https://example.com/api): Full API docs
`)

console.log(doc.title)   // "My Project"
console.log(doc.summary) // "A brief description of the project."
console.log(doc.links)   // Array of parsed links
```

---

### validateLLMSTxt

```typescript
function validateLLMSTxt(doc: LLMSTxtDocument): LLMSTxtValidationResult
```

Validate a parsed document per the llmstxt.org specification.

**Parameters:**
- `doc` - Parsed LLMSTxtDocument

**Returns:** Validation result with errors, warnings, and quality score

**Example:**
```typescript
import { parseLLMSTxt, validateLLMSTxt } from '@25xcodes/llmstxt-parser'

const doc = parseLLMSTxt(markdown)
const result = validateLLMSTxt(doc)

if (result.valid) {
  console.log(`Score: ${result.score}/100`)
} else {
  console.log('Errors:', result.errors)
}
```

---

### fetchLLMSTxt

```typescript
function fetchLLMSTxt(
  urlOrDomain: string, 
  options?: FetchOptions
): Promise<LLMSTxtDocument>
```

Fetch and parse llms.txt from a URL or domain. Automatically tries well-known paths.

**Discovery order:**
1. `/llms.txt`
2. `/llms-full.txt` (if `checkFull` is true)
3. `/.well-known/llms.txt`

**Parameters:**
- `urlOrDomain` - Full URL or domain name
- `options.timeout` - Request timeout in ms (default: 10000)
- `options.checkFull` - Also check for llms-full.txt (default: true)
- `options.corsProxy` - CORS proxy URL for browser environments

**Example:**
```typescript
import { fetchLLMSTxt } from '@25xcodes/llmstxt-parser'

// From domain (tries well-known paths)
const doc = await fetchLLMSTxt('example.com')

// With CORS proxy (for browsers)
const doc = await fetchLLMSTxt('example.com', {
  corsProxy: 'https://your-proxy.workers.dev'
})
```

---

### discoverLLMSTxtFiles

```typescript
function discoverLLMSTxtFiles(
  domain: string, 
  options?: DiscoverOptions
): Promise<DiscoveredFile[]>
```

Discover all llms.txt files available for a domain.

**Returns:** Array of discovered files with their URLs and types

---

### estimateTokens

```typescript
function estimateTokens(doc: LLMSTxtDocument): TokenEstimate
```

Estimate token count for a document (~4 characters per token).

**Returns:**
```typescript
interface TokenEstimate {
  total: number
  breakdown: {
    title: number
    summary: number
    sections: number
    links: number
  }
}
```

---

### toRAGFormat

```typescript
function toRAGFormat(doc: LLMSTxtDocument): string
```

Convert document to plain text format optimized for RAG/embedding.

**Returns:** Plain text string suitable for vector embedding

---

### extractLinksForIndex

```typescript
function extractLinksForIndex(doc: LLMSTxtDocument): RAGLinkEntry[]
```

Extract structured link data for vector database indexing.

**Returns:**
```typescript
interface RAGLinkEntry {
  title: string
  url: string
  description?: string
  section?: string
  embedding_text: string  // Combined text for embedding
}
```

---

### parseAndValidate

```typescript
function parseAndValidate(markdown: string): {
  document: LLMSTxtDocument
  validation: LLMSTxtValidationResult
}
```

Parse and validate in a single call.

## Types

### LLMSTxtDocument

```typescript
interface LLMSTxtDocument {
  title: string              // H1 heading
  summary?: string           // Blockquote after title
  sections: LLMSTxtSection[] // H2 sections
  links: LLMSTxtLink[]       // All extracted links
  raw: string                // Original markdown
  sourceUrl?: string         // URL if fetched
  isFull?: boolean          // True if from llms-full.txt
}
```

### LLMSTxtSection

```typescript
interface LLMSTxtSection {
  title: string
  content: string
  links: LLMSTxtLink[]
}
```

### LLMSTxtLink

```typescript
interface LLMSTxtLink {
  title: string
  url: string
  description?: string
  section?: string          // Parent section name
  optional?: boolean        // True if in Optional section
}
```

### LLMSTxtValidationResult

```typescript
interface LLMSTxtValidationResult {
  valid: boolean
  score: number             // 0-100 quality score
  errors: LLMSTxtValidationError[]
  warnings: LLMSTxtValidationWarning[]
}
```

### LLMSTxtValidationError

```typescript
interface LLMSTxtValidationError {
  code: string              // e.g., 'MISSING_TITLE'
  message: string
  line?: number
}
```

## Browser Usage

For browser environments, use the `corsProxy` option:

```typescript
import { fetchLLMSTxt } from '@25xcodes/llmstxt-parser'

const doc = await fetchLLMSTxt('example.com', {
  corsProxy: 'https://your-cors-proxy.workers.dev'
})
```

## ESM and CommonJS

The package supports both module formats:

```typescript
// ESM
import { parseLLMSTxt, validateLLMSTxt } from '@25xcodes/llmstxt-parser'

// CommonJS
const { parseLLMSTxt, validateLLMSTxt } = require('@25xcodes/llmstxt-parser')
```

# API Reference

Complete API documentation for all WebMCP Tooling Suite packages.

## Format Support

::: tip Full Support for Both Formats
All APIs fully support both **LLMFeed JSON** (`.llmfeed.json`) and **llms.txt** formats. Use the appropriate package for each format.
:::

## Overview

Each package exports a set of functions, classes, and types. This reference covers all public APIs.

<div class="package-grid">
  <a href="/api/validator" class="package-card">
    <h3>Validator API</h3>
    <p>validateFeedStructure, validateLLMFeed, verifyEd25519Signature, and more</p>
  </a>
  
  <a href="/api/signer" class="package-card">
    <h3>Signer API</h3>
    <p>generateKeyPair, signFeed, verifyFeed, loadKeyPair, and more</p>
  </a>
  
  <a href="/api/health-monitor" class="package-card">
    <h3>Health Monitor API</h3>
    <p>crawlFeed, generateReport, MemoryStorage, and more</p>
  </a>
  
  <a href="/api/llmstxt-parser" class="package-card">
    <h3>LLMS.txt Parser API</h3>
    <p>parseLLMSTxt, validateLLMSTxt, fetchLLMSTxt, toRAGFormat, and more</p>
  </a>
</div>

## Common Types

These types are used across multiple packages:

### LLMFeed

```typescript
interface LLMFeed {
  feed_type: 'llmfeed'           // Required
  metadata: Metadata             // Required
  capabilities?: Capability[]
  items: Item[]                  // Required
  trust?: TrustBlock
}
```

### Metadata

```typescript
interface Metadata {
  title: string                  // Required
  origin: string                 // Required
  description: string            // Required
  logo?: string
  contact?: Contact
}
```

### Contact

```typescript
interface Contact {
  email?: string
  name?: string
  url?: string
}
```

### Capability

```typescript
interface Capability {
  name: string
  description: string
  endpoint?: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  authentication?: Authentication
  parameters?: JSONSchema
  response?: JSONSchema
  rateLimit?: RateLimit
}
```

### Item

```typescript
interface Item {
  title: string
  description?: string
  url: string
  type?: string
  tags?: string[]
  published?: string
  updated?: string
  content?: string
}
```

### TrustBlock

```typescript
interface TrustBlock {
  type: 'signed'
  algorithm: 'ed25519'
  publicKey: string
  signature: string
  signedBlocks: string[]  // e.g., ['feed_type', 'metadata', 'capabilities', 'items']
  timestamp?: string
  contentHash?: string
}
```

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean
  structureValid: boolean
  signatureValid?: boolean
  signatureError?: string
  errors: string[]
  warnings?: string[]
}
```

## Error Handling

All packages use standard JavaScript errors:

```typescript
try {
  const result = await signFeed(feed, invalidKey)
} catch (error) {
  if (error instanceof Error) {
    console.error('Signing failed:', error.message)
  }
}
```

Common error types:
- `Error` - General errors
- `TypeError` - Invalid argument types
- `SyntaxError` - Invalid JSON or schema

## Async vs Sync

Most functions that involve cryptography are async:

```typescript
// Async (returns Promise)
const keyPair = await generateKeyPair()
const signed = await signFeed(feed, privateKey)
const result = await validateLLMFeed(feed)

// Sync (returns immediately)
const result = validateFeedStructure(feed)
const sorted = deepSortObject(obj)
```

## ESM and CommonJS

All packages support both ESM and CommonJS:

```typescript
// ESM
import { validateLLMFeed } from '@25xcodes/llmfeed-validator'

// CommonJS
const { validateLLMFeed } = require('@25xcodes/llmfeed-validator')
```

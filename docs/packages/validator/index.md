# @25xcodes/llmfeed-validator

Schema validation and cryptographic signature verification for LLMFeed JSON files.

<div style="display: flex; gap: 0.5rem; margin: 1rem 0;">
  <a href="https://www.npmjs.com/package/@25xcodes/llmfeed-validator">
    <img src="https://img.shields.io/npm/v/@25xcodes/llmfeed-validator?color=cb3837" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/@25xcodes/llmfeed-validator">
    <img src="https://img.shields.io/npm/dm/@25xcodes/llmfeed-validator" alt="npm downloads">
  </a>
</div>

## Format Support

| Format | Status |
|--------|--------|
| **LLMFeed JSON** | ✅ Fully Supported |
| **llm.txt** | 🚧 Coming Soon |

## Features

- ✅ **Schema Validation** - Validate feed structure against the LLMFeed JSON schema
- 🔐 **Signature Verification** - Verify Ed25519 cryptographic signatures
- 🌐 **Remote Fetching** - Fetch and validate feeds from URLs
- 📊 **Detailed Errors** - Comprehensive error messages for debugging
- 🔧 **Utility Functions** - SHA-256 hashing, base64 encoding, and more

## Quick Start

```bash
npm install @25xcodes/llmfeed-validator
```

```typescript
import { validateLLMFeed } from '@25xcodes/llmfeed-validator'

const feed = {
  feed_type: 'llmfeed',
  metadata: {
    title: 'My Service',
    origin: 'https://example.com',
    description: 'A helpful service'
  },
  items: [{ title: 'Doc', url: 'https://example.com' }]
}

const result = await validateLLMFeed(feed)

if (result.valid) {
  console.log('✅ LLMFeed JSON is valid!')
} else {
  console.log('❌ Errors:', result.errors)
}
```

::: info llm.txt Support
Parsing and validation for llm.txt (markdown format) is planned for future releases.
:::

## Core Functions

### `validateFeedStructure(feed)`

Validate the structure of a feed without checking signatures. Returns an array of validation errors:

```typescript
import { validateFeedStructure } from '@25xcodes/llmfeed-validator'

const errors = validateFeedStructure(feed)

if (errors.length === 0) {
  console.log('Feed structure is valid!')
} else {
  errors.forEach(err => console.log(`${err.field}: ${err.message}`))
}
```

### `validateLLMFeed(feed, options?)`

Full validation including signature verification:

```typescript
import { validateLLMFeed } from '@25xcodes/llmfeed-validator'

const result = await validateLLMFeed(signedFeed)

console.log(result.valid)           // Overall validity (boolean)
console.log(result.score)           // Security score (0-100)
console.log(result.signatureValid)  // Signature validity (boolean | undefined)
console.log(result.errors)          // ValidationError[]
console.log(result.warnings)        // ValidationWarning[]
```

### `fetchLLMFeed(url, options?)`

Fetch a feed from a URL. Returns the parsed feed object:

```typescript
import { fetchLLMFeed, validateLLMFeed } from '@25xcodes/llmfeed-validator'

// Fetch the feed
const feed = await fetchLLMFeed('https://example.com/.well-known/mcp.llmfeed.json')

// Then validate it
const result = await validateLLMFeed(feed)
console.log(result.valid)
```

### `verifyEd25519Signature(feed, options?)`

Verify the cryptographic signature with detailed diagnostics:

```typescript
import { verifyEd25519Signature } from '@25xcodes/llmfeed-validator'

const result = await verifyEd25519Signature(signedFeed)

console.log(result.valid)           // boolean
console.log(result.steps)           // Verification steps with status
console.log(result.detectedIssues)  // Any detected signing issues
```

### `validateCapabilitySchemas(feed)`

Validate JSON Schema definitions in capabilities:

```typescript
import { validateCapabilitySchemas } from '@25xcodes/llmfeed-validator'

const errors = validateCapabilitySchemas(feed)

if (errors.length > 0) {
  errors.forEach(err => console.log(`${err.field}: ${err.message}`))
}
```

## CLI Usage

```bash
# Validate a local LLMFeed JSON file
npx @25xcodes/llmfeed-validator ./mcp.llmfeed.json

# Validate a remote feed (auto-discovers .well-known path)
npx @25xcodes/llmfeed-validator example.com

# Validate with full URL
npx @25xcodes/llmfeed-validator https://example.com/.well-known/mcp.llmfeed.json

# Skip signature verification
npx @25xcodes/llmfeed-validator ./feed.json --skip-signature

# Output JSON results (for CI/CD)
npx @25xcodes/llmfeed-validator ./feed.json --json

# Verbose output
npx @25xcodes/llmfeed-validator example.com --verbose
```

::: warning llm.txt
The CLI does not yet support validating llm.txt files. Use LLMFeed JSON format for validation.
:::

## Utility Functions

```typescript
import { 
  sha256,              // SHA-256 hash
  base64ToUint8Array,  // Decode base64
  deepSortObject,      // Canonical JSON sorting
  pemToPublicKey,      // Parse PEM public keys
  detectSigningIssues  // Debug signature problems
} from '@25xcodes/llmfeed-validator'

// Hash a string
const hash = await sha256('hello world')

// Decode base64
const bytes = base64ToUint8Array('SGVsbG8=')

// Canonical JSON for signing
const canonical = JSON.stringify(deepSortObject(obj))

// Debug signature issues
const issues = detectSigningIssues(feed)
```

## Error Messages

The validator provides detailed error messages:

```typescript
const result = validateFeedStructure({
  title: '',  // Empty title
  items: []   // Empty items
})

// result.errors:
// [
//   "title: String must contain at least 1 character(s)",
//   "items: Array must contain at least 1 element(s)"
// ]
```

## Next Steps

- [Installation](/packages/validator/installation) - Detailed installation guide
- [Usage](/packages/validator/usage) - Complete usage examples
- [CLI Reference](/packages/validator/cli) - Full CLI documentation
- [API Reference](/api/validator) - Complete API documentation

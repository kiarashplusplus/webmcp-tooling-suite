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

Validate the structure of a feed without checking signatures:

```typescript
import { validateFeedStructure } from '@25xcodes/llmfeed-validator'

const result = validateFeedStructure(feed)

console.log(result.valid)   // boolean
console.log(result.errors)  // string[]
```

### `validateLLMFeed(feed)`

Full validation including signature verification:

```typescript
import { validateLLMFeed } from '@25xcodes/llmfeed-validator'

const result = await validateLLMFeed(signedFeed)

console.log(result.valid)           // Overall validity
console.log(result.structureValid)  // Schema validity
console.log(result.signatureValid)  // Signature validity
console.log(result.signatureError)  // Signature error message
```

### `fetchLLMFeed(url)`

Fetch and validate a feed from a URL:

```typescript
import { fetchLLMFeed } from '@25xcodes/llmfeed-validator'

const result = await fetchLLMFeed('https://example.com/.well-known/llm.txt')

console.log(result.feed)    // The parsed feed object
console.log(result.valid)   // Validation result
```

### `verifyEd25519Signature(feed)`

Verify just the cryptographic signature:

```typescript
import { verifyEd25519Signature } from '@25xcodes/llmfeed-validator'

const isValid = await verifyEd25519Signature(signedFeed)
```

### `validateCapabilitySchemas(capabilities)`

Validate JSON Schema definitions in capabilities:

```typescript
import { validateCapabilitySchemas } from '@25xcodes/llmfeed-validator'

const result = validateCapabilitySchemas(feed.capabilities)

if (!result.valid) {
  console.log('Schema errors:', result.errors)
}
```

## CLI Usage

```bash
# Validate a local LLMFeed JSON file
npx llmfeed-validate ./llmfeed.json

# Validate a remote feed
npx llmfeed-validate https://example.com/.well-known/llmfeed.json

# Verify signatures
npx llmfeed-validate ./signed-feed.json --verify-signature

# Output JSON results
npx llmfeed-validate ./llmfeed.json --json
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

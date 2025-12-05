# Validator API

Complete API reference for `@25xcodes/llmfeed-validator`.

::: info Format Support
All validation functions work with **LLMFeed JSON** format. Support for **llm.txt** parsing is planned.
:::

## Functions

### validateFeedStructure

Validate the structure of a feed against the LLMFeed schema.

```typescript
function validateFeedStructure(feed: unknown): ValidationResult
```

**Parameters:**
- `feed` - The feed object to validate

**Returns:** `ValidationResult`

```typescript
interface ValidationResult {
  valid: boolean
  errors: string[]
}
```

**Example:**

```typescript
import { validateFeedStructure } from '@25xcodes/llmfeed-validator'

const result = validateFeedStructure({
  feed_type: 'llmfeed',
  metadata: {
    title: 'My Service',
    origin: 'https://example.com',
    description: 'A helpful service'
  },
  items: [{ title: 'Doc', url: 'https://example.com' }]
})

if (result.valid) {
  console.log('LLMFeed JSON is valid')
} else {
  console.log('Errors:', result.errors)
}
```

---

### validateLLMFeed

Full validation including optional signature verification.

```typescript
async function validateLLMFeed(feed: unknown): Promise<FullValidationResult>
```

**Parameters:**
- `feed` - The feed object to validate

**Returns:** `Promise<FullValidationResult>`

```typescript
interface FullValidationResult {
  valid: boolean
  structureValid: boolean
  signatureValid: boolean
  signatureError?: string
  errors: string[]
}
```

**Example:**

```typescript
import { validateLLMFeed } from '@25xcodes/llmfeed-validator'

const result = await validateLLMFeed(signedFeed)

console.log('Overall valid:', result.valid)
console.log('Structure valid:', result.structureValid)
console.log('Signature valid:', result.signatureValid)
```

---

### fetchLLMFeed

Fetch and validate a feed from a URL.

```typescript
async function fetchLLMFeed(url: string): Promise<FetchResult>
```

**Parameters:**
- `url` - The URL to fetch the feed from

**Returns:** `Promise<FetchResult>`

```typescript
interface FetchResult {
  feed: LLMFeed | null
  valid: boolean
  structureValid: boolean
  signatureValid: boolean
  errors: string[]
}
```

**Example:**

```typescript
import { fetchLLMFeed } from '@25xcodes/llmfeed-validator'

// Fetch LLMFeed JSON (recommended)
const result = await fetchLLMFeed('https://example.com/.well-known/llmfeed.json')

if (result.valid && result.feed) {
  console.log('Feed title:', result.feed.metadata.title)
}
```

::: info llm.txt
fetchLLMFeed can fetch llm.txt files but cannot yet parse or validate them. Full support coming soon.
:::

---

### verifyEd25519Signature

Verify the Ed25519 signature of a signed feed.

```typescript
async function verifyEd25519Signature(feed: unknown): Promise<boolean>
```

**Parameters:**
- `feed` - The signed feed object

**Returns:** `Promise<boolean>` - `true` if signature is valid

**Example:**

```typescript
import { verifyEd25519Signature } from '@25xcodes/llmfeed-validator'

const isValid = await verifyEd25519Signature(signedFeed)
console.log('Signature valid:', isValid)
```

---

### validateCapabilitySchemas

Validate JSON Schema definitions in capabilities.

```typescript
function validateCapabilitySchemas(capabilities: Capability[]): ValidationResult
```

**Parameters:**
- `capabilities` - Array of capability objects

**Returns:** `ValidationResult`

**Example:**

```typescript
import { validateCapabilitySchemas } from '@25xcodes/llmfeed-validator'

const result = validateCapabilitySchemas(feed.capabilities)

if (!result.valid) {
  console.log('Schema errors:', result.errors)
}
```

---

### detectSigningIssues

Debug signature issues by detecting common problems.

```typescript
function detectSigningIssues(feed: unknown): SigningIssue[]
```

**Parameters:**
- `feed` - The feed to analyze

**Returns:** `SigningIssue[]`

```typescript
interface SigningIssue {
  type: 'error' | 'warning'
  message: string
  field?: string
}
```

**Example:**

```typescript
import { detectSigningIssues } from '@25xcodes/llmfeed-validator'

const issues = detectSigningIssues(feed)

for (const issue of issues) {
  console.log(`${issue.type}: ${issue.message}`)
}
```

---

## Utility Functions

### sha256

Compute SHA-256 hash of a string.

```typescript
async function sha256(text: string): Promise<string>
```

**Example:**

```typescript
import { sha256 } from '@25xcodes/llmfeed-validator'

const hash = await sha256('hello world')
// => 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
```

---

### deepSortObject

Recursively sort object keys for canonical JSON.

```typescript
function deepSortObject(obj: unknown): unknown
```

**Example:**

```typescript
import { deepSortObject } from '@25xcodes/llmfeed-validator'

const sorted = deepSortObject({ b: 2, a: 1 })
// => { a: 1, b: 2 }

const canonical = JSON.stringify(sorted)
```

---

### base64ToUint8Array

Decode a base64 string to Uint8Array.

```typescript
function base64ToUint8Array(base64: string): Uint8Array
```

**Example:**

```typescript
import { base64ToUint8Array } from '@25xcodes/llmfeed-validator'

const bytes = base64ToUint8Array('SGVsbG8gV29ybGQ=')
```

---

### pemToPublicKey

Parse a PEM-formatted public key.

```typescript
function pemToPublicKey(pem: string): Uint8Array
```

**Example:**

```typescript
import { pemToPublicKey } from '@25xcodes/llmfeed-validator'

const publicKey = pemToPublicKey(`-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA...
-----END PUBLIC KEY-----`)
```

---

## Types

### LLMFeed

```typescript
interface LLMFeed {
  title: string
  description?: string
  url?: string
  logo?: string
  contact?: {
    email?: string
    name?: string
    url?: string
  }
  capabilities?: Capability[]
  items: Item[]
  trust?: TrustBlock
  meta?: Record<string, unknown>
}
```

### Capability

```typescript
interface Capability {
  name: string
  description: string
  endpoint?: string
  method?: string
  authentication?: {
    type: string
    header?: string
  }
  parameters?: object
  response?: object
  rateLimit?: {
    requests: number
    window: string
  }
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
}
```

### TrustBlock

```typescript
interface TrustBlock {
  type: 'signed'
  algorithm: 'ed25519'
  publicKey: string
  signature: string
  signedBlocks: string[]
  timestamp?: string
  contentHash?: string
}
```

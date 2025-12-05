# @25xcodes/llmfeed-signer

Ed25519 key generation and cryptographic feed signing for LLMFeed JSON.

<div style="display: flex; gap: 0.5rem; margin: 1rem 0;">
  <a href="https://www.npmjs.com/package/@25xcodes/llmfeed-signer">
    <img src="https://img.shields.io/npm/v/@25xcodes/llmfeed-signer?color=cb3837" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/@25xcodes/llmfeed-signer">
    <img src="https://img.shields.io/npm/dm/@25xcodes/llmfeed-signer" alt="npm downloads">
  </a>
</div>

## Format Support

| Format | Status |
|--------|--------|
| **LLMFeed JSON** | ✅ Fully Supported |
| **llm.txt** | ❌ Not Applicable |

::: info Why No llm.txt Signing?
The llm.txt markdown format is designed for human readability and doesn't have a structured format suitable for cryptographic signing. Use LLMFeed JSON for feeds that require signature verification.
:::

## Features

- 🔑 **Key Generation** - Generate Ed25519 key pairs
- ✍️ **Feed Signing** - Sign feeds with cryptographic signatures
- 📜 **PEM Support** - Work with PEM-formatted keys
- 🔄 **Key Loading** - Load existing keys from files
- ✅ **Signature Verification** - Verify signed feeds

## Quick Start

```bash
npm install @25xcodes/llmfeed-signer
```

```typescript
import { generateKeyPair, signFeed } from '@25xcodes/llmfeed-signer'

// Generate keys
const { privateKey, publicKey } = await generateKeyPair()

// Sign a LLMFeed JSON
const feed = {
  feed_type: 'llmfeed',
  metadata: {
    title: 'My Service',
    origin: 'https://example.com',
    description: 'A helpful service'
  },
  items: [{ title: 'Doc', url: 'https://example.com' }]
}

const signedFeed = await signFeed(feed, privateKey)
```

## Core Functions

### `generateKeyPair()`

Generate a new Ed25519 key pair:

```typescript
import { generateKeyPair } from '@25xcodes/llmfeed-signer'

const keyPair = await generateKeyPair()

console.log(keyPair.privateKey)     // Base64 PKCS#8
console.log(keyPair.publicKey)      // Base64 raw (32 bytes)
console.log(keyPair.privateKeyPem)  // PEM format
console.log(keyPair.publicKeyPem)   // PEM format
console.log(keyPair.createdAt)      // ISO timestamp
```

### `signFeed(feed, privateKey, options?)`

Sign a feed with your private key:

```typescript
import { signFeed } from '@25xcodes/llmfeed-signer'

const signedFeed = await signFeed(feed, privateKey)

// Specify which blocks to sign
const signedFeed = await signFeed(feed, privateKey, {
  signedBlocks: ['title', 'capabilities']
})
```

The private key can be in multiple formats:
- PEM format (with `-----BEGIN PRIVATE KEY-----` headers)
- Base64-encoded PKCS#8 (48 bytes decoded)
- Base64-encoded raw seed (32 bytes decoded)

### `verifyFeed(feed)`

Verify a signed feed:

```typescript
import { verifyFeed } from '@25xcodes/llmfeed-signer'

const isValid = await verifyFeed(signedFeed)
```

### `loadKeyPair(privateKey)`

Load an existing private key:

```typescript
import { loadKeyPair } from '@25xcodes/llmfeed-signer'
import fs from 'fs'

const privateKeyPem = fs.readFileSync('./private.pem', 'utf-8')
const keyPair = await loadKeyPair(privateKeyPem)
```

## Key Formats

### PEM Format

```typescript
const pem = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIOF0PrJOZV9pPi4E7E9QPWV3Q9o/K7d2mZs8L5Q+Abc1
-----END PRIVATE KEY-----`

const signedFeed = await signFeed(feed, pem)
```

### Base64 PKCS#8

```typescript
const base64Pkcs8 = 'MC4CAQAwBQYDK2VwBCIEIOF0PrJOZV9pPi4E7E9QPWV3Q9o/...'

const signedFeed = await signFeed(feed, base64Pkcs8)
```

### PEM Utilities

```typescript
import { formatPem, parsePem } from '@25xcodes/llmfeed-signer'

// Create PEM from base64
const pem = formatPem(base64Key, 'PRIVATE KEY')

// Extract base64 from PEM
const base64 = parsePem(pem)
```

## CLI Usage

```bash
# Generate a new key pair
npx llmfeed-sign keygen --output ./keys

# Sign a LLMFeed JSON file
npx llmfeed-sign sign ./llmfeed.json --key ./keys/private.pem --output ./signed.json

# Sign specific blocks only
npx llmfeed-sign sign ./llmfeed.json --key ./keys/private.pem --blocks feed_type,metadata,capabilities

# Verify a signed feed
npx llmfeed-sign verify ./signed.json
```

## Utility Functions

```typescript
import {
  sha256,
  deepSortObject,
  uint8ArrayToBase64,
  base64ToUint8Array,
  formatPem,
  parsePem,
  pemToPublicKey
} from '@25xcodes/llmfeed-signer'

// Hash content
const hash = await sha256(JSON.stringify(feed))

// Canonical JSON
const canonical = JSON.stringify(deepSortObject(obj))

// Base64 conversion
const base64 = uint8ArrayToBase64(bytes)
const bytes = base64ToUint8Array(base64)
```

## Trust Block Output

The signed feed includes a `trust` block:

```json
{
  "title": "My Service",
  "items": [...],
  "trust": {
    "type": "signed",
    "algorithm": "ed25519",
    "publicKey": "MCowBQYDK2VwAyEA...",
    "signature": "base64-signature...",
    "signedBlocks": ["title", "items"],
    "timestamp": "2025-12-01T14:30:00Z",
    "contentHash": "sha256:a7b3c4d5..."
  }
}
```

## Security Best Practices

::: danger Never expose private keys
- Don't commit private keys to version control
- Use environment variables in CI/CD
- Use a secrets manager for production
:::

```typescript
// ✅ Good: Load from environment
const privateKey = process.env.LLMFEED_PRIVATE_KEY

// ❌ Bad: Hardcoded key
const privateKey = 'MC4CAQAwBQYDK2VwBCIEI...'
```

## Next Steps

- [Installation](/packages/signer/installation) - Detailed installation guide
- [Key Management](/packages/signer/key-management) - Managing your keys securely
- [Signing Feeds](/packages/signer/signing) - Complete signing guide
- [API Reference](/api/signer) - Full API documentation

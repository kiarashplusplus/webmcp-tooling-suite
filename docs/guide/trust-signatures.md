# Trust & Signatures

Cryptographic signatures are essential for establishing trust in the MCP ecosystem. This guide explains how signing works and how to implement it in your feeds.

::: info Format Support
Cryptographic signing is fully supported for **LLMFeed JSON** format. Signing for **llm.txt** (markdown) files is not supported due to the format's flexibility.
:::

## Why Sign Feeds?

Without signatures, AI agents have no way to verify:

- **Authenticity** - Is this feed really from who it claims to be?
- **Integrity** - Has the feed been tampered with?
- **Non-repudiation** - Can the publisher deny creating this feed?

Signatures solve all three problems using public-key cryptography.

## How It Works

LLMFeed uses **Ed25519** signatures, a modern elliptic curve algorithm that provides:

- Fast signing and verification
- Small key and signature sizes
- Strong security guarantees
- Wide library support

### The Signing Process

```
┌─────────────────────────────────────────────────────────────┐
│                 Your LLMFeed JSON                         │
│  {                                                        │
│    "feed_type": "llmfeed",                                │
│    "metadata": { "title": "My Service", ... },            │
│    "capabilities": [...],                                 │
│    "items": [...]                                         │
│  }                                                        │
└──────────────────────────┴──────────────────────────────────┘
                           │
                    1. Select blocks to sign
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Canonical Payload                       │
│  {"capabilities":[...],"feed_type":"llmfeed","items":..., │
│   "metadata":{...}}                                        │
│  (sorted keys, no whitespace)                              │
└───────────────────────────┬─────────────────────────────────┘
                           │
                    2. Hash with SHA-256
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       SHA-256 Hash                           │
│  a7b3c4d5e6f7...                                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    3. Sign with Ed25519 private key
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        Signature                             │
│  base64-encoded-64-byte-signature                           │
└─────────────────────────────────────────────────────────────┘
```

### The Trust Block

The signature and related metadata go in the `trust` block:

```json
{
  "feed_type": "llmfeed",
  "metadata": {
    "title": "My Service",
    "origin": "https://example.com",
    "description": "Service description"
  },
  "capabilities": [...],
  "items": [...],
  "trust": {
    "type": "signed",
    "algorithm": "ed25519",
    "publicKey": "MCowBQYDK2VwAyEA...",
    "signature": "base64-signature...",
    "signedBlocks": ["feed_type", "metadata", "capabilities", "items"],
    "timestamp": "2024-03-20T14:30:00Z",
    "contentHash": "sha256:a7b3c4d5e6f7..."
  }
}
```

#### Trust Block Fields

| Field | Required | Description |
|-------|----------|-------------|
| `type` | ✅ | Always `"signed"` for cryptographic signatures |
| `algorithm` | ✅ | Signing algorithm, currently `"ed25519"` |
| `publicKey` | ✅ | Base64-encoded public key (SPKI format) |
| `signature` | ✅ | Base64-encoded signature |
| `signedBlocks` | ✅ | Array of top-level keys that were signed |
| `timestamp` | ❌ | ISO 8601 signing timestamp |
| `contentHash` | ❌ | Hash of the signed content |

## Key Management

### Generating Keys

Generate a new key pair:

```bash
# Using CLI
npx llmfeed-sign keygen --output ./keys

# Creates:
# - keys/private.pem
# - keys/public.pem
```

Or programmatically:

```typescript
import { generateKeyPair } from '@25xcodes/llmfeed-signer'

const keyPair = await generateKeyPair()

console.log(keyPair.privateKeyPem)  // PEM format
console.log(keyPair.publicKeyPem)   // PEM format
console.log(keyPair.privateKey)     // Base64 PKCS#8
console.log(keyPair.publicKey)      // Base64 raw 32 bytes
```

### Key Formats

The signer supports multiple key formats:

#### PEM Format (Recommended)

```
-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIOF0PrJOZV9pPi4E7E9QPWV3Q9o/...
-----END PRIVATE KEY-----
```

#### Base64 PKCS#8

```
MC4CAQAwBQYDK2VwBCIEIOF0PrJOZV9pPi4E7E9QPWV3Q9o/...
```

#### Base64 Raw Seed (32 bytes)

```
4XQ+sk5lX2k+LgTsT1A9ZXdD2j8K...
```

### Storing Keys Securely

::: danger NEVER commit private keys to version control
Private keys should be stored securely:
- Use environment variables in CI/CD
- Use a secrets manager (AWS Secrets Manager, HashiCorp Vault)
- Use encrypted storage for local development
:::

Example with environment variables:

```typescript
const privateKey = process.env.LLMFEED_PRIVATE_KEY

if (!privateKey) {
  throw new Error('LLMFEED_PRIVATE_KEY not set')
}

const signedFeed = await signFeed(feed, privateKey)
```

### Key Rotation

Periodically rotate your signing keys:

1. Generate a new key pair
2. Update your feed with the new signature
3. Publish the new public key
4. Archive (don't delete) the old public key for verification of historical signatures

## Signing Feeds

### Basic Signing

```typescript
import { signFeed } from '@25xcodes/llmfeed-signer'
import fs from 'fs'

const feed = {
  title: 'My Service',
  description: 'Service description',
  capabilities: [...],
  items: [...]
}

const privateKey = fs.readFileSync('./keys/private.pem', 'utf-8')

const signedFeed = await signFeed(feed, privateKey)
```

### Selective Block Signing

By default, all blocks except `trust` and `signature` are signed. You can specify which blocks to sign:

```typescript
const signedFeed = await signFeed(feed, privateKey, {
  signedBlocks: ['title', 'capabilities']  // Only sign these
})
```

This is useful when:
- Some blocks change frequently (like `items`)
- You want to allow certain modifications without breaking the signature

### CLI Signing

```bash
# Sign a feed file
npx llmfeed-sign sign feed.json --key ./keys/private.pem --output signed.json

# Sign with specific blocks
npx llmfeed-sign sign feed.json --key ./keys/private.pem --blocks title,capabilities
```

## Verifying Signatures

### Basic Verification

```typescript
import { validateLLMFeed } from '@25xcodes/llmfeed-validator'

const result = await validateLLMFeed(signedFeed)

if (result.signatureValid) {
  console.log('✅ Signature is valid')
} else {
  console.log('❌ Signature verification failed:', result.signatureError)
}
```

### Verification Process

The validator:

1. Extracts `signedBlocks` from the trust block
2. Rebuilds the canonical payload from those blocks
3. Verifies the signature using the embedded public key
4. Optionally verifies the content hash

### CLI Verification

```bash
npx llmfeed-validate signed.json --verify-signature
```

## Trust Levels

Different levels of trust can be established:

### Level 1: Self-Signed

The feed includes its own public key. Agents must decide whether to trust this key.

```json
{
  "trust": {
    "type": "signed",
    "publicKey": "self-signed-key..."
  }
}
```

### Level 2: DNS Verification

The public key is also published at a DNS TXT record, providing domain ownership proof:

```
llmfeed.example.com TXT "v=llmfeed1; k=ed25519; p=base64-public-key"
```

### Level 3: Certificate Authority

The public key is signed by a trusted certificate authority (future enhancement).

## Best Practices

### 1. Always Sign Production Feeds

```typescript
// Don't publish unsigned feeds in production
if (process.env.NODE_ENV === 'production') {
  feed = await signFeed(feed, privateKey)
}
```

### 2. Include Timestamps

```typescript
const signedFeed = await signFeed(feed, privateKey, {
  includeTimestamp: true
})
```

### 3. Publish Your Public Key

Make your public key easily discoverable:

```json
{
  "meta": {
    "publicKeyUrl": "https://example.com/.well-known/llmfeed-pubkey.pem"
  }
}
```

### 4. Monitor Signature Issues

Use the health monitor to track signature validity:

```typescript
import { crawlFeed } from '@25xcodes/llmfeed-health-monitor'

const result = await crawlFeed('https://example.com/llm.txt')

if (!result.signatureValid) {
  // Alert: signature verification failed
  notifyOps('Feed signature invalid', result)
}
```

## Troubleshooting

### "Invalid signature" Error

Common causes:
1. **Modified content** - The feed was changed after signing
2. **Wrong key** - Verifying with a different public key
3. **Encoding issues** - Key not properly base64 encoded
4. **Block mismatch** - `signedBlocks` doesn't match signed content

### "Invalid key format" Error

The signer accepts multiple formats. Ensure your key is one of:
- PEM format with proper headers
- Base64-encoded PKCS#8 (48 bytes decoded)
- Base64-encoded raw seed (32 bytes decoded)

### Debugging Signatures

Use the signature debugger in the playground:

```bash
open https://kiarashplusplus.github.io/webmcp-tooling-suite/
# Navigate to "Signature Debugger" tab
```

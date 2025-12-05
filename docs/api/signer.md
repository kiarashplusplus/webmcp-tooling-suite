# Signer API

Complete API reference for `@25xcodes/llmfeed-signer`.

::: info Format Support
Signing is only available for **LLMFeed JSON** format. The llm.txt markdown format does not support cryptographic signatures.
:::

## Functions

### generateKeyPair

Generate a new Ed25519 key pair.

```typescript
async function generateKeyPair(): Promise<KeyPair>
```

**Returns:** `Promise<KeyPair>`

```typescript
interface KeyPair {
  privateKey: string      // Base64-encoded PKCS#8
  publicKey: string       // Base64-encoded raw (32 bytes)
  privateKeyPem: string   // PEM format
  publicKeyPem: string    // PEM format
  createdAt: string       // ISO 8601 timestamp
}
```

**Example:**

```typescript
import { generateKeyPair } from '@25xcodes/llmfeed-signer'

const keyPair = await generateKeyPair()

console.log(keyPair.privateKeyPem)
// -----BEGIN PRIVATE KEY-----
// MC4CAQAwBQYDK2VwBCIEI...
// -----END PRIVATE KEY-----

console.log(keyPair.publicKeyPem)
// -----BEGIN PUBLIC KEY-----
// MCowBQYDK2VwAyEA...
// -----END PUBLIC KEY-----
```

---

### signFeed

Sign an LLMFeed with an Ed25519 private key.

```typescript
async function signFeed(
  feed: Record<string, unknown>,
  privateKey: string,
  options?: SigningOptions
): Promise<SignedFeed>
```

**Parameters:**
- `feed` - The feed object to sign
- `privateKey` - Private key in PEM, base64 PKCS#8, or raw seed format
- `options` - Optional signing options

**Options:**

```typescript
interface SigningOptions {
  signedBlocks?: string[]  // Blocks to sign (default: all except trust)
}
```

**Returns:** `Promise<SignedFeed>` - The feed with added trust block

**Example:**

```typescript
import { signFeed } from '@25xcodes/llmfeed-signer'

const feed = {
  feed_type: 'llmfeed',
  metadata: {
    title: 'My Service',
    origin: 'https://example.com',
    description: 'A helpful service'
  },
  capabilities: [...],
  items: [...]
}

// Sign with PEM key
const privateKey = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEI...
-----END PRIVATE KEY-----`

const signedFeed = await signFeed(feed, privateKey)

// Sign specific blocks only
const signedFeed = await signFeed(feed, privateKey, {
  signedBlocks: ['feed_type', 'metadata', 'capabilities']
})
```

---

### verifyFeed

Verify the signature of a signed feed.

```typescript
async function verifyFeed(feed: Record<string, unknown>): Promise<boolean>
```

**Parameters:**
- `feed` - The signed feed to verify

**Returns:** `Promise<boolean>` - `true` if signature is valid

**Example:**

```typescript
import { verifyFeed } from '@25xcodes/llmfeed-signer'

const isValid = await verifyFeed(signedFeed)

if (isValid) {
  console.log('Signature is valid')
} else {
  console.log('Signature verification failed')
}
```

---

### loadKeyPair

Load an existing key pair from a private key.

```typescript
async function loadKeyPair(privateKey: string): Promise<KeyPair>
```

**Parameters:**
- `privateKey` - Private key in PEM or base64 format

**Returns:** `Promise<KeyPair>`

**Example:**

```typescript
import { loadKeyPair } from '@25xcodes/llmfeed-signer'
import fs from 'fs'

const privateKeyPem = fs.readFileSync('./private.pem', 'utf-8')
const keyPair = await loadKeyPair(privateKeyPem)

console.log(keyPair.publicKey)  // Derived public key
```

---

## Utility Functions

### formatPem

Format a base64 string as PEM.

```typescript
function formatPem(base64: string, type: string): string
```

**Parameters:**
- `base64` - Base64-encoded key bytes
- `type` - PEM type ('PRIVATE KEY' or 'PUBLIC KEY')

**Example:**

```typescript
import { formatPem } from '@25xcodes/llmfeed-signer'

const pem = formatPem('MC4CAQAwBQYDK2VwBCIEI...', 'PRIVATE KEY')
// -----BEGIN PRIVATE KEY-----
// MC4CAQAwBQYDK2VwBCIEI...
// -----END PRIVATE KEY-----
```

---

### parsePem

Extract base64 content from PEM format.

```typescript
function parsePem(pem: string): string
```

**Parameters:**
- `pem` - PEM-formatted string

**Returns:** Base64 content without headers

**Example:**

```typescript
import { parsePem } from '@25xcodes/llmfeed-signer'

const base64 = parsePem(`-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEI...
-----END PRIVATE KEY-----`)

console.log(base64)  // MC4CAQAwBQYDK2VwBCIEI...
```

---

### deepSortObject

Recursively sort object keys for canonical JSON.

```typescript
function deepSortObject(obj: unknown): unknown
```

**Example:**

```typescript
import { deepSortObject } from '@25xcodes/llmfeed-signer'

const canonical = JSON.stringify(deepSortObject(feed))
```

---

### sha256

Compute SHA-256 hash.

```typescript
async function sha256(text: string): Promise<string>
```

**Example:**

```typescript
import { sha256 } from '@25xcodes/llmfeed-signer'

const hash = await sha256(JSON.stringify(feed))
```

---

### uint8ArrayToBase64

Encode Uint8Array to base64.

```typescript
function uint8ArrayToBase64(bytes: Uint8Array): string
```

---

### base64ToUint8Array

Decode base64 to Uint8Array.

```typescript
function base64ToUint8Array(base64: string): Uint8Array
```

---

### pemToPublicKey

Parse PEM public key to bytes.

```typescript
function pemToPublicKey(pem: string): Uint8Array
```

---

## Types

### KeyPair

```typescript
interface KeyPair {
  privateKey: string      // Base64 PKCS#8
  publicKey: string       // Base64 raw 32 bytes
  privateKeyPem: string   // PEM format
  publicKeyPem: string    // PEM format
  createdAt: string       // ISO 8601
}
```

### SigningOptions

```typescript
interface SigningOptions {
  signedBlocks?: string[]
}
```

### SignedFeed

```typescript
interface SignedFeed {
  // Original feed fields...
  trust: {
    type: 'signed'
    algorithm: 'ed25519'
    publicKey: string
    signature: string
    signedBlocks: string[]
    timestamp: string
    contentHash: string
  }
}
```

## Key Format Details

The signer accepts private keys in multiple formats:

### PEM Format

```
-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIOF0PrJOZV9pPi4E7E9QPWV3Q9o/K7d2mZs8L5Q+Abc1
-----END PRIVATE KEY-----
```

### Base64 PKCS#8 (48 bytes decoded)

```
MC4CAQAwBQYDK2VwBCIEIOF0PrJOZV9pPi4E7E9QPWV3Q9o/K7d2mZs8L5Q+Abc1
```

### Base64 Raw Seed (32 bytes decoded)

```
4XQ+sk5lX2k+LgTsT1A9ZXdD2j8rt3aZmzwvlD4BtzU=
```

The `signFeed` function automatically detects the format and handles it appropriately.

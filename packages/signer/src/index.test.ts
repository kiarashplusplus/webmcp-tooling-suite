/**
 * Signer Package Test Suite
 */

import { describe, it, expect } from 'vitest'
import {
  generateKeyPair,
  signFeed,
  verifyFeed,
  deepSortObject,
  sha256,
  uint8ArrayToBase64,
  base64ToUint8Array,
  formatPem,
  parsePem,
  pemToPublicKey,
  type KeyPair,
  type SignedFeed
} from './index.js'

describe('deepSortObject', () => {
  it('should return primitives unchanged', () => {
    expect(deepSortObject(null)).toBe(null)
    expect(deepSortObject(undefined)).toBe(undefined)
    expect(deepSortObject(42)).toBe(42)
    expect(deepSortObject('hello')).toBe('hello')
    expect(deepSortObject(true)).toBe(true)
  })

  it('should sort object keys alphabetically', () => {
    const input = { z: 1, a: 2, m: 3 }
    const result = deepSortObject(input)
    const keys = Object.keys(result as object)
    expect(keys).toEqual(['a', 'm', 'z'])
  })

  it('should recursively sort nested objects', () => {
    const input = {
      z: { c: 1, a: 2 },
      a: { z: 3, b: 4 }
    }
    const result = deepSortObject(input) as Record<string, Record<string, number>>
    const topKeys = Object.keys(result)
    expect(topKeys).toEqual(['a', 'z'])
    expect(Object.keys(result.a)).toEqual(['b', 'z'])
    expect(Object.keys(result.z)).toEqual(['a', 'c'])
  })

  it('should handle arrays correctly', () => {
    const input = [{ b: 1, a: 2 }, { d: 3, c: 4 }]
    const result = deepSortObject(input) as Array<Record<string, number>>
    expect(Array.isArray(result)).toBe(true)
    expect(Object.keys(result[0])).toEqual(['a', 'b'])
    expect(Object.keys(result[1])).toEqual(['c', 'd'])
  })

  it('should produce canonical JSON for consistent hashing', () => {
    const obj1 = { b: 1, a: 2, c: { z: 1, y: 2 } }
    const obj2 = { c: { y: 2, z: 1 }, a: 2, b: 1 }
    
    const sorted1 = JSON.stringify(deepSortObject(obj1))
    const sorted2 = JSON.stringify(deepSortObject(obj2))
    
    expect(sorted1).toBe(sorted2)
  })
})

describe('sha256', () => {
  it('should compute consistent hash for same input', async () => {
    const text = 'Hello, World!'
    const hash1 = await sha256(text)
    const hash2 = await sha256(text)
    expect(hash1).toBe(hash2)
  })

  it('should produce 64-character hex string', async () => {
    const hash = await sha256('test')
    expect(hash.length).toBe(64)
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true)
  })

  it('should produce different hashes for different inputs', async () => {
    const hash1 = await sha256('input1')
    const hash2 = await sha256('input2')
    expect(hash1).not.toBe(hash2)
  })

  it('should handle empty string', async () => {
    const hash = await sha256('')
    expect(hash.length).toBe(64)
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })
})

describe('uint8ArrayToBase64 and base64ToUint8Array', () => {
  it('should roundtrip encode/decode correctly', () => {
    const original = new Uint8Array([72, 101, 108, 108, 111]) // 'Hello'
    const base64 = uint8ArrayToBase64(original)
    const decoded = base64ToUint8Array(base64)
    expect(Array.from(decoded)).toEqual(Array.from(original))
  })

  it('should handle empty array', () => {
    const empty = new Uint8Array([])
    const base64 = uint8ArrayToBase64(empty)
    const decoded = base64ToUint8Array(base64)
    expect(decoded.length).toBe(0)
  })

  it('should handle 32-byte array (Ed25519 key size)', () => {
    const keyBytes = new Uint8Array(32)
    for (let i = 0; i < 32; i++) keyBytes[i] = i
    
    const base64 = uint8ArrayToBase64(keyBytes)
    const decoded = base64ToUint8Array(base64)
    
    expect(decoded.length).toBe(32)
    expect(Array.from(decoded)).toEqual(Array.from(keyBytes))
  })

  it('should handle 64-byte array (Ed25519 signature size)', () => {
    const sigBytes = new Uint8Array(64)
    for (let i = 0; i < 64; i++) sigBytes[i] = i % 256
    
    const base64 = uint8ArrayToBase64(sigBytes)
    const decoded = base64ToUint8Array(base64)
    
    expect(decoded.length).toBe(64)
    expect(Array.from(decoded)).toEqual(Array.from(sigBytes))
  })
})

describe('formatPem and parsePem', () => {
  it('should format base64 as PUBLIC KEY PEM', () => {
    const base64 = 'AAAA'
    const pem = formatPem(base64, 'PUBLIC KEY')
    expect(pem).toContain('-----BEGIN PUBLIC KEY-----')
    expect(pem).toContain('-----END PUBLIC KEY-----')
    expect(pem).toContain('AAAA')
  })

  it('should format base64 as PRIVATE KEY PEM', () => {
    const base64 = 'BBBB'
    const pem = formatPem(base64, 'PRIVATE KEY')
    expect(pem).toContain('-----BEGIN PRIVATE KEY-----')
    expect(pem).toContain('-----END PRIVATE KEY-----')
  })

  it('should split long base64 into 64-character lines', () => {
    const longBase64 = 'A'.repeat(128)
    const pem = formatPem(longBase64, 'PUBLIC KEY')
    const lines = pem.split('\n')
    // Find content lines (exclude BEGIN/END)
    const contentLines = lines.filter(l => !l.startsWith('-----'))
    expect(contentLines.length).toBe(2)
    expect(contentLines[0].length).toBe(64)
    expect(contentLines[1].length).toBe(64)
  })

  it('should roundtrip format/parse', () => {
    const original = 'SGVsbG8gV29ybGQh'
    const pem = formatPem(original, 'PUBLIC KEY')
    const parsed = parsePem(pem)
    expect(parsed).toBe(original)
  })

  it('should remove whitespace when parsing', () => {
    const pem = `-----BEGIN PUBLIC KEY-----
    SGVs
    bG8=
    -----END PUBLIC KEY-----`
    const parsed = parsePem(pem)
    expect(parsed).toBe('SGVsbG8=')
  })
})

describe('pemToPublicKey', () => {
  it('should extract raw 32-byte key from SPKI PEM', () => {
    // Valid Ed25519 SPKI public key PEM
    const validPem = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAuZQvQwO1AE2b7dUqGdz0xGj3AMGaXxlLhMq9sHJSTHU=
-----END PUBLIC KEY-----`
    
    const result = pemToPublicKey(validPem)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBe(32)
  })

  it('should handle raw 32-byte key (base64)', () => {
    // 32-byte key wrapped in minimal PEM
    const raw32 = new Uint8Array(32)
    for (let i = 0; i < 32; i++) raw32[i] = i
    const base64 = uint8ArrayToBase64(raw32)
    const pem = formatPem(base64, 'PUBLIC KEY')
    
    const result = pemToPublicKey(pem)
    expect(result.length).toBe(32)
  })
})

describe('generateKeyPair', () => {
  it('should generate a valid Ed25519 keypair', async () => {
    const keyPair = await generateKeyPair()
    
    expect(keyPair).toBeDefined()
    expect(keyPair.privateKey).toBeDefined()
    expect(keyPair.publicKey).toBeDefined()
    expect(keyPair.privateKeyPem).toBeDefined()
    expect(keyPair.publicKeyPem).toBeDefined()
    expect(keyPair.createdAt).toBeDefined()
  })

  it('should produce valid base64 private key', async () => {
    const keyPair = await generateKeyPair()
    const decoded = base64ToUint8Array(keyPair.privateKey)
    // PKCS#8 Ed25519 private key is 48 bytes
    expect(decoded.length).toBe(48)
  })

  it('should produce valid base64 public key', async () => {
    const keyPair = await generateKeyPair()
    const decoded = base64ToUint8Array(keyPair.publicKey)
    // Raw Ed25519 public key is 32 bytes
    expect(decoded.length).toBe(32)
  })

  it('should produce PEM-formatted keys', async () => {
    const keyPair = await generateKeyPair()
    
    expect(keyPair.privateKeyPem).toContain('-----BEGIN PRIVATE KEY-----')
    expect(keyPair.privateKeyPem).toContain('-----END PRIVATE KEY-----')
    expect(keyPair.publicKeyPem).toContain('-----BEGIN PUBLIC KEY-----')
    expect(keyPair.publicKeyPem).toContain('-----END PUBLIC KEY-----')
  })

  it('should generate different keypairs each time', async () => {
    const keyPair1 = await generateKeyPair()
    const keyPair2 = await generateKeyPair()
    
    expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey)
    expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey)
  })

  it('should include ISO timestamp', async () => {
    const keyPair = await generateKeyPair()
    const date = new Date(keyPair.createdAt)
    expect(date.getTime()).not.toBeNaN()
  })
})

describe('signFeed', () => {
  let keyPair: KeyPair

  // Generate a keypair before tests
  it('should setup test keypair', async () => {
    keyPair = await generateKeyPair()
    expect(keyPair).toBeDefined()
  })

  it('should sign a feed successfully', async () => {
    const feed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test Feed',
        origin: 'https://example.com',
        description: 'A test feed'
      },
      capabilities: [
        { name: 'test', type: 'tool', description: 'Test tool' }
      ]
    }

    const result = await signFeed(feed, keyPair.privateKey)
    
    expect(result).toBeDefined()
    expect(result.signature).toBeDefined()
    expect(result.feed.trust).toBeDefined()
    expect(result.feed.signature).toBeDefined()
  })

  it('should produce 64-byte signature (base64 encoded)', async () => {
    const feed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      }
    }

    const result = await signFeed(feed, keyPair.privateKey)
    const sigBytes = base64ToUint8Array(result.signature)
    expect(sigBytes.length).toBe(64)
  })

  it('should include trust block with Ed25519 algorithm', async () => {
    const feed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      }
    }

    const result = await signFeed(feed, keyPair.privateKey)
    const trust = result.feed.trust as Record<string, unknown>
    
    expect(trust.algorithm).toBe('Ed25519')
    expect(trust.signed_blocks).toBeDefined()
  })

  it('should include signature block with value and timestamp', async () => {
    const feed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      }
    }

    const result = await signFeed(feed, keyPair.privateKey)
    const sig = result.feed.signature as Record<string, unknown>
    
    expect(sig.value).toBe(result.signature)
    expect(sig.created_at).toBeDefined()
  })

  it('should respect custom signing options', async () => {
    const feed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      },
      capabilities: []
    }

    const result = await signFeed(feed, keyPair.privateKey, {
      signedBlocks: ['metadata'],
      publicKeyUrl: 'https://example.com/key.pem',
      trustLevel: 'self-signed',
      scope: 'full'
    })

    const trust = result.feed.trust as Record<string, unknown>
    expect(trust.signed_blocks).toEqual(['metadata'])
    expect(trust.public_key_hint).toBe('https://example.com/key.pem')
    expect(trust.trust_level).toBe('self-signed')
    expect(trust.scope).toBe('full')
  })

  it('should throw error for non-existent signed block', async () => {
    const feed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      }
    }

    await expect(signFeed(feed, keyPair.privateKey, {
      signedBlocks: ['nonexistent']
    })).rejects.toThrow('does not exist')
  })

  it('should produce different signatures for different feeds', async () => {
    const feed1 = {
      feed_type: 'mcp',
      metadata: { title: 'Feed 1', origin: 'https://a.com', description: 'A' }
    }
    const feed2 = {
      feed_type: 'mcp',
      metadata: { title: 'Feed 2', origin: 'https://b.com', description: 'B' }
    }

    const result1 = await signFeed(feed1, keyPair.privateKey)
    const result2 = await signFeed(feed2, keyPair.privateKey)

    expect(result1.signature).not.toBe(result2.signature)
  })

  it('should compute payload hash', async () => {
    const feed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      }
    }

    const result = await signFeed(feed, keyPair.privateKey)
    expect(result.payloadHash).toBeDefined()
    expect(result.payloadHash.length).toBe(64)
  })

  it('should accept PEM-formatted private key', async () => {
    const feed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test Feed',
        origin: 'https://example.com',
        description: 'Test'
      }
    }

    // Sign using PEM format instead of base64
    const result = await signFeed(feed, keyPair.privateKeyPem)
    
    expect(result).toBeDefined()
    expect(result.signature).toBeDefined()
    expect(result.feed.trust).toBeDefined()
    
    // Signature should be 64 bytes
    const sigBytes = base64ToUint8Array(result.signature)
    expect(sigBytes.length).toBe(64)
  })

  it('should produce same signature with PEM and base64 key', async () => {
    const feed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Consistency Test',
        origin: 'https://example.com',
        description: 'Test'
      }
    }

    const resultBase64 = await signFeed(feed, keyPair.privateKey)
    const resultPem = await signFeed(feed, keyPair.privateKeyPem)
    
    // Same key should produce same signature for same feed
    expect(resultPem.signature).toBe(resultBase64.signature)
    expect(resultPem.payloadHash).toBe(resultBase64.payloadHash)
  })
})

describe('verifyFeed', () => {
  let keyPair: KeyPair

  it('should setup test keypair for verification', async () => {
    keyPair = await generateKeyPair()
    expect(keyPair).toBeDefined()
  })

  it('should verify a correctly signed feed', async () => {
    const feed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test Feed',
        origin: 'https://example.com',
        description: 'A test feed'
      },
      capabilities: [
        { name: 'greet', type: 'tool', description: 'Greet user' }
      ]
    }

    const signedResult = await signFeed(feed, keyPair.privateKey)
    const verifyResult = await verifyFeed(signedResult.feed, keyPair.publicKey)

    expect(verifyResult.valid).toBe(true)
    expect(verifyResult.error).toBeUndefined()
  })

  it('should return error for missing trust block', async () => {
    const feed = {
      feed_type: 'mcp',
      metadata: { title: 'Test', origin: 'https://example.com', description: 'Test' },
      signature: { value: 'fake-sig' }
    }

    const result = await verifyFeed(feed, keyPair.publicKey)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('trust')
  })

  it('should return error for missing signature block', async () => {
    const feed = {
      feed_type: 'mcp',
      metadata: { title: 'Test', origin: 'https://example.com', description: 'Test' },
      trust: { signed_blocks: ['metadata'], algorithm: 'Ed25519' }
    }

    const result = await verifyFeed(feed, keyPair.publicKey)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('signature')
  })

  it('should return error for empty signed_blocks', async () => {
    const feed = {
      feed_type: 'mcp',
      metadata: { title: 'Test', origin: 'https://example.com', description: 'Test' },
      trust: { signed_blocks: [], algorithm: 'Ed25519' },
      signature: { value: 'fake-sig' }
    }

    const result = await verifyFeed(feed, keyPair.publicKey)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('signed_blocks')
  })

  it('should fail verification with wrong public key', async () => {
    const otherKeyPair = await generateKeyPair()
    
    const feed = {
      feed_type: 'mcp',
      metadata: { title: 'Test', origin: 'https://example.com', description: 'Test' }
    }

    const signedResult = await signFeed(feed, keyPair.privateKey)
    const verifyResult = await verifyFeed(signedResult.feed, otherKeyPair.publicKey)

    expect(verifyResult.valid).toBe(false)
  })

  it('should fail verification if feed is tampered', async () => {
    const feed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Original Title',
        origin: 'https://example.com',
        description: 'Test'
      }
    }

    const signedResult = await signFeed(feed, keyPair.privateKey)
    
    // Tamper with the signed feed
    const tamperedFeed = { ...signedResult.feed }
    tamperedFeed.metadata = {
      ...(tamperedFeed.metadata as object),
      title: 'Tampered Title'
    }

    const verifyResult = await verifyFeed(tamperedFeed, keyPair.publicKey)
    expect(verifyResult.valid).toBe(false)
  })

  it('should include signed blocks in result', async () => {
    const feed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      }
    }

    const signedResult = await signFeed(feed, keyPair.privateKey, {
      signedBlocks: ['metadata', 'feed_type']
    })
    const verifyResult = await verifyFeed(signedResult.feed, keyPair.publicKey)

    expect(verifyResult.valid).toBe(true)
    expect(verifyResult.signedBlocks).toContain('metadata')
    expect(verifyResult.signedBlocks).toContain('feed_type')
  })

  it('should include payload hash in result', async () => {
    const feed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      }
    }

    const signedResult = await signFeed(feed, keyPair.privateKey)
    const verifyResult = await verifyFeed(signedResult.feed, keyPair.publicKey)

    expect(verifyResult.valid).toBe(true)
    expect(verifyResult.payloadHash).toBeDefined()
    expect(verifyResult.payloadHash?.length).toBe(64)
  })
})

describe('End-to-end signing and verification', () => {
  it('should complete full roundtrip: keygen -> sign -> verify', async () => {
    // 1. Generate keypair
    const keyPair = await generateKeyPair()
    expect(keyPair.privateKey).toBeDefined()
    expect(keyPair.publicKey).toBeDefined()

    // 2. Create a feed
    const feed = {
      feed_type: 'mcp',
      metadata: {
        title: 'E2E Test Feed',
        origin: 'https://example.com',
        description: 'End-to-end test feed',
        version: '1.0.0'
      },
      capabilities: [
        { name: 'search', type: 'tool', description: 'Search capability' },
        { name: 'fetch', type: 'tool', description: 'Fetch capability' }
      ],
      agent_guidance: {
        on_load: 'Welcome to the test feed',
        interaction_tone: 'professional'
      }
    }

    // 3. Sign the feed
    const signedResult = await signFeed(feed, keyPair.privateKey, {
      publicKeyUrl: 'https://example.com/.well-known/public.pem',
      trustLevel: 'self-signed'
    })

    expect(signedResult.feed.trust).toBeDefined()
    expect(signedResult.feed.signature).toBeDefined()

    // 4. Verify the signed feed
    const verifyResult = await verifyFeed(signedResult.feed, keyPair.publicKey)
    expect(verifyResult.valid).toBe(true)
    expect(verifyResult.error).toBeUndefined()

    // 5. Verify payload hash consistency
    expect(verifyResult.payloadHash).toBe(signedResult.payloadHash)
  })
})

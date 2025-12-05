/**
 * Validator Package Test Suite
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  deepSortObject,
  base64ToUint8Array,
  validateFeedStructure,
  validateCapabilitySchemas,
  validateLLMFeed,
  pemToPublicKey,
  sha256,
  type LLMFeed,
  type ValidationError
} from './index.js'

// Store original fetch for restoration
const originalFetch = global.fetch

// Mock fetch globally
const mockFetch = vi.fn()

// Restore original fetch after all tests
afterEach(() => {
  mockFetch.mockReset()
})

// Setup mock before tests that need it
beforeEach(() => {
  global.fetch = mockFetch
})

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

  it('should preserve array order', () => {
    const input = [3, 1, 2]
    const result = deepSortObject(input)
    expect(result).toEqual([3, 1, 2])
  })

  it('should handle deeply nested structures', () => {
    const input = {
      z: {
        deep: {
          nested: { c: 1, a: 2, b: 3 }
        }
      }
    }
    const result = deepSortObject(input) as { z: { deep: { nested: Record<string, number> } } }
    expect(Object.keys(result.z.deep.nested)).toEqual(['a', 'b', 'c'])
  })

  it('should produce canonical JSON for consistent hashing', () => {
    const obj1 = { b: 1, a: 2, c: { z: 1, y: 2 } }
    const obj2 = { c: { y: 2, z: 1 }, a: 2, b: 1 }
    
    const sorted1 = JSON.stringify(deepSortObject(obj1))
    const sorted2 = JSON.stringify(deepSortObject(obj2))
    
    expect(sorted1).toBe(sorted2)
  })
})

describe('base64ToUint8Array', () => {
  it('should decode valid base64 to Uint8Array', () => {
    // 'SGVsbG8=' is base64 for 'Hello'
    const result = base64ToUint8Array('SGVsbG8=')
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBe(5)
    expect(Array.from(result)).toEqual([72, 101, 108, 108, 111]) // 'Hello' in ASCII
  })

  it('should handle empty string', () => {
    const result = base64ToUint8Array('')
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBe(0)
  })

  it('should decode binary data correctly', () => {
    // 32-byte array (typical Ed25519 key size)
    const base64Key = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
    const result = base64ToUint8Array(base64Key)
    expect(result.length).toBe(32)
  })

  it('should decode 64-byte signature correctly', () => {
    // 64-byte array (Ed25519 signature size)
    const base64Sig = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='
    const result = base64ToUint8Array(base64Sig)
    expect(result.length).toBe(64)
  })
})

describe('validateFeedStructure', () => {
  it('should return error for null feed', () => {
    const errors = validateFeedStructure(null)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].message).toContain('null or undefined')
  })

  it('should return error for undefined feed', () => {
    const errors = validateFeedStructure(undefined)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].message).toContain('null or undefined')
  })

  it('should return error for missing feed_type', () => {
    const feed = {
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      }
    }
    const errors = validateFeedStructure(feed)
    expect(errors.some(e => e.field === 'feed_type')).toBe(true)
  })

  it('should return warning for invalid feed_type value', () => {
    const feed = {
      feed_type: 'invalid-type',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      }
    }
    const errors = validateFeedStructure(feed)
    expect(errors.some(e => e.message.includes('Invalid feed_type'))).toBe(true)
  })

  it('should accept valid feed_types: mcp, export, llm-index', () => {
    const validTypes = ['mcp', 'export', 'llm-index']
    
    for (const feedType of validTypes) {
      const feed = {
        feed_type: feedType,
        metadata: {
          title: 'Test',
          origin: 'https://example.com',
          description: 'Test'
        }
      }
      const errors = validateFeedStructure(feed)
      const feedTypeErrors = errors.filter(e => e.field === 'feed_type' && e.severity === 'error')
      expect(feedTypeErrors).toHaveLength(0)
    }
  })

  it('should return error for missing metadata', () => {
    const feed = { feed_type: 'mcp' }
    const errors = validateFeedStructure(feed)
    expect(errors.some(e => e.field === 'metadata')).toBe(true)
  })

  it('should return errors for missing required metadata fields', () => {
    const feed = {
      feed_type: 'mcp',
      metadata: {}
    }
    const errors = validateFeedStructure(feed)
    expect(errors.some(e => e.field === 'metadata.title')).toBe(true)
    expect(errors.some(e => e.field === 'metadata.origin')).toBe(true)
    expect(errors.some(e => e.field === 'metadata.description')).toBe(true)
  })

  it('should return error for invalid origin URL', () => {
    const feed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'not-a-valid-url',
        description: 'Test'
      }
    }
    const errors = validateFeedStructure(feed)
    expect(errors.some(e => e.field === 'metadata.origin' && e.type === 'format')).toBe(true)
  })

  it('should pass for valid minimal feed structure', () => {
    const feed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test Feed',
        origin: 'https://example.com',
        description: 'A test feed description'
      }
    }
    const errors = validateFeedStructure(feed)
    const criticalErrors = errors.filter(e => e.severity === 'error')
    expect(criticalErrors).toHaveLength(0)
  })
})

describe('validateCapabilitySchemas', () => {
  const baseFeed: LLMFeed = {
    feed_type: 'mcp',
    metadata: {
      title: 'Test',
      origin: 'https://example.com',
      description: 'Test'
    }
  }

  it('should return empty array for feed without capabilities', () => {
    const errors = validateCapabilitySchemas(baseFeed)
    expect(errors).toHaveLength(0)
  })

  it('should return empty array for feed with empty capabilities array', () => {
    const feed: LLMFeed = {
      ...baseFeed,
      capabilities: []
    }
    const errors = validateCapabilitySchemas(feed)
    expect(errors).toHaveLength(0)
  })

  it('should return error for capability missing name', () => {
    const feed: LLMFeed = {
      ...baseFeed,
      capabilities: [
        { name: '', type: 'tool', description: 'Test tool' }
      ]
    }
    const errors = validateCapabilitySchemas(feed)
    expect(errors.some(e => e.message.includes('name'))).toBe(true)
  })

  it('should return warning for capability missing description', () => {
    const feed: LLMFeed = {
      ...baseFeed,
      capabilities: [
        { name: 'test-tool', type: 'tool', description: '' }
      ]
    }
    const errors = validateCapabilitySchemas(feed)
    expect(errors.some(e => e.message.includes('description'))).toBe(true)
  })

  it('should validate multiple capabilities', () => {
    const feed: LLMFeed = {
      ...baseFeed,
      capabilities: [
        { name: '', type: 'tool', description: 'First' },
        { name: 'valid', type: 'tool', description: '' },
        { name: '', type: 'tool', description: '' }
      ]
    }
    const errors = validateCapabilitySchemas(feed)
    expect(errors.length).toBeGreaterThanOrEqual(3)
  })

  it('should pass for valid capability with inputSchema', () => {
    const feed: LLMFeed = {
      ...baseFeed,
      capabilities: [
        {
          name: 'greet',
          type: 'tool',
          description: 'Greet a user',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' }
            }
          }
        }
      ]
    }
    const errors = validateCapabilitySchemas(feed)
    const criticalErrors = errors.filter(e => e.severity === 'error')
    expect(criticalErrors).toHaveLength(0)
  })

  it('should warn if inputSchema type is not object', () => {
    const feed: LLMFeed = {
      ...baseFeed,
      capabilities: [
        {
          name: 'test',
          type: 'tool',
          description: 'Test tool',
          inputSchema: {
            type: 'string' // Unusual - inputSchema is typically object
          }
        }
      ]
    }
    const errors = validateCapabilitySchemas(feed)
    expect(errors.some(e => e.severity === 'warning')).toBe(true)
  })
})

describe('pemToPublicKey', () => {
  it('should extract raw 32-byte key from SPKI PEM', () => {
    // Valid Ed25519 SPKI public key PEM (44 bytes when decoded)
    const validPem = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAuZQvQwO1AE2b7dUqGdz0xGj3AMGaXxlLhMq9sHJSTHU=
-----END PUBLIC KEY-----`
    
    const result = pemToPublicKey(validPem)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBe(32) // Ed25519 public key is 32 bytes
  })

  it('should handle PEM with extra whitespace', () => {
    const pemWithWhitespace = `
    -----BEGIN PUBLIC KEY-----
    MCowBQYDK2VwAyEAuZQvQwO1AE2b7dUqGdz0xGj3AMGaXxlLhMq9sHJSTHU=
    -----END PUBLIC KEY-----
    `
    
    const result = pemToPublicKey(pemWithWhitespace)
    expect(result.length).toBe(32)
  })

  it('should handle PEM with line breaks in key content', () => {
    const pemWithBreaks = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2Vw
AyEAuZQvQwO1
AE2b7dUqGdz0
xGj3AMGaXxlL
hMq9sHJSTHU=
-----END PUBLIC KEY-----`
    
    const result = pemToPublicKey(pemWithBreaks)
    expect(result.length).toBe(32)
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
    // Well-known SHA-256 test vector: empty string produces this hash
    // Reference: https://csrc.nist.gov/CSRC/media/Projects/Cryptographic-Algorithm-Validation-Program/documents/shs/sha256testvectors.txt
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })

  it('should handle unicode strings', async () => {
    const hash = await sha256('こんにちは世界')
    expect(hash.length).toBe(64)
  })
})

describe('validateLLMFeed', () => {
  it('should return valid: false for empty object', async () => {
    const result = await validateLLMFeed({})
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('should return valid: true for minimal valid feed', async () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test Feed',
        origin: 'https://example.com',
        description: 'A test feed'
      }
    }
    const result = await validateLLMFeed(feed)
    expect(result.valid).toBe(true)
  })

  it('should calculate a score between 0 and 100', async () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test Feed',
        origin: 'https://example.com',
        description: 'A test feed'
      }
    }
    const result = await validateLLMFeed(feed)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('should add warning for missing capabilities', async () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      }
    }
    const result = await validateLLMFeed(feed)
    expect(result.warnings.some(w => w.message.includes('capabilities'))).toBe(true)
  })

  it('should add warning for unsigned feed', async () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      }
    }
    const result = await validateLLMFeed(feed)
    expect(result.warnings.some(w => 
      w.message.includes('sign') || w.message.includes('trust')
    )).toBe(true)
  })

  it('should skip signature verification when option is set', async () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      },
      trust: {
        algorithm: 'Ed25519',
        signed_blocks: ['metadata'],
        public_key_hint: 'https://example.com/key.pem'
      },
      signature: {
        value: 'test-signature'
      }
    }
    const result = await validateLLMFeed(feed, { skipSignatureVerification: true })
    expect(result.signatureValid).toBeUndefined()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should decrease score for errors', async () => {
    const validFeed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      },
      capabilities: [
        { name: 'test', type: 'tool', description: 'Test capability' }
      ]
    }
    
    const invalidFeed = {
      feed_type: 'mcp',
      metadata: {} // Missing required fields
    }
    
    const validResult = await validateLLMFeed(validFeed)
    const invalidResult = await validateLLMFeed(invalidFeed)
    
    expect(invalidResult.score).toBeLessThan(validResult.score)
  })
})

describe('Signature verification edge cases', () => {
  it('should handle missing trust block', async () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      },
      signature: {
        value: 'some-signature',
        created_at: '2024-01-01T00:00:00Z'
      }
    }
    const result = await validateLLMFeed(feed)
    // Should warn about missing trust or crypto setup
    expect(result.signatureValid).toBeUndefined()
  })

  it('should handle missing signature block', async () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      },
      trust: {
        algorithm: 'Ed25519',
        signed_blocks: ['metadata'],
        public_key_hint: 'https://example.com/key.pem'
      }
    }
    const result = await validateLLMFeed(feed)
    expect(result.signatureValid).toBeUndefined()
  })

  it('should reject unsupported algorithm', async () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      },
      trust: {
        algorithm: 'RSA-256', // Not supported
        signed_blocks: ['metadata'],
        public_key_hint: 'https://example.com/key.pem'
      },
      signature: {
        value: 'test-signature'
      }
    }
    const result = await validateLLMFeed(feed)
    expect(result.signatureValid).toBe(false)
    expect(result.errors.some(e => e.type === 'signature')).toBe(true)
  })
})

describe('Signature verification with mocked fetch', () => {
  // Valid Ed25519 test data (pre-generated)
  const validPublicKeyPem = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAGb9bTmLHPWy3bNGP/2Z+aqHnCWB7ey5kWUBhZHnqDPU=
-----END PUBLIC KEY-----`

  // 64-byte signature (base64 encoded)
  const valid64ByteSignature = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='

  it('should fail when public key fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      },
      trust: {
        algorithm: 'Ed25519',
        signed_blocks: ['metadata'],
        public_key_hint: 'https://example.com/key.pem'
      },
      signature: {
        value: valid64ByteSignature,
        created_at: '2024-01-01T00:00:00Z'
      }
    }
    
    const result = await validateLLMFeed(feed)
    expect(result.signatureValid).toBe(false)
    expect(result.signatureDiagnostics?.error).toContain('fetch')
  })

  it('should fail when public key returns non-200', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    })
    
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      },
      trust: {
        algorithm: 'Ed25519',
        signed_blocks: ['metadata'],
        public_key_hint: 'https://example.com/key.pem'
      },
      signature: {
        value: valid64ByteSignature,
        created_at: '2024-01-01T00:00:00Z'
      }
    }
    
    const result = await validateLLMFeed(feed)
    expect(result.signatureValid).toBe(false)
    expect(result.signatureDiagnostics?.error).toContain('404')
  })

  it('should fail when public key is not PEM format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'not a valid pem key'
    })
    
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      },
      trust: {
        algorithm: 'Ed25519',
        signed_blocks: ['metadata'],
        public_key_hint: 'https://example.com/key.pem'
      },
      signature: {
        value: valid64ByteSignature,
        created_at: '2024-01-01T00:00:00Z'
      }
    }
    
    const result = await validateLLMFeed(feed)
    expect(result.signatureValid).toBe(false)
    expect(result.signatureDiagnostics?.error).toContain('Invalid public key')
  })

  it('should fail verification with mismatched signature', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => validPublicKeyPem
    })
    
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      },
      trust: {
        algorithm: 'Ed25519',
        signed_blocks: ['metadata'],
        public_key_hint: 'https://example.com/key.pem'
      },
      signature: {
        // 64 bytes of zeros - won't match any real signature
        value: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
        created_at: '2024-01-01T00:00:00Z'
      }
    }
    
    const result = await validateLLMFeed(feed)
    expect(result.signatureValid).toBe(false)
    expect(result.signatureDiagnostics?.steps.some(s => 
      s.step === 'Verify signature' && s.status === 'failed'
    )).toBe(true)
  })

  it('should use custom publicKeyResolver when provided', async () => {
    const customResolver = vi.fn().mockResolvedValue(validPublicKeyPem)
    
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      },
      trust: {
        algorithm: 'Ed25519',
        signed_blocks: ['metadata'],
        public_key_hint: 'https://example.com/key.pem'
      },
      signature: {
        value: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
        created_at: '2024-01-01T00:00:00Z'
      }
    }
    
    await validateLLMFeed(feed, { publicKeyResolver: customResolver })
    
    expect(customResolver).toHaveBeenCalledWith('https://example.com/key.pem')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should handle invalid signature length', async () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      },
      trust: {
        algorithm: 'Ed25519',
        signed_blocks: ['metadata'],
        public_key_hint: 'https://example.com/key.pem'
      },
      signature: {
        value: 'c2hvcnQ=', // Only 5 bytes, not 64
        created_at: '2024-01-01T00:00:00Z'
      }
    }
    
    const result = await validateLLMFeed(feed)
    expect(result.signatureValid).toBe(false)
    expect(result.signatureDiagnostics?.error).toContain('Invalid signature length')
    expect(result.signatureDiagnostics?.detectedIssues.some(i => 
      i.code === 'INVALID_SIGNATURE_LENGTH'
    )).toBe(true)
  })

  it('should handle missing signature.value', async () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      },
      trust: {
        algorithm: 'Ed25519',
        signed_blocks: ['metadata'],
        public_key_hint: 'https://example.com/key.pem'
      },
      signature: {
        // value is missing
        created_at: '2024-01-01T00:00:00Z'
      }
    }
    
    const result = await validateLLMFeed(feed)
    expect(result.signatureValid).toBe(false)
    expect(result.signatureDiagnostics?.error).toContain('Missing signature value')
  })

  it('should handle empty signed_blocks', async () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      },
      trust: {
        algorithm: 'Ed25519',
        signed_blocks: [], // Empty!
        public_key_hint: 'https://example.com/key.pem'
      },
      signature: {
        value: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
        created_at: '2024-01-01T00:00:00Z'
      }
    }
    
    const result = await validateLLMFeed(feed)
    expect(result.signatureValid).toBe(false)
    expect(result.signatureDiagnostics?.error).toContain('No signed_blocks')
  })

  it('should report canonical payload details', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => validPublicKeyPem
    })
    
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      },
      trust: {
        algorithm: 'Ed25519',
        signed_blocks: ['metadata', 'feed_type'],
        public_key_hint: 'https://example.com/key.pem'
      },
      signature: {
        value: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
        created_at: '2024-01-01T00:00:00Z'
      }
    }
    
    const result = await validateLLMFeed(feed)
    expect(result.signatureDiagnostics?.canonicalPayload).toBeDefined()
    expect(result.signatureDiagnostics?.canonicalPayload?.bytes).toBeGreaterThan(0)
    expect(result.signatureDiagnostics?.canonicalPayload?.hash).toBeDefined()
    expect(result.signatureDiagnostics?.canonicalPayload?.hash?.length).toBe(64) // SHA-256 hex
  })
})


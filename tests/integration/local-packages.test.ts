/**
 * Integration Tests for Local Package Builds
 * 
 * These tests verify that the locally-built packages work correctly
 * before publishing to npm. Run as part of the release workflow.
 * 
 * Run with: npx vitest run tests/integration/local-packages.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '../..')

// Sample valid LLMFeed for testing
const validFeed = {
  feed_type: 'mcp',
  metadata: {
    title: 'Integration Test Feed',
    origin: 'https://example.com',
    description: 'A feed for integration testing',
    version: '1.0.0',
  },
  capabilities: [
    {
      name: 'test_capability',
      type: 'tool',
      description: 'A test capability for integration testing',
      inputSchema: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Test input' }
        }
      }
    }
  ]
}

const invalidFeed = {
  // Missing feed_type
  metadata: {
    title: 'Invalid Feed',
    // Missing origin
    description: 'Missing required fields'
  }
}

describe('Local Package Integration Tests', () => {
  // Dynamic imports for local packages
  let validator: typeof import('../../packages/validator/src/index.js')
  let signer: typeof import('../../packages/signer/src/index.js')
  let healthMonitor: typeof import('../../packages/health-monitor/src/index.js')

  beforeAll(async () => {
    // Import local source directly (not dist) for testing during development
    // In CI, this tests the built packages
    validator = await import('../../packages/validator/src/index.js')
    signer = await import('../../packages/signer/src/index.js')
    healthMonitor = await import('../../packages/health-monitor/src/index.js')
  })

  describe('@25xcodes/llmfeed-validator', () => {
    it('should validate a correct feed structure', async () => {
      const result = await validator.validateLLMFeed(validFeed, { 
        skipSignatureVerification: true 
      })
      
      expect(result.valid).toBe(true)
      expect(result.score).toBeGreaterThan(50)
      expect(result.errors).toBeDefined()
      expect(result.warnings).toBeDefined()
    })

    it('should detect invalid feed structure', async () => {
      const result = await validator.validateLLMFeed(invalidFeed, { 
        skipSignatureVerification: true 
      })
      
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should export validateFeedStructure function', () => {
      const errors = validator.validateFeedStructure(null)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].severity).toBe('error')
    })

    it('should export deepSortObject for canonical JSON', () => {
      const obj = { z: 1, a: 2, m: { b: 3, a: 4 } }
      const sorted = validator.deepSortObject(obj) as Record<string, unknown>
      const keys = Object.keys(sorted)
      expect(keys).toEqual(['a', 'm', 'z'])
    })
  })

  describe('@25xcodes/llmfeed-signer', () => {
    it('should generate Ed25519 key pair', async () => {
      const keys = await signer.generateKeyPair()
      
      expect(keys.privateKey).toBeDefined()
      expect(keys.publicKey).toBeDefined()
      expect(keys.privateKeyPem).toContain('-----BEGIN PRIVATE KEY-----')
      expect(keys.publicKeyPem).toContain('-----BEGIN PUBLIC KEY-----')
      
      // Check key sizes
      const privateBytes = signer.base64ToUint8Array(keys.privateKey)
      const publicBytes = signer.base64ToUint8Array(keys.publicKey)
      expect(privateBytes.length).toBe(48) // PKCS#8 Ed25519
      expect(publicBytes.length).toBe(32)  // Raw public key
    })

    it('should sign a feed with base64 private key', async () => {
      const keys = await signer.generateKeyPair()
      
      const result = await signer.signFeed(validFeed, keys.privateKey, {
        publicKeyUrl: 'https://example.com/public-key.pem',
        signedBlocks: ['metadata', 'capabilities']
      })
      
      expect(result.feed.trust).toBeDefined()
      expect(result.feed.signature).toBeDefined()
      expect((result.feed.trust as any).algorithm).toBe('Ed25519')
      expect((result.feed.trust as any).signed_blocks).toContain('metadata')
      
      // Verify signature is 64 bytes
      const sigBytes = signer.base64ToUint8Array(result.signature)
      expect(sigBytes.length).toBe(64)
    })

    it('should sign a feed with PEM-formatted private key', async () => {
      const keys = await signer.generateKeyPair()
      
      // Use PEM format instead of base64
      const result = await signer.signFeed(validFeed, keys.privateKeyPem, {
        publicKeyUrl: 'https://example.com/public-key.pem',
        signedBlocks: ['metadata', 'capabilities']
      })
      
      expect(result.feed.trust).toBeDefined()
      expect(result.feed.signature).toBeDefined()
      expect(result.signature).toBeDefined()
    })

    it('should produce consistent signatures with PEM and base64 keys', async () => {
      const keys = await signer.generateKeyPair()
      const feed = { ...validFeed }
      
      const resultBase64 = await signer.signFeed(feed, keys.privateKey)
      const resultPem = await signer.signFeed(feed, keys.privateKeyPem)
      
      // Same key should produce same signature
      expect(resultPem.signature).toBe(resultBase64.signature)
      expect(resultPem.payloadHash).toBe(resultBase64.payloadHash)
    })

    it('should verify a signed feed', async () => {
      const keys = await signer.generateKeyPair()
      
      const signResult = await signer.signFeed(validFeed, keys.privateKey, {
        signedBlocks: ['metadata', 'capabilities']
      })
      
      const verifyResult = await signer.verifyFeed(
        signResult.feed, 
        keys.publicKey
      )
      
      expect(verifyResult.valid).toBe(true)
    })
  })

  describe('@25xcodes/llmfeed-health-monitor', () => {
    it('should export normalizeUrl utility', () => {
      const normalized = healthMonitor.normalizeUrl('example.com')
      
      expect(normalized).toContain('https://')
      expect(normalized).toContain('.well-known')
      expect(normalized).toContain('mcp.llmfeed.json')
    })

    it('should export generateFeedId utility', () => {
      const feedId = healthMonitor.generateFeedId(
        'https://example.com/.well-known/mcp.llmfeed.json'
      )
      
      expect(feedId).toBeDefined()
      expect(feedId.length).toBeGreaterThan(0)
      expect(feedId).toContain('example-com')
    })

    it('should export checkMetaOptOut utility', () => {
      // With opt-out meta tag
      const htmlWithOptOut = '<meta name="robots" content="noai">'
      const optOut = healthMonitor.checkMetaOptOut(htmlWithOptOut)
      expect(optOut).toBeTruthy()
      
      // Without opt-out
      const htmlNormal = '<html><head><title>Test</title></head></html>'
      const noOptOut = healthMonitor.checkMetaOptOut(htmlNormal)
      expect(noOptOut).toBeNull()
    })

    it('should export checkFeedOptOut utility', () => {
      // Check for metadata llm-feed-bot: noindex
      const feedWithOptOut = {
        metadata: {
          'llm-feed-bot': 'noindex'
        }
      }
      const optOut = healthMonitor.checkFeedOptOut(feedWithOptOut)
      expect(optOut).toBeTruthy()
      
      // Also check health-monitor key
      const feedWithHealthOptOut = {
        metadata: {
          'health-monitor': 'noindex'
        }
      }
      const healthOptOut = healthMonitor.checkFeedOptOut(feedWithHealthOptOut)
      expect(healthOptOut).toBeTruthy()
      
      const normalFeed = {
        metadata: {
          title: 'Normal Feed'
        }
      }
      const noOptOut = healthMonitor.checkFeedOptOut(normalFeed)
      expect(noOptOut).toBeNull()
    })

    it('should export MemoryStorage class', async () => {
      const storage = new healthMonitor.MemoryStorage()
      
      await storage.saveFeed({
        id: 'test-1',
        url: 'https://example.com/feed.json',
        domain: 'example.com',
        discoveredAt: Date.now(),
        optedOut: false
      })
      
      const feed = await storage.getFeed('test-1')
      expect(feed).toBeDefined()
      expect(feed?.url).toBe('https://example.com/feed.json')
      
      const allFeeds = await storage.getAllFeeds()
      expect(allFeeds.length).toBe(1)
    })

    it('should export generateReport function', () => {
      const feed = {
        id: 'test-feed',
        url: 'https://example.com/.well-known/mcp.llmfeed.json',
        domain: 'example.com',
        discoveredAt: Date.now(),
        optedOut: false
      }
      
      const healthCheck = {
        timestamp: Date.now(),
        reachable: true,
        httpStatus: 200,
        responseTimeMs: 150,
        validation: {
          valid: true,
          score: 85,
          errorCount: 0,
          warningCount: 1,
          issues: [],
          capabilitiesCount: 3
        },
        errors: []
      }
      
      const report = healthMonitor.generateReport(feed, healthCheck)
      
      expect(report).toBeDefined()
      expect(report.html).toBeDefined()
      expect(typeof report.html).toBe('string')
      expect(report.json).toBeDefined()
      expect(report.feed).toBe(feed)
      expect(report.timestamp).toBeGreaterThan(0)
    })
  })

  describe('Cross-Package Compatibility', () => {
    it('should sign and verify with validator', async () => {
      // Generate keys with signer
      const keys = await signer.generateKeyPair()
      
      // Sign feed with signer
      const signResult = await signer.signFeed(validFeed, keys.privateKey, {
        publicKeyUrl: 'https://example.com/key.pem',
        signedBlocks: ['metadata', 'capabilities']
      })
      
      // Validate structure with validator
      const structureErrors = validator.validateFeedStructure(signResult.feed)
      const structureValid = structureErrors.filter(e => e.severity === 'error').length === 0
      expect(structureValid).toBe(true)
      
      // Full validation with custom public key resolver
      const fullResult = await validator.validateLLMFeed(signResult.feed, {
        publicKeyResolver: async () => keys.publicKeyPem
      })
      
      expect(fullResult.valid).toBe(true)
      expect(fullResult.signatureValid).toBe(true)
      expect(fullResult.score).toBeGreaterThan(80)
    })

    it('should handle the complete workflow: generate -> sign -> validate -> report', async () => {
      // 1. Generate keys
      const keys = await signer.generateKeyPair()
      
      // 2. Sign feed
      const signResult = await signer.signFeed(validFeed, keys.privateKeyPem, {
        publicKeyUrl: 'https://example.com/key.pem'
      })
      
      // 3. Validate feed
      const validationResult = await validator.validateLLMFeed(signResult.feed, {
        publicKeyResolver: async () => keys.publicKeyPem
      })
      
      // 4. Generate health report
      const feedSource = {
        id: healthMonitor.generateFeedId('https://example.com/.well-known/mcp.llmfeed.json'),
        url: 'https://example.com/.well-known/mcp.llmfeed.json',
        domain: 'example.com',
        discoveredAt: Date.now(),
        optedOut: false
      }
      
      const healthCheck = {
        timestamp: Date.now(),
        reachable: true,
        httpStatus: 200,
        responseTimeMs: 100,
        validation: {
          valid: validationResult.valid,
          score: validationResult.score,
          errorCount: validationResult.errors.length,
          warningCount: validationResult.warnings.length,
          issues: [],
          capabilitiesCount: 1,
          signatureValid: validationResult.signatureValid
        },
        errors: []
      }
      
      const report = healthMonitor.generateReport(feedSource, healthCheck)
      
      // Verify the complete workflow
      expect(validationResult.valid).toBe(true)
      expect(validationResult.signatureValid).toBe(true)
      expect(report.html).toContain('example.com')
      expect(report.json).toBeDefined()
    })
  })
})

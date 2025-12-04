import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validateFeedStructure,
  validateCapabilitySchemas,
  validateLLMFeed,
  calculateTokenEstimate,
  prepareForRAG,
  type LLMFeed,
  type ValidationResult
} from './llmfeed'

// Mock fetch for signature verification tests
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('validateFeedStructure', () => {
  it('should return error for null feed', () => {
    const errors = validateFeedStructure(null)
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('null or undefined')
  })

  it('should return error for missing feed_type', () => {
    const feed = { metadata: { title: 'Test', origin: 'https://example.com', description: 'Test' } }
    const errors = validateFeedStructure(feed)
    expect(errors.some(e => e.field === 'feed_type')).toBe(true)
  })

  it('should return warning for invalid feed_type', () => {
    const feed = {
      feed_type: 'invalid',
      metadata: { title: 'Test', origin: 'https://example.com', description: 'Test' }
    }
    const errors = validateFeedStructure(feed)
    expect(errors.some(e => e.message.includes('Invalid feed_type'))).toBe(true)
  })

  it('should accept valid feed_types', () => {
    const validTypes = ['mcp', 'export', 'llm-index']
    
    for (const feedType of validTypes) {
      const feed = {
        feed_type: feedType,
        metadata: { title: 'Test', origin: 'https://example.com', description: 'Test' }
      }
      const errors = validateFeedStructure(feed)
      expect(errors.filter(e => e.field === 'feed_type')).toHaveLength(0)
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
      metadata: { title: 'Test', origin: 'not-a-url', description: 'Test' }
    }
    const errors = validateFeedStructure(feed)
    expect(errors.some(e => e.field === 'metadata.origin' && e.type === 'format')).toBe(true)
  })

  it('should pass for valid feed structure', () => {
    const feed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test Feed',
        origin: 'https://example.com',
        description: 'A test feed'
      }
    }
    const errors = validateFeedStructure(feed)
    expect(errors.filter(e => e.severity === 'error')).toHaveLength(0)
  })
})

describe('validateCapabilitySchemas', () => {
  it('should return empty array for feed without capabilities', () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: { title: 'Test', origin: 'https://example.com', description: 'Test' }
    }
    const errors = validateCapabilitySchemas(feed)
    expect(errors).toHaveLength(0)
  })

  it('should validate capability names', () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: { title: 'Test', origin: 'https://example.com', description: 'Test' },
      capabilities: [
        { name: '', type: 'tool', description: 'Missing name' }
      ]
    }
    const errors = validateCapabilitySchemas(feed)
    expect(errors.some(e => e.message.includes('name'))).toBe(true)
  })

  it('should validate capability descriptions', () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: { title: 'Test', origin: 'https://example.com', description: 'Test' },
      capabilities: [
        { name: 'test', type: 'tool', description: '' }
      ]
    }
    const errors = validateCapabilitySchemas(feed)
    expect(errors.some(e => e.message.includes('description'))).toBe(true)
  })

  it('should pass for valid capabilities', () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: { title: 'Test', origin: 'https://example.com', description: 'Test' },
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
    expect(errors.filter(e => e.severity === 'error')).toHaveLength(0)
  })
})

describe('validateLLMFeed', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('should return valid: false for empty object feed', async () => {
    const result = await validateLLMFeed({} as any)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('should return valid: true for minimal valid feed', async () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test Feed',
        origin: 'https://example.com',
        description: 'A test feed for validation'
      }
    }
    const result = await validateLLMFeed(feed)
    expect(result.valid).toBe(true)
    expect(result.score).toBeGreaterThan(0)
  })

  it('should add warning for missing trust block', async () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test Feed',
        origin: 'https://example.com',
        description: 'A test feed'
      }
    }
    const result = await validateLLMFeed(feed)
    expect(result.warnings.some(w => w.message.includes('trust') || w.message.includes('signature'))).toBe(true)
  })

  it('should calculate security score', async () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test Feed',
        origin: 'https://example.com',
        description: 'A test feed'
      },
      capabilities: [
        { name: 'test', type: 'tool', description: 'Test capability' }
      ]
    }
    const result = await validateLLMFeed(feed)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })
})

describe('calculateTokenEstimate', () => {
  it('should estimate tokens for a feed', () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test Feed',
        origin: 'https://example.com',
        description: 'A test feed for token estimation'
      },
      capabilities: [
        { name: 'greet', type: 'tool', description: 'Greet a user' },
        { name: 'farewell', type: 'tool', description: 'Say goodbye' }
      ]
    }
    const estimate = calculateTokenEstimate(feed)
    expect(estimate.total).toBeGreaterThan(0)
    expect(estimate.perCapability).toBeGreaterThan(0)
  })

  it('should handle empty capabilities', () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      }
    }
    const estimate = calculateTokenEstimate(feed)
    expect(estimate.total).toBeGreaterThan(0)
    expect(estimate.perCapability).toBe(0)
  })
})

describe('prepareForRAG', () => {
  it('should create RAG entries from feed', () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test Feed',
        origin: 'https://example.com',
        description: 'A test feed'
      },
      capabilities: [
        {
          name: 'greet',
          type: 'tool',
          description: 'Greet a user by name'
        }
      ]
    }
    const entries = prepareForRAG(feed)
    expect(entries.length).toBeGreaterThan(0)
    expect(entries.some(e => e.type === 'capability')).toBe(true)
    expect(entries.some(e => e.type === 'metadata')).toBe(true)
  })

  it('should include metadata in each entry', () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test Feed',
        origin: 'https://example.com',
        description: 'A test feed'
      },
      capabilities: [
        { name: 'test', type: 'tool', description: 'Test' }
      ]
    }
    const entries = prepareForRAG(feed)
    entries.forEach(entry => {
      expect(entry.metadata.origin).toBe('https://example.com')
      expect(entry.metadata.feed_type).toBe('mcp')
    })
  })

  it('should generate embedContent for each entry', () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test Feed',
        origin: 'https://example.com',
        description: 'A test feed'
      },
      capabilities: [
        { name: 'greet', type: 'tool', description: 'Greet someone' }
      ]
    }
    const entries = prepareForRAG(feed)
    entries.forEach(entry => {
      expect(entry.embedContent).toBeTruthy()
      expect(entry.embedContent.length).toBeGreaterThan(0)
    })
  })
})

describe('Feed with signature', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('should add warning for missing signature when trust block exists', async () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      },
      trust: {
        algorithm: 'ed25519',
        public_key_hint: 'https://example.com/key.pem',
        signed_blocks: ['metadata', 'capabilities']
      }
      // Missing signature
    }
    
    const result = await validateLLMFeed(feed)
    // Should have warnings or signature should be invalid
    expect(result.warnings.length > 0 || result.signatureValid === false).toBe(true)
  })

  it('should handle feed with signature block but no value', async () => {
    const feed: LLMFeed = {
      feed_type: 'mcp',
      metadata: {
        title: 'Test',
        origin: 'https://example.com',
        description: 'Test'
      },
      trust: {
        algorithm: 'ed25519',
        public_key_hint: 'https://example.com/key.pem',
        signed_blocks: ['metadata']
      },
      signature: {
        // No value property
        created_at: '2024-01-01T00:00:00Z'
      }
    }

    const result = await validateLLMFeed(feed)
    // Should still validate successfully structurally
    expect(result.errors.filter(e => e.severity === 'error').length).toBeLessThanOrEqual(1)
  })
})

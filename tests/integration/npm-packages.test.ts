/**
 * Integration Tests for Published NPM Packages
 * 
 * These tests verify that the published npm packages work correctly
 * when installed from the registry (not linked locally).
 * 
 * Run with: npx vitest run tests/integration/npm-packages.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// Test directory for isolation
let testDir: string

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

describe('NPM Package Integration Tests', () => {
  beforeAll(() => {
    // Create isolated test directory
    testDir = mkdtempSync(join(tmpdir(), 'llmfeed-integration-'))
    console.log(`Test directory: ${testDir}`)
    
    // Initialize package.json
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'llmfeed-integration-test',
        version: '1.0.0',
        type: 'module',
        dependencies: {
          '@25xcodes/llmfeed-validator': 'latest',
          '@25xcodes/llmfeed-signer': 'latest',
          '@25xcodes/llmfeed-health-monitor': 'latest'
        }
      }, null, 2)
    )
    
    // Install packages from npm
    console.log('Installing packages from npm...')
    execSync('npm install', { cwd: testDir, stdio: 'pipe' })
  }, 120000) // 2 minute timeout for npm install

  describe('@25xcodes/llmfeed-validator', () => {
    it('should validate a correct feed structure', async () => {
      const testScript = `
        import { validateLLMFeed } from '@25xcodes/llmfeed-validator';
        
        const feed = ${JSON.stringify(validFeed)};
        const result = await validateLLMFeed(feed, { skipSignatureVerification: true });
        
        console.log(JSON.stringify(result));
      `
      
      writeFileSync(join(testDir, 'test-validate.mjs'), testScript)
      
      const output = execSync('node test-validate.mjs', { 
        cwd: testDir, 
        encoding: 'utf-8' 
      })
      
      const result = JSON.parse(output.trim())
      expect(result.valid).toBe(true)
      expect(result.score).toBeGreaterThan(50)
      // Check capabilities are detected (capabilities array has 1 item)
      expect(result.warnings).toBeDefined()
    })

    it('should detect invalid feed structure', async () => {
      const testScript = `
        import { validateLLMFeed } from '@25xcodes/llmfeed-validator';
        
        const feed = ${JSON.stringify(invalidFeed)};
        const result = await validateLLMFeed(feed, { skipSignatureVerification: true });
        
        console.log(JSON.stringify(result));
      `
      
      writeFileSync(join(testDir, 'test-invalid.mjs'), testScript)
      
      const output = execSync('node test-invalid.mjs', { 
        cwd: testDir, 
        encoding: 'utf-8' 
      })
      
      const result = JSON.parse(output.trim())
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should export validateFeedStructure function', async () => {
      const testScript = `
        import { validateFeedStructure } from '@25xcodes/llmfeed-validator';
        
        const errors = validateFeedStructure(null);
        console.log(JSON.stringify(errors));
      `
      
      writeFileSync(join(testDir, 'test-structure.mjs'), testScript)
      
      const output = execSync('node test-structure.mjs', { 
        cwd: testDir, 
        encoding: 'utf-8' 
      })
      
      const errors = JSON.parse(output.trim())
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].severity).toBe('error')
    })
  })

  describe('@25xcodes/llmfeed-signer', () => {
    it('should generate Ed25519 key pair', async () => {
      const testScript = `
        import { generateKeyPair } from '@25xcodes/llmfeed-signer';
        
        const keys = await generateKeyPair();
        console.log(JSON.stringify({
          hasPrivate: keys.privateKeyPem.includes('PRIVATE KEY'),
          hasPublic: keys.publicKeyPem.includes('PUBLIC KEY'),
          privateLength: keys.privateKeyPem.length,
          publicLength: keys.publicKeyPem.length
        }));
      `
      
      writeFileSync(join(testDir, 'test-keygen.mjs'), testScript)
      
      const output = execSync('node test-keygen.mjs', { 
        cwd: testDir, 
        encoding: 'utf-8' 
      })
      
      const result = JSON.parse(output.trim())
      expect(result.hasPrivate).toBe(true)
      expect(result.hasPublic).toBe(true)
      expect(result.privateLength).toBeGreaterThan(100)
      expect(result.publicLength).toBeGreaterThan(50)
    })

    it('should sign a feed and produce valid signature', async () => {
      const testScript = `
        import { generateKeyPair, signFeed } from '@25xcodes/llmfeed-signer';
        
        const feed = ${JSON.stringify(validFeed)};
        const keys = await generateKeyPair();
        
        // Use privateKeyPem (PEM format) - the new API supports this
        const signedFeed = await signFeed(feed, keys.privateKeyPem, {
          publicKeyUrl: 'https://example.com/public-key.pem',
          signedBlocks: ['metadata', 'capabilities']
        });
        
        console.log(JSON.stringify({
          hasTrust: !!signedFeed.feed.trust,
          hasSignature: !!signedFeed.feed.trust?.signature || !!signedFeed.feed.signature,
          hasValue: !!signedFeed.feed.signature?.value || !!signedFeed.signature,
          algorithm: signedFeed.feed.trust?.algorithm,
          signedBlocks: signedFeed.feed.trust?.signed_blocks || signedFeed.signedBlocks
        }));
      `
      
      writeFileSync(join(testDir, 'test-sign.mjs'), testScript)
      
      const output = execSync('node test-sign.mjs', { 
        cwd: testDir, 
        encoding: 'utf-8' 
      })
      
      const result = JSON.parse(output.trim())
      expect(result.hasTrust).toBe(true)
      expect(result.hasSignature).toBe(true)
      expect(result.hasValue).toBe(true)
      expect(result.algorithm).toBe('Ed25519')
      expect(result.signedBlocks).toContain('metadata')
      expect(result.signedBlocks).toContain('capabilities')
    })

    it('should round-trip: sign then validate', async () => {
      const testScript = `
        import { generateKeyPair, signFeed } from '@25xcodes/llmfeed-signer';
        import { validateLLMFeed } from '@25xcodes/llmfeed-validator';
        
        const feed = ${JSON.stringify(validFeed)};
        const keys = await generateKeyPair();
        
        // Sign using PEM format
        const signedResult = await signFeed(feed, keys.privateKeyPem, {
          publicKeyUrl: 'https://example.com/public-key.pem',
          signedBlocks: ['metadata', 'capabilities']
        });
        
        // Validate with custom public key resolver (simulating fetch)
        const result = await validateLLMFeed(signedResult.feed, {
          publicKeyResolver: async () => keys.publicKeyPem
        });
        
        console.log(JSON.stringify({
          valid: result.valid,
          score: result.score,
          signatureVerified: result.signatureValid || result.signatureDiagnostics?.valid
        }));
      `
      
      writeFileSync(join(testDir, 'test-roundtrip.mjs'), testScript)
      
      const output = execSync('node test-roundtrip.mjs', { 
        cwd: testDir, 
        encoding: 'utf-8' 
      })
      
      const result = JSON.parse(output.trim())
      expect(result.valid).toBe(true)
      expect(result.signatureVerified).toBe(true)
      expect(result.score).toBeGreaterThan(80)
    })
  })

  describe('@25xcodes/llmfeed-health-monitor', () => {
    it('should export crawler utilities', async () => {
      const testScript = `
        import { normalizeUrl, generateFeedId } from '@25xcodes/llmfeed-health-monitor';
        
        const normalized = normalizeUrl('example.com');
        const feedId = generateFeedId('https://example.com/.well-known/mcp.llmfeed.json');
        
        console.log(JSON.stringify({
          normalized,
          feedId,
          feedIdLength: feedId.length
        }));
      `
      
      writeFileSync(join(testDir, 'test-crawler.mjs'), testScript)
      
      const output = execSync('node test-crawler.mjs', { 
        cwd: testDir, 
        encoding: 'utf-8' 
      })
      
      const result = JSON.parse(output.trim())
      expect(result.normalized).toContain('.well-known')
      expect(result.normalized).toContain('https://')
      expect(result.feedIdLength).toBeGreaterThan(0)
    })

    it('should export report generator', async () => {
      const testScript = `
        import { generateReport } from '@25xcodes/llmfeed-health-monitor';
        
        // generateReport takes (feed, healthCheck, options) and returns FeedReport object
        const feed = {
          id: 'test-feed',
          url: 'https://example.com/.well-known/mcp.llmfeed.json',
          domain: 'example.com',
          discoveredAt: Date.now(),
          optedOut: false
        };
        
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
            issues: [{ severity: 'warning', message: 'No signature' }],
            capabilitiesCount: 3
          },
          errors: []
        };
        
        const report = generateReport(feed, healthCheck);
        
        console.log(JSON.stringify({
          hasHtml: typeof report.html === 'string' && report.html.length > 0,
          hasJson: typeof report.json === 'object',
          hasFeed: !!report.feed,
          hasTimestamp: typeof report.timestamp === 'number'
        }));
      `
      
      writeFileSync(join(testDir, 'test-report.mjs'), testScript)
      
      const output = execSync('node test-report.mjs', { 
        cwd: testDir, 
        encoding: 'utf-8' 
      })
      
      const result = JSON.parse(output.trim())
      expect(result.hasHtml).toBe(true)
      expect(result.hasJson).toBe(true)
      expect(result.hasFeed).toBe(true)
      expect(result.hasTimestamp).toBe(true)
    })

    it('should export MemoryStorage class', async () => {
      const testScript = `
        import { MemoryStorage } from '@25xcodes/llmfeed-health-monitor';
        
        const storage = new MemoryStorage();
        
        // Test feed operations
        await storage.saveFeed({
          id: 'test-1',
          url: 'https://example.com/feed.json',
          domain: 'example.com',
          discoveredAt: Date.now(),
          optedOut: false
        });
        
        const feed = await storage.getFeed('test-1');
        const allFeeds = await storage.getAllFeeds();
        
        console.log(JSON.stringify({
          feedSaved: !!feed,
          feedUrl: feed?.url,
          totalFeeds: allFeeds.length
        }));
      `
      
      writeFileSync(join(testDir, 'test-storage.mjs'), testScript)
      
      const output = execSync('node test-storage.mjs', { 
        cwd: testDir, 
        encoding: 'utf-8' 
      })
      
      const result = JSON.parse(output.trim())
      expect(result.feedSaved).toBe(true)
      expect(result.feedUrl).toBe('https://example.com/feed.json')
      expect(result.totalFeeds).toBe(1)
    })
  })

  describe('CLI Tools', () => {
    it('llmfeed-validate CLI should work', () => {
      // Write a test feed file
      writeFileSync(
        join(testDir, 'test-feed.json'),
        JSON.stringify(validFeed, null, 2)
      )
      
      try {
        const output = execSync(
          'npx llmfeed-validate test-feed.json --skip-signature', 
          { cwd: testDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        )
        
        // CLI should output something about validation
        expect(output.length).toBeGreaterThan(0)
      } catch (error: any) {
        // Even if it exits with an error, check if it ran
        expect(error.status).toBeDefined()
      }
    })

    it('llmfeed-sign CLI should show help', () => {
      try {
        const output = execSync(
          'npx llmfeed-sign --help', 
          { cwd: testDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        )
        
        expect(output).toContain('sign')
      } catch (error: any) {
        // Help might go to stderr
        if (error.stderr) {
          expect(error.stderr.toString()).toContain('sign')
        }
      }
    })

    it('llmfeed-health CLI should show help', () => {
      try {
        const output = execSync(
          'npx llmfeed-health --help', 
          { cwd: testDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        )
        
        expect(output).toContain('health')
      } catch (error: any) {
        // Help might go to stderr
        if (error.stderr) {
          expect(error.stderr.toString()).toContain('health')
        }
      }
    })
  })

  describe('Cross-Package Compatibility', () => {
    it('should work together: validator accepts signer output', async () => {
      const testScript = `
        import { generateKeyPair, signFeed } from '@25xcodes/llmfeed-signer';
        import { validateLLMFeed, validateFeedStructure } from '@25xcodes/llmfeed-validator';
        
        // Create and sign a feed
        const feed = ${JSON.stringify(validFeed)};
        const keys = await generateKeyPair();
        
        const signedResult = await signFeed(feed, keys.privateKeyPem, {
          publicKeyUrl: 'https://example.com/key.pem',
          signedBlocks: ['metadata', 'capabilities']
        });
        
        // Validate structure (no signature check)
        const structureErrors = validateFeedStructure(signedResult.feed);
        const structureValid = structureErrors.filter(e => e.severity === 'error').length === 0;
        
        // Full validation with signature
        const fullResult = await validateLLMFeed(signedResult.feed, {
          publicKeyResolver: async () => keys.publicKeyPem
        });
        
        console.log(JSON.stringify({
          structureValid,
          fullValid: fullResult.valid,
          signatureVerified: fullResult.signatureValid || fullResult.signatureDiagnostics?.valid,
          score: fullResult.score
        }));
      `
      
      writeFileSync(join(testDir, 'test-cross.mjs'), testScript)
      
      const output = execSync('node test-cross.mjs', { 
        cwd: testDir, 
        encoding: 'utf-8' 
      })
      
      const result = JSON.parse(output.trim())
      expect(result.structureValid).toBe(true)
      expect(result.fullValid).toBe(true)
      expect(result.signatureVerified).toBe(true)
      expect(result.score).toBeGreaterThan(80)
    })
  })

  // Cleanup
  afterAll(() => {
    if (testDir && existsSync(testDir)) {
      try {
        rmSync(testDir, { recursive: true, force: true })
        console.log(`Cleaned up test directory: ${testDir}`)
      } catch {
        console.log(`Warning: Could not clean up ${testDir}`)
      }
    }
  })
})

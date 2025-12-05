# Getting Started

Get up and running with LLMFeed in under 5 minutes. This guide walks you through creating, validating, and signing your first feed.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

## Installation

Install the core packages you need:

```bash
# Install all three packages
npm install @25xcodes/llmfeed-validator @25xcodes/llmfeed-signer @25xcodes/llmfeed-health-monitor

# Or install individually
npm install @25xcodes/llmfeed-validator  # For validation
npm install @25xcodes/llmfeed-signer     # For signing
```

## Quick Start: Create Your First Feed

::: tip Format Support
These tools fully support **LLMFeed JSON** format. Support for **llm.txt** (markdown) is coming soon.
:::

### Step 1: Create a Feed File

Create a file called `llmfeed.json` or `feed.json`:

```json
{
  "feed_type": "llmfeed",
  "metadata": {
    "title": "My Awesome Service",
    "origin": "https://api.example.com",
    "description": "A service that helps AI agents do amazing things",
    "contact": {
      "email": "support@example.com"
    }
  },
  "capabilities": [
    {
      "name": "search",
      "description": "Search our database for relevant information",
      "endpoint": "/api/search",
      "method": "POST",
      "parameters": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "The search query"
          },
          "limit": {
            "type": "number",
            "description": "Maximum results to return",
            "default": 10
          }
        },
        "required": ["query"]
      }
    }
  ],
  "items": [
    {
      "title": "Getting Started",
      "description": "How to integrate with our API",
      "url": "https://docs.example.com/getting-started"
    }
  ]
}
```

### Step 2: Validate Your Feed

Use the CLI to validate your LLMFeed JSON:

```bash
npx @25xcodes/llmfeed-validator mcp.llmfeed.json
```

Or use the API:

```typescript
import { validateFeedStructure } from '@25xcodes/llmfeed-validator'
import fs from 'fs'

const feed = JSON.parse(fs.readFileSync('mcp.llmfeed.json', 'utf-8'))
const errors = validateFeedStructure(feed)

if (errors.length === 0) {
  console.log('✅ LLMFeed JSON is valid!')
} else {
  console.error('❌ Validation errors:')
  errors.forEach(err => console.log(`  ${err.field}: ${err.message}`))
}
```

::: info llm.txt Support
Validation for llm.txt (markdown format) is not yet available. It's on our roadmap.
:::

### Step 3: Generate Signing Keys

Generate an Ed25519 key pair for signing:

```bash
npx llmfeed-sign keygen --output ./keys
```

This creates:
- `keys/private.pem` - Your private key (keep secret!)
- `keys/public.pem` - Your public key (share this)

Or programmatically:

```typescript
import { generateKeyPair } from '@25xcodes/llmfeed-signer'

const { privateKey, publicKey, privateKeyPem, publicKeyPem } = await generateKeyPair()

console.log('Private Key (base64):', privateKey)
console.log('Public Key (base64):', publicKey)
```

### Step 4: Sign Your Feed

Sign the feed with your private key:

```bash
npx llmfeed-sign sign feed.json --key ./keys/private.pem --output signed-feed.json
```

Or programmatically:

```typescript
import { signFeed } from '@25xcodes/llmfeed-signer'
import fs from 'fs'

const feed = JSON.parse(fs.readFileSync('feed.json', 'utf-8'))
const privateKey = fs.readFileSync('./keys/private.pem', 'utf-8')

const signedFeed = await signFeed(feed, privateKey)

fs.writeFileSync('signed-feed.json', JSON.stringify(signedFeed, null, 2))
```

### Step 5: Verify the Signature

Verify that the signature is valid:

```typescript
import { validateLLMFeed } from '@25xcodes/llmfeed-validator'
import fs from 'fs'

const signedFeed = JSON.parse(fs.readFileSync('signed-feed.json', 'utf-8'))
const result = await validateLLMFeed(signedFeed)

console.log('Signature valid:', result.signatureValid)
console.log('Security score:', result.score)
console.log('Overall valid:', result.valid)
```

## Publishing Your Feed

Once your feed is validated and signed, publish it to your website:

### Option 1: Well-Known Location

Place your feed at `/.well-known/mcp.llmfeed.json`:

```
https://example.com/.well-known/mcp.llmfeed.json
```

### Option 2: Root Location

Place at the root of your domain:

```
https://example.com/mcp.llmfeed.json
```

### Option 3: Custom Path

Use any path and include it in your `robots.txt`:

```
# robots.txt
User-agent: *
Allow: /

# LLMFeed location
LLMFeed: /api/llm-feed.json
```

## CI/CD Integration

Add validation to your CI/CD pipeline with our GitHub Action:

```yaml
# .github/workflows/validate-feed.yml
name: Validate LLMFeed

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Validate Feed
        uses: kiarashplusplus/webmcp-tooling-suite/packages/github-action@v1
        with:
          feed: './.well-known/mcp.llmfeed.json'
          fail-on-error: 'true'
```

## Monitor Feed Health

Set up monitoring for your feeds:

```typescript
import { crawlFeed, generateReport } from '@25xcodes/llmfeed-health-monitor'

// Crawl a feed
const result = await crawlFeed('https://example.com/.well-known/mcp.llmfeed.json')

// Check health status
console.log('Reachable:', result.healthCheck.reachable)
console.log('Valid:', result.healthCheck.validation?.valid)
console.log('Score:', result.healthCheck.validation?.score)

// Generate a health report
if (!result.optedOut) {
  const report = generateReport(result.feed, result.healthCheck)
  console.log(report.html)
}
```

## Next Steps

<div class="package-grid">
  <a href="/guide/feed-structure" class="package-card">
    <h3>📄 Feed Structure</h3>
    <p>Deep dive into the feed format and all available fields</p>
  </a>
  <a href="/guide/trust-signatures" class="package-card">
    <h3>🔐 Trust & Signatures</h3>
    <p>Learn about cryptographic signing in detail</p>
  </a>
  <a href="/guide/capabilities" class="package-card">
    <h3>🎯 Capabilities</h3>
    <p>Define rich capability metadata for AI agents</p>
  </a>
  <a href="/packages/" class="package-card">
    <h3>📦 API Reference</h3>
    <p>Full documentation for all packages</p>
  </a>
</div>

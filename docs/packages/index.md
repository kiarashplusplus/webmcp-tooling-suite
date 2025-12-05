# Packages

LLMFeed provides a suite of npm packages for working with MCP feeds. Each package is focused on a specific task and can be used independently or together.

## Format Support

| Format | Validation | Signing | Health Monitoring |
|--------|------------|---------|------------------|
| **LLMFeed JSON** (`.json`) | ✅ Full | ✅ Full | ✅ Full |
| **llms.txt** (`.txt`) | ✅ Full | ❌ N/A | ❌ N/A |

::: tip New in v1.2.0
**llms.txt support is now available!** Use `@25xcodes/llmstxt-parser` to parse and validate llms.txt files.
:::

## Overview

<div class="package-grid">
  <div class="package-card">
    <h3>@25xcodes/llmfeed-validator</h3>
    <p>Schema validation and signature verification for LLMFeed files</p>
    <div style="margin-top: 1rem;">
      <a href="/packages/validator/">Documentation →</a>
    </div>
  </div>
  
  <div class="package-card">
    <h3>@25xcodes/llmfeed-signer</h3>
    <p>Ed25519 key generation and cryptographic feed signing</p>
    <div style="margin-top: 1rem;">
      <a href="/packages/signer/">Documentation →</a>
    </div>
  </div>
  
  <div class="package-card">
    <h3>@25xcodes/llmfeed-health-monitor</h3>
    <p>Feed crawling, health tracking, and report generation</p>
    <div style="margin-top: 1rem;">
      <a href="/packages/health-monitor/">Documentation →</a>
    </div>
  </div>
  
  <div class="package-card">
    <h3>@25xcodes/llmfeed-action</h3>
    <p>GitHub Action for CI/CD feed validation</p>
    <div style="margin-top: 1rem;">
      <a href="/packages/github-action/">Documentation →</a>
    </div>
  </div>
  
  <div class="package-card">
    <h3>@25xcodes/llmstxt-parser</h3>
    <p>Parse & validate llms.txt files with RAG utilities</p>
    <div style="margin-top: 1rem;">
      <a href="/packages/llmstxt-parser/">Documentation →</a>
    </div>
  </div>
</div>

## Installation

Install all packages:

```bash
npm install @25xcodes/llmfeed-validator @25xcodes/llmfeed-signer @25xcodes/llmfeed-health-monitor
```

Or install individually based on your needs:

```bash
# Just validation
npm install @25xcodes/llmfeed-validator

# Just signing
npm install @25xcodes/llmfeed-signer

# Just health monitoring
npm install @25xcodes/llmfeed-health-monitor

# Just llms.txt parsing
npm install @25xcodes/llmstxt-parser
```

## Package Dependencies

```
┌─────────────────────────────────────────────────────────┐
│               llmfeed-health-monitor                     │
│         (crawling, storage, reports)                    │
└───────────────────────┬─────────────────────────────────┘
                        │
                   depends on
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                 llmfeed-validator                        │
│       (schema validation, signature verification)        │
└───────────────────────┬─────────────────────────────────┘
                        │
              optional peer dependency
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   llmfeed-signer                         │
│            (key generation, signing)                     │
└─────────────────────────────────────────────────────────┘
```

## TypeScript Support

All packages are written in TypeScript and include full type definitions:

```typescript
import type { 
  ValidationResult, 
  LLMFeed,
  Capability 
} from '@25xcodes/llmfeed-validator'

import type { 
  KeyPair, 
  SignedFeed,
  SigningOptions 
} from '@25xcodes/llmfeed-signer'

import type { 
  CrawlResult, 
  HealthCheck,
  StorageAdapter,
  CrawlerConfig
} from '@25xcodes/llmfeed-health-monitor'

import type {
  LLMSTxtDocument,
  LLMSTxtValidationResult,
  LLMSTxtLink,
  FetchOptions
} from '@25xcodes/llmstxt-parser'
```

## Browser & Node.js

All packages work in both Node.js and modern browsers:

```typescript
// Node.js
import { validateFeedStructure } from '@25xcodes/llmfeed-validator'

// Browser (ESM)
import { validateFeedStructure } from '@25xcodes/llmfeed-validator'

// Browser (UMD - future)
const { validateFeedStructure } = window.LLMFeedValidator
```

## CLI Tools

Each package includes a CLI:

```bash
# Validate feeds
npx @25xcodes/llmfeed-validator ./feed.json

# Generate keys and sign feeds
npx @25xcodes/llmfeed-signer keygen --output ./keys
npx @25xcodes/llmfeed-signer sign ./feed.json --key ./keys/private.pem

# Monitor feed health
npx @25xcodes/llmfeed-health-monitor crawl https://example.com/.well-known/mcp.llmfeed.json
npx @25xcodes/llmfeed-health-monitor report --format html --output report.html

# Parse llms.txt (library only, no CLI)
import { parseLLMSTxt, validateLLMSTxt } from '@25xcodes/llmstxt-parser'
```

## Versioning

All packages follow [Semantic Versioning](https://semver.org/):

- **Major** (1.x.x → 2.x.x): Breaking changes
- **Minor** (x.1.x → x.2.x): New features, backwards compatible
- **Patch** (x.x.1 → x.x.2): Bug fixes

Current versions are kept in sync across packages when possible.

## Source Code

All packages are open source under the MIT license:

- [GitHub Repository](https://github.com/kiarashplusplus/webmcp-tooling-suite)
- [packages/validator](https://github.com/kiarashplusplus/webmcp-tooling-suite/tree/main/packages/validator)
- [packages/signer](https://github.com/kiarashplusplus/webmcp-tooling-suite/tree/main/packages/signer)
- [packages/health-monitor](https://github.com/kiarashplusplus/webmcp-tooling-suite/tree/main/packages/health-monitor)
- [packages/github-action](https://github.com/kiarashplusplus/webmcp-tooling-suite/tree/main/packages/github-action)
- [packages/llmstxt-parser](https://github.com/kiarashplusplus/webmcp-tooling-suite/tree/main/packages/llmstxt-parser)
